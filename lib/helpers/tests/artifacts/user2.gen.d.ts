import mongoose from "mongoose";
/**
 * Lean version of User2AddressCoordinateDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `User2AddressDocument.toObject()`.
 * ```
 * const user2addressObject = user2address.toObject();
 * ```
 */
export type User2AddressCoordinate = {
    lat?: number;
    long?: number;
};
/**
 * Lean version of User2AddressDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `User2Document.toObject()`.
 * ```
 * const user2Object = user2.toObject();
 * ```
 */
export type User2Address = {
    city: string;
    coordinates: User2AddressCoordinate[];
};
/**
 * Lean version of User2AnotherSchemaDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `User2Document.toObject()`.
 * ```
 * const user2Object = user2.toObject();
 * ```
 */
export type User2AnotherSchema = {
    info: string;
    creator?: string;
    time?: number;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of User2AnArrayOfSchemasWithArrayDocumentCoordinateDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `User2AnArrayOfSchemasWithArrayDocumentDocument.toObject()`.
 * ```
 * const user2anarrayofschemaswitharraydocumentObject = user2anarrayofschemaswitharraydocument.toObject();
 * ```
 */
export type User2AnArrayOfSchemasWithArrayDocumentCoordinate = {
    lat?: number;
    long?: number;
};
/**
 * Lean version of User2AnArrayOfSchemasWithArrayDocumentDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `User2Document.toObject()`.
 * ```
 * const user2Object = user2.toObject();
 * ```
 */
export type User2AnArrayOfSchemasWithArrayDocument = {
    city: string;
    coordinates: User2AnArrayOfSchemasWithArrayDocumentCoordinate[];
};
/**
 * Lean version of User2ChildDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `User2Document.toObject()`.
 * ```
 * const user2Object = user2.toObject();
 * ```
 */
export type User2Child = {
    uid: User2["_id"] | User2;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of User2PersonDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `User2Document.toObject()`.
 * ```
 * const user2Object = user2.toObject();
 * ```
 */
export type User2Person = {
    name?: string;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of User2AMapOfSchemaDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `User2Document.toObject()`.
 * ```
 * const user2Object = user2.toObject();
 * ```
 */
export type User2AMapOfSchema = {
    info: string;
    creator?: string;
    time?: number;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of User2AMapOfSchemaArrayDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `User2Document.toObject()`.
 * ```
 * const user2Object = user2.toObject();
 * ```
 */
export type User2AMapOfSchemaArray = {
    info: string;
    creator?: string;
    time?: number;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of User2Document
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `User2Document.toObject()`. To avoid conflicts with model names, use the type alias `User2Object`.
 * ```
 * const user2Object = user2.toObject();
 * ```
 */
export type User2 = {
    _id: number;
    address: User2AnArrayOfSchemasWithArrayDocument;
    lastOnlineAt?: Date;
    anotherSchema?: User2AnotherSchema;
    anArrayOfSchemasWithArrayDocuments: User2AnArrayOfSchemasWithArrayDocument[];
    aMapOfSchemas: Map<string, User2AMapOfSchemaArray>;
    aMapOfSchemaArrays: Map<string, User2AMapOfSchemaArray[]>;
    anArrayOfSchemaMaps: (Map<string, User2AMapOfSchemaArray>)[];
    children: User2Child[];
    people: User2Person[];
    updatedAt?: Date;
    createdAt?: Date;
};
/**
 * Lean version of User2Document (type alias of `User2`)
 *
 * Use this type alias to avoid conflicts with model names:
 * ```
 * import { User2 } from "../models"
 * import { User2Object } from "../interfaces/mongoose.gen.ts"
 *
 * const user2Object: User2Object = user2.toObject();
 * ```
 */
export type User2Object = User2;
/**
 * Mongoose Query type
 *
 * This type is returned from query functions. For most use cases, you should not need to use this type explicitly.
 */
export type User2Query = mongoose.Query<any, User2Document, User2Queries> & User2Queries;
/**
 * Mongoose Query helper types
 *
 * This type represents `User2Schema.query`. For most use cases, you should not need to use this type explicitly.
 */
export type User2Queries = {};
export type User2Methods = {};
export type User2Statics = {};
/**
 * Mongoose Model type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const User2 = mongoose.model<User2Document, User2Model>("User2", User2Schema);
 * ```
 */
export type User2Model = mongoose.Model<User2Document, User2Queries> & User2Statics;
/**
 * Mongoose Schema type
 *
 * Assign this type to new User2 schema instances:
 * ```
 * const User2Schema: User2Schema = new mongoose.Schema({ ... })
 * ```
 */
export type User2Schema = mongoose.Schema<User2Document, User2Model, User2Methods, User2Queries>;
/**
 * Mongoose Subdocument type
 *
 * Type of `User2AddressDocument["coordinates"]` element.
 */
export type User2AddressCoordinateDocument = mongoose.Types.Subdocument<any> & {
    lat?: number;
    long?: number;
};
/**
 * Mongoose Subdocument type
 *
 * Type of `User2Document["address"]` element.
 */
export type User2AddressDocument = mongoose.Types.Subdocument<any> & {
    city: string;
    coordinates: mongoose.Types.DocumentArray<User2AddressCoordinateDocument>;
};
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const User2 = mongoose.model<User2Document, User2Model>("User2", User2Schema);
 * ```
 */
export type User2AnotherSchemaDocument = mongoose.Document<mongoose.Types.ObjectId> & {
    info: string;
    creator?: string;
    time?: number;
    _id: mongoose.Types.ObjectId;
};
/**
 * Mongoose Subdocument type
 *
 * Type of `User2AnArrayOfSchemasWithArrayDocumentDocument["coordinates"]` element.
 */
export type User2AnArrayOfSchemasWithArrayDocumentCoordinateDocument = mongoose.Types.Subdocument<any> & {
    lat?: number;
    long?: number;
};
/**
 * Mongoose Subdocument type
 *
 * Type of `User2Document["anArrayOfSchemasWithArrayDocuments"]` element.
 */
export type User2AnArrayOfSchemasWithArrayDocumentDocument = mongoose.Types.Subdocument<any> & {
    city: string;
    coordinates: mongoose.Types.DocumentArray<User2AnArrayOfSchemasWithArrayDocumentCoordinateDocument>;
};
/**
 * Mongoose Subdocument type
 *
 * Type of `User2Document["children"]` element.
 */
export type User2ChildDocument = mongoose.Types.Subdocument<mongoose.Types.ObjectId> & {
    uid: User2Document["_id"] | User2Document;
    _id: mongoose.Types.ObjectId;
};
/**
 * Mongoose Subdocument type
 *
 * Type of `User2Document["people"]` element.
 */
export type User2PersonDocument = mongoose.Types.Subdocument<mongoose.Types.ObjectId> & {
    name?: string;
    _id: mongoose.Types.ObjectId;
};
/**
 * Mongoose Subdocument type
 *
 * Type of `User2Document["aMapOfSchemas"]` element.
 */
export type User2AMapOfSchemaDocument = mongoose.Types.Subdocument<mongoose.Types.ObjectId> & {
    info: string;
    creator?: string;
    time?: number;
    _id: mongoose.Types.ObjectId;
};
/**
 * Mongoose Subdocument type
 *
 * Type of `User2Document["aMapOfSchemaArrays"]` element.
 */
export type User2AMapOfSchemaArrayDocument = mongoose.Types.Subdocument<mongoose.Types.ObjectId> & {
    info: string;
    creator?: string;
    time?: number;
    _id: mongoose.Types.ObjectId;
};
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const User2 = mongoose.model<User2Document, User2Model>("User2", User2Schema);
 * ```
 */
export type User2Document = mongoose.Document<number, User2Queries> & User2Methods & {
    _id: number;
    address: User2AnArrayOfSchemasWithArrayDocumentDocument;
    lastOnlineAt?: Date;
    anotherSchema?: User2AnotherSchemaDocument;
    anArrayOfSchemasWithArrayDocuments: mongoose.Types.DocumentArray<User2AnArrayOfSchemasWithArrayDocumentDocument>;
    aMapOfSchemas: mongoose.Types.Map<User2AMapOfSchemaArrayDocument>;
    aMapOfSchemaArrays: mongoose.Types.Map<mongoose.Types.Array<User2AMapOfSchemaArrayDocument>>;
    anArrayOfSchemaMaps: mongoose.Types.Array<mongoose.Types.Map<User2AMapOfSchemaArrayDocument>>;
    children: mongoose.Types.DocumentArray<User2ChildDocument>;
    people: mongoose.Types.DocumentArray<User2PersonDocument>;
    updatedAt?: Date;
    createdAt?: Date;
};
/**
 * Check if a property on a document is populated:
 * ```
 * import { IsPopulated } from "../interfaces/mongoose.gen.ts"
 *
 * if (IsPopulated<UserDocument["bestFriend"]>) { ... }
 * ```
 */
export declare function IsPopulated<T>(doc: T | mongoose.Types.ObjectId): doc is T;
/**
 * Helper type used by `PopulatedDocument`. Returns the parent property of a string
 * representing a nested property (i.e. `friend.user` -> `friend`)
 */
type ParentProperty<T> = T extends `${infer P}.${string}` ? P : never;
/**
* Helper type used by `PopulatedDocument`. Returns the child property of a string
* representing a nested property (i.e. `friend.user` -> `user`).
*/
type ChildProperty<T> = T extends `${string}.${infer C}` ? C : never;
/**
* Helper type used by `PopulatedDocument`. Removes the `ObjectId` from the general union type generated
* for ref documents (i.e. `mongoose.Types.ObjectId | UserDocument` -> `UserDocument`)
*/
type PopulatedProperty<Root, T extends keyof Root> = Omit<Root, T> & {
    [ref in T]: Root[T] extends mongoose.Types.Array<infer U> ? mongoose.Types.Array<Exclude<U, mongoose.Types.ObjectId>> : Exclude<Root[T], mongoose.Types.ObjectId>;
};
/**
 * Populate properties on a document type:
 * ```
 * import { PopulatedDocument } from "../interfaces/mongoose.gen.ts"
 *
 * function example(user: PopulatedDocument<UserDocument, "bestFriend">) {
 *   console.log(user.bestFriend._id) // typescript knows this is populated
 * }
 * ```
 */
export type PopulatedDocument<DocType, T> = T extends keyof DocType ? PopulatedProperty<DocType, T> : (ParentProperty<T> extends keyof DocType ? Omit<DocType, ParentProperty<T>> & {
    [ref in ParentProperty<T>]: (DocType[ParentProperty<T>] extends mongoose.Types.Array<infer U> ? (mongoose.Types.Array<ChildProperty<T> extends keyof U ? PopulatedProperty<U, ChildProperty<T>> : PopulatedDocument<U, ChildProperty<T>>>) : (ChildProperty<T> extends keyof DocType[ParentProperty<T>] ? PopulatedProperty<DocType[ParentProperty<T>], ChildProperty<T>> : PopulatedDocument<DocType[ParentProperty<T>], ChildProperty<T>>));
} : DocType);
/**
 * Helper types used by the populate overloads
 */
type Unarray<T> = T extends Array<infer U> ? U : T;
type Modify<T, R> = Omit<T, keyof R> & R;
/**
 * Augment mongoose with Query.populate overloads
 */
declare module "mongoose" {
    interface Query<ResultType, DocType, THelpers = {}> {
        populate<T extends string>(path: T, select?: string | any, model?: string | Model<any, THelpers>, match?: any): Query<ResultType extends Array<DocType> ? Array<PopulatedDocument<Unarray<ResultType>, T>> : (ResultType extends DocType ? PopulatedDocument<Unarray<ResultType>, T> : ResultType), DocType, THelpers> & THelpers;
        populate<T extends string>(options: Modify<PopulateOptions, {
            path: T;
        }> | Array<PopulateOptions>): Query<ResultType extends Array<DocType> ? Array<PopulatedDocument<Unarray<ResultType>, T>> : (ResultType extends DocType ? PopulatedDocument<Unarray<ResultType>, T> : ResultType), DocType, THelpers> & THelpers;
    }
}
export {};
