import type { NextFunction, Request, Response } from "express";

import { authenticate, requireRole } from "../src/middlewares/auth";
import { invalidateAdminSessions } from "../src/utils/adminSessionInvalidation";
import { signToken } from "../src/utils/jwt";
import type { AuthUser } from "../src/types/express";

function mockReq(user?: AuthUser): Request {
  return { user } as unknown as Request;
}

function mockReqWithAuthHeader(token: string): Request {
  return { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
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

describe("authenticate", () => {
  it("attaches req.user and calls next() with no error for a valid token", () => {
    // Arrange
    const next = jest.fn() as unknown as NextFunction;
    const token = signToken({ role: "ADMIN", id: 70001, username: "admin1" });
    const req = mockReqWithAuthHeader(token);

    // Act
    authenticate(req, {} as Response, next);

    // Assert
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ role: "ADMIN", id: 70001, username: "admin1" });
  });

  it("rejects an admin token issued before that admin's sessions were invalidated", () => {
    // Arrange
    const adminId = 70002;
    const nowSeconds = Math.floor(Date.now() / 1000);
    jest.spyOn(Date, "now").mockReturnValue(nowSeconds * 1000);
    const staleToken = signToken({ role: "ADMIN", id: adminId, username: "admin1" });

    jest.spyOn(Date, "now").mockReturnValue((nowSeconds + 1) * 1000);
    invalidateAdminSessions(adminId);

    const next = jest.fn() as unknown as NextFunction;
    const req = mockReqWithAuthHeader(staleToken);

    // Act
    authenticate(req, {} as Response, next);

    // Assert
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(req.user).toBeUndefined();

    jest.restoreAllMocks();
  });

  it("accepts a fresh admin token signed after that admin's sessions were invalidated", () => {
    // Arrange
    const adminId = 70003;
    const nowSeconds = Math.floor(Date.now() / 1000);
    jest.spyOn(Date, "now").mockReturnValue(nowSeconds * 1000);
    invalidateAdminSessions(adminId);

    jest.spyOn(Date, "now").mockReturnValue((nowSeconds + 5) * 1000);
    const freshToken = signToken({ role: "ADMIN", id: adminId, username: "newadmin" });

    const next = jest.fn() as unknown as NextFunction;
    const req = mockReqWithAuthHeader(freshToken);

    // Act
    authenticate(req, {} as Response, next);

    // Assert
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ role: "ADMIN", id: adminId });

    jest.restoreAllMocks();
  });

  it("never applies the admin invalidation check to employee tokens", () => {
    // Arrange — same numeric id as an invalidated admin, but a different
    // role; employee tokens must never be affected by admin invalidation.
    const sharedId = 70004;
    invalidateAdminSessions(sharedId);
    const employeeToken = signToken({ role: "EMPLOYEE", id: sharedId, staffNumber: "S1001" });

    const next = jest.fn() as unknown as NextFunction;
    const req = mockReqWithAuthHeader(employeeToken);

    // Act
    authenticate(req, {} as Response, next);

    // Assert
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ role: "EMPLOYEE", id: sharedId });
  });
});
