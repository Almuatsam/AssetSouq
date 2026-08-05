import { signToken, verifyToken } from "../src/utils/jwt";
import { hashPassword, verifyPassword } from "../src/utils/password";

describe("password utils", () => {
  it("hashes a password and verifies the correct plaintext against it", async () => {
    // Act
    const hash = await hashPassword("correct horse battery staple");

    // Assert
    expect(hash).not.toBe("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect plaintext against a hash", async () => {
    // Arrange
    const hash = await hashPassword("correct horse battery staple");

    // Act / Assert
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });
});

describe("jwt utils", () => {
  it("round-trips a payload through sign and verify", () => {
    // Act
    const token = signToken({ role: "EMPLOYEE", id: 42, staffNumber: "S42" });
    const decoded = verifyToken(token);

    // Assert
    expect(decoded).toMatchObject({ role: "EMPLOYEE", id: 42, staffNumber: "S42" });
  });

  it("throws when verifying a tampered/invalid token", () => {
    // Act / Assert
    expect(() => verifyToken("not-a-real-token")).toThrow();
  });
});
