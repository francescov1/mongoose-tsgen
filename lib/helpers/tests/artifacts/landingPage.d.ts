import mongoose from 'mongoose';
export declare const Landing: mongoose.Model<{
    models: mongoose.Types.DocumentArray<{
        name?: string | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        name?: string | null | undefined;
    }> & {
        name?: string | null | undefined;
    }>;
    brand?: string | null | undefined;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    models: mongoose.Types.DocumentArray<{
        name?: string | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        name?: string | null | undefined;
    }> & {
        name?: string | null | undefined;
    }>;
    brand?: string | null | undefined;
}, {}, mongoose.DefaultSchemaOptions> & {
    models: mongoose.Types.DocumentArray<{
        name?: string | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        name?: string | null | undefined;
    }> & {
        name?: string | null | undefined;
    }>;
    brand?: string | null | undefined;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    models: mongoose.Types.DocumentArray<{
        name?: string | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        name?: string | null | undefined;
    }> & {
        name?: string | null | undefined;
    }>;
    brand?: string | null | undefined;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    models: mongoose.Types.DocumentArray<{
        name?: string | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        name?: string | null | undefined;
    }> & {
        name?: string | null | undefined;
    }>;
    brand?: string | null | undefined;
}>, {}, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & mongoose.FlatRecord<{
    models: mongoose.Types.DocumentArray<{
        name?: string | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        name?: string | null | undefined;
    }> & {
        name?: string | null | undefined;
    }>;
    brand?: string | null | undefined;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export default Landing;
