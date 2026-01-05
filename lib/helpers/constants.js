/**
 * TypeScript keywords categorized by their usage context. (where I got the list)
 * @see {@link https://github.com/microsoft/TypeScript/issues/2536 TS Reserved Words}
 */
/**
 * Regular JavaScript/TypeScript reserved words that cannot be used as identifiers in any context.
 * These are the core keywords that form the basic syntax and control flow of the language.
 * Using these as identifiers will always result in a syntax error.
 *
 * @example
 * // These will cause syntax errors:
 * type if = string;    // Error: 'if' is a reserved word
 * interface class {}   // Error: 'class' is a reserved word
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
];
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
];
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
];
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
];
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
