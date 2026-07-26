/**
 * Full-text search helper for PostgreSQL tsvector queries.
 * Converts user search input into a tsquery-compatible format.
 */

/**
 * Convert a user search string into a PostgreSQL tsquery.
 * Handles:
 * - Multiple words (AND logic)
 * - Prefix matching (partial words)
 * - Special character sanitization
 *
 * Examples:
 *   "laptop gaming" -> "laptop:* & gaming:*"
 *   "desain logo"   -> "desain:* & logo:*"
 *   "t-shirt"       -> "t:* & shirt:*"
 */
export function buildTsQuery(search: string): string {
  if (!search || !search.trim()) return "";

  // Remove special characters that could break tsquery
  const sanitized = search
    .replace(/[^\w\s-]/g, " ") // Keep only word chars, spaces, hyphens
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  if (!sanitized) return "";

  // Split into words and create prefix-matching tsquery
  const words = sanitized
    .split(/[\s-]+/)
    .filter((w) => w.length > 0)
    .map((w) => `${w}:*`); // Prefix matching for partial words

  return words.join(" & "); // AND logic between words
}

/**
 * Build a raw SQL WHERE clause for full-text search.
 * Returns the clause and parameters for parameterized queries.
 *
 * @param searchColumn - The tsvector column name (e.g., '"searchVector"')
 * @param search - The user's search string
 * @param paramIndex - Starting parameter index for $N placeholders
 * @returns { clause: string, params: string[], nextIndex: number }
 */
export function buildSearchClause(
  searchColumn: string,
  search: string,
  paramIndex: number = 1,
): { clause: string; params: string[]; nextIndex: number } {
  const tsquery = buildTsQuery(search);

  if (!tsquery) {
    return { clause: "", params: [], nextIndex: paramIndex };
  }

  return {
    clause: `${searchColumn} @@ to_tsquery('indonesian', $${paramIndex})`,
    params: [tsquery],
    nextIndex: paramIndex + 1,
  };
}

/**
 * Build a rank expression for ordering by relevance.
 */
export function buildRankExpression(
  searchColumn: string,
  paramIndex: number,
): string {
  return `ts_rank(${searchColumn}, to_tsquery('indonesian', $${paramIndex}))`;
}
