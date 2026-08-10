import { createDeviceSchema, listDevicesQuerySchema, updateDeviceSchema } from "../src/validators/adminDeviceValidators";

const validDevice = {
  assetTag: "AST-001",
  deviceType: "Laptop",
  brand: "Dell",
  model: "Latitude 5420",
  price: 150,
};

describe("createDeviceSchema", () => {
  it("accepts a minimal valid device and defaults quantity to 1", () => {
    // Act
    const result = createDeviceSchema.parse(validDevice);

    // Assert
    expect(result.quantity).toBe(1);
  });

  it("accepts a price with exactly 2 decimal places", () => {
    // Act / Assert
    expect(() => createDeviceSchema.parse({ ...validDevice, price: 150.5 })).not.toThrow();
  });

  // Regression: v * 100 in IEEE-754 float is 1998.9999999999998, not
  // 1999 — a naive Number.isInteger(v * 100) check falsely rejects this
  // extremely common price shape. Caught in review before merge.
  it("accepts an ordinary x.99 price despite floating-point imprecision", () => {
    // Act / Assert
    expect(() => createDeviceSchema.parse({ ...validDevice, price: 19.99 })).not.toThrow();
    expect(() => createDeviceSchema.parse({ ...validDevice, price: 1234567.89 })).not.toThrow();
  });

  it("rejects a price with more than 2 decimal places", () => {
    // Act / Assert
    expect(() => createDeviceSchema.parse({ ...validDevice, price: 150.999 })).toThrow(
      /at most 2 decimal places/i,
    );
  });

  it("rejects a zero or negative price", () => {
    // Act / Assert
    expect(() => createDeviceSchema.parse({ ...validDevice, price: 0 })).toThrow();
    expect(() => createDeviceSchema.parse({ ...validDevice, price: -10 })).toThrow();
  });

  it("rejects a price beyond the DECIMAL(10,2) column's range", () => {
    // Act / Assert
    expect(() => createDeviceSchema.parse({ ...validDevice, price: 100_000_000 })).toThrow();
  });

  it("rejects a non-finite price (e.g. scientific-notation overflow)", () => {
    // Act / Assert — "1e300" parses to a finite-looking float with no
    // fractional part, so it must be caught by the explicit max() bound,
    // not just the decimal-places refinement.
    expect(() => createDeviceSchema.parse({ ...validDevice, price: "1e300" })).toThrow();
  });

  it("rejects a quantity or yearsUsed beyond their sane upper bounds", () => {
    // Act / Assert
    expect(() => createDeviceSchema.parse({ ...validDevice, quantity: 1_000_000 })).toThrow();
    expect(() => createDeviceSchema.parse({ ...validDevice, yearsUsed: 500 })).toThrow();
  });

  it("rejects a missing required field", () => {
    // Act / Assert
    expect(() => createDeviceSchema.parse({ ...validDevice, brand: undefined })).toThrow();
  });

  it("rejects a purchaseYear in the future", () => {
    // Act / Assert
    expect(() =>
      createDeviceSchema.parse({ ...validDevice, purchaseYear: new Date().getFullYear() + 1 }),
    ).toThrow();
  });
});

describe("updateDeviceSchema", () => {
  it("accepts a single-field partial update", () => {
    // Act / Assert
    expect(() => updateDeviceSchema.parse({ price: 175 })).not.toThrow();
  });

  it("accepts a status-only update", () => {
    // Act / Assert
    expect(() => updateDeviceSchema.parse({ status: "REMOVED" })).not.toThrow();
  });

  it("rejects an empty update (nothing to change)", () => {
    // Act / Assert
    expect(() => updateDeviceSchema.parse({})).toThrow(/at least one field/i);
  });

  it("rejects an invalid status value", () => {
    // Act / Assert
    expect(() => updateDeviceSchema.parse({ status: "NOT_A_STATUS" })).toThrow();
  });

  it("does not accept assetTag as an updatable field", () => {
    // Act
    const result = updateDeviceSchema.parse({ assetTag: "AST-999", price: 100 });

    // Assert — unknown keys are stripped by Zod's default object parsing.
    expect(result).not.toHaveProperty("assetTag");
  });
});

describe("listDevicesQuerySchema", () => {
  it("accepts no filter", () => {
    // Act / Assert
    expect(() => listDevicesQuerySchema.parse({})).not.toThrow();
  });

  it("accepts a valid status filter", () => {
    // Act / Assert
    expect(listDevicesQuerySchema.parse({ status: "SOLD" })).toEqual({ status: "SOLD" });
  });

  it("rejects an invalid status filter", () => {
    // Act / Assert
    expect(() => listDevicesQuerySchema.parse({ status: "BOGUS" })).toThrow();
  });
});
