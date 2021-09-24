import mongoose from "mongoose";
import flatten, { unflatten } from "flat";
import _ from "lodash";

import * as templates from "./templates";

export const getShouldLeanIncludeVirtuals = (schema: any) => {
  // Check the toObject options to determine if virtual property should be included.
  // See https://mongoosejs.com/docs/api.html#document_Document-toObject for toObject option documentation.
  const toObjectOptions = schema.options?.toObject ?? {};
  if (
    (!toObjectOptions.virtuals && !toObjectOptions.getters) ||
    (toObjectOptions.virtuals === false && toObjectOptions.getters === true)
  )
    return false;
  return true;
};

const makeLine = ({
  key,
  val,
  isOptional = false,
  newline = true
}: {
  key: string;
  val: string;
  isOptional?: boolean;
  newline?: boolean;
}) => {
  let line = "";

  if (key) {
    line += key;
    if (isOptional) line += "?";
    line += ": ";
  }
  line += val + ";";
  if (newline) line += "\n";
  return line;
};

export const convertFuncSignatureToType = (
  funcSignature: string,
  funcType: "methods" | "statics" | "query",
  modelName: string
) => {
  const [, params, returnType] = funcSignature.match(/\((?:this: \w*(?:, )?)?(.*)\) => (.*)/) ?? [];
  let type;
  if (funcType === "query") {
    type = `(${params}) => mongoose.Query<any, ${modelName}Document, ${modelName}Queries> & ${modelName}Queries`;
  } else if (funcType === "methods") {
    type = `(this: ${modelName}Document${params?.length > 0 ? ", " + params : ""}) => ${
      returnType ?? "any"
    }`;
  } else {
    type = `(this: ${modelName}Model${params?.length > 0 ? ", " + params : ""}) => ${
      returnType ?? "any"
    }`;
  }
  return type;
};

const getSubDocName = (path: string, modelName = "") => {
  let subDocName =
    modelName +
    path
      .split(".")
      .map((p: string) => p[0].toUpperCase() + p.slice(1))
      .join("");

  if (subDocName.endsWith("s") && !subDocName.endsWith("ss")) subDocName = subDocName.slice(0, -1);
  return subDocName;
};

// TODO: this could be moved to the generator too, not really relevant to parsing
export const parseFunctions = (
  funcs: any,
  modelName: string,
  funcType: "methods" | "statics" | "query"
) => {
  let interfaceString = "";

  Object.keys(funcs).forEach(key => {
    if (["initializeTimestamps"].includes(key)) return;

    const funcSignature = "(...args: any[]) => any";
    const type = convertFuncSignatureToType(funcSignature, funcType, modelName);
    interfaceString += makeLine({ key, val: type });
  });

  return interfaceString;
};

export const convertBaseTypeToTs = (
  key: string,
  val: any,
  isDocument: boolean,
  noMongoose = false
) => {
  let valType: string | undefined;
  // NOTE: ideally we check actual type of value to ensure its Schema.Types.Mixed (the same way we do with Schema.Types.ObjectId),
  // but this doesnt seem to work for some reason
  // {} is treated as Mixed
  if (
    val.schemaName === "Mixed" ||
    val.type?.schemaName === "Mixed" ||
    (val.constructor === Object && _.isEmpty(val)) ||
    (val.type?.constructor === Object && _.isEmpty(val.type))
  ) {
    valType = "any";
  } else {
    const mongooseType = val.type === Map ? val.of : val.type;
    switch (mongooseType) {
      case String:
      case "String":
        if (val.enum?.length > 0) {
          valType = `"` + val.enum.join(`" | "`) + `"`;
        } else valType = "string";
        break;
      case Number:
      case "Number":
        if (key !== "__v") valType = "number";
        break;
      case mongoose.Schema.Types.Decimal128:
      case mongoose.Types.Decimal128:
        valType = isDocument ? "mongoose.Types.Decimal128" : "number";
        break;
      case Boolean:
        valType = "boolean";
        break;
      case Date:
        valType = "Date";
        break;
      case mongoose.Types.Buffer:
      case mongoose.Schema.Types.Buffer:
      case Buffer:
      case "Buffer":
        valType = "Buffer";
        break;
      case mongoose.Schema.Types.ObjectId:
      case mongoose.Types.ObjectId:
      case "ObjectId": // _id fields have type set to the string "ObjectId"
        valType = noMongoose ? "string" : "mongoose.Types.ObjectId";
        break;
      case Object:
        valType = "any";
        break;
      default:
        // this indicates to the parent func that this type is nested and we need to traverse one level deeper
        valType = "{}";
        break;
    }
  }

  return valType;
};

