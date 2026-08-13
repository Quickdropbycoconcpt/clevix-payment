import {
  createCursorPaginatedResponse,
  createOffsetPaginatedResponse,
  createPaginatedResponse,
  createRequestPagination,
  DEFAULT_PAGINATION_LIMIT,
  MAX_PAGINATION_LIMIT,
  removePaginationQuery,
} from './pagination';

describe('pagination', () => {
  it('creates default offset pagination', () => {
    expect(createRequestPagination({})).toEqual({
      mode: 'offset',
      limit: DEFAULT_PAGINATION_LIMIT,
      take: DEFAULT_PAGINATION_LIMIT,
      page: 1,
      offset: 0,
      skip: 0,
    });
  });

  it('normalizes offset pagination from page and limit', () => {
    expect(createRequestPagination({ page: '3', limit: '10' })).toEqual({
      mode: 'offset',
      limit: 10,
      take: 10,
      page: 3,
      offset: 20,
      skip: 20,
    });
  });

  it('uses cursor mode when a cursor is present', () => {
    expect(
      createRequestPagination({ cursor: 'txn_cursor', limit: '15' }),
    ).toEqual({
      mode: 'cursor',
      limit: 15,
      take: 15,
      page: 1,
      offset: 0,
      skip: 0,
      cursor: 'txn_cursor',
      lastId: 'txn_cursor',
    });
  });

  it('caps oversized limits', () => {
    expect(createRequestPagination({ limit: '1000' }).limit).toBe(
      MAX_PAGINATION_LIMIT,
    );
  });

  it('removes pagination keys from the query object', () => {
    const query = {
      limit: '10',
      page: '2',
      cursor: 'cursor',
      status: 'SUCCESS',
    };

    removePaginationQuery(query);

    expect(query).toEqual({ status: 'SUCCESS' });
  });

  it('creates offset paginated list responses with totals', () => {
    const pagination = createRequestPagination({ page: '2', limit: '2' });

    expect(
      createOffsetPaginatedResponse(['c', 'd'], pagination, { total: 5 }),
    ).toEqual({
      data: ['c', 'd'],
      pagination: {
        mode: 'offset',
        limit: 2,
        page: 2,
        offset: 2,
        hasNextPage: true,
        hasPreviousPage: true,
        total: 5,
        totalPages: 3,
      },
    });
  });

  it('creates cursor paginated list responses and trims the extra item', () => {
    const pagination = createRequestPagination({
      pagination: 'cursor',
      limit: '2',
    });

    expect(
      createCursorPaginatedResponse(
        [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        pagination,
        { getNextCursor: (item) => item.id },
      ),
    ).toEqual({
      data: [{ id: 'a' }, { id: 'b' }],
      pagination: {
        mode: 'cursor',
        limit: 2,
        hasNextPage: true,
        hasPreviousPage: false,
        nextCursor: 'b',
      },
    });
  });

  it('chooses response format from the request pagination mode', () => {
    const pagination = createRequestPagination({
      cursor: 'cursor',
      limit: '1',
    });

    expect(
      createPaginatedResponse([{ id: 'a' }, { id: 'b' }], pagination, {
        getNextCursor: (item) => item.id,
      }).pagination,
    ).toEqual({
      mode: 'cursor',
      limit: 1,
      hasNextPage: true,
      hasPreviousPage: true,
      nextCursor: 'a',
    });
  });
});
