/**
 * Contains information parsed from ts-morph about various types for each model
 */
export type TsReaderModelTypes = {
    [modelName: string]: {
        /** mongoose method function types */
        methods: {
            [funcName: string]: string;
        };
        /** mongoose static function types */
        statics: {
            [funcName: string]: string;
        };
        /** mongoose query function types */
        query: {
            [funcName: string]: string;
        };
        /** mongoose virtual types */
        virtuals: {
            [virtualName: string]: string;
        };
        schemaVariableName?: string;
        modelVariableName?: string;
        filePath: string;
        /** comments found in the mongoose schema */
        comments: {
            path: string;
            comment: string;
        }[];
    };
};
type UndefinedKeys<T> = {
    [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];
type MarkOptional<T, K extends keyof T = UndefinedKeys<T>> = Omit<T, K> & Partial<Pick<T, K>>;
type Resolve<T> = {
    [K in keyof T]: T[K];
};
export type Normalize<T> = Resolve<MarkOptional<T>>;
export {};
