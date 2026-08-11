import { redrawWinnerSchema, runDrawSchema } from "../src/validators/adminDrawValidators";

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

describe("redrawWinnerSchema", () => {
  it.each(["DECLINED", "NON_PAYMENT", "NO_SHOW", "ADMIN_OVERRIDE"])("accepts reason %s", (reason) => {
    // Act / Assert
    expect(() => redrawWinnerSchema.parse({ reason })).not.toThrow();
  });

  it("rejects a missing reason", () => {
    // Act / Assert
    expect(() => redrawWinnerSchema.parse({})).toThrow();
  });

  it("rejects an invalid reason", () => {
    // Act / Assert
    expect(() => redrawWinnerSchema.parse({ reason: "BOGUS" })).toThrow();
  });
});
