import { listWinnersQuerySchema, recordPaymentSchema } from "../src/validators/adminWinnerValidators";

describe("listWinnersQuerySchema", () => {
  it("accepts no filter", () => {
    // Act / Assert
    expect(() => listWinnersQuerySchema.parse({})).not.toThrow();
  });

  it("coerces deviceId/employeeId query strings to numbers", () => {
    // Act
    const result = listWinnersQuerySchema.parse({ deviceId: "1", employeeId: "10" });

    // Assert
    expect(result).toEqual({ deviceId: 1, employeeId: 10 });
  });

  it("accepts a valid paymentStatus filter", () => {
    // Act / Assert
    expect(listWinnersQuerySchema.parse({ paymentStatus: "PAID" })).toEqual({ paymentStatus: "PAID" });
  });

  it("rejects an invalid paymentStatus filter", () => {
    // Act / Assert
    expect(() => listWinnersQuerySchema.parse({ paymentStatus: "BOGUS" })).toThrow();
  });
});

describe("recordPaymentSchema", () => {
  it("accepts PAID with a payment method", () => {
    // Act / Assert
    expect(() =>
      recordPaymentSchema.parse({ paymentStatus: "PAID", paymentMethod: "Payroll deduction" }),
    ).not.toThrow();
  });

  it("accepts PAID with no payment method", () => {
    // Act / Assert
    expect(() => recordPaymentSchema.parse({ paymentStatus: "PAID" })).not.toThrow();
  });

  it("accepts NON_PAYMENT", () => {
    // Act / Assert
    expect(() => recordPaymentSchema.parse({ paymentStatus: "NON_PAYMENT" })).not.toThrow();
  });

  // Regression: PENDING is the schema's implicit initial value, but an
  // admin manually setting a winner "back to pending" is meaningless —
  // must not be an accepted edit target.
  it("rejects PENDING as an edit target", () => {
    // Act / Assert
    expect(() => recordPaymentSchema.parse({ paymentStatus: "PENDING" })).toThrow();
  });

  it("rejects a missing paymentStatus", () => {
    // Act / Assert
    expect(() => recordPaymentSchema.parse({})).toThrow();
  });

  it("rejects a blank payment method", () => {
    // Act / Assert
    expect(() => recordPaymentSchema.parse({ paymentStatus: "PAID", paymentMethod: "   " })).toThrow();
  });
});
