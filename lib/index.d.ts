import { Command, Config, Interfaces } from "@oclif/core";
import * as types from "./types";
declare namespace MongooseTsgen {
    type FlagConfig = types.Normalize<Omit<Interfaces.InferredFlags<typeof MongooseTsgen["flags"]>, "help">>;
    type ArgConfig = types.Normalize<Interfaces.InferredArgs<typeof MongooseTsgen["args"]>>;
    interface Config {
        flags: FlagConfig;
        args: ArgConfig;
    }
}
declare class MongooseTsgen extends Command {
    static id: string;
    static description: string;
    static flags: {
        config: Interfaces.OptionFlag<string | undefined, Interfaces.CustomOptions>;
        "dry-run": Interfaces.BooleanFlag<boolean>;
        help: Interfaces.BooleanFlag<boolean>;
        imports: Interfaces.OptionFlag<string[] | undefined, Interfaces.CustomOptions>;
        "no-format": Interfaces.BooleanFlag<boolean>;
        output: Interfaces.OptionFlag<string | undefined, Interfaces.CustomOptions>;
        project: Interfaces.OptionFlag<string | undefined, Interfaces.CustomOptions>;
        debug: Interfaces.BooleanFlag<boolean>;
        "no-mongoose": Interfaces.BooleanFlag<boolean>;
        "dates-as-strings": Interfaces.BooleanFlag<boolean>;
        "no-populate-overload": Interfaces.BooleanFlag<boolean>;
        "no-experimental-resolver": Interfaces.BooleanFlag<boolean>;
    };
    static args: {
        model_path: Interfaces.Arg<string | undefined, Record<string, unknown>>;
    };
    constructor(argv?: string[], config?: Config);
    private getConfig;
    run(): Promise<void>;
    generateDefinitions(customConfig: MongooseTsgen.Config): Promise<{
        generatedFilePath: string;
        sourceFile: import("ts-morph").SourceFile;
    }>;
}
export declare const run: () => Promise<void>;
export default MongooseTsgen;
