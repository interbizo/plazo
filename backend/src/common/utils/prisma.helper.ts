/**
 * Prisma Helper Utilities
 * Helper functions for working with Prisma
 */

/**
 * Remove readonly fields from update data
 * Prisma doesn't allow updating createdAt, updatedAt, id fields
 */
export function cleanUpdateData<T extends Record<string, any>>(data: T): Omit<T, 'id' | 'createdAt' | 'updatedAt'> {
  const { id, createdAt, updatedAt, ...cleanData } = data;
  return cleanData as Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
}

/**
 * Remove null/undefined values from object
 */
export function removeNullish<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Pick only specified fields from object
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result: any = {};
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specified fields from object
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result: any = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}
