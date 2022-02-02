import * as parser from "../parser";
import mongoose from "mongoose";

describe("getParseKeyFn", () => {
  test("handles untyped Array equivalents as `any[]`", () => {
    // see https://mongoosejs.com/docs/schematypes.html#arrays
    const parseKey = parser.getParseKeyFn(false, false, false);

    expect(parseKey("test1a", { type: [mongoose.Schema.Types.Mixed] })).toBe("test1a: any[];\n");
    expect(parseKey("test1b", [mongoose.Schema.Types.Mixed])).toBe("test1b: any[];\n");

    expect(parseKey("test2a", { type: [] })).toBe("test2a: any[];\n");
    expect(parseKey("test2b", [])).toBe("test2b: any[];\n");

    expect(parseKey("test3a", { type: Array })).toBe("test3a: any[];\n");
    expect(parseKey("test3b", Array)).toBe("test3b: any[];\n");

    expect(parseKey("test4a", { type: [{}] })).toBe("test4a: any[];\n");
    expect(parseKey("test4b", [{}])).toBe("test4b: any[];\n");
  });

  test("handles Object equivalents as `any`", () => {
    // see https://mongoosejs.com/docs/schematypes.html#mixed
    const parseKey = parser.getParseKeyFn(false, false, false);

    expect(parseKey("test1a", { type: mongoose.Schema.Types.Mixed })).toBe("test1a?: any;\n");
    expect(parseKey("test1b", mongoose.Schema.Types.Mixed)).toBe("test1b?: any;\n");
    expect(parseKey("test1c", { type: mongoose.Schema.Types.Mixed, required: true })).toBe(
      "test1c: any;\n"
    );

    expect(parseKey("test2a", { type: {} })).toBe("test2a?: any;\n");
    expect(parseKey("test2b", {})).toBe("test2b?: any;\n");
    expect(parseKey("test2c", { type: {}, required: true })).toBe("test2c: any;\n");

    expect(parseKey("test3a", { type: Object })).toBe("test3a?: any;\n");
    expect(parseKey("test3b", Object)).toBe("test3b?: any;\n");
    expect(parseKey("test3c", { type: Object, required: true })).toBe("test3c: any;\n");
  });

  test("handles 2dsphere index edge case", () => {
    const parseKey = parser.getParseKeyFn(false, false, false);

    // should be optional; not required like normal arrays
    expect(parseKey("test1a", { type: [Number], index: "2dsphere" })).toBe("test1a?: number[];\n");
    // should be required, as usual
    expect(parseKey("test2a", { type: [Number] })).toBe("test2a: number[];\n");
  });
});

describe("convertToSingular", () => {
  it("should properly convert words ending in sses", () => {
    expect(parser.convertToSingular("glasses")).toBe("glass");
    expect(parser.convertToSingular("classes")).toBe("class");
  });

  it("should properly convert plural words", () => {
    expect(parser.convertToSingular("houses")).toBe("house");
    expect(parser.convertToSingular("users")).toBe("user");
  });

  it("should not convert words ending in ss", () => {
    expect(parser.convertToSingular("grass")).toBe("grass");
  });
});
