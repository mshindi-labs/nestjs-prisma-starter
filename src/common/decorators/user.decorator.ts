import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { AuthorizedUser } from './../types';

/**
 * Custom decorator that retrieves the user from the request object.
 * Instead of using the `@Req()` decorator to get the request object and then extract the user from it like req.user, we can use this decorator to directly get the user from the request object.
 * @param data - Additional data passed to the decorator (not used in this implementation).
 * @param ctx - The execution context containing the request object.
 * @returns The user object extracted from the request.
 */
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthorizedUser;
  },
);
