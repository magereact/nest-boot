import { RequestContext } from "@nest-boot/request-context";
import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import {
  createContextId,
  DiscoveryService,
  MetadataScanner,
  ModuleRef,
  Reflector,
} from "@nestjs/core";
import { Injector } from "@nestjs/core/injector/injector";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { MetricsTime, Worker } from "bullmq";

import {
  ConsumerDecorator,
  LegacyProcessorDecorator,
  ProcessorDecorator,
} from "./decorators";
import { Job, JobProcessor, type ProcessorFunction } from "./interfaces";
import { QueueConsumer } from "./interfaces";
import { Queue } from "./queue";

@Injectable()
export class QueueExplorer implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(QueueExplorer.name);
  private readonly injector = new Injector();

  readonly queueMap = new Map<string, Queue>();

  readonly workerMap = new Map<string, Worker>();

  readonly consumerMap = new Map<string, ProcessorFunction>();

  readonly processorMap = new Map<string, Map<string, ProcessorFunction>>();

  readonly legacyProcessorMap = new Map<
    string,
    Map<string, ProcessorFunction>
  >();

  constructor(
    private readonly reflector: Reflector,
    private readonly discoveryService: DiscoveryService,
    private readonly moduleRef: ModuleRef,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  discoveryQueues(): void {
    this.discoveryService.getProviders().forEach((wrapper) => {
      const { instance } = wrapper;

      if (instance instanceof Queue) {
        this.queueMap.set(instance.name, instance);

        this.logger.log(`Queue ${instance.name} discovered`);
      }
    });
  }

  discoveryConsumers(): void {
    this.discoveryService
      .getProviders()
      .forEach((wrapper: InstanceWrapper<QueueConsumer>) => {
        const { host, instance } = wrapper;

        if (
          typeof host !== "undefined" &&
          typeof instance?.constructor !== "undefined"
        ) {
          const metadata = this.reflector.get(
            ConsumerDecorator,
            instance?.constructor,
          );

          if (typeof metadata !== "undefined") {
            const queue = this.queueMap.get(metadata.queue);

            if (typeof queue === "undefined") {
              throw new Error(
                `Queue ${metadata.queue} not found for consumer ${instance?.constructor.name}`,
              );
            }

            const isRequestScoped = !wrapper.isDependencyTreeStatic();

            this.consumerMap.set(
              metadata.queue,
              this.wrapRequestContext(
                this.wrapTimeout(
                  isRequestScoped
                    ? async (job) => {
                        const contextId = createContextId();

                        this.moduleRef.registerRequestByContextId(
                          job,
                          contextId,
                        );

                        const contextInstance =
                          await this.injector.loadPerContext(
                            instance,
                            host,
                            host.providers,
                            contextId,
                          );

                        await contextInstance.consume(job);
                      }
                    : instance.consume.bind(instance),
                ),
              ),
            );
          }
        }
      });
  }

  discoveryProcessors(): void {
    this.discoveryService
      .getProviders()
      .forEach((wrapper: InstanceWrapper<JobProcessor>) => {
        const { host, instance } = wrapper;

        if (
          typeof host !== "undefined" &&
          typeof instance?.constructor !== "undefined"
        ) {
          const metadata = this.reflector.get(
            ProcessorDecorator,
            instance?.constructor,
          );

          if (typeof metadata !== "undefined") {
            const queue = this.queueMap.get(metadata.queue);

            if (typeof queue === "undefined") {
              throw new Error(
                `Queue ${metadata.queue} not found for processor ${instance?.constructor.name}`,
              );
            }

            const isRequestScoped = !wrapper.isDependencyTreeStatic();

            const processors =
              this.processorMap.get(metadata.queue) ??
              new Map<string, ProcessorFunction>();

            processors.set(
              metadata.name,
              this.wrapRequestContext(
                this.wrapTimeout(
                  isRequestScoped
                    ? async (job) => {
                        const contextId = createContextId();

                        this.moduleRef.registerRequestByContextId(
                          job,
                          contextId,
                        );

                        const contextInstance =
                          await this.injector.loadPerContext(
                            instance,
                            host,
                            host.providers,
                            contextId,
                          );

                        await contextInstance.process(job);
                      }
                    : instance.process.bind(instance),
                ),
              ),
            );

            this.processorMap.set(metadata.queue, processors);
          }
        }
      });
  }

  discoveryLegacyProcessors(): void {
    this.discoveryService.getProviders().forEach((wrapper: InstanceWrapper) => {
      const { host, instance } = wrapper;

      if (
        typeof host !== "undefined" &&
        typeof instance?.constructor !== "undefined"
      ) {
        this.metadataScanner
          .getAllMethodNames(Object.getPrototypeOf(instance))
          .forEach((key) => {
            const metadata = this.reflector.get(
              LegacyProcessorDecorator,
              instance[key],
            );

            if (typeof metadata !== "undefined") {
              const queue = this.queueMap.get(metadata.queue);

              if (typeof queue === "undefined") {
                throw new Error(
                  `Queue ${metadata.queue} not found for processor ${instance?.constructor.name}`,
                );
              }

              const isRequestScoped = !wrapper.isDependencyTreeStatic();

              const legacyProcessors =
                this.legacyProcessorMap.get(metadata.queue) ??
                new Map<string, ProcessorFunction>();

              legacyProcessors.set(
                metadata.name,
                this.wrapRequestContext(
                  this.wrapTimeout(
                    isRequestScoped
                      ? async (job) => {
                          const contextId = createContextId();

                          this.moduleRef.registerRequestByContextId(
                            job,
                            contextId,
                          );

                          const contextInstance =
                            await this.injector.loadPerContext(
                              instance,
                              host,
                              host.providers,
                              contextId,
                            );

                          await contextInstance[key](job);
                        }
                      : instance[key].bind(instance),
                  ),
                ),
              );

              this.legacyProcessorMap.set(metadata.queue, legacyProcessors);
            }
          });
      }
    });
  }

  createWorkers(): void {
    [...this.queueMap.entries()].forEach(([name, queue]) => {
      const consumer = this.consumerMap.get(name);
      const processors = this.processorMap.get(name);
      const legacyProcessors = this.legacyProcessorMap.get(name);

      if (
        typeof consumer !== "undefined" ||
        typeof processors !== "undefined" ||
        typeof legacyProcessors !== "undefined"
      ) {
        this.workerMap.set(
          name,
          new Worker(
            name,
            async (job) => {
              const processor = processors?.get(job.name);
              const legacyProcessor = legacyProcessors?.get(job.name);
              if (
                typeof processor !== "undefined" ||
                typeof legacyProcessor !== "undefined"
              ) {
                if (typeof processor !== "undefined") {
                  await processor(job);
                }

                if (typeof legacyProcessor !== "undefined") {
                  await legacyProcessor(job);
                }
              } else if (typeof consumer !== "undefined") {
                await consumer(job);
              }

              throw new Error(
                `Processor ${job.name} not found for queue ${name}`,
              );
            },
            {
              autorun: false,
              metrics: {
                maxDataPoints: MetricsTime.TWO_WEEKS,
              },
              ...queue.opts,
            },
          ),
        );

        this.logger.log(`Worker ${name} created`);
      }
    });
  }

  wrapRequestContext(processor: ProcessorFunction) {
    return async (job: Job) => {
      const ctx = new RequestContext();
      ctx.set("job", job);

      await RequestContext.run(ctx, async () => {
        await processor(job);
      });
    };
  }

  wrapTimeout(processor: ProcessorFunction) {
    return async (job: Job) => {
      let timer: NodeJS.Timeout | undefined;

      await Promise.race([
        (async () => {
          await processor(job);
          clearTimeout(timer);
        })(),
        ...(typeof job.opts.timeout !== "undefined"
          ? [
              new Promise<void>((resolve, reject) => {
                timer = setTimeout(() => {
                  reject(new Error("Job processing timeout"));
                }, job.opts.timeout);
              }),
            ]
          : []),
      ]);
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async onModuleInit(): Promise<void> {
    this.discoveryQueues();
    this.discoveryConsumers();
    this.discoveryProcessors();
    this.discoveryLegacyProcessors();
    this.createWorkers();
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(
      [...this.queueMap.entries()].map(async ([name, queue]) => {
        await queue.close();

        this.logger.log(`Queue ${name} closed`);
      }),
    );

    await Promise.all(
      [...this.workerMap.entries()].map(async ([name, worker]) => {
        await worker.close();

        this.logger.log(`Worker ${name} closed`);
      }),
    );
  }
}
