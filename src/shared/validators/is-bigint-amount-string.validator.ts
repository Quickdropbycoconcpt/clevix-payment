import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export const POSTGRES_BIGINT_MAX = 9223372036854775807n;

export function IsBigIntAmountString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBigIntAmountString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
            return false;
          }

          return BigInt(value) <= POSTGRES_BIGINT_MAX;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a positive integer string within bigint range`;
        },
      },
    });
  };
}
