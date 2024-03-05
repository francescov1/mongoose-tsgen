import mongoose from "mongoose";
import _ from "lodash";
import * as templates from "./templates";

// TODO: Handle statics method issue

// TODO: Switch to using HydratedDocument, https://mongoosejs.com/docs/migrating_to_7.html. Also update query helpers https://mongoosejs.com/docs/typescript/query-helpers.html

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

const formatKeyEntry = ({
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
    // If the key contains any special characters, we need to wrap it in quotes
    line += /^\w*$/.test(key) ? key : JSON.stringify(key);

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
    type = `(this: ${modelName}Query${
      params?.length > 0 ? ", " + params : ""
    }) => ${modelName}Query`;
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

export const convertToSingular = (str: string) => {
  if (str.endsWith("sses")) {
    // https://github.com/francescov1/mongoose-tsgen/issues/79
    return str.slice(0, -2);
  }

  if (str.endsWith("s") && !str.endsWith("ss")) {
    return str.slice(0, -1);
  }

  return str;
};

const getSubDocName = (path: string, modelName = "") => {
  const subDocName =
    modelName +
    path
      .split(".")
      .map((p: string) => p[0].toUpperCase() + p.slice(1))
      .join("");

  return convertToSingular(subDocName);
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
    interfaceString += formatKeyEntry({ key, val: type });
  });

  return interfaceString;
};

const isMapType = (val: any): boolean => {
  return val === Map || val === mongoose.Schema.Types.Map;
};

const BASE_TYPES = new Set([
  Object,
  String,
  "String",
  Number,
  "Number",
  Boolean,
  "Boolean",
  Date,
  "Date",
  Buffer,
  "Buffer",
  Map,
  mongoose.Schema.Types.String,
  mongoose.Schema.Types.Number,
  mongoose.Schema.Types.Boolean,
  mongoose.Schema.Types.Date,
  mongoose.Schema.Types.Map,
  mongoose.Types.Buffer,
  mongoose.Schema.Types.Buffer,
  mongoose.Schema.Types.ObjectId,
  mongoose.Types.ObjectId,
  mongoose.Types.Decimal128,
  mongoose.Schema.Types.Decimal128
]);

export const convertBaseTypeToTs = (
  key: string,
  val: any,
  isDocument: boolean,
  noMongoose = false
) => {
  // NOTE: ideally we check actual type of value to ensure its Schema.Types.Mixed (the same way we do with Schema.Types.ObjectId),
  // but this doesnt seem to work for some reason
  // {} is treated as Mixed
  if (
    val.schemaName === "Mixed" ||
    val.type?.schemaName === "Mixed" ||
    (val.constructor === Object && _.isEmpty(val)) ||
    (val.type?.constructor === Object && _.isEmpty(val.type))
  ) {
    return "any";
  }

  const isMap = isMapType(val.type);
  const mongooseType = isMap ? val.of : val.type;

  // If the user specifies a map with no type, we set to any
  if (isMap && !mongooseType) {
    return "any";
  }

  switch (mongooseType) {
    case mongoose.Schema.Types.String:
    case String:
    case "String":
      if (val.enum?.length > 0) {
        const includesNull = val.enum.includes(null);
        const enumValues = val.enum.filter((str: string) => str !== null);
        let enumString = `"` + enumValues.join(`" | "`) + `"`;
        if (includesNull) enumString += ` | null`;

        return enumString;
      }

      return "string";
    case mongoose.Schema.Types.Number:
    case Number:
    case "Number":
      return key === "__v" ? undefined : "number";
    case mongoose.Schema.Types.Decimal128:
    case mongoose.Types.Decimal128:
      return isDocument ? "mongoose.Types.Decimal128" : "number";
    case mongoose.Schema.Types.Boolean:
    case Boolean:
    case "Boolean":
      return "boolean";
    case mongoose.Schema.Types.Date:
    case Date:
    case "Date":
      return "Date";
    case mongoose.Types.Buffer:
    case mongoose.Schema.Types.Buffer:
    case Buffer:
    case "Buffer":
      return isDocument ? "mongoose.Types.Buffer" : "Buffer";
    case mongoose.Schema.Types.ObjectId:
    case mongoose.Types.ObjectId:
    case "ObjectId": // _id fields have type set to the string "ObjectId"
      return noMongoose ? "string" : "mongoose.Types.ObjectId";
    case Object:
      return "any";
    default:
      if (_.isPlainObject(val)) {
        // This indicates to the parent func that this type is nested and we need to traverse one level deeper
        return "{}";
      }

      console.warn(
        `parser: Unknown type detected for field "${key}", using type "any". Please create an issue in the mongoose-tsgen GitHub repo to have this case handled.`
      );

      return "any";
  }
};

