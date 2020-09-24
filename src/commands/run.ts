import { Command, flags } from '@oclif/command'
import cli from 'cli-ux';
import * as fs from 'fs';
import path from 'path';

import * as parser from "../helpers/parser";

export default class Run extends Command {
    static description = 'Generate an index.d.ts file containing Mongoose Schema interfaces. If no `path` argument is provided, the tool will expect all models to be exported from `./src/models` by default.'

    // TODO: if src/types/mongoose doesnt exist, default -o to ./
    static flags = {
        help: flags.help({char: 'h'}),
        output: flags.string({ char: 'o', default: "./src/types/mongoose", description: "Path of output index.d.ts file" }),
        "dry-run": flags.boolean({ char: 'd', default: false, description: "Print output rather than writing to file" }),
        fresh: flags.boolean({ char: 'f', description: "Fresh run, ignoring previously generated custom interfaces" }),
    }

    // path of mongoose models
    // TODO: if not absolute path, search in sub dirs
    // - as first version, simply look for models folder
    // TODO: once we do the todo above, we could change the first arg to be output path instead
    static args = [
        {
            name: 'path',
            default: path.join(process.cwd(), "./src/models/index.ts"),
        },
    ]

    async run() {
        cli.action.start('Generating mongoose typescript definitions')
        const { flags, args } = this.parse(Run)

        const ouputFilePath = path.join(flags.output, "index.d.ts");

        const customInterfaces = flags.fresh ? "" : parser.loadCustomInterfaces(ouputFilePath)

        let fullTemplate: string;
        try {
            fullTemplate = parser.generateAllInterfaces({ modelsPath: args.path, customInterfaces })
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
            this.log(`Writing interfaces to ${ouputFilePath}`);
            fs.writeFileSync(ouputFilePath, fullTemplate, "utf8");
            this.log('Writing complete 🐒')
        }
    }
}
