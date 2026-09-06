import {
  invalidateAdminSessions,
  isAdminTokenStillValid,
} from "../src/utils/adminSessionInvalidation";

describe("adminSessionInvalidation", () => {
  it("treats a token as valid when its admin has never been invalidated", () => {
    // Act / Assert — a fresh admin id (unused by any other test in this
    // file) that never appears in the invalidation map.
    expect(isAdminTokenStillValid(90001, 1000)).toBe(true);
  });

  it("rejects a token issued strictly before the invalidation timestamp", () => {
    // Arrange
    const adminId = 90002;
    const nowSeconds = Math.floor(Date.now() / 1000);
    jest.spyOn(Date, "now").mockReturnValue(nowSeconds * 1000);

    // Act
    invalidateAdminSessions(adminId);

    // Assert — a token issued one second earlier is now invalid.
    expect(isAdminTokenStillValid(adminId, nowSeconds - 1)).toBe(false);

    jest.restoreAllMocks();
  });

  it("still accepts a token issued in the same second as the invalidation", () => {
    // Arrange
    const adminId = 90003;
    const nowSeconds = Math.floor(Date.now() / 1000);
    jest.spyOn(Date, "now").mockReturnValue(nowSeconds * 1000);

    // Act
    invalidateAdminSessions(adminId);

    // Assert
    expect(isAdminTokenStillValid(adminId, nowSeconds)).toBe(true);

    jest.restoreAllMocks();
  });

  it("accepts a token issued after the invalidation timestamp", () => {
    // Arrange
    const adminId = 90004;
    const nowSeconds = Math.floor(Date.now() / 1000);
    jest.spyOn(Date, "now").mockReturnValue(nowSeconds * 1000);

    // Act
    invalidateAdminSessions(adminId);

    // Assert
    expect(isAdminTokenStillValid(adminId, nowSeconds + 10)).toBe(true);

    jest.restoreAllMocks();
  });

  it("only invalidates the targeted admin, not others", () => {
    // Arrange
    const invalidatedAdminId = 90005;
    const otherAdminId = 90006;
    const nowSeconds = Math.floor(Date.now() / 1000);
    jest.spyOn(Date, "now").mockReturnValue(nowSeconds * 1000);

    // Act
    invalidateAdminSessions(invalidatedAdminId);

    // Assert
    expect(isAdminTokenStillValid(invalidatedAdminId, nowSeconds - 5)).toBe(false);
    expect(isAdminTokenStillValid(otherAdminId, nowSeconds - 5)).toBe(true);

    jest.restoreAllMocks();
  });
});
