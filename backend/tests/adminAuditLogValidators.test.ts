import { listAuditLogsQuerySchema } from "../src/validators/adminAuditLogValidators";

describe("listAuditLogsQuerySchema", () => {
  it("accepts an empty query", () => {
    // Act
    const result = listAuditLogsQuerySchema.parse({});

    // Assert
    expect(result).toEqual({});
  });

  it("accepts and coerces a valid entity + adminId filter", () => {
    // Act
    const result = listAuditLogsQuerySchema.parse({ entity: "Winner", adminId: "1" });

    // Assert
    expect(result).toEqual({ entity: "Winner", adminId: 1 });
  });

  it("rejects a non-positive adminId", () => {
    // Act / Assert
    expect(() => listAuditLogsQuerySchema.parse({ adminId: "0" })).toThrow();
  });

  it("rejects a blank entity", () => {
    // Act / Assert
    expect(() => listAuditLogsQuerySchema.parse({ entity: "" })).toThrow();
  });
});
