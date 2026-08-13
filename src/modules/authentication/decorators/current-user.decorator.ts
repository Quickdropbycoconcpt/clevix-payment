import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  AuthenticatedRequest,
  JwtPayload,
} from '../interface/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    if (request.pagination) {
      user.pagination = request.pagination;
    }

    if (!data) {
      return user;
    }

    return user[data];
  },
);
