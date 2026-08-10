import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import { errorHandler } from "../src/middlewares/errorHandler";

// AppError / ZodError / generic-500 / notFoundHandler paths are already
// exercised indirectly through the various *.routes.test.ts files (all
// at 100% coverage) — this file targets only the new P2002 branch, which
// nothing else in the suite triggers.
describe("errorHandler — Prisma unique-constraint (P2002) mapping", () => {
  function mockRes() {
    return { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  }

  it("maps a P2002 error to a 409 naming the offending field", () => {
    // Arrange
    const res = mockRes();
    const err = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.22.0",
      meta: { target: ["assetTag"] },
    });

    // Act
    errorHandler(err, {} as Request, res, jest.fn() as NextFunction);

    // Assert
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "A record with this assetTag already exists",
    });
  });

  it("falls back to a generic field label when meta.target is missing", () => {
    // Arrange
    const res = mockRes();
    const err = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.22.0",
    });

    // Act
    errorHandler(err, {} as Request, res, jest.fn() as NextFunction);

    // Assert
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "A record with this field already exists",
    });
  });

  it("does not intercept other Prisma error codes — falls through to the generic 500", () => {
    // Arrange
    const res = mockRes();
    const err = new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
      code: "P2003",
      clientVersion: "5.22.0",
    });

    // Act
    errorHandler(err, {} as Request, res, jest.fn() as NextFunction);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
