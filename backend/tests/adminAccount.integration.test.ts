// Full-stack (real service, real middleware, real invalidation store —
// only the Prisma-backed repository and bcrypt are mocked) test of the
// one-time admin credential handover. Deliberately separate from
// adminAccount.routes.test.ts (which mocks the service layer for
// request-validation-level assertions) because this file needs the real
// adminAccountService + real authenticate middleware to prove the actual
// end-to-end guarantee: a token issued before the handover stops working
// on the very next request afterward, and the handover itself cannot be
// re-run — matching this feature's "backend must remain the source of
// truth, direct API requests cannot bypass it" requirement.
import request from "supertest";

import { createApp } from "../src/app";
import { adminRepository } from "../src/repositories/adminRepository";
import { signToken } from "../src/utils/jwt";
import * as passwordUtil from "../src/utils/password";

jest.mock("../src/repositories/adminRepository");
jest.mock("../src/utils/password");

const mockedAdminRepo = adminRepository as jest.Mocked<typeof adminRepository>;
const mockedPassword = passwordUtil as jest.Mocked<typeof passwordUtil>;

const app = createApp();

const ADMIN_ID = 55001;

const devAdmin = {
  id: ADMIN_ID,
  username: "dev_admin",
  passwordHash: "old-hash",
  lastLogin: null,
  credentialsChangedAt: null,
};

const validPayload = {
  newUsername: "company_admin",
  newPassword: "CompanyPass123",
  confirmPassword: "CompanyPass123",
};

describe("Admin credential handover — end-to-end session invalidation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects the previously-issued token immediately after a successful credential change, and blocks a second handover attempt", async () => {
    // Arrange — a token minted before the handover, as if the admin had
    // already been browsing the dashboard with the default credentials.
    // Date.now is pinned and stepped forward explicitly rather than left
    // to real wall-clock time: invalidation compares whole seconds (see
    // adminSessionInvalidation.ts), and a fast test can otherwise sign
    // the token and trigger the invalidation within the same real
    // second, making the "stale token rejected" assertion flaky.
    const baseSeconds = Math.floor(Date.now() / 1000);
    jest.spyOn(Date, "now").mockReturnValue(baseSeconds * 1000);
    const preChangeToken = signToken({ role: "ADMIN", id: ADMIN_ID, username: "dev_admin" });

    mockedAdminRepo.findById
      .mockResolvedValueOnce(devAdmin) // read inside changeInitialCredentials
      .mockResolvedValueOnce({
        ...devAdmin,
        username: "company_admin",
        passwordHash: "new-hash",
        credentialsChangedAt: new Date(),
      }); // re-fetch after the write
    mockedAdminRepo.findByUsername.mockResolvedValue(null);
    mockedPassword.hashPassword.mockResolvedValue("new-hash");
    mockedAdminRepo.completeCredentialsHandover.mockResolvedValue(1);

    // Advance the clock 5 seconds before the change actually runs, so the
    // invalidation cutoff lands strictly after preChangeToken's iat.
    jest.spyOn(Date, "now").mockReturnValue((baseSeconds + 5) * 1000);

    // Act 1 — the request that performs the change succeeds using the
    // very token it's about to invalidate (no self-lockout mid-request).
    const changeRes = await request(app)
      .patch("/api/admin/account/credentials")
      .set("Authorization", `Bearer ${preChangeToken}`)
      .send(validPayload);

    // Assert 1
    expect(changeRes.status).toBe(200);
    expect(changeRes.body.data.admin.username).toBe("company_admin");

    // Act 2 — reusing the SAME (now-stale) token against any other
    // authenticated admin route must fail from here on.
    const staleTokenRes = await request(app)
      .get("/api/admin/dashboard/stats")
      .set("Authorization", `Bearer ${preChangeToken}`);

    // Assert 2
    expect(staleTokenRes.status).toBe(401);

    // Act 3 — a direct API replay of the handover itself, using the same
    // stale token, must also be rejected (401 from the invalidated
    // token, before it would even reach the already-completed check).
    const replayRes = await request(app)
      .patch("/api/admin/account/credentials")
      .set("Authorization", `Bearer ${preChangeToken}`)
      .send(validPayload);

    // Assert 3
    expect(replayRes.status).toBe(401);

    // Act 4 — a *fresh* token for the same admin (as if they'd logged
    // back in), signed after the invalidation cutoff so it passes
    // authenticate() and reaches the real, DB-backed one-time gate.
    jest.spyOn(Date, "now").mockReturnValue((baseSeconds + 10) * 1000);
    mockedAdminRepo.findById.mockReset();
    mockedAdminRepo.findById.mockResolvedValue({
      ...devAdmin,
      username: "company_admin",
      credentialsChangedAt: new Date(),
    });
    const freshToken = signToken({ role: "ADMIN", id: ADMIN_ID, username: "company_admin" });
    const secondAttemptRes = await request(app)
      .patch("/api/admin/account/credentials")
      .set("Authorization", `Bearer ${freshToken}`)
      .send(validPayload);

    // Assert 4
    expect(secondAttemptRes.status).toBe(409);
    expect(mockedAdminRepo.completeCredentialsHandover).toHaveBeenCalledTimes(1);

    jest.restoreAllMocks();
  });
});
