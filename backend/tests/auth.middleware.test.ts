import type { NextFunction, Request, Response } from "express";

import { requireRole } from "../src/middlewares/auth";
import type { AuthUser } from "../src/types/express";

function mockReq(user?: AuthUser): Request {
  return { user } as unknown as Request;
}

describe("requireRole", () => {
  it("calls next() with no error when the user has an allowed role", () => {
    // Arrange
    const next = jest.fn() as unknown as NextFunction;
    const req = mockReq({ role: "ADMIN", id: 1 });

    // Act
    requireRole("ADMIN")(req, {} as Response, next);

    // Assert
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next() with a 403 AppError when the user's role isn't allowed", () => {
    // Arrange
    const next = jest.fn() as unknown as NextFunction;
    const req = mockReq({ role: "EMPLOYEE", id: 1 });

    // Act
    requireRole("ADMIN")(req, {} as Response, next);

    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it("calls next() with a 401 AppError when there is no authenticated user", () => {
    // Arrange
    const next = jest.fn() as unknown as NextFunction;
    const req = mockReq(undefined);

    // Act
    requireRole("ADMIN")(req, {} as Response, next);

    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
