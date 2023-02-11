import { Command, Interfaces, Flags, Help } from "@oclif/core";

export const helpFlag = (opts: Partial<Interfaces.BooleanFlag<boolean>> = {}) => {
  return Flags.help({
    ...opts,
    parse: async (_, cmd) => {
      new Help(cmd.config).showCommandHelp(cmd.constructor as Command.Class);
      return cmd.exit(0) as never;
    }
  });
};
