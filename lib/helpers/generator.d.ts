import { SourceFile } from "ts-morph";
import { TsReaderModelTypes } from "../types";
import { MongooseModel } from "../parser/types";
export declare const cleanComment: (comment: string) => string;
export declare const sanitizeModelName: (name: string) => string;
export declare const convertFuncSignatureToType: (funcSignature: string, funcType: "query" | "methods" | "statics", modelName: string) => string;
export declare const replaceModelTypes: (sourceFile: SourceFile, modelTypes: TsReaderModelTypes, models: MongooseModel[]) => void;
export declare const addPopulateHelpers: (sourceFile: SourceFile) => void;
export declare const overloadQueryPopulate: (sourceFile: SourceFile) => void;
export declare const createSourceFile: (genPath: string) => SourceFile;
export declare const parseFunctions: (funcs: {
    [key: string]: () => any;
}, modelName: string, funcType: "methods" | "statics" | "query") => string;
export declare const getSchemaTypes: (model: MongooseModel) => string;
export declare const generateTypes: ({ sourceFile, imports, modelsPaths, noMongoose, datesAsStrings }: {
    sourceFile: SourceFile;
    modelsPaths: string[];
    imports?: string[];
    noMongoose: boolean;
    datesAsStrings: boolean;
}) => Promise<SourceFile>;
export declare const saveFile: ({ sourceFile }: {
    sourceFile: SourceFile;
    generatedFilePath: string;
}) => void;
