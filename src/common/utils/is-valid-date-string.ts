/**
 * Checks if a given string is a valid date string.
 * @param dateString - The string to be checked.
 * @returns A boolean indicating whether the string is a valid date string.
 */
export const isValidDateString = (dateString: string): boolean => {
  return !isNaN(Date.parse(dateString));
};
