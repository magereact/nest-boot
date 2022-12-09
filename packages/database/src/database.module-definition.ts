import { ConfigurableModuleBuilder } from "@nestjs/common";
import { DatabaseModuleOptions } from "./interfaces";

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<DatabaseModuleOptions>()
  .setClassMethodName("forRoot")
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
