/**
 * Parser types
 */

import {
  convertBaseTypeToTs,
  getParseKeyFn,
  getShouldLeanIncludeVirtuals,
  getSubdocName
} from "./utils";
import _ from "lodash";
import * as templates from "../helpers/templates";
import { MongooseSchema, ParserSchemaField } from "./types";

// TODO next:
// - Fix all type issues here. Need to see if mongoose has TS types, otherwise create my own

// old TODOs:
// - Handle statics method issue
// - Switch to using HydratedDocument, https://mongoosejs.com/docs/migrating_to_7.html. Also update query helpers https://mongoosejs.com/docs/typescript/query-helpers.html

export class ParserSchema {
  modelName: string;
  mongooseSchema: MongooseSchema;
  fields: ParserSchemaField[];
  header: string;
  footer: string;
  methods: Record<string, string> = {};
  statics: Record<string, string> = {};
  queries: Record<string, string> = {};
  virtuals: Record<string, string> = {};
  comments: { path: string; comment: string }[] = [];
  childSchemas: ParserSchema[];

  datesAsStrings: boolean;
  isDocument: boolean;
  noMongoose: boolean;

  // schema.tree with custom field _aliasRootField, TODO: Create explicit type for this
  schemaTree: MongooseSchema["tree"] = {};

  shouldLeanIncludeVirtuals: boolean;

  constructor({
    mongooseSchema,
    datesAsStrings,
    isDocument,
    noMongoose,
    modelName,
    header,
    footer
  }: {
    mongooseSchema: MongooseSchema;
    datesAsStrings: boolean;
    isDocument: boolean;
    noMongoose: boolean;
    modelName: string;
    header: string;
    footer: string;
  }) {
    this.modelName = modelName;
    this.mongooseSchema = mongooseSchema;
    this.datesAsStrings = datesAsStrings;
    this.isDocument = isDocument;
    this.noMongoose = noMongoose;
    this.header = header;
    this.footer = footer;
    this.childSchemas = mongooseSchema.childSchemas && modelName ? this.parseChildSchemas() : [];
    this.schemaTree = this.parseTree();

    this.fields = this.generateFields(mongooseSchema);

    this.shouldLeanIncludeVirtuals = getShouldLeanIncludeVirtuals(mongooseSchema);
  }

  // TODO: Generate own representation
  private generateFields(_mongooseSchema: MongooseSchema): ParserSchemaField[] {
    // return Object.entries(mongooseSchema.tree).map(([name, field]) => ({
    //   name: field.name,
    //   type: field.type,
    //   isOptional: field.isOptional || false,
    //   isArray: field.isArray || false,
    //   isMap: field.isMap || false,
    //   ref: field.ref,
    //   virtual: field.virtual,
    //   comment: field.comment
    // }));
    return [];
  }

  public generateTemplate(): string {
    let template = "";

    this.childSchemas.forEach(child => {
      template += child.generateTemplate();
    });

    template += this.header;

    const parseKey = getParseKeyFn({
      isDocument: this.isDocument,
      shouldLeanIncludeVirtuals: this.shouldLeanIncludeVirtuals,
      noMongoose: this.noMongoose,
      datesAsStrings: this.datesAsStrings
    });

    Object.entries(this.schemaTree).forEach(([key, val]) => {
      template += parseKey(key, val);
    });

    template += this.footer;
    return template;
  }

  /**
   * Parses the schema tree, and adds _aliasRootField to the tree for aliases.
   * @returns The parsed schema tree.
   */
  parseTree = (): Record<string, any> => {
    const tree = _.cloneDeep(this.mongooseSchema.tree);

    if (!_.isEmpty(this.mongooseSchema.aliases) && this.modelName) {
      Object.entries(this.mongooseSchema.aliases).forEach(([alias, path]: [string, any]) => {
        _.set(tree, `${alias}._aliasRootField`, _.get(tree, path));
      });
    }

    return tree;
  };

