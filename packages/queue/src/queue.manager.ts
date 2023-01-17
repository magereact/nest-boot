import { Injectable, Logger } from "@nestjs/common";

import { QueueExplorer } from "./queue.explorer";

@Injectable()
export class QueueManager {
  constructor(
    private readonly logger: Logger,
    private readonly queueExplorer: QueueExplorer
  ) {}

  async start(names?: string[]): Promise<void> {
    [...this.queueExplorer.workers.entries()]
      .filter(([name]) => typeof names === "undefined" || names.includes(name))
      .forEach(([name, worker]) => {
        void worker.run();
        this.logger.log(`Worker ${name} started`, this.constructor.name);
      });
  }
}