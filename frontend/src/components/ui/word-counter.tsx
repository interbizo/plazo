"use client";

const MAX_WORDS = 1500;

/**
 * Count words from text (strips HTML tags if present).
 * More accurate word counting that handles various edge cases.
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  // Remove HTML comments first
  let stripped = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove script and style tags with their content
  stripped = stripped.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  stripped = stripped.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Strip all HTML tags
  stripped = stripped.replace(/<[^>]+>/g, ' ');
  
  // Decode common HTML entities
  stripped = stripped
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…')
    .replace(/&[a-z]+;/gi, ' '); // Remove any other entities
  
  // Remove all whitespace characters (spaces, tabs, newlines, etc)
  // and replace with single space
  stripped = stripped
    .replace(/[\s\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]+/g, ' ')
    .trim();
  
  // If empty after cleaning, return 0
  if (!stripped || stripped.length === 0) return 0;
  
  // Split by whitespace and filter out empty strings
  const words = stripped
    .split(/\s+/)
    .filter((word) => word && word.length > 0);
  
  return words.length;
}

/**
 * Check if word count exceeds the limit.
 */
export function isOverWordLimit(text: string, limit: number = MAX_WORDS): boolean {
  return countWords(text) > limit;
}

interface WordCounterProps {
  text: string;
  limit?: number;
  className?: string;
  showCounter?: boolean; // Option to show/hide counter
}

/**
 * A word counter indicator component.
 * Shows validation for maximum word limit.
 * Counter display is hidden by default.
 */
export function WordCounter({ 
  text, 
  limit = MAX_WORDS, 
  className = "",
  showCounter = false // Hidden by default
}: WordCounterProps) {
  const wordCount = countWords(text);
  const isOverMax = wordCount > limit;

  // Don't show anything if counter is hidden and validation passes
  if (!showCounter && !isOverMax) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 mt-1 ${className}`}>
      {showCounter && (
        <span
          className={`text-xs font-medium ${
            isOverMax
              ? "text-red-600"
              : wordCount > limit * 0.9
                ? "text-amber-600"
                : "text-gray-500"
          }`}
        >
          {wordCount.toLocaleString("id-ID")} / {limit.toLocaleString("id-ID")} kata
        </span>
      )}
      {isOverMax && (
        <span className="text-xs text-red-600 font-medium">
          — Melebihi batas! Kurangi {(wordCount - limit).toLocaleString("id-ID")} kata.
        </span>
      )}
      {!isOverMax && wordCount > limit * 0.9 && showCounter && (
        <span className="text-xs text-amber-600">
          — Mendekati batas
        </span>
      )}
    </div>
  );
}

export { MAX_WORDS };