const parseChildSchemas = ({
  schema,
  isDocument,
  noMongoose,
  modelName
}: {
  schema: any;
  isDocument: boolean;
  noMongoose: boolean;
  modelName: string;
}) => {
  const flatSchemaTree: any = flatten(schema.tree, { safe: true });
  let childInterfaces = "";

  const processChild = (rootPath: string) => {
    return (child: any) => {
      const path = child.model.path;
      const isSubdocArray = child.model.$isArraySubdocument;
      const name = getSubDocName(path, rootPath);

      child.schema._isReplacedWithSchema = true;
      child.schema._inferredInterfaceName = name;
      child.schema._isSubdocArray = isSubdocArray;

      const requiredValuePath = `${path}.required`;
      if (requiredValuePath in flatSchemaTree && flatSchemaTree[requiredValuePath] === true) {
        child.schema.required = true;
      }

      /**
       * for subdocument arrays, mongoose supports passing `default: undefined` to disable the default empty array created.
       * here we indicate this on the child schema using _isDefaultSetToUndefined so that the parser properly sets the `isOptional` flag
       */
      if (isSubdocArray) {
        const defaultValuePath = `${path}.default`;
        if (defaultValuePath in flatSchemaTree && flatSchemaTree[defaultValuePath] === undefined) {
          child.schema._isDefaultSetToUndefined = true;
        }
      }
      flatSchemaTree[path] = isSubdocArray ? [child.schema] : child.schema;

      // since we now will process this child by using the schema, we can remove any further nested properties in flatSchemaTree
      for (const key in flatSchemaTree) {
        if (key.startsWith(path) && key.length > path.length) {
          delete flatSchemaTree[key];
        }
      }

      let header = "";
      if (isDocument)
        header += isSubdocArray ?
          templates.getSubdocumentDocs(rootPath, path) :
          templates.getDocumentDocs(rootPath);
      else header += templates.getLeanDocs(rootPath, name);

      header += "\nexport ";

      if (isDocument) {
        header += `type ${name}Document = `;
        if (isSubdocArray) {
          header += "mongoose.Types.EmbeddedDocument";
        }
        // not sure why schema doesnt have `tree` property for typings
        else {
          let _idType;
          // get type of _id to pass to mongoose.Document
          // this is likely unecessary, since non-subdocs are not allowed to have option _id: false (https://mongoosejs.com/docs/guide.html#_id)
          if ((schema as any).tree._id)
            _idType = convertBaseTypeToTs("_id", (schema as any).tree._id, true, noMongoose);

          // TODO: this should extend `${name}Methods` like normal docs, but generator will only have methods, statics, etc. under the model name, not the subdoc model name
          // so after this is generated, we should do a pass and see if there are any child schemas that have non-subdoc definitions.
          // or could just wait until we dont need duplicate subdoc versions of docs (use the same one for both embedded doc and non-subdoc)
          header += `mongoose.Document<${_idType ?? "never"}>`;
        }

        header += " & {\n";
      } else header += `type ${name} = {\n`;

      // TODO: this should not circularly call parseSchema
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      childInterfaces += parseSchema({
        schema: child.schema,
        modelName: name,
        header,
        isDocument,
        footer: `}\n\n`,
        noMongoose,
        shouldLeanIncludeVirtuals: getShouldLeanIncludeVirtuals(child.schema)
      });
    };
  };

  schema.childSchemas.forEach(processChild(modelName));

  const schemaTree = unflatten(flatSchemaTree);
  schema.tree = schemaTree;

  return childInterfaces;
};

export const parseSchema = ({
  schema: schemaOriginal,
  modelName,
  isDocument,
  header = "",
  footer = "",
  noMongoose = false,
  shouldLeanIncludeVirtuals
}: {
  schema: any;
  modelName?: string;
  isDocument: boolean;
  header?: string;
  footer?: string;
  noMongoose?: boolean;
  shouldLeanIncludeVirtuals: boolean;
}) => {
  let template = "";
  const schema = _.cloneDeep(schemaOriginal);

  if (schema.childSchemas?.length > 0 && modelName) {
    template += parseChildSchemas({ schema, isDocument, noMongoose, modelName });
  }

  template += header;

  const schemaTree = schema.tree;

  // parseSchema and getParseKeyFn call each other - both are exported consts
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const parseKey = getParseKeyFn(isDocument, shouldLeanIncludeVirtuals, noMongoose);

  Object.keys(schemaTree).forEach((key: string) => {
    const val = schemaTree[key];
    template += parseKey(key, val);
  });

  template += footer;

  return template;
};

