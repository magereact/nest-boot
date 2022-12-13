import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { Logger } from "pino";
import logger, { HttpLogger } from "pino-http";

import { MODULE_OPTIONS_TOKEN } from "../common.module-definition";
import { Context } from "../context";
import { CommonModuleOptions } from "../interfaces";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly loggerMiddleware: HttpLogger;

  constructor(@Inject(MODULE_OPTIONS_TOKEN) options: CommonModuleOptions) {
    this.loggerMiddleware = logger({
      autoLogging:
        typeof options.httpAutoLogging !== "undefined"
          ? options.httpAutoLogging
          : false,
      genReqId: () => randomUUID(),
    });
  }

  async use(req: Request, res: Response, next: () => void): Promise<void> {
    this.loggerMiddleware(req, res);

    const ctx = Context.get();
    ctx.set<Logger>("logger", req.log);

    return next();
  }
}