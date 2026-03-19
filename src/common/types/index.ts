import { Prisma } from 'generated/prisma/client';

/**
 * When dealing with financial data, it is important to use the Prisma.Decimal type. It has a higher precision than the JavaScript number/Float type.
 */
export type PrismaDecimal = Prisma.Decimal;

export * from './authenticated-request';
