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
export declare function sanitizeTypeIdentifier(input: string): string;
