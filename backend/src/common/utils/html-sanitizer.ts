/**
 * HTML Sanitizer utility for email templates.
 * Prevents HTML injection when dynamic values are inserted into email HTML.
 */

/**
 * Escape HTML special characters to prevent injection.
 * Converts: & < > " ' / ` to their HTML entity equivalents.
 */
export function escapeHtml(unsafe: string | number | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return "";
  const str = String(unsafe);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/`/g, "&#96;");
}

/**
 * Sanitize a URL for use in href attributes.
 * Only allows http:, https:, and mailto: protocols.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:")
  ) {
    return escapeHtml(trimmed);
  }
  return "#";
}
