export type PaymentStatus = "PENDING" | "PAID" | "NON_PAYMENT";
export type RedrawReason = "DECLINED" | "NON_PAYMENT" | "NO_SHOW" | "ADMIN_OVERRIDE";

export interface WinnerEmployeeSummary {
  id: number;
  staffNumber: string;
  name: string;
  department: string;
}

export interface WinnerDeviceSummary {
  id: number;
  assetTag: string;
  deviceType: string;
  brand: string;
  model: string;
  price: string;
  status: string;
}

// Mirrors backend GET /admin/winners's WinnerAdminRow.
export interface Winner {
  id: number;
  employeeId: number;
  deviceId: number;
  drawId: number | null;
  drawDate: string;
  accepted: boolean;
  priceDue: string;
  paymentStatus: PaymentStatus;
  paymentDate: string | null;
  paymentMethod: string | null;
  handoverDate: string | null;
  redrawOf: number | null;
  redrawReason: RedrawReason | null;
  employee: WinnerEmployeeSummary;
  device: WinnerDeviceSummary;
}

// Mirrors backend/src/validators/adminWinnerValidators.ts's listWinnersQuerySchema.
export interface WinnerListFilters {
  deviceId?: number;
  employeeId?: number;
  paymentStatus?: PaymentStatus;
}

// Mirrors backend/src/validators/adminWinnerValidators.ts's
// recordPaymentSchema — PENDING is intentionally not a valid target.
export interface RecordPaymentInput {
  paymentStatus: "PAID" | "NON_PAYMENT";
  paymentMethod?: string;
}

// Mirrors backend POST /admin/draws's DrawWithWinners.winners — narrower
// than Winner above (no device join, no payment/handover/redraw fields)
// since that's all drawRepository.findByIdWithWinners actually selects.
export interface DrawWinnerSummary {
  id: number;
  employeeId: number;
  deviceId: number;
  drawId: number | null;
  priceDue: string;
  paymentStatus: PaymentStatus;
  employee: WinnerEmployeeSummary;
}

export interface Draw {
  id: number;
  deviceId: number;
  rngSeed: string;
  candidatePoolSnapshot: number[];
  drawnAt: string;
  drawnByAdminId: number;
  winners: DrawWinnerSummary[];
}
