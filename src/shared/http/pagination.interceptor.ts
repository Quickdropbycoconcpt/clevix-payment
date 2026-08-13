import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  createRequestPagination,
  PaginatedRequest,
  removePaginationQuery,
} from './pagination';

@Injectable()
export class PaginationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<PaginatedRequest>();

    request.pagination = createRequestPagination(request.query);
    if (request.user) {
      request.user.pagination = request.pagination;
    }

    removePaginationQuery(request.query);

    return next.handle();
  }
}
