import { TS_IDENTIFIER_SEPARATOR_REGEX, TS_INVALID_CHAR_REGEX, TS_INVALID_START_REGEX, tsReservedKeywords } from "./constants";
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
export function sanitizeTypeIdentifier(input) {
    // Input validation
    if (typeof input !== "string") {
        throw new TypeError(`Model name must be a string, received: ${typeof input}`);
    }
    const trimmedInput = input.trim();
    if (!trimmedInput) {
        throw new Error("Type identifier cannot be empty");
    }
    // Check if input is a reserved keyword
    if (tsReservedKeywords.includes(trimmedInput)) {
        throw new Error(`Invalid model name: "${trimmedInput}" - cannot use TypeScript reserved keyword`);
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
        throw new Error(`Invalid model name: "${trimmedInput}" - results in invalid TypeScript identifier ""`);
    }
    return sanitizedParts.join("");
}
