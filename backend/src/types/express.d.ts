import "express";

export type AuthRole = "EMPLOYEE" | "ADMIN";

export interface AuthUser {
  role: AuthRole;
  // Employee id when role === "EMPLOYEE", Admin id when role === "ADMIN".
  id: number;
  staffNumber?: string;
  username?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}
