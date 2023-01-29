import { Inject, Injectable } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";

import { MODULE_OPTIONS_TOKEN } from "./hash.module-definition";
import { HashModuleOptions } from "./hash-module-options.interface";

@Injectable()
export class HashService {
  private readonly secret?: Buffer;

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private readonly options: HashModuleOptions
  ) {
    if (typeof options.secret !== "undefined") {
      this.secret = Buffer.from(options.secret);
    }
  }

  async create(value: string | Buffer): Promise<string> {
    return await hash(value, {
      secret: this.secret,
    });
  }

  async verify(
    hashed: string | Buffer,
    value: string | Buffer
  ): Promise<boolean> {
    return await verify(hashed, value, {
      secret: this.secret,
    });
  }
}
