export const convertKeyValueToLine = ({
  key,
  valueType,
  isOptional = false,
  newline = true
}: {
  key: string;
  valueType: string;
  isOptional?: boolean;
  newline?: boolean;
}) => {
  let line = "";

  if (key) {
    // If the key contains any special characters, we need to wrap it in quotes
    line += /^\w*$/.test(key) ? key : JSON.stringify(key);

    if (isOptional) line += "?";
    line += ": ";
  }

  line += valueType + ";";
  if (newline) line += "\n";
  return line;
};
