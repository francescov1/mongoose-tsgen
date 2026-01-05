import mongoose from "mongoose";
/**
 * Lean version of UserFriendDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `UserDocument.toObject()`.
 * ```
 * const userObject = user.toObject();
 * ```
 */
export type UserFriend = {
    uid: User["_id"] | User;
    nickname?: string;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of UserCitySubdocWithoutDefaultDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `UserDocument.toObject()`.
 * ```
 * const userObject = user.toObject();
 * ```
 */
export type UserCitySubdocWithoutDefault = {
    a?: string;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of UserSubdocArrayWithComplexTypeExtensionDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `UserSubdocArrayWithComplexTypeDocument.toObject()`.
 * ```
 * const usersubdocarraywithcomplextypeObject = usersubdocarraywithcomplextype.toObject();
 * ```
 */
export type UserSubdocArrayWithComplexTypeExtension = {
    customer?: string;
    path: string[];
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of UserSubdocArrayWithComplexTypeDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `UserDocument.toObject()`.
 * ```
 * const userObject = user.toObject();
 * ```
 */
export type UserSubdocArrayWithComplexType = {
    fieldName?: string;
    extension?: UserSubdocArrayWithComplexTypeExtension;
};
/**
 * Lean version of UserDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `UserDocument.toObject()`. To avoid conflicts with model names, use the type alias `UserObject`.
 * ```
 * const userObject = user.toObject();
 * ```
 */
export type User = {
    email: string;
    firstName: string;
    /** inline jsdoc */
    lastName: string;
    /**
     * single line jsdoc
     */
    metadata?: any;
    bestFriend?: User["_id"] | User;
    refFunction?: mongoose.Types.ObjectId;
    /**
     * multiline
     * jsdoc
     */
    friends: UserFriend[];
    city: {
        coordinates: number[];
        subdocWithoutDefault?: UserCitySubdocWithoutDefault[];
    };
    tags: string[];
    alternateObjectId?: mongoose.Types.ObjectId;
    socialMediaHandles?: Map<string, string>;
    mapWithSchemaType?: Map<string, number>;
    arrayOfMaps: (Map<string, number>)[];
    mapOfArrays?: Map<string, number[]>;
    untypedMap?: Map<string, any>;
    untypedSchemaMap?: Map<string, any>;
    untypedRequiredMap: Map<string, any>;
    requiredIsFunction?: number;
    arrayExplicitelyRequiredFalse?: string[];
    requiredArrayWithDefaultUndefined: string[];
    buffer: Buffer;
    bufferString?: Buffer;
    bufferSchemaTypeWithDefaultNull?: Buffer | null;
    decimal128?: number;
    otherDecimal128?: number;
    numberString?: number;
    stringString?: string;
    booleanString?: boolean;
    dateString?: Date;
    otherNumberString: number;
    otherStringString: string;
    defaultNullString: string | null;
    enumWithNull?: "a" | "b" | "c" | null;
    enumWithoutNull?: "a" | "b" | "c";
    baseEnumClass?: "value1" | "value2";
    "special-character"?: string;
    typeWithAnAlias?: number;
    optionalBaseTypeArray?: string[];
    subdocArrayWithComplexType: UserSubdocArrayWithComplexType[];
    alias: {
        field?: number;
    };
    _id: mongoose.Types.ObjectId;
    name: string;
};
/**
 * Lean version of UserDocument (type alias of `User`)
 *
 * Use this type alias to avoid conflicts with model names:
 * ```
 * import { User } from "../models"
 * import { UserObject } from "../interfaces/mongoose.gen.ts"
 *
 * const userObject: UserObject = user.toObject();
 * ```
 */
export type UserObject = User;
/**
 * Mongoose Query type
 *
 * This type is returned from query functions. For most use cases, you should not need to use this type explicitly.
 */
export type UserQuery = mongoose.Query<any, UserDocument, UserQueries> & UserQueries;
/**
 * Mongoose Query helper types
 *
 * This type represents `UserSchema.query`. For most use cases, you should not need to use this type explicitly.
 */
export type UserQueries = {
    populateFriends: (this: UserQuery) => UserQuery;
};
export type UserMethods = {
    isMetadataString: (this: UserDocument) => boolean;
};
export type UserStatics = {
    getFriends: (this: UserModel, friendUids: UserDocument["_id"][]) => Promise<UserObject[]>;
};
/**
 * Mongoose Model type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const User = mongoose.model<UserDocument, UserModel>("User", UserSchema);
 * ```
 */
export type UserModel = mongoose.Model<UserDocument, UserQueries> & UserStatics;
/**
 * Mongoose Schema type
 *
 * Assign this type to new User schema instances:
 * ```
 * const UserSchema: UserSchema = new mongoose.Schema({ ... })
 * ```
 */
export type UserSchema = mongoose.Schema<UserDocument, UserModel, UserMethods, UserQueries>;
/**
 * Mongoose Subdocument type
 *
 * Type of `UserDocument["friends"]` element.
 */
export type UserFriendDocument = mongoose.Types.Subdocument<mongoose.Types.ObjectId> & {
    uid: UserDocument["_id"] | UserDocument;
    nickname?: string;
    _id: mongoose.Types.ObjectId;
};
/**
 * Mongoose Subdocument type
 *
 * Type of `UserDocument["city.subdocWithoutDefault"]` element.
 */
export type UserCitySubdocWithoutDefaultDocument = mongoose.Types.Subdocument<mongoose.Types.ObjectId> & {
    a?: string;
    _id: mongoose.Types.ObjectId;
};
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const UserSubdocArrayWithComplexType = mongoose.model<UserSubdocArrayWithComplexTypeDocument, UserSubdocArrayWithComplexTypeModel>("UserSubdocArrayWithComplexType", UserSubdocArrayWithComplexTypeSchema);
 * ```
 */
export type UserSubdocArrayWithComplexTypeExtensionDocument = mongoose.Document<mongoose.Types.ObjectId> & {
    customer?: string;
    path: mongoose.Types.Array<string>;
    _id: mongoose.Types.ObjectId;
};
/**
 * Mongoose Subdocument type
 *
 * Type of `UserDocument["subdocArrayWithComplexType"]` element.
 */
export type UserSubdocArrayWithComplexTypeDocument = mongoose.Types.Subdocument<any> & {
    fieldName?: string;
    extension?: UserSubdocArrayWithComplexTypeExtensionDocument;
};
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const User = mongoose.model<UserDocument, UserModel>("User", UserSchema);
 * ```
 */
export type UserDocument = mongoose.Document<mongoose.Types.ObjectId, UserQueries> & UserMethods & {
    email: string;
    firstName: string;
    /** inline jsdoc */
    lastName: string;
    /**
     * single line jsdoc
     */
    metadata?: any;
    bestFriend?: UserDocument["_id"] | UserDocument;
    refFunction?: mongoose.Types.ObjectId | mongoose.Document;
    /**
     * multiline
     * jsdoc
     */
    friends: mongoose.Types.DocumentArray<UserFriendDocument>;
    city: {
        coordinates: mongoose.Types.Array<number>;
        subdocWithoutDefault?: mongoose.Types.DocumentArray<UserCitySubdocWithoutDefaultDocument>;
    };
    tags: mongoose.Types.Array<string>;
    alternateObjectId?: mongoose.Types.ObjectId;
    socialMediaHandles?: mongoose.Types.Map<string>;
    mapWithSchemaType?: mongoose.Types.Map<number>;
    arrayOfMaps: mongoose.Types.Array<mongoose.Types.Map<number>>;
    mapOfArrays?: mongoose.Types.Map<mongoose.Types.Array<number>>;
    untypedMap?: mongoose.Types.Map<any>;
    untypedSchemaMap?: mongoose.Types.Map<any>;
    untypedRequiredMap: mongoose.Types.Map<any>;
    requiredIsFunction?: number;
    arrayExplicitelyRequiredFalse?: mongoose.Types.Array<string>;
    requiredArrayWithDefaultUndefined: mongoose.Types.Array<string>;
    buffer: mongoose.Types.Buffer;
    bufferString?: mongoose.Types.Buffer;
    bufferSchemaTypeWithDefaultNull?: mongoose.Types.Buffer | null;
    decimal128?: mongoose.Types.Decimal128;
    otherDecimal128?: mongoose.Types.Decimal128;
    numberString?: number;
    stringString?: string;
    booleanString?: boolean;
    dateString?: Date;
    otherNumberString: number;
    otherStringString: string;
    defaultNullString: string | null;
    enumWithNull?: "a" | "b" | "c" | null;
    enumWithoutNull?: "a" | "b" | "c";
    baseEnumClass?: "value1" | "value2";
    "special-character"?: string;
    typeWithAnAlias?: number;
    optionalBaseTypeArray?: mongoose.Types.Array<string>;
    subdocArrayWithComplexType: mongoose.Types.DocumentArray<UserSubdocArrayWithComplexTypeDocument>;
    alias: {
        field?: number;
    };
    _id: mongoose.Types.ObjectId;
    name: string;
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
