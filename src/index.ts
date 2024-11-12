import { Args, Command, Config, Interfaces, Flags, ux } from "@oclif/core";

import * as tsReader from "./helpers/tsReader";
import * as paths from "./helpers/paths";
import * as formatter from "./helpers/formatter";
import * as generator from "./helpers/generator";
import * as cli from "./helpers/cli";
import * as types from "./types";
import { loadModels } from "./parser/utils";

declare namespace MongooseTsgen {
  export type CliFlagConfig = Interfaces.InferredFlags<typeof MongooseTsgen["flags"]>;
  export type FlagConfig = types.Normalize<
    Omit<CliFlagConfig, "config" | "help" | "json" | "output" | "project"> & {
      output: string;
      project: string;
    }
  >;

  export type ArgConfig = types.Normalize<Interfaces.InferredArgs<typeof MongooseTsgen["args"]>>;

  export interface Config {
    flags: FlagConfig;
    args: ArgConfig;
  }
}

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
    recursive: Flags.boolean({
      char: "r",
      description: "Include files in nested subdirectories when searching for models",
      default: false
    })
  };

  // path of mongoose models folder
  static args = {
    model_path: Args.string()
  };

  constructor(argv: string[], config = new Config({ root: __dirname })) {
    super(argv, config);
  }

  private async getConfig() {
    const { flags: cliFlags, args } = await this.parse(MongooseTsgen);

    const configFileFlags: Partial<MongooseTsgen.FlagConfig> = paths.getConfigFromFile(
      cliFlags.config
    );

    // remove "config" since its only used to grab the config file
    delete cliFlags.config;

    // we cant set flags as `default` using the official oclif method since the defaults would overwrite flags provided in the config file.
    // instead, well just set "output" and "project" as default manually if theyre still missing after merge with configFile.
    configFileFlags.output = configFileFlags?.output ?? "./src/interfaces";
    configFileFlags.project = configFileFlags?.project ?? "./";

    return {
      flags: {
        ...configFileFlags,
        ...cliFlags
      } as MongooseTsgen.FlagConfig,
      args
    };
  }

  async run() {
    const config = await this.getConfig();
    const { flags } = config;

    if (flags.debug) {
      this.log("Debug mode enabled");
      process.env.DEBUG = "1";
    }

    ux.action.start("Generating mongoose typescript definitions");

    try {
      const { genFilePath, sourceFile } = await this.generateDefinitions(config);
      ux.action.stop();
      if (flags["dry-run"]) {
        this.log("Dry run detected, generated interfaces will be printed to console:\n");
        this.log(sourceFile.getFullText());
      } else {
        this.log(`Writing interfaces to ${genFilePath}`);

        generator.saveFile({ genFilePath, sourceFile });

        if (!flags["no-format"]) await formatter.format([genFilePath]);
        this.log("Writing complete 🐒");
        process.exit();
      }
    } catch (error) {
      this.error(error as Error, { exit: 1 });
    }
  }

  async generateDefinitions(config: MongooseTsgen.Config) {
    const { flags, args } = config;
    const modelsPaths = paths.getModelsPaths(args.model_path, flags.recursive);

    const cleanupTs = tsReader.registerUserTs(flags.project);

    const genFilePath = paths.cleanOutputPath(flags.output);
    let sourceFile = generator.createSourceFile(genFilePath);

    const noMongoose = flags["no-mongoose"];
    const datesAsStrings = flags["dates-as-strings"];
    sourceFile = generator.generateTypes({
      modelsPaths,
      sourceFile,
      imports: flags.imports,
      noMongoose,
      datesAsStrings
    });

    // only get model types (methods, statics, queries & virtuals) if user does not specify `noMongoose`,
    if (noMongoose) {
      this.log("Skipping TS model parsing and sourceFile model type replacement");
    } else {
      const modelTypes = tsReader.getModelTypes(modelsPaths);
      const models = loadModels(modelsPaths);
      generator.replaceModelTypes(sourceFile, modelTypes, models);

      // add populate helpers
      await generator.addPopulateHelpers(sourceFile);
      // add mongoose.Query.populate overloads
      if (!flags["no-populate-overload"]) {
        await generator.overloadQueryPopulate(sourceFile);
      }
    }

    cleanupTs?.();
    return { genFilePath, sourceFile };
  }
}

export = MongooseTsgen;
