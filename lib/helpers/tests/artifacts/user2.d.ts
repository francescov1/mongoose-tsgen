import mongoose from 'mongoose';
import { User2Document } from './user2.gen';
export declare const User2: mongoose.Model<User2Document, import("./user2.gen").User2Queries, {}, {}, mongoose.Document<unknown, import("./user2.gen").User2Queries, User2Document, {}, {}> & mongoose.Document<number, import("./user2.gen").User2Queries, any, Record<string, any>, {}> & {
    _id: number;
    address: import("./user2.gen").User2AnArrayOfSchemasWithArrayDocumentDocument;
    lastOnlineAt?: Date;
    anotherSchema?: import("./user2.gen").User2AnotherSchemaDocument;
    anArrayOfSchemasWithArrayDocuments: mongoose.Types.DocumentArray<import("./user2.gen").User2AnArrayOfSchemasWithArrayDocumentDocument>;
    aMapOfSchemas: mongoose.Types.Map<import("./user2.gen").User2AMapOfSchemaArrayDocument>;
    aMapOfSchemaArrays: mongoose.Types.Map<mongoose.Types.Array<import("./user2.gen").User2AMapOfSchemaArrayDocument>>;
    anArrayOfSchemaMaps: mongoose.Types.Array<mongoose.Types.Map<import("./user2.gen").User2AMapOfSchemaArrayDocument>>;
    children: mongoose.Types.DocumentArray<import("./user2.gen").User2ChildDocument>;
    people: mongoose.Types.DocumentArray<import("./user2.gen").User2PersonDocument>;
    updatedAt?: Date;
    createdAt?: Date;
} & Required<{
    _id: number;
}> & {
    __v: number;
}, any>;
