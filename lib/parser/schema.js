/**
 * Parser types
 */
import { convertBaseTypeToTs, getTypeFromKeyValue, getShouldLeanIncludeVirtuals, getSubdocName } from "./utils";
import _ from "lodash";
import * as templates from "../helpers/templates";
import { sanitizeModelName } from "../helpers/generator";
// old TODOs:
// - Handle statics method issue
// - Switch to using HydratedDocument, https://mongoosejs.com/docs/migrating_to_7.html. Also update query helpers https://mongoosejs.com/docs/typescript/query-helpers.html
// TODO: Look into new inference of types https://mongoosejs.com/docs/typescript/schemas.html
export class ParserSchema {
    modelName;
    model; // TODO: Can we get better types here?
    mongooseSchema;
    fields;
    methods = {};
    statics = {};
    queries = {};
    virtuals = {};
    comments = [];
    // schema.tree with custom field _aliasRootField, TODO: Create explicit type for this
    schemaTree = {};
    shouldLeanIncludeVirtuals;
    childSchemas;
    constructor({ mongooseSchema, modelName, model }) {
        this.model = model;
        this.modelName = modelName;
        this.mongooseSchema = mongooseSchema;
        this.childSchemas = this.parseChildSchemas(mongooseSchema);
        this.schemaTree = this.parseTree(mongooseSchema);
        this.fields = this.generateFields(mongooseSchema);
        this.shouldLeanIncludeVirtuals = getShouldLeanIncludeVirtuals(mongooseSchema);
    }
    // TODO: Generate own representation
    generateFields(_mongooseSchema) {
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
    generateTemplate({ isDocument, noMongoose, datesAsStrings, header, footer }) {
        let template = "";
        if (this.mongooseSchema.childSchemas && this.modelName) {
            // TODO: Splint into functuon
            this.childSchemas.forEach((child) => {
                const path = child.model.path;
                const name = getSubdocName(path, this.modelName);
                let header = "";
                if (isDocument)
                    // TODO: Does this make sense for child docs?
                    header += child.mongooseSchema._isSubdocArray
                        ? templates.getSubdocumentDocs(this.modelName, path)
                        : templates.getDocumentDocs(this.modelName);
                else
                    header += templates.getLeanDocs(this.modelName, name);
                header += "\nexport ";
                if (isDocument) {
                    header += `type ${name}Document = `;
                    // get type of _id to pass to mongoose.Document
                    // this is likely unecessary, since non-subdocs are not allowed to have option _id: false (https://mongoosejs.com/docs/guide.html#_id)
                    // TODO: Fix type manually
                    const _idType = child.mongooseSchema.tree._id
                        ? convertBaseTypeToTs({
                            key: "_id",
                            val: child.mongooseSchema.tree._id,
                            isDocument: true,
                            noMongoose,
                            datesAsStrings
                        })
                        : "any";
                    // TODO: this should extend `${name}Methods` like normal docs, but generator will only have methods, statics, etc. under the model name, not the subdoc model name
                    // so after this is generated, we should do a pass and see if there are any child schemas that have non-subdoc definitions.
                    // or could just wait until we dont need duplicate subdoc versions of docs (use the same one for both embedded doc and non-subdoc)
                    header += child.mongooseSchema._isSubdocArray
                        ? `mongoose.Types.Subdocument<${_idType}>`
                        : `mongoose.Document<${_idType}>`;
                    header += " & {\n";
                }
                else
                    header += `type ${name} = {\n`;
                const footer = `}\n\n`;
                template += child.generateTemplate({
                    isDocument,
                    noMongoose,
                    datesAsStrings,
                    header,
                    footer
                });
            });
        }
        template += header;
        Object.entries(this.schemaTree).forEach(([key, val]) => {
            template += getTypeFromKeyValue({
                key,
                val,
                isDocument,
                noMongoose,
                datesAsStrings,
                shouldLeanIncludeVirtuals: this.shouldLeanIncludeVirtuals
            });
        });
        template += footer;
        return template;
    }
    /**
     * Parses the schema tree, and adds _aliasRootField to the tree for aliases.
     * @param schema The schema to parse.
     * @returns The parsed schema tree.
     */
    parseTree = (schema) => {
        const tree = _.cloneDeep(schema.tree);
        // TODO: Rename this to what it was before, related to adding type aliases
        // Add alias types to tree
        if (!_.isEmpty(this.mongooseSchema.aliases) && this.modelName) {
            Object.entries(this.mongooseSchema.aliases).forEach(([alias, path]) => {
                _.set(tree, `${alias}._aliasRootField`, _.get(tree, path));
            });
        }
        return tree;
    };
    parseChildSchemas = (schema) => {
        const childSchemas = [];
        // NOTE: The for loop below is a hack for Schema maps. For some reason, when a map of a schema exists, the schema is not included
        // in childSchemas. So we add it manually and add a few extra properties to ensure the processChild works correctly.
        // UPDSTE: Newer versions of Mongoose do include the schema map in the child schemas, but in a weird format with "*$" postfix in the path. We can just filter those out which is what were doing directly below.
        const mongooseChildSchemas = _.cloneDeep(schema.childSchemas).filter((child) => !child.model.path.endsWith("$*"));
        for (const [path, type] of Object.entries(this.mongooseSchema.paths)) {
            // This check tells us that this is a map of a separate schema
            if (type?.$isSchemaMap && type?.$__schemaType.schema) {
                const childSchema = type.$__schemaType;
                childSchema.model = {
                    path: path,
                    // TODO: Augment the mongoose schema with these, or dont update them in place would be even better
                    $isArraySubdocument: childSchema.Constructor?.$isArraySubdocument ??
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
            const name = getSubdocName(path, this.modelName);
            const sanitizedName = sanitizeModelName(name);
            child.schema._isReplacedWithSchema = true;
            child.schema._inferredInterfaceName = sanitizedName;
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
                if (_.has(this.mongooseSchema.tree, defaultValuePath) &&
                    _.get(this.mongooseSchema.tree, defaultValuePath) === undefined) {
                    child.schema._isDefaultSetToUndefined = true;
                }
            }
            if (isSchemaMap) {
                _.set(this.mongooseSchema.tree, path, {
                    type: Map,
                    of: isSubdocArray ? [child.schema] : child.schema
                });
            }
            else if (isSubdocArray) {
                _.set(this.mongooseSchema.tree, path, [child.schema]);
            }
            else {
                _.set(this.mongooseSchema.tree, path, child.schema);
            }
            const childSchema = new ParserSchema({
                mongooseSchema: child.schema,
                modelName: sanitizedName,
                model: child.model
            });
            childSchemas.push(childSchema);
        }
        return childSchemas;
    };
}
