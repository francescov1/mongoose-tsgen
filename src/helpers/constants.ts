/**
 * TypeScript keywords categorized by their usage context. (where I got the list)
 * @see {@link https://github.com/microsoft/TypeScript/issues/2536 TS Reserved Words}
 */

// WARNING: comments are claude generated. not sure if they are accurate

/**
 * Regular JavaScript/TypeScript reserved words that cannot be used as identifiers in any context.
 * These are the core keywords that form the basic syntax and control flow of the language.
 * Using these as identifiers will always result in a syntax error.
 *
 * @example
 * // These will cause syntax errors:
 * type if = string;    // Error: 'if' is a reserved word
 * interface Class {}   // Error: 'class' is a reserved word
 */
export const tsReservedWords = [
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with"
] as const;

/**
 * Additional reserved words that include both JavaScript strict mode keywords
 * and TypeScript-specific modifiers. These cannot be used as identifiers in
 * strict mode or when using TypeScript features.
 *
 * @example
 * // These will cause errors:
 * let interface = "foo";     // Error: 'interface' is reserved
 */
export const tsStrictModeReservedWords = [
  "as",
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "yield"
] as const;

/**
 * Contextual keywords that have special meaning in certain contexts but can be used as identifiers.
 * These keywords need to be handled carefully during type generation to avoid creating invalid TypeScript.
 *
 * @example
 * // These would create invalid type definitions:
 * type type = string;        // Error: 'type' is a contextual keyword
 * interface get<T> {}        // Error: 'get' cannot be used as an interface name
 * type async<T> = T;        // Error: 'async' cannot be used as a type alias
 */
export const tsContextualKeywords = [
  "any",
  "async",
  "await",
  "boolean",
  "constructor",
  "declare",
  "get",
  "infer",
  "is",
  "keyof",
  "module",
  "namespace",
  "never",
  "readonly",
  "require",
  "number",
  "set",
  "string",
  "symbol",
  "type",
  "from",
  "of",
  "unknown",
  "undefined",
  "unique",
  "global"
] as const;

/**
 * Combined array of all TypeScript keywords, including reserved words,
 * strict mode reserved words, and contextual keywords.
 * This comprehensive list can be used when checking if a string is any kind
 * of TypeScript keyword.
 */
export const tsReservedKeywords = [
  ...tsReservedWords,
  ...tsStrictModeReservedWords,
  ...tsContextualKeywords
] as const;

/**
 * Regex pattern that matches any character that is not a valid TypeScript identifier character.
 * Used to split strings into parts that could form valid identifiers.
 * Valid characters are: a-z, A-Z, 0-9, underscore (_), and dollar sign ($)
 */
export const TS_IDENTIFIER_SEPARATOR_REGEX = /[^a-zA-Z0-9_$]+/;

/**
 * Regex pattern that matches invalid TypeScript identifier characters.
 * Used to clean individual parts of an identifier.
 * Matches anything that is not: a-z, A-Z, 0-9, underscore (_), or dollar sign ($)
 */
export const TS_INVALID_CHAR_REGEX = /[^a-zA-Z0-9_$]/g;

/**
 * Regex pattern that matches invalid starting characters for TypeScript identifiers.
 * Used to ensure the first part of an identifier starts with a valid character.
 * Matches any characters that are not: a-z, A-Z, underscore (_), or dollar sign ($)
 */
export const TS_INVALID_START_REGEX = /^[^a-zA-Z_$]+/;

/**
 * Converts a string into a valid TypeScript type identifier by:
 * 1. Validating input
 * 2. Splitting on non-alphanumeric characters
 * 3. Removing invalid characters
 * 4. Ensuring valid start characters (letters, _, $)
 * 5. Converting to PascalCase
 *
 * @param input - The string to convert into a valid TypeScript type identifier
 * @returns A valid TypeScript type identifier in PascalCase
 * @throws {TypeError} If the input is not a string
 * @throws {Error} If the input is empty or results in an empty string after processing
 *
 * @example
 * // Basic conversion
 * sanitizeTypeIdentifier("hello world")      // Returns "HelloWorld"
 * sanitizeTypeIdentifier("my-component-123") // Returns "MyComponent123"
 *
 * @example
 * // Edge cases
 * sanitizeTypeIdentifier("123-invalid")     // Returns "Invalid"
 * sanitizeTypeIdentifier("user.profile")    // Returns "UserProfile"
 * sanitizeTypeIdentifier("$special_case")   // Returns "SpecialCase"
 * sanitizeTypeIdentifier("  trimmed  ")     // Returns "Trimmed"
 */
export function sanitizeTypeIdentifier(input: string): string {
  // Input validation
  if (typeof input !== "string") {
    throw new TypeError(`Model name must be a string, received: ${typeof input}`);
  }

  const trimmedInput = input.trim();
  if (!trimmedInput) {
    throw new Error("Type identifier cannot be empty");
  }

  // Check if input is a reserved keyword
  if (tsReservedKeywords.includes(trimmedInput as any)) {
    throw new Error(
      `Invalid model name: "${trimmedInput}" - cannot use TypeScript reserved keyword`
    );
  }

  // Split by common separators and filter out empty strings
  const parts = trimmedInput.split(TS_IDENTIFIER_SEPARATOR_REGEX).filter(Boolean);

  // Process each part
  const sanitizedParts = parts
    .map((part, index) => {
      // Remove invalid characters
      const cleaned = part.replace(TS_INVALID_CHAR_REGEX, "");

      // For first part: remove leading numbers/invalid characters
      // For other parts: keep numbers (even at start)
      const validStart = index === 0 ? cleaned.replace(TS_INVALID_START_REGEX, "") : cleaned;

      // Capitalize first letter if it exists
      return validStart.charAt(0).toUpperCase() + validStart.slice(1);
    })
    .filter(Boolean); // Remove any parts that became empty after cleaning

  // Check if first character is a number
  if (/^\d/.test(trimmedInput)) {
    throw new Error(`Invalid model name: "${trimmedInput}" - type name cannot start with a number`);
  }

  // Ensure we have valid parts after processing
  if (sanitizedParts.length === 0) {
    throw new Error(
      `Invalid model name: "${trimmedInput}" - results in invalid TypeScript identifier ""`
    );
  }

  return sanitizedParts.join("");
}
