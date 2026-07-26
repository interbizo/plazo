import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Count characters from text (strips HTML tags).
 */
function countCharacters(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  // Remove HTML comments first
  let stripped = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove script and style tags with their content
  stripped = stripped.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  stripped = stripped.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Strip all HTML tags
  stripped = stripped.replace(/<[^>]+>/g, '');
  
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
    .replace(/&[a-z]+;/gi, ' ');
  
  // Trim whitespace
  stripped = stripped.trim();
  
  return stripped.length;
}

/**
 * Count words from text (strips HTML tags if present).
 * More accurate word counting that handles various edge cases.
 */
function countWords(text: string): number {
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
 * Custom validator decorator that checks if a string field
 * has at least a minimum number of characters (excluding HTML).
 *
 * @param minChars  Minimum number of characters required (default 1500)
 * @param validationOptions  Standard class-validator options
 */
export function MinCharCount(
  minChars: number = 1500,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'minCharCount',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `Deskripsi minimal ${minChars.toLocaleString('id-ID')} karakter`,
        ...validationOptions,
      },
      constraints: [minChars],
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== 'string') return true; // skip if not string
          return countCharacters(value) >= minChars;
        },
      },
    });
  };
}

/**
 * Custom validator decorator that checks if a string field
 * does not exceed a given word count limit.
 *
 * @param maxWords  Maximum number of words allowed (default 1500)
 * @param validationOptions  Standard class-validator options
 */
export function MaxWordCount(
  maxWords: number = 1500,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'maxWordCount',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `Deskripsi tidak boleh melebihi ${maxWords} kata`,
        ...validationOptions,
      },
      constraints: [maxWords],
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== 'string') return true; // skip if not string
          return countWords(value) <= maxWords;
        },
      },
    });
  };
}
