// dotenv/config has a load-time side effect (reads .env into process.env).
// Stub it out so these tests fully control process.env instead of having
// values silently repopulated from the real .env file.
jest.mock("dotenv/config", () => ({}));

describe("config/env", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("throws a descriptive error when a required variable is missing", () => {
    // Arrange
    process.env.DATABASE_URL = "mysql://u:p@localhost:3306/db";
    delete process.env.JWT_SECRET;

    // Act / Assert
    expect(() => require("../src/config/env")).toThrow(/JWT_SECRET/);
  });

  it("falls back to defaults for optional variables when unset", () => {
    // Arrange
    process.env.DATABASE_URL = "mysql://u:p@localhost:3306/db";
    process.env.JWT_SECRET = "secret";
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.CORS_ORIGIN;
    delete process.env.JWT_EXPIRES_IN;

    // Act
    const { env } = require("../src/config/env");

    // Assert
    expect(env).toMatchObject({
      nodeEnv: "development",
      port: 4000,
      corsOrigin: "http://localhost:5173",
      jwtExpiresIn: "8h",
    });
  });

  it("uses provided values over defaults when all variables are set", () => {
    // Arrange
    process.env.DATABASE_URL = "mysql://u:p@localhost:3306/db";
    process.env.JWT_SECRET = "secret";
    process.env.NODE_ENV = "production";
    process.env.PORT = "9000";
    process.env.CORS_ORIGIN = "https://assetsouq.example.com";
    process.env.JWT_EXPIRES_IN = "1h";

    // Act
    const { env } = require("../src/config/env");

    // Assert
    expect(env).toMatchObject({
      nodeEnv: "production",
      port: 9000,
      corsOrigin: "https://assetsouq.example.com",
      jwtExpiresIn: "1h",
    });
  });
});
