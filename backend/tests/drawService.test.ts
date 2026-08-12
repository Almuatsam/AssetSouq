import { prisma } from "../src/config/prisma";
import { auditLogRepository } from "../src/repositories/auditLogRepository";
import { deviceRepository } from "../src/repositories/deviceRepository";
import { drawRepository } from "../src/repositories/drawRepository";
import { employeeRepository } from "../src/repositories/employeeRepository";
import { registrationRepository } from "../src/repositories/registrationRepository";
import { winnerRepository } from "../src/repositories/winnerRepository";
import { drawService } from "../src/services/drawService";
import { eligibilityService } from "../src/services/eligibilityService";
import * as rng from "../src/utils/rng";

jest.mock("../src/config/prisma", () => ({
  // runDraw()'s/redrawWinner()'s writes happen inside prisma.$transaction —
  // just invoke the callback with a placeholder tx object; every
  // repository call inside it is separately mocked below, so what "tx"
  // actually is doesn't matter for these tests, only that the callback
  // runs.
  prisma: { $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback({})) },
}));
jest.mock("../src/repositories/auditLogRepository");
jest.mock("../src/repositories/deviceRepository");
jest.mock("../src/repositories/drawRepository");
jest.mock("../src/repositories/employeeRepository");
jest.mock("../src/repositories/registrationRepository");
jest.mock("../src/repositories/winnerRepository");
jest.mock("../src/services/eligibilityService");
jest.mock("../src/utils/rng");

const mockedPrisma = prisma as unknown as { $transaction: jest.Mock };
const mockedAuditLogRepo = auditLogRepository as jest.Mocked<typeof auditLogRepository>;
const mockedDeviceRepo = deviceRepository as jest.Mocked<typeof deviceRepository>;
const mockedDrawRepo = drawRepository as jest.Mocked<typeof drawRepository>;
const mockedEmployeeRepo = employeeRepository as jest.Mocked<typeof employeeRepository>;
const mockedRegistrationRepo = registrationRepository as jest.Mocked<typeof registrationRepository>;
const mockedWinnerRepo = winnerRepository as jest.Mocked<typeof winnerRepository>;
const mockedEligibility = eligibilityService as jest.Mocked<typeof eligibilityService>;
const mockedRng = rng as jest.Mocked<typeof rng>;

const baseDevice = {
  id: 1,
  assetTag: "AST-001",
  deviceType: "Laptop",
  brand: "Dell",
  model: "Latitude 5420",
  cpu: null,
  ram: null,
  storage: null,
  purchaseYear: null,
  yearsUsed: null,
  price: "150.00",
  status: "AVAILABLE",
  quantity: 1,
  createdAt: new Date(),
};

