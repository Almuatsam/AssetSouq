import { runDrawSchema } from "../src/validators/adminDrawValidators";

describe("runDrawSchema", () => {
  it("accepts a valid deviceId", () => {
    // Act / Assert
    expect(runDrawSchema.parse({ deviceId: 1 })).toEqual({ deviceId: 1 });
  });

  it("coerces a deviceId string", () => {
    // Act / Assert
    expect(runDrawSchema.parse({ deviceId: "5" })).toEqual({ deviceId: 5 });
  });

  it("rejects a missing deviceId", () => {
    // Act / Assert
    expect(() => runDrawSchema.parse({})).toThrow();
  });

  it("rejects a zero or negative deviceId", () => {
    // Act / Assert
    expect(() => runDrawSchema.parse({ deviceId: 0 })).toThrow();
    expect(() => runDrawSchema.parse({ deviceId: -1 })).toThrow();
  });
});
