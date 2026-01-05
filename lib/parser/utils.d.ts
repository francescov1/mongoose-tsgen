import mongoose from "mongoose";
import { MongooseModel } from "./types";
export declare const getSubdocName: (path: string, modelName?: string) => string;
export declare const isMapType: (val: any) => boolean;
export declare const convertBaseTypeToTs: ({ key, val, isDocument, noMongoose, datesAsStrings }: {
    key: string;
    val: any;
    isDocument: boolean;
    noMongoose: boolean;
    datesAsStrings: boolean;
}) => string | undefined;
export declare const getShouldLeanIncludeVirtuals: (schema: any) => boolean;
export declare const BASE_TYPES: Set<string | ObjectConstructor | StringConstructor | typeof mongoose.Schema.Types.String | NumberConstructor | typeof mongoose.Schema.Types.Number | DateConstructor | typeof mongoose.Schema.Types.Date | BooleanConstructor | typeof mongoose.Schema.Types.Boolean | typeof mongoose.Schema.Types.ObjectId | MapConstructor | {
    new (str: string, encoding?: string): Buffer;
    new (size: number): Buffer;
    new (array: Uint8Array): Buffer;
    new (arrayBuffer: ArrayBuffer | SharedArrayBuffer): Buffer;
    new (array: any[]): Buffer;
    new (buffer: Buffer): Buffer;
    prototype: Buffer;
    from(arrayBuffer: ArrayBuffer | SharedArrayBuffer, byteOffset?: number, length?: number): Buffer;
    from(data: any[]): Buffer;
    from(data: Uint8Array): Buffer;
    from(obj: {
        valueOf(): string | object;
    } | {
        [Symbol.toPrimitive](hint: "string"): string;
    }, byteOffset?: number, length?: number): Buffer;
    from(str: string, encoding?: string): Buffer;
    of(...items: number[]): Buffer;
    isBuffer(obj: any): obj is Buffer;
    isEncoding(encoding: string): boolean | undefined;
    byteLength(string: string | NodeJS.TypedArray | DataView | ArrayBuffer | SharedArrayBuffer, encoding?: string): number;
    concat(list: Uint8Array[], totalLength?: number): Buffer;
    compare(buf1: Uint8Array, buf2: Uint8Array): number;
    alloc(size: number, fill?: string | Buffer | number, encoding?: string): Buffer;
    allocUnsafe(size: number): Buffer;
    allocUnsafeSlow(size: number): Buffer;
    poolSize: number;
} | typeof mongoose.Schema.Types.Decimal128 | typeof mongoose.Schema.Types.Buffer | typeof mongoose.Schema.Types.Map | typeof mongoose.Types.ObjectId | typeof mongoose.Types.Decimal128>;
export declare const loadModels: (modelsPaths: string[]) => Promise<MongooseModel[]>;
export declare const getTypeFromKeyValue: ({ key, val: valOriginal, isDocument, shouldLeanIncludeVirtuals, noMongoose, datesAsStrings }: {
    key: string;
    val: any;
    isDocument: boolean;
    shouldLeanIncludeVirtuals: boolean;
    noMongoose: boolean;
    datesAsStrings: boolean;
}) => string;