  parseChildSchemas = (): ParserSchema[] => {
    const mongooseChildSchemas = _.cloneDeep(this.mongooseSchema.childSchemas);
    const childSchemas: ParserSchema[] = [];

    // NOTE: This is a hack for Schema maps. For some reason, when a map of a schema exists, the schema is not included
    // in childSchemas. So we add it manually and add a few extra properties to ensure the processChild works correctly.
    for (const [path, type] of Object.entries(this.mongooseSchema.paths)) {
      // This check tells us that this is a map of a separate schema
      if ((type as any)?.$isSchemaMap && (type as any)?.$__schemaType.schema) {
        const childSchema = (type as any).$__schemaType;
        childSchema.model = {
          path: path,
          // TODO: Augment the mongoose schema with these, or dont update them in place would be even better
          $isArraySubdocument:
            childSchema.Constructor?.$isArraySubdocument ??
            childSchema.$isMongooseDocumentArray ??
            false,
          $isSchemaMap: true
        };
        mongooseChildSchemas.push(childSchema);
      }
    }

    for (const child of mongooseChildSchemas) {
      const path = child.model.path;
      const isSubdocArray = child.model.$isArraySubdocument;
      const isSchemaMap = child.model.$isSchemaMap ?? false;
      let name = getSubdocName(path, this.modelName);

      // // If a user names a field "model", it will conflict with the model name, so we need to rename it.
      // // https://github.com/francescov1/mongoose-tsgen/issues/128
      if (name === `${this.modelName}Model`) {
        name += "Field";
      }

      child.schema._isReplacedWithSchema = true;
      child.schema._inferredInterfaceName = name;
      child.schema._isSubdocArray = isSubdocArray;
      child.schema._isSchemaMap = isSchemaMap;

      const requiredValuePath = `${path}.required`;
      if (_.get(this.mongooseSchema.tree, requiredValuePath) === true) {
        child.schema.required = true;
      }

      /**
       * for subdocument arrays, mongoose supports passing `default: undefined` to disable the default empty array created.
       * here we indicate this on the child schema using _isDefaultSetToUndefined so that the parser properly sets the `isOptional` flag
       */
      if (isSubdocArray) {
        const defaultValuePath = `${path}.default`;
        if (
          _.has(this.mongooseSchema.tree, defaultValuePath) &&
          _.get(this.mongooseSchema.tree, defaultValuePath) === undefined
        ) {
          child.schema._isDefaultSetToUndefined = true;
        }
      }

      if (isSchemaMap) {
        _.set(this.mongooseSchema.tree, path, {
          type: Map,
          of: isSubdocArray ? [child.schema] : child.schema
        });
      } else if (isSubdocArray) {
        _.set(this.mongooseSchema.tree, path, [child.schema]);
      } else {
        _.set(this.mongooseSchema.tree, path, child.schema);
      }

      let header = "";
      if (this.isDocument)
        header += isSubdocArray ?
          templates.getSubdocumentDocs(this.modelName, path) :
          templates.getDocumentDocs(this.modelName);
      else header += templates.getLeanDocs(this.modelName, name);

      header += "\nexport ";

      if (this.isDocument) {
        header += `type ${name}Document = `;
        if (isSubdocArray) {
          header += "mongoose.Types.Subdocument";
        }
        // not sure why schema doesnt have `tree` property for typings
        else {
          let _idType;
          // get type of _id to pass to mongoose.Document
          // this is likely unecessary, since non-subdocs are not allowed to have option _id: false (https://mongoosejs.com/docs/guide.html#_id)
          if ((this.mongooseSchema as any).tree._id)
            // TODO: Fix type manually
            _idType = convertBaseTypeToTs({
              key: "_id",
              val: (this.mongooseSchema as any).tree._id,
              isDocument: true,
              noMongoose: this.noMongoose,
              datesAsStrings: this.datesAsStrings
            });

          // TODO: this should extend `${name}Methods` like normal docs, but generator will only have methods, statics, etc. under the model name, not the subdoc model name
          // so after this is generated, we should do a pass and see if there are any child schemas that have non-subdoc definitions.
          // or could just wait until we dont need duplicate subdoc versions of docs (use the same one for both embedded doc and non-subdoc)
          header += `mongoose.Document<${_idType ?? "never"}>`;
        }

        header += " & {\n";
      } else header += `type ${name} = {\n`;

      // TODO: this should not circularly call parseSchema
      const childSchema = new ParserSchema({
        mongooseSchema: child.schema,
        modelName: name,
        header,
        isDocument: this.isDocument,
        footer: `}\n\n`,
        noMongoose: this.noMongoose,
        datesAsStrings: this.datesAsStrings
      });

      childSchemas.push(childSchema);
    }

    return childSchemas;
  };
}
