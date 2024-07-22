import { EntityClass, EntityManager, MikroORM } from "@mikro-orm/core";
import { HealthCheckRegistry } from "@nest-boot/health-check";
import {
  RequestContext,
  RequestContextModule,
} from "@nest-boot/request-context";
import {
  Global,
  Inject,
  Logger,
  Module,
  OnModuleInit,
  Optional,
  Provider,
} from "@nestjs/common";

import { DatabaseHealthIndicator } from "./database.health-indicator";
import { DatabaseLogger } from "./database.logger";
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from "./database.module-definition";
import { type DatabaseModuleOptions } from "./interfaces";
import { withBaseConfig } from "./utils/with-base-config.util";

const providers: Provider[] = [
  Logger,
  {
    provide: MikroORM,
    inject: [MODULE_OPTIONS_TOKEN, Logger],
    useFactory: (options: DatabaseModuleOptions, logger: Logger) => {
      options = withBaseConfig(options);

      return MikroORM.init({
        ...options,
        entities: [...DatabaseModule.entities, ...(options.entities ?? [])],
        context: () => {
          if (RequestContext.isActive()) {
            return RequestContext.get(EntityManager);
          }
        },
        loggerFactory:
          options.debug === true
            ? (options) => new DatabaseLogger(options, logger)
            : undefined,
      });
    },
  },
  {
    provide: EntityManager,
    inject: [MikroORM],
    useFactory: (orm: MikroORM) =>
      new Proxy(orm.em, {
        get(target, property: keyof EntityManager, receiver) {
          if (!RequestContext.isActive()) {
            return Reflect.get(target, property, receiver);
          }

          const instance = RequestContext.get(EntityManager);
          if (!instance) {
            return Reflect.get(target, property, receiver);
          }

          return instance[property];
        },
      }),
  },
  DatabaseHealthIndicator,
];

@Global()
@Module({
  imports: [RequestContextModule],
  providers,
  exports: providers,
})
export class DatabaseModule
  extends ConfigurableModuleClass
  implements OnModuleInit
{
  static entities: EntityClass<any>[] = [];

  static registerEntity(entities: EntityClass<any>[]) {
    this.entities.push(...entities);
  }

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: DatabaseModuleOptions,
    private readonly orm: MikroORM,
    private readonly healthIndicator: DatabaseHealthIndicator,
    @Optional()
    private readonly healthCheckRegistry?: HealthCheckRegistry,
  ) {
    super();
  }

  onModuleInit(): void {
    const healthCheckOptions = this.options.healthCheck;

    if (healthCheckOptions && typeof this.healthCheckRegistry !== "undefined") {
      this.healthCheckRegistry.register(
        async () =>
          await this.healthIndicator.healthCheck(
            "database",
            healthCheckOptions === true ? undefined : healthCheckOptions,
          ),
      );
    }

    RequestContext.registerMiddleware(async (ctx, next) => {
      const em = this.orm.em.fork({ useContext: true });

      if (this.options.explicitTransaction) {
        return await em.transactional(
          async (em) => {
            ctx.set(EntityManager, em);
            return await next();
          },
          this.options.explicitTransaction === true
            ? {}
            : this.options.explicitTransaction,
        );
      }

      ctx.set(EntityManager, em);
      return await next();
    });
  }
}
