/**
 * Test cases for word counter fix
 * Run this in browser console to verify the fix
 */

function countWords(text) {
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
    .replace(/&[a-z]+;/gi, ' ');
  
  // Remove all whitespace characters
  stripped = stripped
    .replace(/[\s\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]+/g, ' ')
    .trim();
  
  if (!stripped || stripped.length === 0) return 0;
  
  const words = stripped
    .split(/\s+/)
    .filter((word) => word && word.length > 0);
  
  return words.length;
}

// Test cases
const tests = [
  {
    name: "Simple text",
    input: "produk bagus murah meriah",
    expected: 4
  },
  {
    name: "Text with trailing newlines",
    input: "produk bagus murah meriah \n\n ",
    expected: 4
  },
  {
    name: "Text with multiple newlines",
    input: "produk bagus murah meriah\n\n\n",
    expected: 4
  },
  {
    name: "HTML paragraph",
    input: "<p>produk bagus murah meriah</p>",
    expected: 4
  },
  {
    name: "HTML with empty paragraphs (CKEditor style)",
    input: "<p>produk bagus murah meriah</p><p><br></p><p><br></p>",
    expected: 4
  },
  {
    name: "HTML with multiple empty paragraphs",
    input: "<p>produk bagus murah meriah</p><p>&nbsp;</p><p><br /></p><p></p>",
    expected: 4
  },
  {
    name: "Multiple paragraphs with content",
    input: "<p>produk bagus</p><p>murah meriah</p>",
    expected: 4
  },
  {
    name: "Text with HTML entities",
    input: "<p>produk&nbsp;bagus&nbsp;murah&nbsp;meriah</p>",
    expected: 4
  },
  {
    name: "Empty string",
    input: "",
    expected: 0
  },
  {
    name: "Only whitespace",
    input: "   \n\n\t  ",
    expected: 0
  },
  {
    name: "Only HTML tags",
    input: "<p></p><br><div></div>",
    expected: 0
  },
  {
    name: "Complex HTML with formatting",
    input: "<p><strong>produk</strong> <em>bagus</em></p><p>murah <u>meriah</u></p>",
    expected: 4
  },
  {
    name: "Text with line breaks",
    input: "produk\nbagus\nmurah\nmeriah",
    expected: 4
  },
  {
    name: "Text with tabs",
    input: "produk\tbagus\tmurah\tmeriah",
    expected: 4
  },
  {
    name: "Mixed whitespace",
    input: "produk  \n\n  bagus\t\tmurah    meriah",
    expected: 4
  }
];

console.log("=== Word Counter Test Results ===\n");

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  const result = countWords(test.input);
  const status = result === test.expected ? "✓ PASS" : "✗ FAIL";
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${index + 1}. ${test.name}`);
  console.log(`   Input: "${test.input.substring(0, 50)}${test.input.length > 50 ? '...' : ''}"`);
  console.log(`   Expected: ${test.expected}, Got: ${result} - ${status}\n`);
});

console.log("=== Summary ===");
console.log(`Total: ${tests.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