export const getParseKeyFn = (
  isDocument: boolean,
  shouldLeanIncludeVirtuals: boolean,
  noMongoose: boolean
) => {
  return (key: string, valOriginal: any): string => {
    // if the value is an object, we need to deepClone it to ensure changes to `val` aren't persisted in parent function
    let val = _.isPlainObject(valOriginal) ? _.cloneDeep(valOriginal) : valOriginal;

    let valType;
    let isOptional = !val.required;

    let isArray = Array.isArray(val);
    let isUntypedArray = false;
    let isMapOfArray = false;
    /**
     * If _isDefaultSetToUndefined is set, it means this is a subdoc array with `default: undefined`, indicating that mongoose will not automatically
     * assign an empty array to the value. Therefore, isOptional = true. In other cases, isOptional is false since the field will be automatically initialized
     * with an empty array
     */
    const isArrayOuterDefaultSetToUndefined = Boolean(val._isDefaultSetToUndefined);

    // this means its a subdoc
    if (isArray) {
      val = val[0];
      if (val === undefined && val?.type === undefined) {
        isUntypedArray = true;
        isOptional = isArrayOuterDefaultSetToUndefined ?? false;
      } else {
        isOptional = val._isDefaultSetToUndefined ?? false;
      }
    } else if (Array.isArray(val.type)) {
      val.type = val.type[0];
      isArray = true;

      if (val.type === undefined) {
        isUntypedArray = true;
        isOptional = isArrayOuterDefaultSetToUndefined ?? false;
      } else if (val.type.type) {
        /**
         * Arrays can also take the following format.
         * This is used when validation needs to be done on both the element itself and the full array.
         * This format implies `required: true`.
         *
         * ```
         * friends: {
         *   type: [
         *     {
         *       type: Schema.Types.ObjectId,
         *       ref: "User",
         *       validate: [
         *         function(userId: mongoose.Types.ObjectId) { return !this.friends.includes(userId); }
         *       ]
         *     }
         *   ],
         *   validate: [function(val) { return val.length <= 3; } ]
         * }
         * ```
         */
        if (val.type.ref) val.ref = val.type.ref;
        val.type = val.type.type;
        isOptional = false;
      } else {
        // 2dsphere index is a special edge case which does not have an inherent default value of []
        isOptional = val.index === "2dsphere" ? true : isArrayOuterDefaultSetToUndefined;
      }
    }

    // TODO: this list should be combined with the convertBaseTypeToTs somehow so that we dont duplicate types
    // if type is provided directly on property, expand it
    if (
      [
        Object,
        String,
        "String",
        Number,
        "Number",
        Boolean,
        Date,
        Buffer,
        "Buffer",
        mongoose.Types.Buffer,
        mongoose.Schema.Types.Buffer,
        mongoose.Schema.Types.ObjectId,
        mongoose.Types.ObjectId,
        mongoose.Types.Decimal128,
        mongoose.Schema.Types.Decimal128
      ].includes(val)
    )
      val = { type: val };

    const isMap = val?.type === Map;

    // // handles maps of arrays as per https://github.com/francescov1/mongoose-tsgen/issues/63
    if (isMap && Array.isArray(val.of)) {
      val.of = val.of[0];
      isMapOfArray = true;
      isArray = true;
    }

    if (val === Array || val?.type === Array || isUntypedArray) {
      // treat Array constructor and [] as an Array<Mixed>
      isArray = true;
      valType = "any";
      isOptional = isArrayOuterDefaultSetToUndefined ?? false;
    } else if (val._inferredInterfaceName) {
      valType = val._inferredInterfaceName + (isDocument ? "Document" : "");
    } else if (val.path && val.path && val.setters && val.getters) {
      // check for virtual properties
      // skip id property
      if (key === "id") return "";

      // if not lean doc and lean docs shouldnt include virtuals, ignore entry
      if (!isDocument && !shouldLeanIncludeVirtuals) return "";

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
        "__v"
      ].includes(key)
    ) {
      return "";
    } else if (val.ref) {
      let docRef: string;

      docRef = val.ref.replace(`'`, "");
      if (docRef.includes(".")) {
        docRef = getSubDocName(docRef);
      }

      valType = isDocument ?
        `${docRef}Document["_id"] | ${docRef}Document` :
        `${docRef}["_id"] | ${docRef}`;
    } else {
      // _ids are always required
      if (key === "_id") isOptional = false;
      const convertedType = convertBaseTypeToTs(key, val, isDocument, noMongoose);

      if (convertedType === "{}") {
        // if we dont find it, go one level deeper
        // here we pass isNestedObject: true to prevent `export ` from being prepended to the header
        valType = parseSchema({
          schema: { tree: val },
          header: "{\n",
          isDocument,
          footer: "}",
          noMongoose,
          shouldLeanIncludeVirtuals
        });

        isOptional = false;
      } else {
        valType = convertedType;
      }
    }

    if (!valType) return "";

    if (isMap && !isMapOfArray)
      valType = isDocument ? `mongoose.Types.Map<${valType}>` : `Map<string, ${valType}>`;

    if (valType === "Buffer" && isDocument) valType = "mongoose.Types.Buffer";

    if (isArray) {
      if (isDocument)
        valType = `mongoose.Types.${val._isSubdocArray ? "Document" : ""}Array<` + valType + ">";
      else {
        // if valType includes a space, likely means its a union type (ie "number | string") so lets wrap it in brackets when adding the array to the type
        if (valType.includes(" ")) valType = `(${valType})`;
        valType = `${valType}[]`;
      }
    }

    // a little messy, but if we have a map of arrays, we need to wrap the value after adding the array info
    if (isMap && isMapOfArray)
      valType = isDocument ? `mongoose.Types.Map<${valType}>` : `Map<string, ${valType}>`;

    return makeLine({ key, val: valType, isOptional });
  };
};

