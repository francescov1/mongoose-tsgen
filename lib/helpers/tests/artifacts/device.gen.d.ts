import mongoose from "mongoose";
/**
 * Lean version of HomeDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `HomeDocument.toObject()`. To avoid conflicts with model names, use the type alias `HomeObject`.
 * ```
 * const homeObject = home.toObject();
 * ```
 */
export type Home = {
    homeId?: string;
    homeName?: string;
};
/**
 * Lean version of HomeDocument (type alias of `Home`)
 *
 * Use this type alias to avoid conflicts with model names:
 * ```
 * import { Home } from "../models"
 * import { HomeObject } from "../interfaces/mongoose.gen.ts"
 *
 * const homeObject: HomeObject = home.toObject();
 * ```
 */
export type HomeObject = Home;
/**
 * Mongoose Query type
 *
 * This type is returned from query functions. For most use cases, you should not need to use this type explicitly.
 */
export type HomeQuery = mongoose.Query<any, HomeDocument, HomeQueries> & HomeQueries;
/**
 * Mongoose Query helper types
 *
 * This type represents `HomeSchema.query`. For most use cases, you should not need to use this type explicitly.
 */
export type HomeQueries = {};
export type HomeMethods = {};
export type HomeStatics = {};
/**
 * Mongoose Model type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Home = mongoose.model<HomeDocument, HomeModel>("Home", HomeSchema);
 * ```
 */
export type HomeModel = mongoose.Model<HomeDocument, HomeQueries> & HomeStatics;
/**
 * Mongoose Schema type
 *
 * Assign this type to new Home schema instances:
 * ```
 * const HomeSchema: HomeSchema = new mongoose.Schema({ ... })
 * ```
 */
export type HomeSchema = mongoose.Schema<HomeDocument, HomeModel, HomeMethods, HomeQueries>;
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Home = mongoose.model<HomeDocument, HomeModel>("Home", HomeSchema);
 * ```
 */
export type HomeDocument = mongoose.Document<any, HomeQueries> & HomeMethods & {
    homeId?: string;
    homeName?: string;
    status: string;
};
/**
 * Lean version of DeviceHomeDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `DeviceDocument.toObject()`.
 * ```
 * const deviceObject = device.toObject();
 * ```
 */
export type DeviceHome = {
    homeId?: string;
    homeName?: string;
};
/**
 * Lean version of DeviceDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `DeviceDocument.toObject()`. To avoid conflicts with model names, use the type alias `DeviceObject`.
 * ```
 * const deviceObject = device.toObject();
 * ```
 */
export type Device = {
    name?: string;
    home?: DeviceHome;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of DeviceDocument (type alias of `Device`)
 *
 * Use this type alias to avoid conflicts with model names:
 * ```
 * import { Device } from "../models"
 * import { DeviceObject } from "../interfaces/mongoose.gen.ts"
 *
 * const deviceObject: DeviceObject = device.toObject();
 * ```
 */
export type DeviceObject = Device;
/**
 * Mongoose Query type
 *
 * This type is returned from query functions. For most use cases, you should not need to use this type explicitly.
 */
export type DeviceQuery = mongoose.Query<any, DeviceDocument, DeviceQueries> & DeviceQueries;
/**
 * Mongoose Query helper types
 *
 * This type represents `DeviceSchema.query`. For most use cases, you should not need to use this type explicitly.
 */
export type DeviceQueries = {};
export type DeviceMethods = {
    test: (this: DeviceDocument, ...args: any[]) => any;
};
export type DeviceStatics = {
    test: (this: DeviceModel, ...args: any[]) => any;
};
/**
 * Mongoose Model type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Device = mongoose.model<DeviceDocument, DeviceModel>("Device", DeviceSchema);
 * ```
 */
export type DeviceModel = mongoose.Model<DeviceDocument, DeviceQueries> & DeviceStatics;
/**
 * Mongoose Schema type
 *
 * Assign this type to new Device schema instances:
 * ```
 * const DeviceSchema: DeviceSchema = new mongoose.Schema({ ... })
 * ```
 */
