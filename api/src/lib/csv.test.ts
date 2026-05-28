import { describe, expect, it } from "vitest";
import { csvField, toCSV } from "./csv";

describe("csvField", () => {
  it("passes plain values through", () => {
    expect(csvField("hello")).toBe("hello");
    expect(csvField(4.5)).toBe("4.5");
    expect(csvField(true)).toBe("true");
  });

  it("renders null/undefined as empty", () => {
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
  });

  it("quotes fields containing a comma", () => {
    expect(csvField("Earth, Wind & Fire")).toBe('"Earth, Wind & Fire"');
  });

  it("quotes and doubles internal quotes", () => {
    expect(csvField('She said "encore"')).toBe('"She said ""encore"""');
  });

  it("quotes fields containing newlines", () => {
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("toCSV", () => {
  it("joins headers and rows with CRLF", () => {
    const out = toCSV(["a", "b"], [
      ["1", "2"],
      ["3", "4"],
    ]);
    expect(out).toBe("a,b\r\n1,2\r\n3,4");
  });

  it("escapes review text with commas and quotes", () => {
    const out = toCSV(["title", "review"], [
      ["Kid A", 'A pivot — "guitars set down."'],
      ["In Rainbows, deluxe", "Warm, restrained."],
    ]);
    expect(out).toBe(
      'title,review\r\n' +
        'Kid A,"A pivot — ""guitars set down."""\r\n' +
        '"In Rainbows, deluxe","Warm, restrained."',
    );
  });

  it("handles an empty row set (headers only)", () => {
    expect(toCSV(["x"], [])).toBe("x");
  });
});
