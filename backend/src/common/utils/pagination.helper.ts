export class PaginationHelper {
  static calculatePagination(
    page: number = 1,
    limit: number = 10,
  ): { skip: number; take: number } {
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit)) || 10));

    return {
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    };
  }

  // Alias for backwards compatibility
  static formatResponse<T>(
    data: T[],
    total: number,
    page: number = 1,
    limit: number = 10,
  ) {
    return PaginationHelper.formatPaginatedResponse(data, total, page, limit);
  }

  static formatPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number = 1,
    limit: number = 10,
  ) {
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit)) || 10));

    return {
      data,
      total,
      pages: Math.ceil(total / limitNum),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
        hasNextPage: pageNum * limitNum < total,
        hasPrevPage: pageNum > 1,
      },
    };
  }
}
