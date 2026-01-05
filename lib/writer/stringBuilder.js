import { tsReservedKeywords } from "../helpers/constants";
export const convertKeyValueToLine = ({ key, valueType, isOptional = false, newline = true }) => {
    let line = "";
    if (key) {
        // Check if the key is a valid TypeScript identifier:
        // 1. Must start with a letter, underscore, or dollar sign
        // 2. Can contain letters, numbers, underscores, or dollar signs
        // 3. Cannot be a reserved keyword
        const isValidTsIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) && !tsReservedKeywords.includes(key);
        line += isValidTsIdentifier ? key : JSON.stringify(key);
        if (isOptional)
            line += "?";
        line += ": ";
    }
    line += valueType + ";";
    if (newline)
        line += "\n";
    return line;
};
