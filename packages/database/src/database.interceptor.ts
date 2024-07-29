import { EntityManager } from "@mikro-orm/core";
import { RequestContext } from "@nest-boot/request-context";
import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { from, lastValueFrom } from "rxjs";

import { TRANSACTION_METADATA_KEY } from "./database.constants";
import { MODULE_OPTIONS_TOKEN } from "./database.module-definition";
import type { DatabaseModuleOptions } from "./interfaces";
import { TransactionOptions } from "./interfaces/transaction-options.interface";
import { isResolvingGraphQLField } from "./utils/is-resolving-graphql-field.util";

@Injectable()
export class DatabaseInterceptor implements NestInterceptor {
  private readonly transactionOptions: TransactionOptions;

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: DatabaseModuleOptions,
    private readonly reflector: Reflector,
    private readonly em: EntityManager,
  ) {
    this.transactionOptions = this.options?.transactional ?? false;
  }

  intercept<T>(executionContext: ExecutionContext, next: CallHandler<T>) {
    const transactionOptions =
      this.reflector.get<TransactionOptions>(
        TRANSACTION_METADATA_KEY,
        executionContext.getHandler(),
      ) ??
      this.reflector.get<TransactionOptions>(
        TRANSACTION_METADATA_KEY,
        executionContext.getClass(),
      ) ??
      this.transactionOptions;

    if (
      transactionOptions &&
      ["http", "graphql"].includes(executionContext.getType()) &&
      !isResolvingGraphQLField(executionContext) &&
      RequestContext.isActive()
    ) {
      return from(
        RequestContext.child(() =>
          this.em.transactional(
            (em) => {
              RequestContext.set(EntityManager, em);
              return lastValueFrom(next.handle());
            },
            transactionOptions === true ? {} : transactionOptions,
          ),
        ),
      );
    }

    return next.handle();
  }
}
