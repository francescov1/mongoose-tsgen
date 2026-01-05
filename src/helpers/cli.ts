import { Interfaces, Flags } from "@oclif/core";

export const helpFlag = (opts: Partial<Interfaces.BooleanFlag<boolean>> = {}) => {
  return Flags.boolean({
    description: "Show CLI help.",
    ...opts,
    parse: async () => {
      // Just return true - oclif will handle the help display
      return true;
    }
  });
};
