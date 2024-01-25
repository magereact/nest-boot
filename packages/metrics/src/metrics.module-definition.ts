import { ConfigurableModuleBuilder } from "@nestjs/common";
import { RegistryContentType } from "prom-client";

import { type MetricsModuleOptions } from "./metrics-module-options.interface";

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<MetricsModuleOptions<RegistryContentType>>()
  .setExtras(
    {
      isGlobal: true,
    },
    (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
    }),
  )
  .build();