export type DeviceSchema = mongoose.Schema<DeviceDocument, DeviceModel, DeviceMethods, DeviceQueries>;
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Device = mongoose.model<DeviceDocument, DeviceModel>("Device", DeviceSchema);
 * ```
 */
export type DeviceHomeDocument = mongoose.Document<any> & {
    homeId?: string;
    homeName?: string;
    status: any;
};
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Device = mongoose.model<DeviceDocument, DeviceModel>("Device", DeviceSchema);
 * ```
 */
export type DeviceDocument = mongoose.Document<mongoose.Types.ObjectId, DeviceQueries> & DeviceMethods & {
    name?: string;
    home?: DeviceHomeDocument;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of Device2HomeDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `Device2Document.toObject()`.
 * ```
 * const device2Object = device2.toObject();
 * ```
 */
export type Device2Home = {
    homeId?: string;
    homeName?: string;
};
/**
 * Lean version of Device2Document
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `Device2Document.toObject()`. To avoid conflicts with model names, use the type alias `Device2Object`.
 * ```
 * const device2Object = device2.toObject();
 * ```
 */
export type Device2 = {
    name?: string;
    home?: Device2Home;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of Device2Document (type alias of `Device2`)
 *
 * Use this type alias to avoid conflicts with model names:
 * ```
 * import { Device2 } from "../models"
 * import { Device2Object } from "../interfaces/mongoose.gen.ts"
 *
 * const device2Object: Device2Object = device2.toObject();
 * ```
 */
export type Device2Object = Device2;
/**
 * Mongoose Query type
 *
 * This type is returned from query functions. For most use cases, you should not need to use this type explicitly.
 */
export type Device2Query = mongoose.Query<any, Device2Document, Device2Queries> & Device2Queries;
/**
 * Mongoose Query helper types
 *
 * This type represents `Device2Schema.query`. For most use cases, you should not need to use this type explicitly.
 */
export type Device2Queries = {};
export type Device2Methods = {
    test: (this: Device2Document, ...args: any[]) => any;
};
export type Device2Statics = {
    test: (this: Device2Model, ...args: any[]) => any;
};
/**
 * Mongoose Model type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Device2 = mongoose.model<Device2Document, Device2Model>("Device2", Device2Schema);
 * ```
 */
export type Device2Model = mongoose.Model<Device2Document, Device2Queries> & Device2Statics;
/**
 * Mongoose Schema type
 *
 * Assign this type to new Device2 schema instances:
 * ```
 * const Device2Schema: Device2Schema = new mongoose.Schema({ ... })
 * ```
 */
export type Device2Schema = mongoose.Schema<Device2Document, Device2Model, Device2Methods, Device2Queries>;
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Device2 = mongoose.model<Device2Document, Device2Model>("Device2", Device2Schema);
 * ```
 */
export type Device2HomeDocument = mongoose.Document<any> & {
    homeId?: string;
    homeName?: string;
    status: any;
};
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Device2 = mongoose.model<Device2Document, Device2Model>("Device2", Device2Schema);
 * ```
 */
export type Device2Document = mongoose.Document<mongoose.Types.ObjectId, Device2Queries> & Device2Methods & {
    name?: string;
    home?: Device2HomeDocument;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of Device3HomeDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `Device3Document.toObject()`.
 * ```
 * const device3Object = device3.toObject();
 * ```
 */
export type Device3Home = {
    homeId?: string;
    homeName?: string;
};
/**
 * Lean version of Device3Document
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `Device3Document.toObject()`. To avoid conflicts with model names, use the type alias `Device3Object`.
 * ```
 * const device3Object = device3.toObject();
 * ```
 */
export type Device3 = {
    name?: string;
    home?: Device3Home;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of Device3Document (type alias of `Device3`)
 *
 * Use this type alias to avoid conflicts with model names:
 * ```
 * import { Device3 } from "../models"
 * import { Device3Object } from "../interfaces/mongoose.gen.ts"
 *
 * const device3Object: Device3Object = device3.toObject();
 * ```
 */
export type Device3Object = Device3;
/**
 * Mongoose Query type
 *
 * This type is returned from query functions. For most use cases, you should not need to use this type explicitly.
 */
export type Device3Query = mongoose.Query<any, Device3Document, Device3Queries> & Device3Queries;
/**
 * Mongoose Query helper types
 *
 * This type represents `Device3Schema.query`. For most use cases, you should not need to use this type explicitly.
 */
export type Device3Queries = {};
export type Device3Methods = {
    test: (this: Device3Document, ...args: any[]) => any;
};
export type Device3Statics = {
    test: (this: Device3Model, ...args: any[]) => any;
};
/**
 * Mongoose Model type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Device3 = mongoose.model<Device3Document, Device3Model>("Device3", Device3Schema);
 * ```
 */
export type Device3Model = mongoose.Model<Device3Document, Device3Queries> & Device3Statics;
/**
 * Mongoose Schema type
 *
 * Assign this type to new Device3 schema instances:
 * ```
 * const Device3Schema: Device3Schema = new mongoose.Schema({ ... })
 * ```
 */
export type Device3Schema = mongoose.Schema<Device3Document, Device3Model, Device3Methods, Device3Queries>;
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Device3 = mongoose.model<Device3Document, Device3Model>("Device3", Device3Schema);
 * ```
 */
export type Device3HomeDocument = mongoose.Document<any> & {
    homeId?: string;
    homeName?: string;
    status: any;
};
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Device3 = mongoose.model<Device3Document, Device3Model>("Device3", Device3Schema);
 * ```
 */
export type Device3Document = mongoose.Document<mongoose.Types.ObjectId, Device3Queries> & Device3Methods & {
    name?: string;
    home?: Device3HomeDocument;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of Device4HomeDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `Device4Document.toObject()`.
 * ```
 * const device4Object = device4.toObject();
 * ```
 */
export type Device4Home = {
    homeId?: string;
    homeName?: string;
};
/**
 * Lean version of Device4Document
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `Device4Document.toObject()`. To avoid conflicts with model names, use the type alias `Device4Object`.
 * ```
 * const device4Object = device4.toObject();
 * ```
 */
export type Device4 = {
    name?: string;
    home?: Device4Home;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of Device4Document (type alias of `Device4`)
 *
 * Use this type alias to avoid conflicts with model names:
 * ```
 * import { Device4 } from "../models"
 * import { Device4Object } from "../interfaces/mongoose.gen.ts"
 *
 * const device4Object: Device4Object = device4.toObject();
 * ```
 */
export type Device4Object = Device4;
/**
 * Mongoose Query type
 *
 * This type is returned from query functions. For most use cases, you should not need to use this type explicitly.
 */
export type Device4Query = mongoose.Query<any, Device4Document, Device4Queries> & Device4Queries;
/**
 * Mongoose Query helper types
 *
 * This type represents `Device4Schema.query`. For most use cases, you should not need to use this type explicitly.
 */
export type Device4Queries = {};
export type Device4Methods = {
    test: (this: Device4Document, ...args: any[]) => any;
};
export type Device4Statics = {
    test: (this: Device4Model, ...args: any[]) => any;
};
/**
 * Mongoose Model type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Device4 = mongoose.model<Device4Document, Device4Model>("Device4", Device4Schema);
 * ```
 */
export type Device4Model = mongoose.Model<Device4Document, Device4Queries> & Device4Statics;
/**
 * Mongoose Schema type
 *
 * Assign this type to new Device4 schema instances:
 * ```
 * const Device4Schema: Device4Schema = new mongoose.Schema({ ... })
 * ```
 */
export type Device4Schema = mongoose.Schema<Device4Document, Device4Model, Device4Methods, Device4Queries>;
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Device4 = mongoose.model<Device4Document, Device4Model>("Device4", Device4Schema);
 * ```
 */
export type Device4HomeDocument = mongoose.Document<any> & {
    homeId?: string;
    homeName?: string;
    status: any;
};
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const Device4 = mongoose.model<Device4Document, Device4Model>("Device4", Device4Schema);
 * ```
 */
export type Device4Document = mongoose.Document<mongoose.Types.ObjectId, Device4Queries> & Device4Methods & {
    name?: string;
    home?: Device4HomeDocument;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of DeviceDefaultHomeDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `DeviceDefaultDocument.toObject()`.
 * ```
 * const devicedefaultObject = devicedefault.toObject();
 * ```
 */
export type DeviceDefaultHome = {
    homeId?: string;
    homeName?: string;
};
/**
 * Lean version of DeviceDefaultDocument
 *
 * This has all Mongoose getters & functions removed. This type will be returned from `DeviceDefaultDocument.toObject()`. To avoid conflicts with model names, use the type alias `DeviceDefaultObject`.
 * ```
 * const devicedefaultObject = devicedefault.toObject();
 * ```
 */
export type DeviceDefault = {
    name?: string;
    home?: DeviceDefaultHome;
    _id: mongoose.Types.ObjectId;
};
/**
 * Lean version of DeviceDefaultDocument (type alias of `DeviceDefault`)
 *
 * Use this type alias to avoid conflicts with model names:
 * ```
 * import { DeviceDefault } from "../models"
 * import { DeviceDefaultObject } from "../interfaces/mongoose.gen.ts"
 *
 * const devicedefaultObject: DeviceDefaultObject = devicedefault.toObject();
 * ```
 */
export type DeviceDefaultObject = DeviceDefault;
/**
 * Mongoose Query type
 *
 * This type is returned from query functions. For most use cases, you should not need to use this type explicitly.
 */
export type DeviceDefaultQuery = mongoose.Query<any, DeviceDefaultDocument, DeviceDefaultQueries> & DeviceDefaultQueries;
/**
 * Mongoose Query helper types
 *
 * This type represents `DeviceDefaultSchema.query`. For most use cases, you should not need to use this type explicitly.
 */
export type DeviceDefaultQueries = {};
export type DeviceDefaultMethods = {
    test: (this: DeviceDefaultDocument) => string;
};
export type DeviceDefaultStatics = {
    test: (this: DeviceDefaultModel) => string;
};
/**
 * Mongoose Model type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const DeviceDefault = mongoose.model<DeviceDefaultDocument, DeviceDefaultModel>("DeviceDefault", DeviceDefaultSchema);
 * ```
 */
export type DeviceDefaultModel = mongoose.Model<DeviceDefaultDocument, DeviceDefaultQueries> & DeviceDefaultStatics;
/**
 * Mongoose Schema type
 *
 * Assign this type to new DeviceDefault schema instances:
 * ```
 * const DeviceDefaultSchema: DeviceDefaultSchema = new mongoose.Schema({ ... })
 * ```
 */
export type DeviceDefaultSchema = mongoose.Schema<DeviceDefaultDocument, DeviceDefaultModel, DeviceDefaultMethods, DeviceDefaultQueries>;
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const DeviceDefault = mongoose.model<DeviceDefaultDocument, DeviceDefaultModel>("DeviceDefault", DeviceDefaultSchema);
 * ```
 */
export type DeviceDefaultHomeDocument = mongoose.Document<any> & {
    homeId?: string;
    homeName?: string;
    status: any;
};
/**
 * Mongoose Document type
 *
 * Pass this type to the Mongoose Model constructor:
 * ```
 * const DeviceDefault = mongoose.model<DeviceDefaultDocument, DeviceDefaultModel>("DeviceDefault", DeviceDefaultSchema);
 * ```
 */
export type DeviceDefaultDocument = mongoose.Document<mongoose.Types.ObjectId, DeviceDefaultQueries> & DeviceDefaultMethods & {
    name?: string;
    home?: DeviceDefaultHomeDocument;
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
