import type { ApiResponse } from '@/types/api';

/**
 * Helper functions untuk handle API responses
 */

/**
 * Unwrap ApiResponse to get data directly
 * Useful when API returns { statusCode, message, data }
 */
export function unwrapApiResponse<T>(response: ApiResponse<T> | T): T {
  // Check if response is already unwrapped
  if (response && typeof response === 'object' && 'data' in response && 'statusCode' in response) {
    return (response as ApiResponse<T>).data;
  }
  
  // Response is already unwrapped
  return response as T;
}

/**
 * Check if response is wrapped in ApiResponse
 */
export function isApiResponse<T>(response: any): response is ApiResponse<T> {
  return (
    response &&
    typeof response === 'object' &&
    'statusCode' in response &&
    'data' in response
  );
}

/**
 * Safe unwrap - returns data or null if not found
 */
export function safeUnwrap<T>(response: ApiResponse<T> | T | null | undefined): T | null {
  if (!response) return null;
  
  if (isApiResponse(response)) {
    return response.data;
  }
  
  return response as T;
}
