import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Centralized error handler. Keep responses consistent and avoid leaking
// internals (stack traces, DB errors) to the client.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  // The employee-import upload (middlewares/upload.ts) is the only
  // multer consumer so far — surfaces its size/count limit errors as a
  // proper 400 instead of falling through to the generic 500 below.
  if (err instanceof multer.MulterError) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
    return;
  }

  // Project-wide backstop for unique-constraint violations (P2002), e.g.
  // a race between a service's own pre-check (findByAssetTag, etc.) and
  // the actual create() landing — without this, that race surfaces as an
  // opaque 500 instead of the accurate, already-expected 409.
  const uniqueConstraintMessage = describeUniqueConstraintViolation(err);
  if (uniqueConstraintMessage) {
    res.status(409).json({ success: false, error: uniqueConstraintMessage });
    return;
  }

  console.error(err);
  res.status(500).json({ success: false, error: "Internal server error" });
}

// Shared with employeeImportService.ts's per-row error handling, which
// hits this exact same P2002 race (a row's own pre-checks vs. a
// concurrent import's create()/update() landing first) but can't route
// through this Express error middleware — a single bad row must not abort
// the rest of the file. The field name(s) in `meta.target` are just
// schema column names, not internal detail, so it's safe to include in
// the message.
export function describeUniqueConstraintViolation(err: unknown): string | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : "field";
    return `A record with this ${target} already exists`;
  }
  return null;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: `Not found: ${req.originalUrl}` });
}
