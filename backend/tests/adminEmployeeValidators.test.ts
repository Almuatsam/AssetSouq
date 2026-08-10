import {
  createEmployeeSchema,
  listEmployeesQuerySchema,
  updateEmployeeSchema,
} from "../src/validators/adminEmployeeValidators";

const validEmployee = {
  staffNumber: "S1001",
  name: "Jane Doe",
  department: "Engineering",
  email: "jane.doe@example.com",
};

describe("createEmployeeSchema", () => {
  it("accepts a minimal valid employee", () => {
    // Act / Assert
    expect(() => createEmployeeSchema.parse(validEmployee)).not.toThrow();
  });

  it("accepts optional laptopHolder/eligible flags", () => {
    // Act
    const result = createEmployeeSchema.parse({ ...validEmployee, laptopHolder: true, eligible: false });

    // Assert
    expect(result.laptopHolder).toBe(true);
    expect(result.eligible).toBe(false);
  });

  it("rejects an invalid email address", () => {
    // Act / Assert
    expect(() => createEmployeeSchema.parse({ ...validEmployee, email: "not-an-email" })).toThrow();
  });

  it("rejects a missing required field", () => {
    // Act / Assert
    expect(() => createEmployeeSchema.parse({ ...validEmployee, name: undefined })).toThrow();
  });

  it("rejects a blank staff number", () => {
    // Act / Assert
    expect(() => createEmployeeSchema.parse({ ...validEmployee, staffNumber: "   " })).toThrow();
  });
});

describe("updateEmployeeSchema", () => {
  it("accepts a single-field partial update", () => {
    // Act / Assert
    expect(() => updateEmployeeSchema.parse({ department: "Finance" })).not.toThrow();
  });

  it("accepts toggling active/eligible/laptopHolder", () => {
    // Act / Assert
    expect(() =>
      updateEmployeeSchema.parse({ active: false, eligible: false, laptopHolder: true }),
    ).not.toThrow();
  });

  it("rejects an empty update (nothing to change)", () => {
    // Act / Assert
    expect(() => updateEmployeeSchema.parse({})).toThrow(/at least one field/i);
  });

  it("does not accept staffNumber as an updatable field", () => {
    // Act
    const result = updateEmployeeSchema.parse({ staffNumber: "S9999", department: "Finance" });

    // Assert — unknown keys are stripped by Zod's default object parsing.
    expect(result).not.toHaveProperty("staffNumber");
  });

  it("does not accept lastWinnerDate as an updatable field", () => {
    // Act
    const result = updateEmployeeSchema.parse({ lastWinnerDate: "2026-01-01", department: "Finance" });

    // Assert
    expect(result).not.toHaveProperty("lastWinnerDate");
  });

  it("rejects an invalid email address", () => {
    // Act / Assert
    expect(() => updateEmployeeSchema.parse({ email: "not-an-email" })).toThrow();
  });
});

describe("listEmployeesQuerySchema", () => {
  it("accepts no filter", () => {
    // Act / Assert
    expect(() => listEmployeesQuerySchema.parse({})).not.toThrow();
  });

  it("parses the string 'true'/'false' query flags into real booleans", () => {
    // Act
    const result = listEmployeesQuerySchema.parse({ active: "false", eligible: "true" });

    // Assert
    expect(result.active).toBe(false);
    expect(result.eligible).toBe(true);
  });

  // Regression: z.coerce.boolean() would make the string "false" coerce to
  // true (Boolean("false") === true) — this schema must reject anything
  // that isn't literally "true" or "false" rather than silently coercing.
  it("rejects a non-boolean-flag value instead of silently coercing it", () => {
    // Act / Assert
    expect(() => listEmployeesQuerySchema.parse({ active: "yes" })).toThrow();
  });

  it("accepts a search and department filter", () => {
    // Act
    const result = listEmployeesQuerySchema.parse({ search: "Jane", department: "Engineering" });

    // Assert
    expect(result).toEqual({ search: "Jane", department: "Engineering" });
  });
});
