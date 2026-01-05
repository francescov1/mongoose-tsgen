import mongoose from "mongoose";
/**
 * Lean version of TestFilesArrayItemDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `TestFilesDocument.toObject()`.
 * ```
 * const testfilesObject = testfiles.toObject();
 * ```
 */
export type TestFilesArrayItem = {
    "item@id"?: string;
    "item#name"?: string;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of TestFilesDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `TestFilesDocument.toObject()`. To avoid conflicts with model names, use the type alias `TestFilesObject`.
 * ```
 * const testfilesObject = testfiles.toObject();
 * ```
 */
export type TestFiles = {
    "brand-name": string;
    "123number": string;
    "class"?: "class1" | "class2" | "class3";
    "special@char"?: string;
    "space name"?: string;
    uploadsFiles?: string;
    "typeof": "public" | "private" | "restricted";
    meta_data: {
        "size-kb"?: number;
        "mime-type"?: string;
        "created@"?: Date;
    };
    arrayItems: TestFilesArrayItem[];
    "function"?: string;
    interfaceMap?: Map<string, string>;
    _id: mongoose.Types.ObjectId;
    updatedAt?: Date;
    createdAt?: Date;
    full: {
        path: any;
    };
};
/**
 * Lean version of TestFilesDocument (type alias of `TestFiles`)
 *
 * Use this type alias to avoid conflicts with model names:
 * ```
 * import { TestFiles } from "../models"
 * import { TestFilesObject } from "../interfaces/mongoose.gen.ts"
 *
 * const testfilesObject: TestFilesObject = testfiles.toObject();
 * ```
 */
export type TestFilesObject = TestFiles;
/**
 * Mongoose Query type
 *
 * This type is returned from query functions. For most use cases, you should not need to use this type explicitly.
 */
export type TestFilesQuery = mongoose.Query<any, TestFilesDocument, TestFilesQueries> & TestFilesQueries;
/**
 * Mongoose Query helper types
 *
 * This type represents `TestFilesSchema.query`. For most use cases, you should not need to use this type explicitly.
 */
export type TestFilesQueries = {
    "by.brand": (this: TestFilesQuery, ...args: any[]) => TestFilesQuery;
    "with.metadata": (this: TestFilesQuery, ...args: any[]) => TestFilesQuery;
};
export type TestFilesMethods = {
    "validate@type": (this: TestFilesDocument, ...args: any[]) => any;
    "get.size": (this: TestFilesDocument, ...args: any[]) => any;
};
export type TestFilesStatics = {
    "find.byType": (this: TestFilesModel, ...args: any[]) => any;
    "count@extension": (this: TestFilesModel, ...args: any[]) => any;
};
/**
 * Mongoose Model type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const TestFiles = mongoose.model<TestFilesDocument, TestFilesModel>("TestFiles", TestFilesSchema);
 * ```
 */
export type TestFilesModel = mongoose.Model<TestFilesDocument, TestFilesQueries> & TestFilesStatics;
/**
 * Mongoose Schema type
 *
 * Assign this type to new TestFiles schema instances:
 * ```
 * const TestFilesSchema: TestFilesSchema = new mongoose.Schema({ ... })
 * ```
 */
export type TestFilesSchema = mongoose.Schema<TestFilesDocument, TestFilesModel, TestFilesMethods, TestFilesQueries>;
/**
 * Mongoose Subdocument type
 *
 * Type of `TestFilesDocument["arrayItems"]` element.
 */
export type TestFilesArrayItemDocument = mongoose.Types.Subdocument<mongoose.Types.ObjectId> & {
    "item@id"?: string;
    "item#name"?: string;
    _id: mongoose.Types.ObjectId;
};
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const TestFiles = mongoose.model<TestFilesDocument, TestFilesModel>("TestFiles", TestFilesSchema);
 * ```
 */
export type TestFilesDocument = mongoose.Document<mongoose.Types.ObjectId, TestFilesQueries> & TestFilesMethods & {
    "brand-name": string;
    "123number": string;
    "class"?: "class1" | "class2" | "class3";
    "special@char"?: string;
    "space name"?: string;
    uploadsFiles?: string;
    "typeof": "public" | "private" | "restricted";
    meta_data: {
        "size-kb"?: number;
        "mime-type"?: string;
        "created@"?: Date;
    };
    arrayItems: mongoose.Types.DocumentArray<TestFilesArrayItemDocument>;
    "function"?: string;
    interfaceMap?: mongoose.Types.Map<string>;
    _id: mongoose.Types.ObjectId;
    updatedAt?: Date;
    createdAt?: Date;
    full: {
        path: any;
    };
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
