import { UnauthorizedException } from '@nestjs/common';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import {
  DEFAULT_REQUEST_PAGINATION,
  type RequestPagination,
} from './http/pagination';

export type RequestScope = {
  businessId?: string | null;
  userId?: string;
  pagination?: RequestPagination;
  environment?: string | null;
};

export type BusinessScope = {
  businessId: string;
  environment: string;
  pagination: RequestPagination;
};

export const getBusinessScope = (scope: RequestScope): BusinessScope => {
  const businessId = scope.businessId?.trim();
  const environment = scope.environment?.trim();
  const pagination = scope.pagination ?? { ...DEFAULT_REQUEST_PAGINATION };

  if (!businessId || !environment) {
    throw new UnauthorizedException('Invalid request scope');
  }

  return { businessId, environment, pagination };
};

export const businessScopeFilter = (scope: RequestScope): BusinessScope =>
  getBusinessScope(scope);

export const applyBusinessScope = <T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  alias: string,
  scope: RequestScope,
): SelectQueryBuilder<T> => {
  const { businessId, environment } = getBusinessScope(scope);

  return queryBuilder
    .andWhere(`${alias}.businessId = :businessId`, { businessId })
    .andWhere(`${alias}.environment = :environment`, { environment });
};
