import { convertToSingular, parseKey } from "../utils";
import mongoose from "mongoose";

describe("parseKey", () => {
  test("handles untyped Array equivalents as `any[]`", () => {
    const genericParseKeyParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: false
    };
    // see https://mongoosejs.com/docs/schematypes.html#arrays

    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test1a",
        val: { type: [mongoose.Schema.Types.Mixed] }
      })
    ).toBe("test1a: any[];\n");

    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test1b",
        val: [mongoose.Schema.Types.Mixed]
      })
    ).toBe("test1b: any[];\n");

    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test2a",
        val: { type: [] }
      })
    ).toBe("test2a: any[];\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test2b",
        val: []
      })
    ).toBe("test2b: any[];\n");

    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test3a",
        val: { type: Array }
      })
    ).toBe("test3a: any[];\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test3b",
        val: Array
      })
    ).toBe("test3b: any[];\n");

    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test4a",
        val: { type: [{}] }
      })
    ).toBe("test4a: any[];\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test4b",
        val: [{}]
      })
    ).toBe("test4b: any[];\n");
  });

  test("handles Object equivalents as `any`", () => {
    // see https://mongoosejs.com/docs/schematypes.html#mixed
    const genericParseKeyParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: false
    };

    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test1a",
        val: { type: mongoose.Schema.Types.Mixed }
      })
    ).toBe("test1a?: any;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test1b",
        val: mongoose.Schema.Types.Mixed
      })
    ).toBe("test1b?: any;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test1c",
        val: { type: mongoose.Schema.Types.Mixed, required: true }
      })
    ).toBe("test1c: any;\n");

    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test2a",
        val: { type: {} }
      })
    ).toBe("test2a?: any;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test2b",
        val: {}
      })
    ).toBe("test2b?: any;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test2c",
        val: { type: {}, required: true }
      })
    ).toBe("test2c: any;\n");

    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test3a",
        val: { type: Object }
      })
    ).toBe("test3a?: any;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test3b",
        val: Object
      })
    ).toBe("test3b?: any;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test3c",
        val: { type: Object, required: true }
      })
    ).toBe("test3c: any;\n");
  });

  test("handles 2dsphere index edge case", () => {
    const genericParseKeyParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: false
    };

    // should be optional; not required like normal arrays
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test1a",
        val: { type: [Number], index: "2dsphere" }
      })
    ).toBe("test1a?: number[];\n");
    // should be required, as usual
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test2a",
        val: { type: [Number] }
      })
    ).toBe("test2a: number[];\n");
  });

  test("handles Schematypes", () => {
    const genericParseKeyParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: false
    };

    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test1a",
        val: { type: mongoose.Schema.Types.String }
      })
    ).toBe("test1a?: string;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test1b",
        val: { type: mongoose.Schema.Types.Number }
      })
    ).toBe("test1b?: number;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test1c",
        val: { type: mongoose.Schema.Types.Date }
      })
    ).toBe("test1c?: Date;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test1d",
        val: { type: mongoose.Schema.Types.Boolean }
      })
    ).toBe("test1d?: boolean;\n");

    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test2a",
        val: mongoose.Schema.Types.String
      })
    ).toBe("test2a?: string;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test2b",
        val: mongoose.Schema.Types.Number
      })
    ).toBe("test2b?: number;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test2c",
        val: mongoose.Schema.Types.Date
      })
    ).toBe("test2c?: Date;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test2d",
        val: mongoose.Schema.Types.Boolean
      })
    ).toBe("test2d?: boolean;\n");
  });

  test("handles references and mongoose-autopopulate", () => {
    const genericParseKeyParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: false
    };

    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test1a",
        val: { type: mongoose.Schema.Types.ObjectId, ref: "RefTest" }
      })
    ).toBe('test1a?: RefTest["_id"] | RefTest;\n');
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "test1b",
        val: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "RefTest",
          autopopulate: false
        }
      })
    ).toBe('test1b?: RefTest["_id"] | RefTest;\n');
    expect(
      parseKey({
        ...genericParseKeyParams,
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
    const genericParseKeyParams = {
      isDocument: false,
      shouldLeanIncludeVirtuals: false,
      noMongoose: false,
      datesAsStrings: true
    };

    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "aDate",
        val: Date
      })
    ).toBe("aDate?: string;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "aDateType",
        val: { type: Date }
      })
    ).toBe("aDateType?: string;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "aDateString",
        val: "Date"
      })
    ).toBe("aDateString?: string;\n");
    expect(
      parseKey({
        ...genericParseKeyParams,
        key: "aDateTypeString",
        val: { type: "Date" }
      })
    ).toBe("aDateTypeString?: string;\n");
  });
});

describe("convertToSingular", () => {
  it("should properly convert words ending in sses", () => {
    expect(convertToSingular("glasses")).toBe("glass");
    expect(convertToSingular("classes")).toBe("class");
  });

  it("should properly convert plural words", () => {
    expect(convertToSingular("houses")).toBe("house");
    expect(convertToSingular("users")).toBe("user");
  });

  it("should not convert words ending in ss", () => {
    expect(convertToSingular("grass")).toBe("grass");
  });
});
