import { Inject, Injectable } from "@nestjs/common";

import {
  SearchEngineInterface,
  SearchModuleOptions,
  SearchOptions,
} from "./interfaces";
import { MODULE_OPTIONS_TOKEN } from "./search.module-definition";

@Injectable()
export class SearchService implements SearchEngineInterface {
  private readonly engine: SearchEngineInterface;

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) readonly options: SearchModuleOptions
  ) {
    this.engine = options.engine;
  }

  async search(
    index: string,
    query: string,
    options?: SearchOptions<any>
  ): Promise<[Array<string | number>, number]> {
    return await this.engine.search(index, query, options);
  }
}
