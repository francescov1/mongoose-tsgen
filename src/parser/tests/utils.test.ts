import { getTypeFromKeyValue } from "../utils";
import mongoose from "mongoose";

describe("getTypeFromKeyValue", () => {
  test("handles untyped Array equivalents as `any[]`", () => {
    const genericParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: false,
      rootSchemaTree: {}
    };
    // see https://mongoosejs.com/docs/schematypes.html#arrays

    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test1a",
        val: { type: [mongoose.Schema.Types.Mixed] }
      })
    ).toBe("test1a: any[];\n");

    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test1b",
        val: [mongoose.Schema.Types.Mixed]
      })
    ).toBe("test1b: any[];\n");

    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test2a",
        val: { type: [] }
      })
    ).toBe("test2a: any[];\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test2b",
        val: []
      })
    ).toBe("test2b: any[];\n");

    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test3a",
        val: { type: Array }
      })
    ).toBe("test3a: any[];\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test3b",
        val: Array
      })
    ).toBe("test3b: any[];\n");

    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test4a",
        val: { type: [{}] }
      })
    ).toBe("test4a: any[];\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test4b",
        val: [{}]
      })
    ).toBe("test4b: any[];\n");
  });

  test("handles Object equivalents as `any`", () => {
    // see https://mongoosejs.com/docs/schematypes.html#mixed
    const genericParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: false,
      rootSchemaTree: {}
    };

    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test1a",
        val: { type: mongoose.Schema.Types.Mixed }
      })
    ).toBe("test1a?: any;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test1b",
        val: mongoose.Schema.Types.Mixed
      })
    ).toBe("test1b?: any;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test1c",
        val: { type: mongoose.Schema.Types.Mixed, required: true }
      })
    ).toBe("test1c: any;\n");

    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test2a",
        val: { type: {} }
      })
    ).toBe("test2a?: any;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test2b",
        val: {}
      })
    ).toBe("test2b?: any;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test2c",
        val: { type: {}, required: true }
      })
    ).toBe("test2c: any;\n");

    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test3a",
        val: { type: Object }
      })
    ).toBe("test3a?: any;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test3b",
        val: Object
      })
    ).toBe("test3b?: any;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test3c",
        val: { type: Object, required: true }
      })
    ).toBe("test3c: any;\n");
  });

  test("handles 2dsphere index edge case", () => {
    const genericParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: false,
      rootSchemaTree: {}
    };

    // should be optional; not required like normal arrays
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test1a",
        val: { type: [Number], index: "2dsphere" }
      })
    ).toBe("test1a?: number[];\n");
    // should be required, as usual
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test2a",
        val: { type: [Number] }
      })
    ).toBe("test2a: number[];\n");
  });

  test("handles Schematypes", () => {
    const genericParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: false,
      rootSchemaTree: {}
    };

    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test1a",
        val: { type: mongoose.Schema.Types.String }
      })
    ).toBe("test1a?: string;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test1b",
        val: { type: mongoose.Schema.Types.Number }
      })
    ).toBe("test1b?: number;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test1c",
        val: { type: mongoose.Schema.Types.Date }
      })
    ).toBe("test1c?: Date;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test1d",
        val: { type: mongoose.Schema.Types.Boolean }
      })
    ).toBe("test1d?: boolean;\n");

    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test2a",
        val: mongoose.Schema.Types.String
      })
    ).toBe("test2a?: string;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test2b",
        val: mongoose.Schema.Types.Number
      })
    ).toBe("test2b?: number;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test2c",
        val: mongoose.Schema.Types.Date
      })
    ).toBe("test2c?: Date;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test2d",
        val: mongoose.Schema.Types.Boolean
      })
    ).toBe("test2d?: boolean;\n");
  });

  test("handles references and mongoose-autopopulate", () => {
    const genericParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: false,
      rootSchemaTree: {}
    };

    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test1a",
        val: { type: mongoose.Schema.Types.ObjectId, ref: "RefTest" }
      })
    ).toBe('test1a?: RefTest["_id"] | RefTest;\n');
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test1b",
        val: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "RefTest",
          autopopulate: false
        }
      })
    ).toBe('test1b?: RefTest["_id"] | RefTest;\n');
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "test1c",
        val: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "RefTest",
          autopopulate: true
        }
      })
    ).toBe("test1c?: RefTest;\n");
  });

  test("handles dates as strings", () => {
    // see https://mongoosejs.com/docs/schematypes.html#arrays
    const genericParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: true,
      rootSchemaTree: {}
    };

    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "aDate",
        val: Date
      })
    ).toBe("aDate?: string;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "aDateType",
        val: { type: Date }
      })
    ).toBe("aDateType?: string;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "aDateString",
        val: "Date"
      })
    ).toBe("aDateString?: string;\n");
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "aDateTypeString",
        val: { type: "Date" }
      })
    ).toBe("aDateTypeString?: string;\n");
  });

  test("handles refPath dynamic references", () => {
    const rootSchemaTree = {
      scenario_type: {
        type: String,
        enum: ["ModelA", "ModelB", "ModelC"]
      }
    };
    const genericParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: false,
      rootSchemaTree
    };

    // Basic refPath
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "scenario",
        val: { type: mongoose.Schema.Types.ObjectId, refPath: "scenario_type" }
      })
    ).toBe(
      'scenario?: ModelA["_id"] | ModelA | ModelB["_id"] | ModelB | ModelC["_id"] | ModelC;\n'
    );

    // refPath with autopopulate
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "scenario",
        val: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "scenario_type",
          autopopulate: true
        }
      })
    ).toBe("scenario?: ModelA | ModelB | ModelC;\n");

    // refPath in document mode
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        isDocument: true,
        key: "scenario",
        val: { type: mongoose.Schema.Types.ObjectId, refPath: "scenario_type" }
      })
    ).toBe(
      'scenario?: ModelADocument["_id"] | ModelADocument | ModelBDocument["_id"] | ModelBDocument | ModelCDocument["_id"] | ModelCDocument;\n'
    );
  });

  test("handles refPath in nested array format with validation", () => {
    // This tests the fix for refPath hoisting in nested array format
    // e.g., { type: [{ type: ObjectId, refPath: "..." }], validate: [...] }
    const rootSchemaTree = {
      item_type: {
        type: String,
        enum: ["Product", "Service"]
      }
    };
    const genericParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: false,
      rootSchemaTree
    };

    // Nested array format with refPath (the format that was previously broken)
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "items",
        val: {
          type: [
            {
              type: mongoose.Schema.Types.ObjectId,
              refPath: "item_type"
            }
          ],
          validate: [() => true]
        }
      })
    ).toBe('items: (Product["_id"] | Product | Service["_id"] | Service)[];\n');

    // Nested array format with refPath and autopopulate
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "items",
        val: {
          type: [
            {
              type: mongoose.Schema.Types.ObjectId,
              refPath: "item_type",
              autopopulate: true
            }
          ],
          validate: [() => true]
        }
      })
    ).toBe("items: (Product | Service)[];\n");
  });

  test("handles refPath fallback when discriminator not found", () => {
    const genericParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: false,
      rootSchemaTree: {} // Empty schema tree - discriminator won't be found
    };

    // Should fallback to ObjectId when discriminator field is not found
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        key: "scenario",
        val: { type: mongoose.Schema.Types.ObjectId, refPath: "missing_field" }
      })
    ).toBe("scenario?: mongoose.Types.ObjectId;\n");

    // Document mode should include mongoose.Document in fallback
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        isDocument: true,
        key: "scenario",
        val: { type: mongoose.Schema.Types.ObjectId, refPath: "missing_field" }
      })
    ).toBe("scenario?: mongoose.Types.ObjectId | mongoose.Document;\n");

    // noMongoose mode should fallback to string
    expect(
      getTypeFromKeyValue({
        ...genericParams,
        noMongoose: true,
        key: "scenario",
        val: { type: mongoose.Schema.Types.ObjectId, refPath: "missing_field" }
      })
    ).toBe("scenario?: string;\n");
  });
});