const baseEmployee = {
  id: 10,
  staffNumber: "S1001",
  name: "Jane Doe",
  department: "IT",
  email: "jane@example.com",
  active: true,
  laptopHolder: false,
  lastWinnerDate: null,
  eligible: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function registration(employeeId: number) {
  return {
    id: employeeId,
    employeeId,
    deviceId: 1,
    agreed: true,
    submittedAt: new Date(),
    status: "ELIGIBLE" as const,
  };
}

const baseDrawResult = {
  id: 100,
  deviceId: 1,
  rngSeed: "seed",
  candidatePoolSnapshot: [10],
  drawnAt: new Date(),
  drawnByAdminId: 1,
  winners: [],
};

describe("drawService.runDraw", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({}));
    mockedRng.generateSeed.mockReturnValue("seed");
    // Identity "shuffle" — the seeded-shuffle algorithm itself is covered
    // by tests/rng.test.ts; these tests only need a deterministic,
    // order-preserving stand-in so assertions on who wins are simple.
    mockedRng.seededShuffle.mockImplementation((items) => [...items]);
    mockedEligibility.checkEmployeeAttributes.mockReturnValue({ eligible: true, reasons: [] });
    mockedDrawRepo.create.mockResolvedValue(baseDrawResult as never);
    mockedDrawRepo.createWinner.mockResolvedValue({} as never);
    mockedEmployeeRepo.markAsWinner.mockResolvedValue(baseEmployee as never);
    mockedDeviceRepo.markDrawn.mockResolvedValue(baseDevice as never);
    mockedDrawRepo.findByIdWithWinners.mockResolvedValue(baseDrawResult as never);
  });

  it("rejects with a 404 when the device doesn't exist", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(null);

    // Act / Assert
    await expect(drawService.runDraw(1, 1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects with a 409 when the device isn't AVAILABLE", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue({ ...baseDevice, status: "DRAWN" } as never);

    // Act / Assert
    await expect(drawService.runDraw(1, 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedRegistrationRepo.findEligibleByDeviceId).not.toHaveBeenCalled();
  });

  // Regression: closes the TOCTOU race where two concurrent runDraw()
  // calls for the same device could both pass the pre-check above (which
  // reads outside any transaction) before either commits. The row lock +
  // re-check inside the transaction must catch a device that's no longer
  // AVAILABLE by the time this call actually gets to write.
  it("re-verifies device availability under a lock inside the transaction, rejecting a race where it's no longer AVAILABLE", async () => {
    // Arrange — simulates a concurrent draw that already flipped the
    // device to DRAWN between this call's pre-check and the point where
    // its own transaction acquires the device row lock.
    mockedDeviceRepo.findById
      .mockResolvedValueOnce(baseDevice as never) // pre-check, outside the transaction
      .mockResolvedValueOnce({ ...baseDevice, status: "DRAWN" } as never); // re-check, inside it
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);

    // Act / Assert
    await expect(drawService.runDraw(1, 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedDeviceRepo.lockForUpdate).toHaveBeenCalledWith(1, expect.anything());
    expect(mockedDrawRepo.create).not.toHaveBeenCalled();
  });

  it("locks the device row before creating the draw", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);

    // Act
    await drawService.runDraw(1, 1);

    // Assert
    expect(mockedDeviceRepo.lockForUpdate).toHaveBeenCalledWith(1, expect.anything());
  });

  it("rejects with a 409 when there are no ELIGIBLE registrations at all", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([]);

    // Act / Assert
    await expect(drawService.runDraw(1, 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedDrawRepo.create).not.toHaveBeenCalled();
  });

  it("rejects with a 409 when every candidate fails re-validation at draw time", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);
    mockedEligibility.checkEmployeeAttributes.mockReturnValue({
      eligible: false,
      reasons: ["Laptop holders cannot participate"],
    });

    // Act / Assert
    await expect(drawService.runDraw(1, 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedDrawRepo.create).not.toHaveBeenCalled();
  });

  // Regression: checkEmployeeAttributes (not the full checkEmployee) must
  // be used here — checkEmployee's "no other active registration" check
  // would find the candidate's own ELIGIBLE registration for this exact
  // device and disqualify every candidate, every time.
  it("uses checkEmployeeAttributes, not the full checkEmployee, to re-validate candidates", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);

    // Act
    await drawService.runDraw(1, 1);

    // Assert
    expect(mockedEligibility.checkEmployeeAttributes).toHaveBeenCalledWith(baseEmployee);
    expect(mockedEligibility.checkEmployee).not.toHaveBeenCalled();
  });

  it("excludes a candidate who fails employee-attribute eligibility at draw time", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never); // quantity 1
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10), registration(11)]);
    mockedEmployeeRepo.findById.mockImplementation((id: number) =>
      Promise.resolve({ ...baseEmployee, id } as never),
    );
    mockedEligibility.checkEmployeeAttributes.mockImplementation((employee) =>
      employee.id === 11
        ? { eligible: false, reasons: ["Laptop holders cannot participate"] }
        : { eligible: true, reasons: [] },
    );

    // Act
    await drawService.runDraw(1, 1);

    // Assert
    expect(mockedDrawRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ candidatePoolSnapshot: [10] }),
      expect.anything(),
    );
  });

  it("selects device.quantity winners and creates a Winner row for each", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue({ ...baseDevice, quantity: 2 } as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([
      registration(10),
      registration(11),
      registration(12),
    ]);
    mockedEmployeeRepo.findById.mockImplementation((id: number) =>
      Promise.resolve({ ...baseEmployee, id } as never),
    );

    // Act
    await drawService.runDraw(1, 1);

    // Assert
    expect(mockedDrawRepo.createWinner).toHaveBeenCalledTimes(2);
    expect(mockedDrawRepo.createWinner).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 10, deviceId: 1, priceDue: baseDevice.price }),
      expect.anything(),
    );
    expect(mockedDrawRepo.createWinner).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 11 }),
      expect.anything(),
    );
  });

  // Regression, whole-system audit finding: markAsWinner() (which stamps
  // employee.lastWinnerDate, the 24-month re-entry cooldown) used to run
  // here, at draw-time *selection* — before a winner has paid, accepted,
  // or received anything. That incorrectly started the cooldown even for
  // a candidate later redrawn away (declined/unpaid/no-show/admin
  // override), penalizing them for a win they never actually got. It now
  // only runs from winnerService.recordPayment() once a payment is
  // actually confirmed — see that test file's matching regression test.
  it("does not stamp lastWinnerDate at selection time — only payment confirmation does that", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);

    // Act
    await drawService.runDraw(1, 1);

    // Assert
    expect(mockedDrawRepo.createWinner).toHaveBeenCalled();
    expect(mockedEmployeeRepo.markAsWinner).not.toHaveBeenCalled();
  });

  it("does not create a Winner row for candidates beyond device.quantity", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue({ ...baseDevice, quantity: 1 } as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10), registration(11)]);
    mockedEmployeeRepo.findById.mockImplementation((id: number) =>
      Promise.resolve({ ...baseEmployee, id } as never),
    );

    // Act
    await drawService.runDraw(1, 1);

    // Assert
    expect(mockedDrawRepo.createWinner).toHaveBeenCalledTimes(1);
    expect(mockedDrawRepo.createWinner).not.toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 11 }),
      expect.anything(),
    );
  });

  it("marks the device as DRAWN", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);

    // Act
    await drawService.runDraw(1, 1);

    // Assert
    expect(mockedDeviceRepo.markDrawn).toHaveBeenCalledWith(1, expect.anything());
  });

  it("persists the full shuffled candidate pool (not just the winners) and the RNG seed/admin id for audit", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue({ ...baseDevice, quantity: 1 } as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([
      registration(10),
      registration(11),
      registration(12),
    ]);
    mockedEmployeeRepo.findById.mockImplementation((id: number) =>
      Promise.resolve({ ...baseEmployee, id } as never),
    );

    // Act
    await drawService.runDraw(1, 42);

    // Assert
    expect(mockedDrawRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: 1,
        candidatePoolSnapshot: [10, 11, 12],
        rngSeed: "seed",
        drawnByAdminId: 42,
      }),
      expect.anything(),
    );
  });

  it("returns the reloaded draw with its winners", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);
    const reloaded = { ...baseDrawResult, winners: [{ id: 1, employeeId: 10 }] };
    mockedDrawRepo.findByIdWithWinners.mockResolvedValue(reloaded as never);

    // Act
    const result = await drawService.runDraw(1, 1);

    // Assert
    expect(result).toEqual(reloaded);
  });

  it("throws a 500 if the draw cannot be reloaded after creation (defensive, should be unreachable)", async () => {
    // Arrange
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedRegistrationRepo.findEligibleByDeviceId.mockResolvedValue([registration(10)]);
    mockedEmployeeRepo.findById.mockResolvedValue(baseEmployee as never);
    mockedDrawRepo.findByIdWithWinners.mockResolvedValue(null);

    // Act / Assert
    await expect(drawService.runDraw(1, 1)).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe("drawService.redrawWinner", () => {
  const baseWinner = {
    id: 1,
    employeeId: 10,
    deviceId: 1,
    drawId: 100,
    drawDate: new Date(),
    accepted: false,
    priceDue: "150.00",
    paymentStatus: "PENDING" as const,
    paymentDate: null,
    paymentMethod: null,
    handoverDate: null,
    redrawOf: null,
    redrawReason: null,
  };

  const drawWithWaitingList = {
    id: 100,
    deviceId: 1,
    rngSeed: "seed",
    candidatePoolSnapshot: [10, 11, 12],
    drawnAt: new Date(),
    drawnByAdminId: 1,
    winners: [{ id: 1, employeeId: 10, deviceId: 1, drawId: 100, priceDue: "150.00", paymentStatus: "PENDING" }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({}));
    mockedWinnerRepo.findById.mockResolvedValue(baseWinner as never);
    mockedWinnerRepo.findByRedrawOf.mockResolvedValue(null);
    mockedDrawRepo.findByIdWithWinners.mockResolvedValue(drawWithWaitingList as never);
    mockedDeviceRepo.findById.mockResolvedValue(baseDevice as never);
    mockedEmployeeRepo.findById.mockImplementation((id: number) =>
      Promise.resolve({ ...baseEmployee, id } as never),
    );
    mockedEligibility.checkEmployeeAttributes.mockReturnValue({ eligible: true, reasons: [] });
    mockedDrawRepo.createWinner.mockResolvedValue({ id: 2, employeeId: 11 } as never);
    mockedEmployeeRepo.markAsWinner.mockResolvedValue(baseEmployee as never);
    mockedAuditLogRepo.create.mockResolvedValue({} as never);
    // jest.clearAllMocks() only clears call history, not implementations
    // set via .mockResolvedValue() — every dependency needs its own
    // explicit default here, or a later test can end up silently running
    // against whatever value an earlier test happened to leave behind.
    mockedRegistrationRepo.findActiveByEmployeeId.mockResolvedValue(null);
    mockedRegistrationRepo.updateStatus.mockResolvedValue({} as never);
  });

  it("rejects with a 404 when the winner doesn't exist", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue(null);

    // Act / Assert
    await expect(drawService.redrawWinner(999, "NON_PAYMENT", 1)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("rejects with a 409 when the winner has already paid", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue({ ...baseWinner, paymentStatus: "PAID" } as never);

    // Act / Assert
    await expect(drawService.redrawWinner(1, "NON_PAYMENT", 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedDrawRepo.createWinner).not.toHaveBeenCalled();
  });

  it("rejects with a 409 when the winner has already been redrawn", async () => {
    // Arrange
    mockedWinnerRepo.findByRedrawOf.mockResolvedValue({ ...baseWinner, id: 2, redrawOf: 1 } as never);

    // Act / Assert
    await expect(drawService.redrawWinner(1, "NON_PAYMENT", 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedDrawRepo.createWinner).not.toHaveBeenCalled();
  });

  it("rejects with a 409 when there's no one left in the waiting list", async () => {
    // Arrange — every remaining candidate fails eligibility.
    mockedEligibility.checkEmployeeAttributes.mockReturnValue({
      eligible: false,
      reasons: ["Laptop holders cannot participate"],
    });

    // Act / Assert
    await expect(drawService.redrawWinner(1, "NON_PAYMENT", 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedDrawRepo.createWinner).not.toHaveBeenCalled();
  });

  it("picks the first still-eligible candidate from the waiting list, skipping current winners", async () => {
    // Act
    await drawService.redrawWinner(1, "NON_PAYMENT", 1);

    // Assert — employeeId 10 is skipped (already a winner for this draw),
    // so employeeId 11 (next in candidatePoolSnapshot) is selected.
    expect(mockedDrawRepo.createWinner).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 11,
        deviceId: 1,
        drawId: 100,
        priceDue: baseWinner.priceDue,
        redrawOf: 1,
        redrawReason: "NON_PAYMENT",
      }),
      expect.anything(),
    );
  });

  // Regression, whole-system audit finding: this used to re-read
  // device.price fresh at redraw time — deviceService.updateDevice()
  // only gates the `status` field, so price stays editable at any
  // status, meaning a price edit between the original draw and a later
  // redraw would give the replacement winner a different price than
  // every other winner on the same draw/device owes. The replacement
  // must inherit the *original* winner's locked-in priceDue instead —
  // confirmed here by asserting the device is never even looked up for
  // pricing purposes anymore.
  it("never reads the device's current price when pricing the replacement winner", async () => {
    // Act
    await drawService.redrawWinner(1, "NON_PAYMENT", 1);

    // Assert
    expect(mockedDeviceRepo.findById).not.toHaveBeenCalled();
  });

  it("skips a waiting-list candidate who fails re-validation and picks the next one", async () => {
    // Arrange
    mockedEligibility.checkEmployeeAttributes.mockImplementation((employee) =>
      employee.id === 11
        ? { eligible: false, reasons: ["Laptop holders cannot participate"] }
        : { eligible: true, reasons: [] },
    );

    // Act
    await drawService.redrawWinner(1, "NON_PAYMENT", 1);

    // Assert
    expect(mockedDrawRepo.createWinner).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 12 }),
      expect.anything(),
    );
  });

  // Regression, whole-system audit finding: this used to stamp the
  // *replacement* winner's lastWinnerDate immediately, same as runDraw()
  // did for an original winner — see that test file's matching
  // regression test for why selection alone no longer starts the
  // cooldown for anyone, redrawn-in or not; only
  // winnerService.recordPayment() does, once payment is confirmed.
  it("does not stamp the replacement winner's lastWinnerDate at selection time", async () => {
    // Act
    await drawService.redrawWinner(1, "NON_PAYMENT", 1);

    // Assert
    expect(mockedDrawRepo.createWinner).toHaveBeenCalled();
    expect(mockedEmployeeRepo.markAsWinner).not.toHaveBeenCalled();
  });

  // Regression, whole-system audit finding: the original winner's
  // registration used to stay ELIGIBLE forever after being redrawn away,
  // permanently satisfying registrationRepository.findActiveByEmployeeId
  // ()'s one-active-registration check and blocking that employee from
  // ever registering for a *different* device, even though they never
  // actually won or received anything.
  it("closes out the original winner's active registration so they can register again", async () => {
    // Arrange
    mockedRegistrationRepo.findActiveByEmployeeId.mockResolvedValue({ id: 55, employeeId: 10 } as never);
    mockedRegistrationRepo.updateStatus.mockResolvedValue({} as never);

    // Act
    await drawService.redrawWinner(1, "NON_PAYMENT", 1);

    // Assert — employeeId 10 is baseWinner's employee, the one being
    // redrawn away.
    expect(mockedRegistrationRepo.findActiveByEmployeeId).toHaveBeenCalledWith(10, expect.anything());
    expect(mockedRegistrationRepo.updateStatus).toHaveBeenCalledWith(55, "WITHDRAWN", expect.anything());
  });

  it("does nothing if the original winner has no active registration left to close", async () => {
    // Arrange — e.g. an admin already closed it out some other way.
    mockedRegistrationRepo.findActiveByEmployeeId.mockResolvedValue(null);

    // Act
    await drawService.redrawWinner(1, "NON_PAYMENT", 1);

    // Assert
    expect(mockedRegistrationRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("writes an audit log entry for the redraw", async () => {
    // Act
    await drawService.redrawWinner(1, "DECLINED", 7);

    // Assert
    expect(mockedAuditLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: 7, action: "REDRAW_WINNER", entity: "Winner" }),
      expect.anything(),
    );
  });

  // The draw (not the specific winner row) is what's locked — see the
  // comment on drawRepository.lockForUpdate() for why: the contested
  // resource across concurrent redraws on one draw is "who's next in the
  // waiting list", which is shared by every winner slot on that draw.
  it("locks the draw before re-selecting and creating the replacement", async () => {
    // Act
    await drawService.redrawWinner(1, "NON_PAYMENT", 1);

    // Assert
    expect(mockedDrawRepo.lockForUpdate).toHaveBeenCalledWith(100, expect.anything());
  });

  // Regression: closes the TOCTOU race where two concurrent redrawWinner()
  // calls for the same winner could both pass the pre-check before either
  // commits. The locked re-check inside the transaction must catch a
  // winner that's been redrawn by the time this call gets to write.
  it("re-verifies under a lock inside the transaction, rejecting a race where the winner was already redrawn", async () => {
    // Arrange — simulates a concurrent redraw landing between this call's
    // pre-check and the point where its own transaction acquires the lock.
    mockedWinnerRepo.findByRedrawOf
      .mockResolvedValueOnce(null) // pre-check, outside the transaction
      .mockResolvedValueOnce({ id: 2, redrawOf: 1 } as never); // re-check, inside it

    // Act / Assert
    await expect(drawService.redrawWinner(1, "NON_PAYMENT", 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedDrawRepo.createWinner).not.toHaveBeenCalled();
  });

  // Regression: the "not already paid" pre-check ran before the
  // transaction, with a non-trivial amount of async work (loading the
  // draw/device, then the waiting-list eligibility loop) in between — a
  // concurrent recordPayment() landing in that window must still be
  // caught by re-reading the locked winner row, not just trusting the
  // pre-transaction read.
  it("re-verifies payment status under the lock inside the transaction, rejecting a race where a payment was recorded concurrently", async () => {
    // Arrange
    mockedWinnerRepo.findById
      .mockResolvedValueOnce(baseWinner as never) // pre-check, outside the transaction
      .mockResolvedValueOnce({ ...baseWinner, paymentStatus: "PAID" } as never); // re-check, inside it

    // Act / Assert
    await expect(drawService.redrawWinner(1, "NON_PAYMENT", 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedDrawRepo.createWinner).not.toHaveBeenCalled();
  });

  // Regression: this is the cross-slot race the draw-level lock exists to
  // close. Two concurrent redraws of two *different* winner slots on the
  // same draw could otherwise both compute the same next-in-line
  // candidate (from a stale pre-lock read of "current winners") before
  // either commits. The authoritative re-selection — re-fetching the
  // draw's winners *after* acquiring the lock — must see any winner a
  // concurrent redraw already committed and pick someone else instead.
  it("re-selects a fresh candidate under the lock if the pre-check's pick was already claimed by a concurrent redraw", async () => {
    // Arrange
    mockedDrawRepo.findByIdWithWinners
      .mockResolvedValueOnce(drawWithWaitingList as never) // pre-check: only 10 is a winner, so 11 looks free
      .mockResolvedValueOnce({
        ...drawWithWaitingList,
        winners: [...drawWithWaitingList.winners, { id: 3, employeeId: 11 }],
      } as never); // locked re-fetch: a concurrent redraw already claimed 11

    // Act
    await drawService.redrawWinner(1, "NON_PAYMENT", 1);

    // Assert — 11 is now excluded, so 12 is selected instead.
    expect(mockedDrawRepo.createWinner).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 12 }),
      expect.anything(),
    );
  });

  it("rejects with a 409 if the waiting list is exhausted by the time of the authoritative re-check, even though the pre-check found a candidate", async () => {
    // Arrange
    mockedDrawRepo.findByIdWithWinners
      .mockResolvedValueOnce(drawWithWaitingList as never) // pre-check: 11 looks free
      .mockResolvedValueOnce({
        ...drawWithWaitingList,
        winners: [
          ...drawWithWaitingList.winners,
          { id: 3, employeeId: 11 },
          { id: 4, employeeId: 12 },
        ],
      } as never); // locked re-fetch: everyone left in the pool is already a winner

    // Act / Assert
    await expect(drawService.redrawWinner(1, "NON_PAYMENT", 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedDrawRepo.createWinner).not.toHaveBeenCalled();
  });

  it("rejects with a 409 when the winner has no associated draw (defensive, should be unreachable)", async () => {
    // Arrange
    mockedWinnerRepo.findById.mockResolvedValue({ ...baseWinner, drawId: null } as never);

    // Act / Assert
    await expect(drawService.redrawWinner(1, "NON_PAYMENT", 1)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockedDrawRepo.findByIdWithWinners).not.toHaveBeenCalled();
  });

  it("rejects with a 404 when the draw can't be found", async () => {
    // Arrange
    mockedDrawRepo.findByIdWithWinners.mockResolvedValue(null);

    // Act / Assert
    await expect(drawService.redrawWinner(1, "NON_PAYMENT", 1)).rejects.toMatchObject({ statusCode: 404 });
  });
});