const addAliaseTypesToTree = ({ schema }: { schema: any }) => {
  Object.entries(schema.aliases).forEach(([alias, path]: [string, any]) => {
    _.set(schema.tree, `${alias}._aliasRootField`, _.get(schema.tree, path));
  });
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
  let childInterfaces = "";

  // NOTE: This is a hack for Schema maps. For some reason, when a map of a schema exists, the schema is not included
  // in childSchemas. So we add it manually and add a few extra properties to ensure the processChild works correctly.
  for (const [path, type] of Object.entries(schema.paths)) {
    // This check tells us that this is a map of a separate schema
    if ((type as any)?.$isSchemaMap && (type as any)?.$__schemaType.schema) {
      const childSchema = (type as any).$__schemaType;
      childSchema.model = {
        path: path,
        $isArraySubdocument:
          childSchema.Constructor?.$isArraySubdocument ??
          childSchema.$isMongooseDocumentArray ??
          false,
        $isSchemaMap: true
      };
      schema.childSchemas.push(childSchema);
    }
  }

  const processChild = (rootPath: string) => {
    return (child: any) => {
      const path = child.model.path;
      const isSubdocArray = child.model.$isArraySubdocument;
      const isSchemaMap = child.model.$isSchemaMap ?? false;
      let name = getSubDocName(path, rootPath);

      // // If a user names a field "model", it will conflict with the model name, so we need to rename it.
      // // https://github.com/francescov1/mongoose-tsgen/issues/128
      if (name === `${modelName}Model`) {
        name += "Field";
      }

      child.schema._isReplacedWithSchema = true;
      child.schema._inferredInterfaceName = name;
      child.schema._isSubdocArray = isSubdocArray;
      child.schema._isSchemaMap = isSchemaMap;

      const requiredValuePath = `${path}.required`;
      if (_.get(schema.tree, requiredValuePath) === true) {
        child.schema.required = true;
      }

      /**
       * for subdocument arrays, mongoose supports passing `default: undefined` to disable the default empty array created.
       * here we indicate this on the child schema using _isDefaultSetToUndefined so that the parser properly sets the `isOptional` flag
       */
      if (isSubdocArray) {
        const defaultValuePath = `${path}.default`;
        if (
          _.has(schema.tree, defaultValuePath) &&
          _.get(schema.tree, defaultValuePath) === undefined
        ) {
          child.schema._isDefaultSetToUndefined = true;
        }
      }

      if (isSchemaMap) {
        _.set(schema.tree, path, { type: Map, of: isSubdocArray ? [child.schema] : child.schema });
      } else if (isSubdocArray) {
        _.set(schema.tree, path, [child.schema]);
      } else {
        _.set(schema.tree, path, child.schema);
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
          header += "mongoose.Types.Subdocument";
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
  return childInterfaces;
};

export const getParseKeyFn = (
  isDocument: boolean,
  shouldLeanIncludeVirtuals: boolean,
  noMongoose: boolean
) => {
  return (key: string, valOriginal: any): string => {
    // if the value is an object, we need to deepClone it to ensure changes to `val` aren't persisted in parent function
    let val = _.isPlainObject(valOriginal) ? _.cloneDeep(valOriginal) : valOriginal;
    let valType: string | undefined;

    const requiredValue = Array.isArray(val.required) ? val.required[0] : val.required;
    let isOptional = requiredValue !== true;

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

      // Array optionality is a bit overcomplicated, see https://github.com/francescov1/mongoose-tsgen/issues/124.
      // If user explicitely sets required: false, we override our logic and assume they know best.
      if (requiredValue === false) {
        isOptional = true;
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
      } else if (val.index === "2dsphere") {
        // 2dsphere index is a special edge case which does not have an inherent default value of []
        isOptional = true;
      } else if ("default" in val && val.default === undefined && requiredValue !== true) {
        // If default: undefined, it means the field should not default with an empty array.
        isOptional = true;
      } else {
        isOptional = isArrayOuterDefaultSetToUndefined;
      }

      // Array optionality is a bit overcomplicated, see https://github.com/francescov1/mongoose-tsgen/issues/124.
      // If user explicitely sets required: false, we override our logic and assume they know best.
      if (requiredValue === false) {
        isOptional = true;
      }
    }

    if (BASE_TYPES.has(val)) val = { type: val };

    const isMap = isMapType(val?.type);

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

      // Array optionality is a bit overcomplicated, see https://github.com/francescov1/mongoose-tsgen/issues/124.
      // If user explicitely sets required: false, we override our logic and assume they know best.
      if (requiredValue === false) {
        isOptional = true;
      }
    } else if (val._inferredInterfaceName) {
      valType = val._inferredInterfaceName + (isDocument ? "Document" : "");
    } else if (isMap && val.of?._inferredInterfaceName) {
      valType = val.of._inferredInterfaceName + (isDocument ? "Document" : "");
      isOptional = val.of.required !== true;
    } else if (val.path && val.path && val.setters && val.getters) {
      // check for virtual properties
      // skip id property
      if (key === "id") return "";

      // if not lean doc and lean docs shouldnt include virtuals, ignore entry
      if (!isDocument && !shouldLeanIncludeVirtuals) return "";

      // If the val has the _aliasRootField property, it means this field is an alias for another field, and _aliasRootField contains the other field's type.
      // So we can re-call this function using _aliasRootField.
      if (val._aliasRootField) {
        const parseKey = getParseKeyFn(isDocument, shouldLeanIncludeVirtuals, noMongoose);
        return parseKey(key, val._aliasRootField);
      }

      valType = "any";
      isOptional = false;
    } else if (
      key &&
      [
        "get",
        "set",
        "schemaName",
        "_defaultCaster",
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

      const populatedType = isDocument ? `${docRef}Document` : docRef;
      valType = val.autopopulate ? // support for mongoose-autopopulate
        populatedType :
        `${populatedType}["_id"] | ${populatedType}`;
    } else {
      // _ids are always required
      if (key === "_id") isOptional = false;

      const convertedType = convertBaseTypeToTs(key, val, isDocument, noMongoose);

      // TODO: we should detect nested types from unknown types and handle differently.
      // Currently, if we get an unknown type (ie not handled) then users run into a "max callstack exceeded error"
      if (convertedType === "{}") {
        const nestedSchema = _.cloneDeep(val);
        valType = "{\n";

        const parseKey = getParseKeyFn(isDocument, shouldLeanIncludeVirtuals, noMongoose);
        Object.keys(nestedSchema).forEach((key: string) => {
          valType += parseKey(key, nestedSchema[key]);
        });

        valType += "}";
        isOptional = false;
      } else {
        valType = convertedType;
      }
    }

    if (!valType) return "";

    if (isMap && !isMapOfArray)
      valType = isDocument ? `mongoose.Types.Map<${valType}>` : `Map<string, ${valType}>`;

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

    return formatKeyEntry({ key, val: valType, isOptional });
  };
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

  if (schema.childSchemas && modelName) {
    template += parseChildSchemas({ schema, isDocument, noMongoose, modelName });
  }

  if (!_.isEmpty(schema.aliases) && modelName) {
    addAliaseTypesToTree({ schema });
  }

  template += header;

  const schemaTree = schema.tree;
  const parseKey = getParseKeyFn(isDocument, shouldLeanIncludeVirtuals, noMongoose);

  Object.keys(schemaTree).forEach((key: string) => {
    const val = schemaTree[key];
    template += parseKey(key, val);
  });

  template += footer;

  return template;
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
      const error = (err as Error).message?.includes(`Cannot find module '${singleModelPath}'`) ?
        new Error(`Could not find a module at path ${singleModelPath}.`) :
        err;
      throw error;
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
