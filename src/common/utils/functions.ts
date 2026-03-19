import * as util from 'util';

import { isDate, toNumber, trim } from 'lodash';

import { format } from 'date-fns';

export const inspectData = (message: string | object) => {
  if (typeof message === 'object') {
    console.log(util.inspect(message, false, null, true));
    return;
  }
  console.log(message);
};

/**
 * @method isEmpty
 * @param {String | Number | Object} value
 * @returns {Boolean} true & false
 * @description this value is Empty Check
 */
export const isEmpty = (value: string | number | object): boolean => {
  if (value === null) {
    return true;
  } else if (typeof value !== 'number' && value === '') {
    return true;
  } else if (typeof value === 'undefined' || value === undefined) {
    return true;
  } else if (
    value !== null &&
    typeof value === 'object' &&
    !Object.keys(value).length
  ) {
    return true;
  } else {
    return false;
  }
};

/**
 * Checks if a value is truthy.
 * @param value - The value to be checked.
 * @returns Returns true if the value is truthy, otherwise returns false.
 */
export const isTruthy = (value: unknown): boolean => {
  if (isDate(value)) {
    return true;
  } else if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length > 0;
  } else if (Array.isArray(value)) {
    return value.length > 0;
  } else if (typeof value === 'string') {
    return trim(value).length > 0;
  } else if (typeof value === 'number') {
    return !Number.isNaN(value);
  } else {
    return Boolean(value);
  }
};

export interface PaymentForItem {
  name: string;
  amount: number;
}

/**
 * Extracts items from a given input string and converts them into an array of PaymentForItem objects.
 * The input string should contain items in the format ""(Attendance - 300),(Porridge - 50),(CSB 1 KG - 50)"".
 *
 * @param input - The input string containing items in the format "(name - value)".
 * @returns An array of PaymentForItem objects, each containing a name and an amount.
 */
export function transformInputToPaymentArray(input: string): PaymentForItem[] {
  const regex = /\(([^)]+)\)/g;
  const result: PaymentForItem[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const [name, value] = match[1].split(' - ');
    result.push({
      name: name.trim(),
      amount: parseInt(value.trim(), 10), // Convert value to an integer
    });
  }

  return result;
}

/**
 * Calculates the sum of the values of a specified key in an array of objects.
 *
 * @param arr - The array of objects to iterate over.
 * @param key - The key whose values will be summed.
 * @returns The sum of the values corresponding to the specified key.
 */
export const sumArrayValuesBy = (
  arr: Record<string, unknown>[],
  key: string,
): number => {
  return arr.reduce(
    (acc: number, obj: Record<string, unknown>) => acc + toNumber(obj[key]),
    0,
  );
};

/**
 * Checks if a given date is a valid Date object.
 * @param date - The date to check.
 * @returns True if the date is a valid Date object, false otherwise.
 */
export const isValidDate = (date: Date) => {
  const d = new Date(date);

  const isDateInstance = d instanceof Date;

  if (!isDateInstance) {
    return false;
  } else {
    return !isNaN(d.getTime());
  }
};

export function validateDate(date: Date | string | number | null | undefined) {
  if (!date) {
    return '';
  }

  if (new Date(date).toString() === 'Invalid Date') {
    return `Invalid Date`;
  }
  if (!isValidDate(new Date(date))) {
    return `Invalid Date`;
  }
  return true;
}

export function formatDate(
  date: Date | string | number | null | undefined,
): string {
  if (validateDate(date) !== true) {
    return `${validateDate(date)}`;
  }

  return `${format(new Date(date as Date), 'yyyy-MM-dd')}`;
}

export function formatDateTime(date: Date | string | number | null): string {
  if (validateDate(date) !== true) {
    return `${validateDate(date)}`;
  }

  return format(new Date(date as Date), 'yyyy-MM-dd HH:mm:ss');
}

export function formatTime(date: Date | string | number | null): string {
  if (validateDate(date) !== true) {
    return `${validateDate(date)}`;
  }

  return format(new Date(date as Date), 'HH:mm:ss a');
}

/**
 * Normalizes an MSISDN (phone number) to E.164 format with a leading `+`.
 * Handles both `+254704981655` and `254704981655` as the same number.
 *
 * @param msisdn - Raw phone number string from the client
 * @returns Canonical E.164 string, e.g. `+254704981655`
 */
export function normalizeMsisdn(msisdn: string): string {
  const trimmed = msisdn.trim();
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

/**
 * Formats a number as a financial amount with comma separators
 * @param amount - The number to format (can be number, string, or decimal)
 * @returns Formatted string with commas (e.g., "1,000" or "1,234.50")
 */
export function formatFinancialAmount(
  amount: number | string | undefined | null,
): string {
  if (amount === null || amount === undefined) {
    return '0';
  }

  const numericAmount =
    typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return '0';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}
