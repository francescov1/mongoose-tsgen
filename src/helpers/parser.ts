import mongoose from "mongoose";
import flatten, { unflatten } from "flat";
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
  
  function parseFunctions(methodsOrStatics: any, prefix = "") {
    let template = "";
  
    Object.keys(methodsOrStatics).forEach(key => {
      template += makeLine({ key, val: "Function", prefix });
    });
  
    return template;
  }

  function parseSchema({schema, modelName, header = "", footer = "", prefix = ""}: {schema: any, modelName?: string, header?: string, footer?: string, prefix?: string}) {
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
        // return { schema, childInterfaces };

        template += childInterfaces;
        // schema = newSchema;
    }

    template += header;

    const schemaTree = schema.tree;
  
    Object.keys(schemaTree).forEach(key => {
      let val = schemaTree[key];
  
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
      } else if (val._isReplacedWithSchema) {
        // TODO: should header and footer both have prefix? or neither
        valType = parseSchema({ schema: val, header: "{\n", footer: prefix + "}", prefix: prefix + "\t" });
        isOptional = false;
      }
      // check for virtual properties
      else if (val.path && val.path && val.setters && val.getters) {
        if (key === "id") {
          return;
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
        return;
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
          // _id fields have type as a string
          case "ObjectId":
            return;
          // TODO: instead we should be calling the callback func to the Object.keys func call above here
          default:
            // if we dont find it, go one level deeper
            valType = parseSchema({ schema: { tree: val }, header: "{\n", footer: prefix + "}", prefix: prefix + "\t"});
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

    template += footer;
  
    return template;
  }

  export const loadCustomInterfaces = (filePath: string) => {
    try {
      const prevInterfaces = fs.readFileSync(filePath, "utf8");
      const customInterfaces = prevInterfaces?.split(CUSTOM_INTERFACES_HEADER).pop()?.split(CUSTOM_INTERFACES_FOOTER)[0];
      return customInterfaces;
    }
    catch (error) {
      return ""
    }
  }

  export const generateAllInterfaces = ({
    modelsPath,
    customInterfaces = "",
  }: {
    modelsPath: string;
    customInterfaces?: string;
  }) => {
    let fullTemplate = "// ######################################## THIS FILE WAS GENERATED BY MONGOOSE-TSGEN ######################################## //\n\n// NOTE: ANY CHANGES MADE WILL BE OVERWRITTEN ON SUBSEQUENT EXECUTIONS OF MONGOOSE-TSGEN.\n// TO ADD CUSTOM INTERFACES, DEFINE THEM IN THE `CUSTOM INTERFACES` BLOCK\n\n"
  
    fullTemplate += `import mongoose from "mongoose";\ntype ObjectId = mongoose.Types.ObjectId;\n\n`;
    fullTemplate += `declare module "mongoose" {\n\n`;
  
    let models: any;
    try {
      // eslint-disable-next-line node/no-missing-require
      models = require(modelsPath);
    }
    catch (error) {
      if (error.message?.includes("Cannot find module")) {
          throw new Error(`Path ${modelsPath} does not contain an exported module.`)
      }
      else {
          throw error;
      }
    }
  
    Object.keys(models).forEach(modelKey => {
      // eslint-disable-next-line prefer-const
      let { modelName, schema } = (models as any)[modelKey];
  
      let interfaceStr = "";
  
      // TODO: move to parseSchema
      if (schema.statics) {
        interfaceStr += `\texport interface I${modelName}Model extends Model<I${modelName}> {\n`;
        interfaceStr += parseFunctions(schema.statics, "\t\t");
        interfaceStr += "\t}\n\n";
      }
  
      // rn passing modelName causes childSchemas to be processed
      interfaceStr += parseSchema({schema, modelName, header: `\texport interface I${modelName} extends Document {\n`, footer: "\t}\n\n", prefix: "\t\t"});
      fullTemplate += interfaceStr;
    });
  
    fullTemplate += CUSTOM_INTERFACES_HEADER
    fullTemplate += customInterfaces
    fullTemplate += CUSTOM_INTERFACES_FOOTER
    fullTemplate += "}\n";
  
    return fullTemplate;
  };
