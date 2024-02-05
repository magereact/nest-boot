import { type ValidationOptions } from "class-validator";

import {
  Comparator,
  ValidateCompareNumber,
} from "./validate-compare-number.decorator";

export function IsLessThan(
  field: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateCompareNumber(Comparator.LT, field, validationOptions);
}
