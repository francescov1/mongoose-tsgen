import mongoose from "mongoose";
import flatten, { unflatten } from "flat";
import glob from "glob";
import path from 'path';
import mkdirp from 'mkdirp';
import * as fs from 'fs';

const { ObjectId } = mongoose.Schema.Types;

const getSubDocName = (path: string, modelName = "") => {
    let subDocName = modelName +
      path
        .split(".")
        .map((p: string) => p[0].toUpperCase() + p.slice(1))
        .join("")
  
    if (subDocName.endsWith("s")) subDocName = subDocName.slice(0, -1);
    return subDocName;
  };
  
  const CUSTOM_INTERFACES_HEADER = "// ########################################## CUSTOM INTERFACES ########################################## //\n"
  const CUSTOM_INTERFACES_FOOTER = "// ######################################## END CUSTOM INTERFACES ######################################## //\n"

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
    line += val + ";";
    if (newline) line += "\n";
    return line;
  };
  
  const parseFunctions = (methodsOrStatics: any, prefix = "") => {
    let interfaceString = "";
  
    Object.keys(methodsOrStatics).forEach(key => {
      interfaceString += makeLine({ key, val: "Function", prefix });
    });
  
    return interfaceString;
  }

  export const parseSchema = ({ schema, modelName, addModel = false, header = "", footer = "", prefix = "" }: {schema: any, modelName?: string, addModel?: boolean, header?: string, footer?: string, prefix?: string}) => {
    let template = "";

    if (schema.childSchemas?.length > 0 && modelName) {
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
            
                const header = `\tinterface I${name} extends ${
                    isSubdocArray ? "mongoose.Types.Subdocument" : "Document"
                    } {\n`;

                childInterfaces += parseSchema({ schema: child.schema, modelName: name, header, footer: "\t}\n\n", prefix: "\t\t" });
            };
        };
        
        schema.childSchemas.forEach(processChild(modelName));
    
        const schemaTree = unflatten(flatSchemaTree);
        schema.tree = schemaTree;
        template += childInterfaces;
    }

    if (schema.statics && modelName && addModel) {
        template += `\texport interface I${modelName}Model extends Model<I${modelName}> {\n`;
        template += parseFunctions(schema.statics, "\t\t");
        template += "\t}\n\n";
    }

    template += header;

    const schemaTree = schema.tree;

    const parseKey = (key: string, val: any, prefix: string): string => {
      // if type is provided directly on property, expand it
      if ([String, Number, Boolean, Date, ObjectId].includes(val))
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

      if (val._inferredInterfaceName) {
        valType = val._inferredInterfaceName;
      }

      // check for virtual properties
      else if (val.path && val.path && val.setters && val.getters) {
        if (key === "id") {
          return "";
        }
  
        valType = "any";
        isOptional = false;
      } 
      else if (
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
        return "";
      } else if (val.ref) {
        let docRef: string;
  
        docRef = val.ref.replace(`'`, "");
        if (docRef.includes(".")) {
          docRef = getSubDocName(docRef);
        }
  
        // isArray check for second type option happens when adding line - but we do need to add the index
  
        valType = `I${docRef}["_id"] | I${docRef}`;
      }
      // NOTE: ideally we check actual type of value to ensure its Schema.Types.Mixed (the same way we do with Schema.Types.ObjectId), 
      // but this doesnt seem to work for some reason
      else if (val.schemaName === "Mixed" || val.type?.schemaName === "Mixed") {
        valType = "any";
      }   
      else {
        switch (val.type) {
          case String:
            if (val.enum?.length > 0) {
                valType = `"` + val.enum.join(`" | "`) + `"`;
            }
            else valType = "string";
            break;
          case Number:
            if (key !== "__v") valType = "number";
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
          // _id fields have type as a string
          case "ObjectId":
            return "";
          default:
            // if we dont find it, go one level deeper
            valType = parseSchema({ schema: { tree: val }, header: "{\n", footer: prefix + "}", prefix: prefix + "\t"});
            isOptional = false;
        }
      }
  
      if (!valType) return "";
  
      if (isArray)
        valType =
          `Types.${val._isSubdocArray ? "Document" : ""}Array<` + valType + ">";
  
      return makeLine({ key, val: valType, prefix, isOptional });
  }
  
    Object.keys(schemaTree).forEach((key: string) => {
      const val = schemaTree[key];
      template += parseKey(key, val, prefix);
    });
  
    if (schema.methods) {
      template += parseFunctions(schema.methods, prefix);
    }

    template += footer;
  
    return template;
  }

  export const loadCustomInterfaces = (filePath: string) => {
    try {
      const prevInterfaces = fs.readFileSync(filePath, "utf8");
      const customInterfaces = prevInterfaces?.split(CUSTOM_INTERFACES_HEADER).pop()?.split(CUSTOM_INTERFACES_FOOTER)[0];
      return customInterfaces;
    }
    catch (err) {
      console.log("Existing index.d.ts file not found. index.d.ts file will have an empty custom interface");
      return ""
    }
  }

  export const registerUserTs = (basePath: string): (() => void) | null => {
    let pathToSearch: string;
    if (basePath.endsWith("tsconfig.json")) pathToSearch = basePath;
    else pathToSearch = path.join(basePath, "**/tsconfig.json")

    const files = glob.sync(pathToSearch, { ignore: "**/node_modules/**"});

    if (files.length === 0)
      throw new Error(`No tsconfig.json file found at path "${basePath}"`);
    else if (files.length > 1)
      throw new Error(`Multiple tsconfig.json files found. Please specify a more specific project value. Paths found: ${files}`);
  
    const foundPath = path.join(process.cwd(), files[0]);
    require('ts-node').register({ transpileOnly: true, project: foundPath });

    // handle path aliases
    const tsConfig = require(foundPath);

    if (tsConfig.compilerOptions.paths) {
      const cleanup = require("tsconfig-paths").register({
        // Either absolute or relative path. If relative it's resolved to current working directory.
        baseUrl: "./",
        paths: tsConfig.compilerOptions.paths,
      });

      return cleanup;
    }

    return null;
  }

  export const findModelsPath = (basePath: string, useJs = false): string | string[] => {
    const extension = useJs ? "js" : "ts";

    let pathToSearch: string;
    if (basePath.endsWith("models") || basePath.endsWith("models/")) pathToSearch = path.join(basePath, `*.${extension}`);
    else if (basePath.endsWith(`index.${extension}`)) pathToSearch = basePath;
    else pathToSearch = path.join(basePath, `**/models/*.${extension}`)

    const files = glob.sync(pathToSearch, { ignore: "**/node_modules/**" })

    const mainExportFiles = files.filter((filename: string) => {
      return filename.endsWith(`models/index.${extension}`);
    })

    let modelsPath;
    if (mainExportFiles.length === 1) {
      modelsPath = path.join(process.cwd(), mainExportFiles[0]) as string;
    }
    else if (mainExportFiles.length > 1) {
      throw new Error(`Multiple paths found ending in "models/index.${extension}". Please specify a more specific path argument. Paths found: ${mainExportFiles}`)
    }
    // if no index.js file, then well require all model files individually
    else if (files.length > 0) {
      modelsPath = files.map((filename: string) => {
        // return path.join(basePath, filename);
        return path.join(process.cwd(), filename);
      }) as string[]
    }
    else {
      throw new Error(`No "/models" folder found at path "${basePath}"`)
    }

    return modelsPath
  }

  // TODO: test instanceof mongoose.Model
  // https://stackoverflow.com/questions/10827108/mongoose-check-if-object-is-mongoose-object
  const isSchema = (obj: any): boolean => {
    return obj?.modelName && obj?.schema;
  }

  export const generateFileString = ({
    modelsPath,
    customInterfaces = "",
  }: {
    modelsPath: string | string[];
    customInterfaces?: string;
  }) => {
    let fullTemplate = "// ######################################## THIS FILE WAS GENERATED BY MONGOOSE-TSGEN ######################################## //\n\n// NOTE: ANY CHANGES MADE WILL BE OVERWRITTEN ON SUBSEQUENT EXECUTIONS OF MONGOOSE-TSGEN.\n// TO ADD CUSTOM INTERFACES, DEFINE THEM IN THE `CUSTOM INTERFACES` BLOCK\n\n"
  
    fullTemplate += `import mongoose from "mongoose";\ntype ObjectId = mongoose.Types.ObjectId;\n\n`;
    fullTemplate += `declare module "mongoose" {\n\n`;
  
    let models: any;

    // if models folder does not export all schemas from an index.js file, we check each file's export object
    // for property names that would commonly export the schema. Here is the priority (using the filename as a starting point to determine model name): 
    // default export, model name (ie `User`), model name lowercase (ie `user`), collection name (ie `users`), collection name uppercased (ie `Users`).
    // If none of those exist, we assume the export object is set to the schema directly
    if (Array.isArray(modelsPath)) {
      models = modelsPath.map((singleModelPath: string) => {
        let exportedData;
        try {
          exportedData = require(singleModelPath);
        }
        catch (err) {
          if (err.message?.includes(`Cannot find module '${singleModelPath}'`))
              throw new Error(`Path ${singleModelPath} do not contain an exported schema. Please ensure these files export a Mongoose Schema (preferably default export).`);
          else throw err;
        }

        // if exported data has a default export, use that
        if (isSchema(exportedData.default)) return exportedData.default;
        if (isSchema(exportedData)) return exportedData;
        
        // if no default export, look for a property matching file name
        const pathComponents = singleModelPath.split("/");
        const filename = pathComponents[pathComponents.length - 1]
        const filenameRoot = filename?.split(".")?.[0]

        // capitalize first char
        const modelName = filenameRoot.charAt(0).toUpperCase() + filenameRoot.slice(1)
        const collectionNameUppercased = modelName + "s";

        let modelNameLowercase = filenameRoot.endsWith("s") ? filenameRoot.slice(0, -1) : filenameRoot
        modelNameLowercase = modelNameLowercase.toLowerCase();

        const collectionName = modelNameLowercase + "s";

        // check likely names that schema would be exported from
        if (isSchema(exportedData[modelName])) return exportedData[modelName];
        if (isSchema(exportedData[modelNameLowercase])) return exportedData[modelNameLowercase];
        if (isSchema(exportedData[collectionName])) return exportedData[collectionName];
        if (isSchema(exportedData[collectionNameUppercased])) return exportedData[collectionNameUppercased];
        
        // if none of those have it, check all properties
        for (const obj of Object.values(exportedData)) {
          if (isSchema(obj)) return obj;
        }

        throw new Error(`Path ${singleModelPath} do not contain an exported schema. Please ensure these files export a Mongoose Schema (preferably default export).`)
      });
    }
    else {
      try {
        models = require(modelsPath);
      }
      catch (err) {
        if (err.message?.includes("Cannot find module"))
            // TODO fix message for only index.d.ts
            throw new Error(`Path ${modelsPath} do not contain an exported schema. Please ensure these files export a Mongoose Schema (preferably default export).`);
        else throw err;
      }
    }
  
    Object.keys(models).forEach(modelKey => {
      // eslint-disable-next-line prefer-const
      let { modelName, schema } = (models as any)[modelKey];
        
      let interfaceStr = "";
  
      // rn passing modelName causes childSchemas to be processed
      interfaceStr += parseSchema({schema, modelName, addModel: true, header: `\texport interface I${modelName} extends Document {\n`, footer: "\t}\n\n", prefix: "\t\t"});
      fullTemplate += interfaceStr;
    });
  
    fullTemplate += CUSTOM_INTERFACES_HEADER
    fullTemplate += customInterfaces
    fullTemplate += CUSTOM_INTERFACES_FOOTER
    fullTemplate += "}\n";
  
    return fullTemplate;
  };

  export const writeInterfaceToFile = (outputFilePath: string, interfaceString: string) => {
    const outputPath = outputFilePath.split("/index.d.ts")[0]
    const outputPathComponents = outputPath.split("/");
    
    if (outputPathComponents[outputPathComponents.length - 1].includes(".")) {
      throw new Error("--output parameter must reference a folder path or an index.d.ts file.")
    }

    try {
      fs.writeFileSync(outputFilePath, interfaceString, "utf8");
    }
    catch (err) {
      if (err.message.includes("ENOENT: no such file or directory")) {
        console.log(`Path ${outputPath} not found; creating...`)
        mkdirp.sync(outputPath);
        console.log(`Attempting write index.d.ts file in new path`);
        fs.writeFileSync(outputFilePath, interfaceString, "utf8");
      }
    }
  }
