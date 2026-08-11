import request from "supertest";

import { createApp } from "../src/app";
import { AppError } from "../src/middlewares/errorHandler";
import { drawService } from "../src/services/drawService";
import { winnerService } from "../src/services/winnerService";
import { signToken } from "../src/utils/jwt";

jest.mock("../src/services/winnerService");
jest.mock("../src/services/drawService");

const mockedWinnerService = winnerService as jest.Mocked<typeof winnerService>;
const mockedDrawService = drawService as jest.Mocked<typeof drawService>;

const app = createApp();

const adminToken = signToken({ role: "ADMIN", id: 1, username: "admin1" });
const employeeToken = signToken({ role: "EMPLOYEE", id: 10, staffNumber: "S1001" });

const baseWinner = {
  id: 1,
  employeeId: 10,
  deviceId: 1,
  drawId: 100,
  drawDate: new Date(),
  accepted: false,
  priceDue: "150.00",
  paymentStatus: "PENDING",
  paymentDate: null,
  paymentMethod: null,
  handoverDate: null,
  redrawOf: null,
  redrawReason: null,
  employee: { id: 10, staffNumber: "S1001", name: "Jane Doe", department: "Engineering" },
  device: {
    id: 1,
    assetTag: "AST-001",
    deviceType: "Laptop",
    brand: "Dell",
    model: "Latitude 5420",
    price: "150.00",
    status: "DRAWN",
  },
};

describe("GET /api/admin/winners", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).get("/api/admin/winners");

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees (admin-only route)", async () => {
    // Act
    const res = await request(app).get("/api/admin/winners").set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(403);
  });

  it("returns every winner for an authenticated admin", async () => {
    // Arrange
    mockedWinnerService.listAllForAdmin.mockResolvedValue([baseWinner] as never);

    // Act
    const res = await request(app).get("/api/admin/winners").set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.winners).toHaveLength(1);
    expect(mockedWinnerService.listAllForAdmin).toHaveBeenCalledWith({});
  });

  it("passes filters through to the service", async () => {
    // Arrange
    mockedWinnerService.listAllForAdmin.mockResolvedValue([]);

    // Act
    const res = await request(app)
      .get("/api/admin/winners?paymentStatus=PAID&deviceId=1")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(mockedWinnerService.listAllForAdmin).toHaveBeenCalledWith({ paymentStatus: "PAID", deviceId: 1 });
  });

  it("returns 400 for an invalid paymentStatus filter", async () => {
    // Act
    const res = await request(app)
      .get("/api/admin/winners?paymentStatus=NOT_A_STATUS")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(400);
    expect(mockedWinnerService.listAllForAdmin).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/winners/:id/payment", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app)
      .patch("/api/admin/winners/1/payment")
      .send({ paymentStatus: "PAID" });

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees", async () => {
    // Act
    const res = await request(app)
      .patch("/api/admin/winners/1/payment")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ paymentStatus: "PAID" });

    // Assert
    expect(res.status).toBe(403);
  });

  it("records the payment for an authenticated admin", async () => {
    // Arrange
    mockedWinnerService.recordPayment.mockResolvedValue({ ...baseWinner, paymentStatus: "PAID" } as never);

    // Act
    const res = await request(app)
      .patch("/api/admin/winners/1/payment")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ paymentStatus: "PAID", paymentMethod: "Payroll deduction" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.winner.paymentStatus).toBe("PAID");
    expect(mockedWinnerService.recordPayment).toHaveBeenCalledWith(1, {
      paymentStatus: "PAID",
      paymentMethod: "Payroll deduction",
    });
  });

  it("returns 400 for an invalid paymentStatus", async () => {
    // Act
    const res = await request(app)
      .patch("/api/admin/winners/1/payment")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ paymentStatus: "PENDING" });

    // Assert
    expect(res.status).toBe(400);
    expect(mockedWinnerService.recordPayment).not.toHaveBeenCalled();
  });

  it("returns 404 when the winner doesn't exist", async () => {
    // Arrange
    mockedWinnerService.recordPayment.mockRejectedValue(new AppError(404, "Winner not found"));

    // Act
    const res = await request(app)
      .patch("/api/admin/winners/999/payment")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ paymentStatus: "PAID" });

    // Assert
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/winners/:id/handover", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app).patch("/api/admin/winners/1/handover");

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees", async () => {
    // Act
    const res = await request(app)
      .patch("/api/admin/winners/1/handover")
      .set("Authorization", `Bearer ${employeeToken}`);

    // Assert
    expect(res.status).toBe(403);
  });

  it("records the handover for an authenticated admin", async () => {
    // Arrange
    mockedWinnerService.recordHandover.mockResolvedValue({
      ...baseWinner,
      paymentStatus: "PAID",
      handoverDate: new Date(),
    } as never);

    // Act
    const res = await request(app)
      .patch("/api/admin/winners/1/handover")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.data.winner.handoverDate).not.toBeNull();
    expect(mockedWinnerService.recordHandover).toHaveBeenCalledWith(1);
  });

  it("returns 409 when the winner hasn't paid yet", async () => {
    // Arrange
    mockedWinnerService.recordHandover.mockRejectedValue(
      new AppError(409, "Cannot hand over a device before payment is recorded"),
    );

    // Act
    const res = await request(app)
      .patch("/api/admin/winners/1/handover")
      .set("Authorization", `Bearer ${adminToken}`);

    // Assert
    expect(res.status).toBe(409);
  });
});

describe("POST /api/admin/winners/:id/redraw", () => {
  beforeEach(() => jest.clearAllMocks());

  it("requires authentication", async () => {
    // Act
    const res = await request(app)
      .post("/api/admin/winners/1/redraw")
      .send({ reason: "NON_PAYMENT" });

    // Assert
    expect(res.status).toBe(401);
  });

  it("is not available to employees", async () => {
    // Act
    const res = await request(app)
      .post("/api/admin/winners/1/redraw")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ reason: "NON_PAYMENT" });

    // Assert
    expect(res.status).toBe(403);
  });

  it("redraws the winner for an authenticated admin", async () => {
    // Arrange
    mockedDrawService.redrawWinner.mockResolvedValue({
      ...baseWinner,
      id: 2,
      employeeId: 11,
      redrawOf: 1,
      redrawReason: "NON_PAYMENT",
    } as never);

    // Act
    const res = await request(app)
      .post("/api/admin/winners/1/redraw")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "NON_PAYMENT" });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.data.winner.redrawOf).toBe(1);
    expect(mockedDrawService.redrawWinner).toHaveBeenCalledWith(1, "NON_PAYMENT", 1);
  });

  it("returns 400 for a missing reason", async () => {
    // Act
    const res = await request(app)
      .post("/api/admin/winners/1/redraw")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    // Assert
    expect(res.status).toBe(400);
    expect(mockedDrawService.redrawWinner).not.toHaveBeenCalled();
  });

  it("returns 409 when there's no one left in the waiting list", async () => {
    // Arrange
    mockedDrawService.redrawWinner.mockRejectedValue(
      new AppError(409, "No remaining eligible candidates in the waiting list"),
    );

    // Act
    const res = await request(app)
      .post("/api/admin/winners/1/redraw")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "NON_PAYMENT" });

    // Assert
    expect(res.status).toBe(409);
  });

  it("returns 404 when the winner doesn't exist", async () => {
    // Arrange
    mockedDrawService.redrawWinner.mockRejectedValue(new AppError(404, "Winner not found"));

    // Act
    const res = await request(app)
      .post("/api/admin/winners/999/redraw")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "NON_PAYMENT" });

    // Assert
    expect(res.status).toBe(404);
  });
});
