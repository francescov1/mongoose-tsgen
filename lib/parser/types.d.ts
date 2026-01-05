import mongoose from "mongoose";
export interface ParserSchemaField {
    name: string;
    type: string;
    isOptional: boolean;
    isArray: boolean;
    isMap: boolean;
    ref?: string;
    virtual?: boolean;
    comment?: string;
}
export interface MongooseSchema extends mongoose.Schema {
    tree: {
        [key: string]: any;
    };
    aliases: {
        [alias: string]: string;
    };
    childSchemas: {
        schema: MongooseSchema;
        model: any;
    }[];
    required: boolean;
    _isReplacedWithSchema?: boolean;
    _inferredInterfaceName?: string;
    _isSubdocArray?: boolean;
    _isSchemaMap?: boolean;
    _isDefaultSetToUndefined?: boolean;
}
export interface MongooseModel<T = any, TQueryHelpers = {}, TMethods = {}, TVirtuals = {}> extends Omit<mongoose.Model<T, TQueryHelpers, TMethods, TVirtuals>, "schema"> {
    schema: MongooseSchema;
}
