import { Command, flags } from '@oclif/command'
import mongoose from "mongoose";
import * as fs from 'fs';
import flatten, { unflatten } from "flat";

const { ObjectId, Mixed } = mongoose.Schema.Types;

// TODO ( last things )
// TODO: subsub docs working, enum strings, function params and return, pendingCharge

// resource: https://medium.com/@tomanagle/strongly-typed-models-with-mongoose-and-typescript-7bc2f7197722

const getSubDocName = (path: string, modelName = "") => {
  let subDocName = modelName +
    path
      .split(".")
      .map((p: string) => p[0].toUpperCase() + p.slice(1))
      .join("")

  if (subDocName.endsWith("s")) subDocName = subDocName.slice(0, -1);
  return subDocName;
};

const makeLine = ({
  key,
  val,
  prefix,
  isOptional = false,
  newline = true,
}: {
  key: string;
  val: string;
  prefix: string;
  isOptional?: boolean;
  newline?: boolean;
}) => {
  let line = prefix ? prefix : "";

  if (key) {
    line += key;
    if (isOptional) line += "?";
    line += ": ";
  }
  line += val;
  if (newline) line += "\n";
  return line;
};

function parseFunctions(methodsOrStatics: any, prefix = "") {
  let template = "";

  Object.keys(methodsOrStatics).forEach(key => {
    template += makeLine({ key, val: "Function", prefix });
  });

  return template;
}

function parseSchema(schema: any, prefix = "") {
  const schemaTree = schema.tree;

  let template = "";

  Object.keys(schemaTree).forEach(key => {
    let val = schemaTree[key];

    // if type is provided directly on property, expand it
    if ([String, Number, Boolean, Date, Mixed, ObjectId].includes(val))
      val = { type: val, required: false };

    let valType;
    let isOptional = !val.required;

    let isArray = Array.isArray(val);
    // this means its a subdoc
    if (isArray) {
      isOptional = false;
      val = val[0];
    } else if (Array.isArray(val.type)) {
      val.type = val.type[0];
      isArray = true;
    }

    // if (isArray && !val._isSubdocArray) {
    //   console.log("IS ARRAY NOT SUB");
    //   console.log(key + ": ", val);
    // }

    if (val._inferredInterfaceName) {
      valType = val._inferredInterfaceName;
    } else if (val._isReplacedWithSchema) {
      // console.log("IS REPLACED BY SCHEMA (SHOULD NOT GET HERE)")
      // console.log(key + ": ", val)
      valType = "{\n";

      valType += parseSchema(val, prefix + "\t");
      // +"\n";

      valType += prefix + "}";
      isOptional = false;
    }
    // check for virtual properties
    else if (val.path && val.path && val.setters && val.getters) {
      // else if (val instanceof mongoose.VirtualType) {
      if (key === "id") {
        return;
        // valType = "string";
      }

      valType = "any";
      isOptional = false;
    } else if (
      key &&
      [
        "get",
        "set",
        "schemaName",
        "defaultOptions",
        "_checkRequired",
        "_cast",
        "checkRequired",
        "cast",
        "__v",
      ].includes(key)
    ) {
      return;
    } else if (val.ref) {
      let docRef: string;

      docRef = val.ref.replace(`'`, "");
      if (docRef.includes(".")) {
        docRef = getSubDocName(docRef);
      }

      // isArray check for second type option happens when adding line - but we do need to add the index

      valType = `I${docRef}["_id"] | I${docRef}`;
    } else {
      switch (val.type) {
        case String:
          valType = "string";
          break;
        case Number:
          if (key === "__v") return;
          valType = "number";
          break;
        case Boolean:
          valType = "boolean";
          break;
        case Date:
          valType = "Date";
          break;
        case ObjectId:
          valType = "ObjectId";
          break;
        case Mixed:
          valType = "any";
          break;
        // _id fields have type as a string
        case "ObjectId":
          return;
        // TODO: instead we should be calling the callback func to the Object.keys func call above here
        default:
          // if we dont find it, go one level deeper
          valType = "{\n";

          // console.log(key + ": ", val)
          valType += parseSchema({ tree: val }, prefix + "\t");
          // +"\n";

          valType += prefix + "}";
          isOptional = false;
          break;
      }
    }

    if (!valType) return;

    if (isArray)
      valType =
        `Types.${val._isSubdocArray ? "Document" : ""}Array<` + valType + ">";

    template += makeLine({ key, val: valType, prefix, isOptional });
  });

  if (schema.methods) {
    template += parseFunctions(schema.methods, prefix);
  }

  if (schema.statics) {
    template;
  }

  return template;
}

