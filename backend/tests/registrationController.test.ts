import type { NextFunction, Request, Response } from "express";

import { registrationController } from "../src/controllers/registrationController";

// requireRole("EMPLOYEE") always runs before these controller methods on
// the real route, guaranteeing req.user is set — so this can't be
// exercised through supertest/HTTP. Calling the controller directly here
// covers the defensive fallback in case that assumption is ever violated
// (route reordered, middleware skipped, controller reused elsewhere).
describe("registrationController defensive auth check", () => {
  function mockRes() {
    return { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  }

  it("create() calls next with a 401 when req.user is missing", async () => {
    // Arrange
    const req = { body: {} } as Request;
    const next = jest.fn() as NextFunction;

    // Act
    await registrationController.create(req, mockRes(), next);

    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it("mine() calls next with a 401 when req.user is missing", async () => {
    // Arrange
    const req = {} as Request;
    const next = jest.fn() as NextFunction;

    // Act
    await registrationController.mine(req, mockRes(), next);

    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
