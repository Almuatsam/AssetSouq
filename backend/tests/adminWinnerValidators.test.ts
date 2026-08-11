import { listWinnersQuerySchema } from "../src/validators/adminWinnerValidators";

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
