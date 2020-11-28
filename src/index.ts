import { Command, flags } from "@oclif/command";
import cli from "cli-ux";

import * as parser from "./helpers/parser";
import * as tsReader from "./helpers/tsReader";
import * as paths from "./helpers/paths";
import * as formatter from "./helpers/formatter";
class MongooseTsgen extends Command {
  static description =
    'Generate a Typescript file containing Mongoose Schema interfaces. The specified root path ("." by default) will be searched recursively for a `models` folder, where your Mongoose Schemas should be exported from.';

  static flags = {
    help: flags.help({ char: "h" }),
    output: flags.string({
      char: "o",
      default: "./src/interfaces",
      description:
        "path of output file containing generated interfaces. If a folder path is passed, the generator will default to creating an `mongoose.gen.ts` file in the specified folder."
    }),
    "dry-run": flags.boolean({
      char: "d",
      default: false,
      description: "print output rather than writing to file"
    }),
    "no-func-types": flags.boolean({
      default: false,
      description: "disable using TS compiler API for method, static and query typings"
    }),
    "no-format": flags.boolean({
      default: false,
      description: "disable formatting generated files with prettier and fixing with eslint"
    }),
    js: flags.boolean({
      char: "j",
      default: false,
      description: "search for Mongoose schemas in Javascript files rather than in Typescript files"
    }),
    project: flags.string({
      char: "p",
      default: "./",
      description: "path of tsconfig.json or its root folder"
    }),
    module: flags.boolean({
      default: false,
      description: 'generate interfaces in a `declare module "mongoose"` block'
    })
  };

  // path of mongoose models folder
  static args = [
    {
      name: "root_path",
      default: "."
    }
  ];

  async run() {
    const { flags, args } = this.parse(MongooseTsgen);
    if (flags.help as any) return;

    cli.action.start("Generating mongoose typescript definitions");

    if (!flags.module) {
      const pathSegments = args.output?.split?.("/");
      // if no output path (used to default to /src/types/mongoose/index.d.ts) or if output path is a folder path,  warn that this library does not add typescript interfaces as declared modules by default (now requires --module flag)
      if (
        !pathSegments ||
        pathSegments[pathSegments.length - 1].match(/[a-zA-Z0-9_-]*\.[A-Za-z]{2,3}/)
      ) {
        this.warn(
          "⚠ Breaking change in update to v5.1.0 - Run `npx mtgen --help` for more details ⚠\n* Generated types and interfaces are now exported from the generated file, rather than augmented on to the mongoose module. Use `--module` for previous behaviour.\n* The default value for the --output flag has changed."
        );
      }
    }
    let interfaceString: string;
    try {
      const extension = flags.js ? "js" : "ts";
      const modelsPaths = paths.getFullModelsPaths(args.root_path, extension);

      let cleanupTs: any;
      if (!flags.js) {
        cleanupTs = parser.registerUserTs(flags.project);

        if (!flags["no-func-types"]) {
          const functionTypes = tsReader.getFunctionTypes(modelsPaths);
          parser.setFunctionTypes(functionTypes);
        }
      }

      const schemas = parser.loadSchemas(modelsPaths);

      const { genFilePath, customFilePath } = paths.cleanOutputPath(flags.output);
      interfaceString = parser.generateFileString({
        schemas,
        isModule: flags.module,
        customFilePath
      });
      cleanupTs?.();

      cli.action.stop();
      if (flags["dry-run"]) {
        this.log("Dry run detected, generated interfaces will be printed to console:\n");
        this.log(interfaceString);
      } else {
        this.log(`Writing interfaces to ${genFilePath}`);

        parser.writeOrCreateInterfaceFiles({
          genFilePath,
          customFilePath,
          interfaceString,
          isModule: flags.module
        });
        if (!flags["no-format"]) await formatter.format([genFilePath, customFilePath]);
        this.log("Writing complete 🐒");
        process.exit();
      }
    } catch (error) {
      this.error(error);
    }
  }
}

export = MongooseTsgen;
