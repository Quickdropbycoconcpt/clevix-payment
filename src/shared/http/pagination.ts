import type { Request } from 'express';

export const DEFAULT_PAGINATION_LIMIT = 25;
export const MAX_PAGINATION_LIMIT = 100;
export const DEFAULT_PAGINATION_PAGE = 1;

const PAGINATION_QUERY_KEYS = [
  'limit',
  'page',
  'offset',
  'cursor',
  'lastId',
  'pagination',
  'paginationMode',
] as const;

export type PaginationMode = 'offset' | 'cursor';

export type RequestPagination = {
  mode: PaginationMode;
  limit: number;
  take: number;
  page: number;
  offset: number;
  skip: number;
  cursor?: string;
  lastId?: string;
};

export type PaginationMeta = {
  mode: PaginationMode;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page?: number;
  offset?: number;
  total?: number;
  totalPages?: number;
  nextCursor?: string | null;
};

export type PaginatedListResponse<T> = {
  data: T[];
  pagination: PaginationMeta;
};

export type OffsetPaginatedListOptions = {
  total?: number;
  hasNextPage?: boolean;
};

export type CursorPaginatedListOptions<T> = {
  hasNextPage?: boolean;
  nextCursor?: string | null;
  getNextCursor?: (item: T) => string;
};

export const DEFAULT_REQUEST_PAGINATION: RequestPagination = {
  mode: 'offset',
  limit: DEFAULT_PAGINATION_LIMIT,
  take: DEFAULT_PAGINATION_LIMIT,
  page: DEFAULT_PAGINATION_PAGE,
  offset: 0,
  skip: 0,
};

export type PaginatedRequest = Request & {
  pagination: RequestPagination;
  user?: {
    pagination?: RequestPagination;
  };
};

export function createRequestPagination(
  query: Request['query'],
): RequestPagination {
  const limit = clampLimit(getPositiveInteger(query.limit));
  const page = getPositiveInteger(query.page) ?? DEFAULT_PAGINATION_PAGE;
  const offset = getNonNegativeInteger(query.offset) ?? (page - 1) * limit;
  const cursor = getStringValue(query.cursor) ?? getStringValue(query.lastId);
  const requestedMode =
    getStringValue(query.paginationMode) ?? getStringValue(query.pagination);
  const mode: PaginationMode =
    requestedMode === 'cursor' || cursor ? 'cursor' : 'offset';

  return {
    mode,
    limit,
    take: limit,
    page,
    offset,
    skip: offset,
    ...(cursor ? { cursor, lastId: cursor } : {}),
  };
}

export function createOffsetPaginatedResponse<T>(
  data: T[],
  pagination: RequestPagination,
  options: OffsetPaginatedListOptions = {},
): PaginatedListResponse<T> {
  const totalPages =
    options.total === undefined
      ? undefined
      : Math.ceil(options.total / pagination.limit);
  const hasNextPage =
    options.hasNextPage ??
    (options.total === undefined
      ? data.length >= pagination.limit
      : pagination.offset + data.length < options.total);

  return {
    data,
    pagination: {
      mode: 'offset',
      limit: pagination.limit,
      page: pagination.page,
      hasNextPage,
      hasPreviousPage: pagination.offset > 0,
      ...(options.total !== undefined ? { total: options.total } : {}),
      ...(totalPages !== undefined ? { totalPages } : {}),
    },
  };
}

export function createCursorPaginatedResponse<T>(
  data: T[],
  pagination: RequestPagination,
  options: CursorPaginatedListOptions<T> = {},
): PaginatedListResponse<T> {
  const hasNextPage = options.hasNextPage ?? data.length > pagination.limit;
  const items = data.slice(0, pagination.limit);
  const lastItem = items.at(-1);
  const nextCursor =
    options.nextCursor ??
    (hasNextPage && lastItem && options.getNextCursor
      ? options.getNextCursor(lastItem)
      : null);

  return {
    data: items,
    pagination: {
      mode: 'cursor',
      limit: pagination.limit,
      hasNextPage,
      hasPreviousPage: Boolean(pagination.cursor),
      nextCursor,
    },
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: RequestPagination,
  options: OffsetPaginatedListOptions & CursorPaginatedListOptions<T> = {},
): PaginatedListResponse<T> {
  if (pagination.mode === 'cursor') {
    return createCursorPaginatedResponse(data, pagination, options);
  }

  return createOffsetPaginatedResponse(data, pagination, options);
}

export function removePaginationQuery(query: Request['query']) {
  for (const key of PAGINATION_QUERY_KEYS) {
    delete query[key];
  }
}

function clampLimit(limit?: number) {
  if (!limit) {
    return DEFAULT_PAGINATION_LIMIT;
  }

  return Math.min(limit, MAX_PAGINATION_LIMIT);
}

function getPositiveInteger(value: unknown) {
  const integer = getInteger(value);

  if (!integer || integer <= 0) {
    return undefined;
  }

  return integer;
}

function getNonNegativeInteger(value: unknown) {
  const integer = getInteger(value);

  if (integer === undefined || integer < 0) {
    return undefined;
  }

  return integer;
}

function getInteger(value: unknown) {
  const stringValue = getStringValue(value);

  if (!stringValue || !/^\d+$/.test(stringValue)) {
    return undefined;
  }

  const integer = Number.parseInt(stringValue, 10);

  return Number.isSafeInteger(integer) ? integer : undefined;
}

function getStringValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return getStringValue(value[0]);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue || undefined;
}
