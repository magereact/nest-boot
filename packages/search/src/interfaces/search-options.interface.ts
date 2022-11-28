import { FilterQuery, FindOptions } from "@mikro-orm/core";

export interface SearchOptions<T> extends FindOptions<T> {
  where?: FilterQuery<T>;
}
