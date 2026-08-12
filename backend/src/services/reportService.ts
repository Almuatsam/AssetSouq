import ExcelJS from "exceljs";

import { deviceRepository } from "../repositories/deviceRepository";
import { employeeRepository } from "../repositories/employeeRepository";
import { registrationRepository } from "../repositories/registrationRepository";
import { winnerRepository } from "../repositories/winnerRepository";

// Prisma's Decimal fields (Device.price, Winner.priceDue) don't serialize
// as plain numbers the way ExcelJS expects for a numeric cell — they're
// Prisma.Decimal instances, not strings, but Number() coerces via
// valueOf() and round-trips exactly at this column's precision
// (@db.Decimal(10, 2), well under Number.MAX_SAFE_INTEGER), and the value
// always comes straight out of the DB, never user input.
function toAmount(value: unknown): number {
  return Number(value);
}

// Excel treats a cell string starting with =, +, -, or @ as a formula to
// evaluate on open — "spreadsheet/CSV injection" defense-in-depth for any
// free-text field that ultimately traces back to something other than an
// admin typing directly into Excel themselves (bulk-imported employee
// name/department, a free-text payment method entered via a prompt, an
// admin-entered device field). exceljs already writes plain strings as a
// literal String cell type rather than a Formula one, so this isn't
// closing an active hole in this exact export path today — it's a cheap
// safeguard against the value surviving a later re-export/re-paste as
// CSV, where that distinction no longer exists. Leading apostrophe is the
// standard "force literal text" escape Excel itself uses.
function sanitizeText<T>(value: T): T {
  if (typeof value !== "string") return value;
  return (/^[=+\-@]/.test(value) ? `'${value}` : value) as unknown as T;
}

async function toBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  // writeBuffer() already returns a genuine Node Buffer at runtime — the
  // cast (not Buffer.from(), which always allocates and copies) is only
  // working around exceljs's own index.d.ts declaring `interface Buffer
  // extends ArrayBuffer {}` at module scope, which corrupts the ambient
  // global Buffer type for this whole program (same root cause as the
  // matching comment in employeeImportService.ts's parseEmployeeWorkbook).
  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
}

export const reportService = {
  // Every export below intentionally has no filters (unlike the admin
  // list endpoints they're built on) — these are full-dataset snapshots
  // for offline record-keeping, not a filtered view of what's currently
  // on screen. Add filter params here if that need shows up later.

  async buildDevicesReport(): Promise<Buffer> {
    const devices = await deviceRepository.findAll();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Devices");
    sheet.columns = [
      { header: "Asset Tag", key: "assetTag", width: 16 },
      { header: "Type", key: "deviceType", width: 14 },
      { header: "Brand", key: "brand", width: 14 },
      { header: "Model", key: "model", width: 20 },
      { header: "CPU", key: "cpu", width: 20 },
      { header: "RAM", key: "ram", width: 10 },
      { header: "Storage", key: "storage", width: 12 },
      { header: "Purchase Year", key: "purchaseYear", width: 14 },
      { header: "Years Used", key: "yearsUsed", width: 12 },
      { header: "Price", key: "price", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const device of devices) {
      sheet.addRow({
        assetTag: sanitizeText(device.assetTag),
        deviceType: sanitizeText(device.deviceType),
        brand: sanitizeText(device.brand),
        model: sanitizeText(device.model),
        cpu: sanitizeText(device.cpu),
        ram: sanitizeText(device.ram),
        storage: sanitizeText(device.storage),
        purchaseYear: device.purchaseYear,
        yearsUsed: device.yearsUsed,
        price: toAmount(device.price),
        status: device.status,
        quantity: device.quantity,
        createdAt: device.createdAt,
      });
    }
    return toBuffer(workbook);
  },

  async buildEmployeesReport(): Promise<Buffer> {
    const employees = await employeeRepository.findAll({});

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Employees");
    sheet.columns = [
      { header: "Staff Number", key: "staffNumber", width: 16 },
      { header: "Name", key: "name", width: 24 },
      { header: "Department", key: "department", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "Active", key: "active", width: 10 },
      { header: "Laptop Holder", key: "laptopHolder", width: 14 },
      { header: "Eligible", key: "eligible", width: 10 },
      { header: "Last Winner Date", key: "lastWinnerDate", width: 18 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const employee of employees) {
      sheet.addRow({
        staffNumber: sanitizeText(employee.staffNumber),
        name: sanitizeText(employee.name),
        department: sanitizeText(employee.department),
        email: sanitizeText(employee.email),
        active: employee.active,
        laptopHolder: employee.laptopHolder,
        eligible: employee.eligible,
        lastWinnerDate: employee.lastWinnerDate,
        createdAt: employee.createdAt,
      });
    }
    return toBuffer(workbook);
  },

  async buildRegistrationsReport(): Promise<Buffer> {
    const registrations = await registrationRepository.findAllForAdmin({});

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Registrations");
    sheet.columns = [
      { header: "Staff Number", key: "staffNumber", width: 16 },
      { header: "Employee Name", key: "employeeName", width: 24 },
      { header: "Asset Tag", key: "assetTag", width: 16 },
      { header: "Device", key: "device", width: 24 },
      { header: "Status", key: "status", width: 14 },
      { header: "Agreed to Terms", key: "agreed", width: 14 },
      { header: "Submitted At", key: "submittedAt", width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const registration of registrations) {
      sheet.addRow({
        staffNumber: sanitizeText(registration.employee.staffNumber),
        employeeName: sanitizeText(registration.employee.name),
        assetTag: sanitizeText(registration.device.assetTag),
        device: sanitizeText(`${registration.device.brand} ${registration.device.model}`),
        status: registration.status,
        agreed: registration.agreed,
        submittedAt: registration.submittedAt,
      });
    }
    return toBuffer(workbook);
  },

  async buildWinnersReport(): Promise<Buffer> {
    const winners = await winnerRepository.findAllForAdmin({});

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Winners");
    sheet.columns = [
      { header: "Staff Number", key: "staffNumber", width: 16 },
      { header: "Employee Name", key: "employeeName", width: 24 },
      { header: "Asset Tag", key: "assetTag", width: 16 },
      { header: "Device", key: "device", width: 24 },
      { header: "Price Due", key: "priceDue", width: 12 },
      { header: "Payment Status", key: "paymentStatus", width: 16 },
      { header: "Payment Method", key: "paymentMethod", width: 18 },
      { header: "Payment Date", key: "paymentDate", width: 18 },
      { header: "Draw Date", key: "drawDate", width: 18 },
      { header: "Handover Date", key: "handoverDate", width: 18 },
      { header: "Redraw Reason", key: "redrawReason", width: 16 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const winner of winners) {
      sheet.addRow({
        staffNumber: sanitizeText(winner.employee.staffNumber),
        employeeName: sanitizeText(winner.employee.name),
        assetTag: sanitizeText(winner.device.assetTag),
        device: sanitizeText(`${winner.device.brand} ${winner.device.model}`),
        priceDue: toAmount(winner.priceDue),
        paymentStatus: winner.paymentStatus,
        paymentMethod: sanitizeText(winner.paymentMethod),
        paymentDate: winner.paymentDate,
        drawDate: winner.drawDate,
        handoverDate: winner.handoverDate,
        redrawReason: winner.redrawReason,
      });
    }
    return toBuffer(workbook);
  },
};
