/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator constraint for checking if a date is in ISO 8601 format.
 */
@ValidatorConstraint({ async: false })
export class IsIsoDateConstraint implements ValidatorConstraintInterface {
  /**
   * Validates if the given date is in ISO 8601 format.
   * @param date - The date to validate.
   * @param _args - Additional validation arguments (not used in this implementation).
   * @returns A boolean indicating whether the date is in ISO 8601 format.
   */
  validate(date: unknown, _args: ValidationArguments) {
    if (typeof date !== 'string') return false;
    // Regex to match ISO 8601 date format
    const isoDateRegex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
    return isoDateRegex.test(date);
  }

  /**
   * Gets the default error message for the validation constraint.
   * @param _args - Additional validation arguments (not used in this implementation).
   * @returns The default error message.
   */
  defaultMessage(_args: ValidationArguments) {
    return 'Date ($value) must be in ISO 8601 format';
  }
}

/**
 * Decorator that validates if a property is a valid ISO date string.
 *
 * @param validationOptions - The validation options.
 * @returns A decorator function.
 */
export function IsIsoDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsIsoDateConstraint,
    });
  };
}
