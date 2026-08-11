import {
  listRegistrationsQuerySchema,
  updateRegistrationStatusSchema,
} from "../src/validators/adminRegistrationValidators";

describe("listRegistrationsQuerySchema", () => {
  it("accepts no filter", () => {
    // Act / Assert
    expect(() => listRegistrationsQuerySchema.parse({})).not.toThrow();
  });

  it("accepts a valid status filter", () => {
    // Act / Assert
    expect(listRegistrationsQuerySchema.parse({ status: "WITHDRAWN" })).toEqual({
      status: "WITHDRAWN",
    });
  });

  it("rejects an invalid status filter", () => {
    // Act / Assert
    expect(() => listRegistrationsQuerySchema.parse({ status: "BOGUS" })).toThrow();
  });

  it("coerces deviceId/employeeId query strings to numbers", () => {
    // Act
    const result = listRegistrationsQuerySchema.parse({ deviceId: "1", employeeId: "10" });

    // Assert
    expect(result).toEqual({ deviceId: 1, employeeId: 10 });
  });

  it("accepts a search term", () => {
    // Act
    const result = listRegistrationsQuerySchema.parse({ search: "Jane" });

    // Assert
    expect(result).toEqual({ search: "Jane" });
  });
});

describe("updateRegistrationStatusSchema", () => {
  it("accepts ELIGIBLE/INELIGIBLE/WITHDRAWN", () => {
    // Act / Assert
    expect(() => updateRegistrationStatusSchema.parse({ status: "ELIGIBLE" })).not.toThrow();
    expect(() => updateRegistrationStatusSchema.parse({ status: "INELIGIBLE" })).not.toThrow();
    expect(() => updateRegistrationStatusSchema.parse({ status: "WITHDRAWN" })).not.toThrow();
  });

  // Regression: PENDING is the schema's implicit initial default, but
  // registrationRepository.create() always writes ELIGIBLE directly, so
  // an admin manually setting a registration "back to pending" would be
  // meaningless — must not be an accepted edit target.
  it("rejects PENDING as an edit target", () => {
    // Act / Assert
    expect(() => updateRegistrationStatusSchema.parse({ status: "PENDING" })).toThrow();
  });

  it("rejects a missing status", () => {
    // Act / Assert
    expect(() => updateRegistrationStatusSchema.parse({})).toThrow();
  });

  it("rejects an invalid status value", () => {
    // Act / Assert
    expect(() => updateRegistrationStatusSchema.parse({ status: "BOGUS" })).toThrow();
  });
});
