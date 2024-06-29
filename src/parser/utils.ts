import mongoose from "mongoose";
import _ from "lodash";
import { MongooseSchema } from "./types";

export const getSubdocName = (path: string, modelName = "") => {
  let subDocName =
    modelName +
    path
      .split(".")
      .map((p: string) => p[0].toUpperCase() + p.slice(1))
      .join("");

  subDocName = convertToSingular(subDocName);

  // // If a user names a field "model", it will conflict with the model name, so we need to rename it.
  // // https://github.com/francescov1/mongoose-tsgen/issues/128
  if (subDocName === `${modelName}Model`) {
    // NOTE: This wasnt behavior for usage from getParseKeyFn, but it should probably be here anyways.
    // If causes issues, add a param to control it
    subDocName += "Field";
  }

  return subDocName;
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

export const isMapType = (val: any): boolean => {
  return val === Map || val === mongoose.Schema.Types.Map;
};

export const convertBaseTypeToTs = ({
  key,
  val,
  isDocument,
  noMongoose,
  datesAsStrings
}: {
  key: string;
  val: any;
  isDocument: boolean;
  noMongoose: boolean;
  datesAsStrings: boolean;
}) => {
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
      // NOTE: This handles the `enum` field being both an array of values and being a TS enum (so that we can support this feature: https://github.com/Automattic/mongoose/issues/9546)
      if (val.enum && Object.values(val.enum)?.length > 0) {
        // User passed a typescript enum to the enum property of the String field config.
        const enumValues = Object.values(val.enum);

        const includesNull = enumValues.includes(null);
        const enumValuesWithoutNull = enumValues.filter(str => str !== null);
        let enumTypscriptType = `"` + enumValuesWithoutNull.join(`" | "`) + `"`;
        if (includesNull) enumTypscriptType += ` | null`;
        return enumTypscriptType;
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
      return datesAsStrings ? "string" : "Date";
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

export const BASE_TYPES = new Set([
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

// TODO: This should not be part of the parser, should be part of the writer
export const formatKeyEntry = ({
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

export const loadSchemasFromModelPath = (
  modelsPaths: string[]
): { schema: MongooseSchema; model: any; modelName: string }[] => {
  const schemas: { schema: MongooseSchema; model: any; modelName: string }[] = [];

  const checkAndRegisterModel = (obj: any): boolean => {
    if (!obj?.modelName || !obj?.schema) return false;
    schemas.push({ schema: obj.schema, model: obj, modelName: obj.modelName });
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

    const prevSchemaCount = schemas.length;

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

    const schemaCount = schemas.length - prevSchemaCount;
    if (schemaCount === 0) {
      console.warn(
        `A module was found at ${singleModelPath}, but no new exported models were found. If this file contains a Mongoose schema, ensure it is exported and its name does not conflict with others.`
      );
    }
  });

  return schemas;
};

// TODO: This is one of the most complex functions, and should be refactored.

export const getParseKeyFn = ({
  isDocument,
  shouldLeanIncludeVirtuals,
  noMongoose,
  datesAsStrings
}: {
  isDocument: boolean;
  shouldLeanIncludeVirtuals: boolean;
  noMongoose: boolean;
  datesAsStrings: boolean;
}) => {
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

    // if (key === "subdocWithoutDefault") {
    //   console.log("\n\nisArrayOuterDefaultSetToUndefined - ", isArrayOuterDefaultSetToUndefined);
    //   console.log("requiredValue - ", requiredValue);
    //   console.log("isOptional - ", isOptional);
    //   console.log("isArray - ", isArray);
    //   console.log("isUntypedArray - ", isUntypedArray);
    //   console.log("isMapOfArray - ", isMapOfArray);
    //   console.log("FIELD VALUE - ", `${key}: `, val);
    // }

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
        console.log(
          `"default" in val && val.default === undefined && requiredValue !== true - ${key}`
        );
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
        const parseKey = getParseKeyFn({
          isDocument,
          shouldLeanIncludeVirtuals,
          noMongoose,
          datesAsStrings
        });
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
      let docRef = val.ref.replace?.(`'`, "");

      if (typeof val.ref === "function") {
        // If we get a function, we cant determine the document that we would populate, so just assume it's an ObjectId
        valType = "mongoose.Types.ObjectId";

        // If generating the document version, we can also provide document as an option to reflect the populated case. But for
        // lean docs we can't do this cause we don't have a base type to extend from (since we can't determine it when parsing only JS).
        // Later the tsReader can implement a function typechecker to subtitute the type with the more exact one.
        if (isDocument) {
          valType += " | mongoose.Document";
        }
      } else if (docRef) {
        // If val.ref is an invalid type (not a string) then this gets skipped.
        if (docRef.includes(".")) {
          docRef = getSubdocName(docRef);
        }

        const populatedType = isDocument ? `${docRef}Document` : docRef;
        valType = val.autopopulate ? // support for mongoose-autopopulate
          populatedType :
          `${populatedType}["_id"] | ${populatedType}`;
      }
    } else {
      // _ids are always required
      if (key === "_id") isOptional = false;

      const convertedType = convertBaseTypeToTs({
        key,
        val,
        isDocument,
        noMongoose,
        datesAsStrings
      });

      // TODO: we should detect nested types from unknown types and handle differently.
      // Currently, if we get an unknown type (ie not handled) then users run into a "max callstack exceeded error"
      if (convertedType === "{}") {
        const nestedSchema = _.cloneDeep(val);
        valType = "{\n";

        const parseKey = getParseKeyFn({
          isDocument,
          shouldLeanIncludeVirtuals,
          noMongoose,
          datesAsStrings
        });
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

    if (val?.default === null) {
      valType += " | null";
    }
    return formatKeyEntry({ key, val: valType, isOptional });
  };
};
