/**
 * API Response Utilities
 * Standardize API response handling across the application
 */

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * Extract array data from API response
 * Handles both direct array and paginated response formats
 */
export function extractArrayData<T>(response: any): T[] {
  // Direct array
  if (Array.isArray(response)) {
    return response;
  }

  // Nested in data property
  if (response && Array.isArray(response.data)) {
    return response.data;
  }

  // Paginated response
  if (response && response.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }

  // Invalid format
  console.error('Invalid API response format:', response);
  return [];
}

/**
 * Extract paginated data from API response
 */
export function extractPaginatedData<T>(response: any): PaginatedResponse<T> {
  const defaultResponse: PaginatedResponse<T> = {
    data: [],
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  };

  if (!response) return defaultResponse;

  // Direct paginated response
  if (response.data && Array.isArray(response.data)) {
    return {
      data: response.data,
      total: response.total || 0,
      page: response.page || 1,
      limit: response.limit || 10,
      pages: response.pages || 0,
    };
  }

  // Nested paginated response
  if (response.data && response.data.data && Array.isArray(response.data.data)) {
    return {
      data: response.data.data,
      total: response.data.total || 0,
      page: response.data.page || 1,
      limit: response.data.limit || 10,
      pages: response.data.pages || 0,
    };
  }

  console.error('Invalid paginated response format:', response);
  return defaultResponse;
}

/**
 * Safe array map with fallback
 */
export function safeMap<T, R>(
  data: any,
  mapFn: (item: T, index: number) => R
): R[] {
  const array = extractArrayData<T>(data);
  return array.map(mapFn);
}
