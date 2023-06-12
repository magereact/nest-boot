import { SetMetadata } from "@nestjs/common";

import { type ProcessorMetadataOptions } from "../interfaces/processor-metadata-options.interface";
import { PROCESSOR_METADATA_KEY } from "../queue.module-definition";

export const Processor =
  (name: string): MethodDecorator =>
  <T>(
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ) =>
    SetMetadata<string, ProcessorMetadataOptions>(PROCESSOR_METADATA_KEY, {
      name,
    })(target, propertyKey, descriptor);
