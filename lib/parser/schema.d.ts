/**
 * Parser types
 */
import { MongooseModel, MongooseSchema, ParserSchemaField } from "./types";
export declare class ParserSchema {
    modelName: string;
    model: any;
    mongooseSchema: MongooseSchema;
    fields: ParserSchemaField[];
    methods: Record<string, string>;
    statics: Record<string, string>;
    queries: Record<string, string>;
    virtuals: Record<string, string>;
    comments: {
        path: string;
        comment: string;
    }[];
    schemaTree: MongooseSchema["tree"];
    shouldLeanIncludeVirtuals: boolean;
    childSchemas: ParserSchema[];
    constructor({ mongooseSchema, modelName, model }: {
        mongooseSchema: MongooseSchema;
        modelName: string;
        model: MongooseModel;
    });
    private generateFields;
    generateTemplate({ isDocument, noMongoose, datesAsStrings, header, footer }: {
        isDocument: boolean;
        noMongoose: boolean;
        datesAsStrings: boolean;
        header: string;
        footer: string;
    }): string;
    /**
     * Parses the schema tree, and adds _aliasRootField to the tree for aliases.
     * @param schema The schema to parse.
     * @returns The parsed schema tree.
     */
    parseTree: (schema: MongooseSchema) => Record<string, any>;
    parseChildSchemas: (schema: MongooseSchema) => ParserSchema[];
}