interface LoadedSchemas {
  [modelName: string]: mongoose.Schema;
}

export const loadSchemas = (modelsPaths: string[]) => {
  const schemas: LoadedSchemas = {};

  const checkAndRegisterModel = (obj: any): boolean => {
    if (!obj?.modelName || !obj?.schema) return false;
    schemas[obj.modelName] = obj.schema;
    return true;
  };

  modelsPaths.forEach((singleModelPath: string) => {
    let exportedData;
    try {
      exportedData = require(singleModelPath);
    } catch (err) {
      if ((err as Error).message?.includes(`Cannot find module '${singleModelPath}'`))
        throw new Error(`Could not find a module at path ${singleModelPath}.`);
      else throw err;
    }

    const prevSchemaCount = Object.keys(schemas).length;

    // NOTE: This was used to find the most likely names of the model based on the filename, and only check those properties for mongoose models. Now, we check all properties, but this could be used as a "strict" option down the road.

    // we check each file's export object for property names that would commonly export the schema.
    // Here is the priority (using the filename as a starting point to determine model name):
    // default export, model name (ie `User`), model name lowercase (ie `user`), collection name (ie `users`), collection name uppercased (ie `Users`).
    // If none of those exist, we assume the export object is set to the schema directly
    /*
    // if exported data has a default export, use that
    if (checkAndRegisterModel(exportedData.default) || checkAndRegisterModel(exportedData)) return;

    // if no default export, look for a property matching file name
    const { name: filenameRoot } = path.parse(singleModelPath);

    // capitalize first char
    const modelName = filenameRoot.charAt(0).toUpperCase() + filenameRoot.slice(1);
    const collectionNameUppercased = modelName + "s";

    let modelNameLowercase = filenameRoot.endsWith("s") ? filenameRoot.slice(0, -1) : filenameRoot;
    modelNameLowercase = modelNameLowercase.toLowerCase();

    const collectionName = modelNameLowercase + "s";

    // check likely names that schema would be exported from
    if (
      checkAndRegisterModel(exportedData[modelName]) ||
      checkAndRegisterModel(exportedData[modelNameLowercase]) ||
      checkAndRegisterModel(exportedData[collectionName]) ||
      checkAndRegisterModel(exportedData[collectionNameUppercased])
    )
      return;
    */

    // check if exported object is a model
    checkAndRegisterModel(exportedData);

    // iterate through each exported property, check if val is a schema and add to schemas if so
    for (const obj of Object.values(exportedData)) {
      checkAndRegisterModel(obj);
    }

    const schemaCount = Object.keys(schemas).length - prevSchemaCount;
    if (schemaCount === 0) {
      console.warn(
        `A module was found at ${singleModelPath}, but no new exported models were found. If this file contains a Mongoose schema, ensure it is exported and its name does not conflict with others.`
      );
    }
  });

  return schemas;
};
