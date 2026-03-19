import { PAGINATION_SIZES } from '../constants';

/**
 * Returns the pagination parameters based on the provided pagination query.
 * @param pagination - The pagination query object.
 * @returns An object containing the page, limit, and skip parameters.
 */
export const getPagination = (pagination: { page: number; size: number }) => {
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.size) || PAGINATION_SIZES.DEFAULT;
  const skip = (page - 1) * limit;
  return { offset: page, take: limit, skip };
};
