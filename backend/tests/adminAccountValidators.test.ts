import { adminPasswordSchema, changeAdminCredentialsSchema } from "../src/validators/adminAccountValidators";

const validInput = {
  newUsername: "company_admin",
  newPassword: "CompanyPass123",
  confirmPassword: "CompanyPass123",
};

describe("adminPasswordSchema", () => {
  it("accepts a password meeting the length + complexity floor", () => {
    // Act / Assert
    expect(() => adminPasswordSchema.parse("CompanyPass123")).not.toThrow();
  });

  it("rejects a password shorter than 12 characters", () => {
    // Act / Assert
    expect(() => adminPasswordSchema.parse("Short1Aa")).toThrow(/at least 12 characters/);
  });

  it("rejects a password longer than 72 characters", () => {
    // Act / Assert — bcrypt silently truncates past 72 bytes; this bounds
    // input to what's actually enforced at the hashing layer.
    expect(() => adminPasswordSchema.parse(`Aa1${"a".repeat(70)}`)).toThrow(/at most 72 characters/);
  });

  it("accepts a password exactly 72 characters long", () => {
    // Act / Assert
    expect(() => adminPasswordSchema.parse(`Aa1${"a".repeat(69)}`)).not.toThrow();
  });

  it("rejects a password with no lowercase letter", () => {
    // Act / Assert
    expect(() => adminPasswordSchema.parse("COMPANYPASS123")).toThrow(/lowercase letter/);
  });

  it("rejects a password with no uppercase letter", () => {
    // Act / Assert
    expect(() => adminPasswordSchema.parse("companypass123")).toThrow(/uppercase letter/);
  });

  it("rejects a password with no number", () => {
    // Act / Assert
    expect(() => adminPasswordSchema.parse("CompanyPassword")).toThrow(/include a number/);
  });
});

describe("changeAdminCredentialsSchema", () => {
  it("accepts a fully valid payload", () => {
    // Act
    const result = changeAdminCredentialsSchema.parse(validInput);

    // Assert
    expect(result).toEqual(validInput);
  });

  it("trims whitespace from newUsername", () => {
    // Act
    const result = changeAdminCredentialsSchema.parse({ ...validInput, newUsername: "  company_admin  " });

    // Assert
    expect(result.newUsername).toBe("company_admin");
  });

  it("rejects an empty newUsername", () => {
    // Act / Assert
    expect(() => changeAdminCredentialsSchema.parse({ ...validInput, newUsername: "" })).toThrow(
      /username is required/i,
    );
  });

  it("rejects a newUsername that is only whitespace", () => {
    // Act / Assert
    expect(() => changeAdminCredentialsSchema.parse({ ...validInput, newUsername: "   " })).toThrow(
      /username is required/i,
    );
  });

  it("rejects a newUsername over 191 characters (VARCHAR(191) column width)", () => {
    // Act / Assert
    expect(() =>
      changeAdminCredentialsSchema.parse({ ...validInput, newUsername: "a".repeat(192) }),
    ).toThrow(/at most 191 characters/);
  });

  it("rejects a missing confirmPassword", () => {
    // Act / Assert
    expect(() =>
      changeAdminCredentialsSchema.parse({ newUsername: "company_admin", newPassword: "CompanyPass123" }),
    ).toThrow();
  });

  it("rejects when confirmPassword does not match newPassword, attributing the error to confirmPassword", () => {
    // Act
    const result = changeAdminCredentialsSchema.safeParse({
      ...validInput,
      confirmPassword: "SomethingElse123",
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
      expect(result.error.issues[0].message).toMatch(/do not match/i);
    }
  });
});
