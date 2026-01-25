import mongoose, { Schema } from "mongoose";
import {
  ModelADocument,
  ModelAModel,
  ModelASchema,
  ModelBDocument,
  ModelBModel,
  ModelBSchema
} from "./virtualPopulate.gen";

// ModelB Schema - the referenced model
const ModelBSchema: ModelBSchema = new Schema(
  {
    bar: {
      type: Schema.Types.ObjectId,
      required: true
    },
    baz: {
      type: String,
      required: true
    }
  },
  {
    toObject: {
      virtuals: true
    }
  }
);

export const ModelB: ModelBModel = mongoose.model<ModelBDocument, ModelBModel>(
  "ModelB",
  ModelBSchema
);

// ModelA Schema - has virtual populate refs to ModelB
const ModelASchema: ModelASchema = new Schema(
  {
    foo: {
      type: String,
      required: true
    },
    bar: {
      type: Schema.Types.ObjectId,
      required: true
    }
  },
  {
    toObject: {
      virtuals: true
    }
  }
);

// Virtual populate: returns array of ModelB documents (justOne: false is default)
ModelASchema.virtual("items", {
  ref: "ModelB",
  localField: "bar",
  foreignField: "bar",
  justOne: false
});

// Virtual populate: returns single ModelB document or null
ModelASchema.virtual("item", {
  ref: "ModelB",
  localField: "bar",
  foreignField: "bar",
  justOne: true
});

// Virtual populate: returns count of matching documents
ModelASchema.virtual("itemCount", {
  ref: "ModelB",
  localField: "bar",
  foreignField: "bar",
  count: true
});

export const ModelA: ModelAModel = mongoose.model<ModelADocument, ModelAModel>(
  "ModelA",
  ModelASchema
);
