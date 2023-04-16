import { ConfigurableModuleBuilder } from "@nestjs/common";

import { type LoggerModuleOptions } from "./logger-module-options.interface";

export const PINO_LOGGER = Symbol("PINO_LOGGER");

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<LoggerModuleOptions>()
    .setExtras(
      {
        isGlobal: true,
      },
      (definition, extras) => ({
        ...definition,
        global: extras.isGlobal,
      })
    )
    .build();
