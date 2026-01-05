import mongoose from 'mongoose';
import { DeviceDocument, DeviceModel, HomeDocument } from './device.gen';
export declare const home: mongoose.Model<HomeDocument, import("./device.gen").HomeQueries, {}, {}, mongoose.Document<unknown, import("./device.gen").HomeQueries, HomeDocument, {}, {}> & mongoose.Document<any, import("./device.gen").HomeQueries, any, Record<string, any>, {}> & {
    homeId?: string;
    homeName?: string;
    status: string;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, any>;
export declare const device: DeviceModel;
export declare const device2: mongoose.Model<DeviceDocument, {}, {}, {}, mongoose.Document<unknown, {}, DeviceDocument, {}, {}> & mongoose.Document<mongoose.Types.ObjectId, import("./device.gen").DeviceQueries, any, Record<string, any>, {}> & import("./device.gen").DeviceMethods & {
    name?: string;
    home?: import("./device.gen").DeviceHomeDocument;
    _id: mongoose.Types.ObjectId;
} & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const device3: DeviceModel;
export declare const device4: mongoose.Model<DeviceDocument, {}, {}, {}, mongoose.Document<unknown, {}, DeviceDocument, {}, {}> & mongoose.Document<mongoose.Types.ObjectId, import("./device.gen").DeviceQueries, any, Record<string, any>, {}> & import("./device.gen").DeviceMethods & {
    name?: string;
    home?: import("./device.gen").DeviceHomeDocument;
    _id: mongoose.Types.ObjectId;
} & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
declare const _default: DeviceModel;
export default _default;