function parseChildSchemas(schema: any, modelName: string) {
  const flatSchemaTree: any = flatten(schema.tree, { safe: true });
  let childInterfaces = "";

  const processChild = (rootPath: string) => {
    return (child: any) => {
      const path = child.model.path;
      const isSubdocArray = child.model.$isArraySubdocument;

      const name = getSubDocName(path, rootPath);

      child.schema._isReplacedWithSchema = true;
      child.schema._inferredInterfaceName = `I${name}`;
      child.schema._isSubdocArray = isSubdocArray;
      flatSchemaTree[path] = isSubdocArray ? [child.schema] : child.schema;

      childInterfaces += `\tinterface I${name} extends ${
        isSubdocArray ? "mongoose.Types.Subdocument" : "Document"
      } {\n`;
      childInterfaces += parseSchema(child.schema, "\t\t");
      childInterfaces += "\t}\n\n";

      if (child.schema.childSchemas) {
        // console.log("Children", child.schema.childSchemas);
        child.schema.childSchemas.forEach(processChild(name));
      }
    };
  };

  schema.childSchemas.forEach(processChild(modelName));

  const schemaTree = unflatten(flatSchemaTree);
  schema.tree = schemaTree;
  return { schema, childInterfaces };
}

export const generateAllInterfaces = ({
  exceptions = [],
  modelsPath,
  outputPath,
}: {
  exceptions?: string[];
  modelsPath: string;
  outputPath: string;
}) => {
  let fullTemplate = `import mongoose from "mongoose";\ntype ObjectId = mongoose.Types.ObjectId;\n\n`;
  fullTemplate += `declare module "mongoose" {\n\n`;

  let models: any;
  try {
    // eslint-disable-next-line node/no-missing-require
    models = require(modelsPath);
  }
  catch (error) {
    if (error.message?.includes("Cannot find module")) console.error(`Path ${modelsPath} does not contain an exported module.`)
    else console.error(error)

    return;
  }

  Object.keys(models).forEach(modelKey => {
    // eslint-disable-next-line prefer-const
    let { modelName, schema } = (models as any)[modelKey];

    if (exceptions.includes(modelName)) return;

    let interfaceStr = "";
    if (schema.childSchemas.length > 0) {
      interfaceStr += `\t// ${modelName} Child Schemas\n\n`;

      const { childInterfaces, schema: newSchema } = parseChildSchemas(
        schema,
        modelName
      );
      interfaceStr += childInterfaces;
      schema = newSchema;
    }

    if (schema.statics) {
      interfaceStr += `\texport interface I${modelName}Model extends Model<I${modelName}> {\n`;
      interfaceStr += parseFunctions(schema.statics, "\t\t");
      interfaceStr += "\t}\n\n";
    }

    interfaceStr += `\texport interface I${modelName} extends Document {\n`;
    interfaceStr += parseSchema(schema, "\t\t");
    interfaceStr += "\t}\n\n";

    fullTemplate += interfaceStr;
  });

  fullTemplate += "// ########################################## CUSTOM INTERFACES ########################################## //\n"
  // TODO: grab current customs and inject here
  fullTemplate += "// ######################################## END CUSTOM INTERFACES ######################################## //\n"
  fullTemplate += "}\n";

  fs.writeFileSync(outputPath, fullTemplate, "utf8");
};

export default class Gen extends Command {
    static description = 'generate mongoose type definitions'

    static flags = {
        help: flags.help({char: 'h'}),
        output: flags.string({char: 'o', default: "./index.d.ts"}),
        // removes custom interfaces
        fresh: flags.boolean({char: 'f'}),
    }

    // path of mongoose models
    // TODO: if not absolute path, search in sub dirs
    static args = [
        {
            name: 'path',
            // default: '../../../backend/src/models',
            default: `${process.cwd()}/src/models`,
        },
    ]

    async run() {
        const { flags, args } = this.parse(Gen)
        this.parse(Gen)
        this.log('Generating mongoose typescript definitions...')

        generateAllInterfaces({ exceptions: [], modelsPath: args.path, outputPath: flags.output })

        this.log('Done 🐒')
    }
}
