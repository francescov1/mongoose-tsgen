import mongoose from "mongoose";
/**
 * Lean version of LandingModelFieldDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `LandingDocument.toObject()`.
 * ```
 * const landingObject = landing.toObject();
 * ```
 */
export type LandingModelField = {
    name?: string;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of LandingDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `LandingDocument.toObject()`. To avoid conflicts with model names, use the type alias `LandingObject`.
 * ```
 * const landingObject = landing.toObject();
 * ```
 */
export type Landing = {
    brand?: string;
    models: LandingModelField[];
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of LandingDocument (type alias of `Landing`)
 *
 * Use this type alias to avoid conflicts with model names:
 * ```
 * import { Landing } from "../models"
 * import { LandingObject } from "../interfaces/mongoose.gen.ts"
 *
 * const landingObject: LandingObject = landing.toObject();
 * ```
 */
export type LandingObject = Landing;
/**
 * Mongoose Query type
 *
 * This type is returned from query functions. For most use cases, you should not need to use this type explicitly.
 */
export type LandingQuery = mongoose.Query<any, LandingDocument, LandingQueries> & LandingQueries;
/**
 * Mongoose Query helper types
 *
 * This type represents `LandingSchema.query`. For most use cases, you should not need to use this type explicitly.
 */
export type LandingQueries = {};
export type LandingMethods = {};
export type LandingStatics = {};
/**
 * Mongoose Model type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Landing = mongoose.model<LandingDocument, LandingModel>("Landing", LandingSchema);
 * ```
 */
export type LandingModel = mongoose.Model<LandingDocument, LandingQueries> & LandingStatics;
/**
 * Mongoose Schema type
 *
 * Assign this type to new Landing schema instances:
 * ```
 * const LandingSchema: LandingSchema = new mongoose.Schema({ ... })
 * ```
 */
export type LandingSchema = mongoose.Schema<LandingDocument, LandingModel, LandingMethods, LandingQueries>;
/**
 * Mongoose Subdocument type
 *
 * Type of `LandingDocument["models"]` element.
 */
export type LandingModelFieldDocument = mongoose.Types.Subdocument<mongoose.Types.ObjectId> & {
    name?: string;
    _id: mongoose.Types.ObjectId;
};
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Landing = mongoose.model<LandingDocument, LandingModel>("Landing", LandingSchema);
 * ```
 */
export type LandingDocument = mongoose.Document<mongoose.Types.ObjectId, LandingQueries> & LandingMethods & {
    brand?: string;
    models: mongoose.Types.DocumentArray<LandingModelFieldDocument>;
    _id: mongoose.Types.ObjectId;
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
