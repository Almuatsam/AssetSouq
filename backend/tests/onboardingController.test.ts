import type { NextFunction, Request, Response } from "express";

import { onboardingController } from "../src/controllers/onboardingController";

// authenticate always runs before these controller methods on the real
// route (see routes/onboardingRoutes.ts), guaranteeing req.user is set —
// so this can't be exercised through supertest/HTTP. Calling the
// controller directly here covers the defensive fallback in case that
// assumption is ever violated. Mirrors registrationController.test.ts.
describe("onboardingController defensive auth check", () => {
  function mockRes() {
    return { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  }

  it("me() calls next with a 401 when req.user is missing", async () => {
    // Arrange
    const req = {} as Request;
    const next = jest.fn() as NextFunction;

    // Act
    await onboardingController.me(req, mockRes(), next);

    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it("updateMe() calls next with a 401 when req.user is missing", async () => {
    // Arrange
    const req = { body: {} } as Request;
    const next = jest.fn() as NextFunction;

    // Act
    await onboardingController.updateMe(req, mockRes(), next);

    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
