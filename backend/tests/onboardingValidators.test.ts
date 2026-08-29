import { updateOnboardingSchema } from "../src/validators/onboardingValidators";

describe("updateOnboardingSchema", () => {
  it("accepts an empty body", () => {
    // Act
    const result = updateOnboardingSchema.parse({});

    // Assert
    expect(result).toEqual({});
  });

  it("accepts a valid action", () => {
    // Act
    const result = updateOnboardingSchema.parse({ action: "restart" });

    // Assert
    expect(result).toEqual({ action: "restart" });
  });

  it("rejects an invalid action", () => {
    // Act / Assert
    expect(() => updateOnboardingSchema.parse({ action: "pause" })).toThrow();
  });

  it("accepts currentStepId: null to clear the resume position", () => {
    // Act
    const result = updateOnboardingSchema.parse({ currentStepId: null });

    // Assert
    expect(result).toEqual({ currentStepId: null });
  });

  it("accepts a partial checklist patch", () => {
    // Act
    const result = updateOnboardingSchema.parse({ checklist: { items: { browseDevices: true } } });

    // Assert
    expect(result).toEqual({ checklist: { items: { browseDevices: true } } });
  });

  it("rejects an unknown top-level field (schema is .strict())", () => {
    // Act / Assert
    expect(() => updateOnboardingSchema.parse({ notARealField: 1 })).toThrow();
  });

  it("rejects a non-positive tourVersion", () => {
    // Act / Assert
    expect(() => updateOnboardingSchema.parse({ tourVersion: 0 })).toThrow();
  });
});
