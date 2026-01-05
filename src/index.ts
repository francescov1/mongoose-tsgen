import { Args, Command, Config, Interfaces, Flags, ux } from "@oclif/core";

import * as tsReader from "./helpers/tsReader";
import * as paths from "./helpers/paths";
import * as formatter from "./helpers/formatter";
import * as generator from "./helpers/generator";
import * as cli from "./helpers/cli";
import * as types from "./types";
import { loadModels } from "./parser/utils";

import { fileURLToPath } from "url";
import { dirname } from "path";

// At the top level of your file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace MongooseTsgen {
  export type FlagConfig = types.Normalize<
    Omit<Interfaces.InferredFlags<typeof MongooseTsgen["flags"]>, "help">
  >;
  export type ArgConfig = types.Normalize<Interfaces.InferredArgs<typeof MongooseTsgen["args"]>>;

  export interface Config {
    flags: FlagConfig;
    args: ArgConfig;
  }
}

// eslint-disable-next-line no-redeclare
class MongooseTsgen extends Command {
  static id = ".";

  static description =
    "Generate a Typescript file containing Mongoose Schema typings.\nSpecify the directory of your Mongoose model definitions using `MODEL_PATH`. If left blank, all sub-directories will be searched for `models/*.ts` (ignores `index.ts` files). Files found are expected to export a Mongoose model.";

  static flags = {
    config: Flags.string({
      char: "c",
      description:
        "[default: ./] Path of `mtgen.config.json` or its root folder. CLI flag options will take precendence over settings in `mtgen.config.json`."
    }),
    "dry-run": Flags.boolean({
      char: "d",
      description: "Print output rather than writing to file."
    }),
    help: cli.helpFlag({
      char: "h"
    }),
    imports: Flags.string({
      char: "i",
      description:
        "Custom import statements to add to the output file. Useful if you use third-party types in your mongoose schema definitions. For multiple imports, specify this flag more than once.",
      multiple: true
    }),
    "no-format": Flags.boolean({
      description: "Disable formatting generated files with prettier."
    }),
    output: Flags.string({
      char: "o",
      description:
        "[default: ./src/interfaces] Path of output file to write generated typings. If a folder path is passed, the generator will create a `mongoose.gen.ts` file in the specified folder."
    }),
    project: Flags.string({
      char: "p",
      description: "[default: ./] Path of `tsconfig.json` or its root folder."
    }),
    debug: Flags.boolean({
      description: "Print debug information if anything isn't working"
    }),
    "no-mongoose": Flags.boolean({
      description:
        "Don't generate types that reference mongoose (i.e. documents). Replace ObjectId with string."
    }),
    "dates-as-strings": Flags.boolean({
      description:
        "Dates will be typed as strings. Useful for types returned to a frontend by API requests."
    }),
    "no-populate-overload": Flags.boolean({
      description:
        "Disable augmenting mongoose with Query.populate overloads (the overloads narrow the return type of populated documents queries)."
    }),
    "no-experimental-resolver": Flags.boolean({
      description:
        "Turn off experimentalResolver of the ts-node. It would help to resolve conflicting issue with some external modules."
    })
  };

  // path of mongoose models folder
  static args = {
    model_path: Args.string()
  };

  constructor(argv: string[] = [], config = new Config({ root: __dirname })) {
    super(argv, config);
  }

  private async getConfig(
    customConfig: MongooseTsgen.Config
  ): Promise<
    MongooseTsgen.Config & { flags: MongooseTsgen.FlagConfig & { output: string; project: string } }
  > {
    const configFileFlags: Partial<MongooseTsgen.FlagConfig> = paths.getConfigFromFile(
      customConfig.flags.config
    );

    return {
      flags: {
        ...configFileFlags,
        ...customConfig.flags,

        // We dont need the config field anymore now that we've merged the config file here
        config: undefined,

        // we cant set flags as `default` using the official oclif method since the defaults would overwrite flags provided in the config file.
        // instead, well just set "output" and "project" as default manually if theyre still missing after merge with configFile.
        output: configFileFlags?.output ?? customConfig.flags.output ?? "./src/interfaces",
        project: configFileFlags?.project ?? customConfig.flags.project ?? "./"
      },
      args: {
        ...configFileFlags,
        ...customConfig.args
      }
    };
  }

  async run() {
    const customConfig = await this.parse(MongooseTsgen);
    try {
      await this.generateDefinitions(customConfig);
    } catch (error) {
      this.error(error as Error, { exit: 1 });
    }
  }

  async generateDefinitions(customConfig: MongooseTsgen.Config) {
    ux.action.start("Generating mongoose typescript definitions");

    const { flags, args } = await this.getConfig(customConfig);

    if (flags.debug) {
      this.log("Debug mode enabled");
      process.env.DEBUG = "1";
    }

    const modelsPaths = paths.getModelsPaths(args.model_path);

    const cleanupTs = await tsReader.registerUserTs(flags.project);

    const generatedFilePath = paths.cleanOutputPath(flags.output);
    let sourceFile = generator.createSourceFile(generatedFilePath);

    const noMongoose = flags["no-mongoose"];
    const datesAsStrings = flags["dates-as-strings"];
    sourceFile = await generator.generateTypes({
      modelsPaths,
      sourceFile,
      imports: flags.imports,
      noMongoose,
      datesAsStrings
    });

    const modelTypes = tsReader.getModelTypes(modelsPaths);
    const models = loadModels(modelsPaths);
    generator.replaceModelTypes(sourceFile, modelTypes, await models);

    // only get model types (methods, statics, queries & virtuals) if user does not specify `noMongoose`,
    if (noMongoose) {
      this.log("Skipping TS model parsing and sourceFile model type replacement");
    } else {
      // add populate helpers
      await generator.addPopulateHelpers(sourceFile);
      // add mongoose.Query.populate overloads
      if (!flags["no-populate-overload"]) {
        await generator.overloadQueryPopulate(sourceFile);
      }
    }

    cleanupTs?.();

    if (flags["dry-run"]) {
      this.log("Dry run detected, generated interfaces will be printed to console:\n");
      this.log(sourceFile.getFullText());
    } else {
      this.log(`Writing interfaces to ${generatedFilePath}`);

      generator.saveFile({ generatedFilePath, sourceFile });

      if (!flags["no-format"]) await formatter.format([generatedFilePath]);
      this.log("Writing complete 🐒");
    }

    ux.action.stop();

    return { generatedFilePath, sourceFile };
  }
}

export const run = async (): Promise<void> => {
  return await MongooseTsgen.run(process.argv.slice(2));
};

export default MongooseTsgen;
