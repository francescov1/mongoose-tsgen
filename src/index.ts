import {Command, flags} from '@oclif/command'

import cli from 'cli-ux';
import path from 'path';

import * as parser from "./helpers/parser";

class MongooseTsgen extends Command {
  static description = 'Generate an index.d.ts file containing Mongoose Schema interfaces. The specified root path ("." by default) will be searched recursively for a `models` folder, where your Mongoose Schemas should be exported from.'

  static flags = {
    help: flags.help({char: 'h'}),
    output: flags.string({ char: 'o', default: "./src/types/mongoose", description: "path of output index.d.ts file" }),
    "dry-run": flags.boolean({ char: 'd', default: false, description: "print output rather than writing to file" }),
    fresh: flags.boolean({ char: 'f', description: "fresh run, ignoring previously generated custom interfaces" }),
    js: flags.boolean({ char: 'j', default: false, description: "search for Mongoose schemas in Javascript files rather than in Typescript files"}),
    project: flags.string({ char: 'p', default: "./", description: "path of tsconfig.json or its root folder"})
  }
  
   // path of mongoose models folder
   static args = [
        {
            name: 'root_path',
            default: "."
        }
    ]

    async run() {
      cli.action.start('Generating mongoose typescript definitions')
      const { flags, args } = this.parse(MongooseTsgen)
      const outputFilePath = flags.output.endsWith("index.d.ts") ? flags.output : path.join(flags.output, "index.d.ts");

      const customInterfaces = flags.fresh ? "" : parser.loadCustomInterfaces(outputFilePath)

      let fullTemplate: string;
      try {
          const modelsPath = parser.findModelsPath(args.root_path, flags.js)
          
          let cleanupTs: any;
          if (!flags.js) {
              cleanupTs = parser.registerUserTs(flags.project);
          }
          const schemas = parser.loadSchemas(modelsPath);
          fullTemplate = parser.generateFileString({ schemas, customInterfaces });
          cleanupTs?.();
      }
      catch (error) {
          this.error(error)
      }

      cli.action.stop()

      if (flags["dry-run"]) {
          this.log("Dry run detected, generated interfaces will be printed to console:\n")
          this.log(fullTemplate)
      }
      else {
          this.log(`Writing interfaces to ${outputFilePath}`);
          parser.writeInterfaceToFile(outputFilePath, fullTemplate);
          this.log('Writing complete 🐒')
      }
  }
}

export = MongooseTsgen
