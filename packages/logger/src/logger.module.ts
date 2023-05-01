import { REQUEST, RequestContext, RESPONSE } from "@nest-boot/request-context";
import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import { randomUUID } from "crypto";
import { type Request, type Response } from "express";
import pino from "pino";
import pinoHttp from "pino-http";

import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  PINO_LOGGER,
} from "./logger.module-definition";
import { Logger } from "./logger.service";
import { LoggerModuleOptions } from "./logger-module-options.interface";

@Module({
  providers: [Logger],
  exports: [Logger],
})
export class LoggerModule
  extends ConfigurableModuleClass
  implements OnModuleInit
{
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private readonly options: LoggerModuleOptions
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const logger = pino();
    const loggerMiddleware = pinoHttp({
      autoLogging: false,
      genReqId:
        this.options.genReqId ??
        function (req, res) {
          const existingID = req.id ?? req.headers["x-request-id"];
          if (typeof existingID === "string") {
            return existingID;
          }

          const id = randomUUID();
          res.setHeader("X-Request-Id", id);
          return id;
        },
      ...this.options,
    });

    RequestContext.registerMiddleware(async (ctx, next) => {
      const req = ctx.get<Request>(REQUEST);
      const res = ctx.get<Response>(RESPONSE);

      if (typeof req !== "undefined" && typeof res !== "undefined") {
        loggerMiddleware(req, res);
        ctx.set(PINO_LOGGER, req.log);
      } else {
        ctx.set(
          PINO_LOGGER,
          logger.child({
            req: { id: randomUUID() },
          })
        );
      }

      return await next();
    });
  }
}
