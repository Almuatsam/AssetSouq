import { z } from "zod";

// DECIMAL(10,2) (schema.prisma) tops out at 8 digits before the point —
// bound it explicitly rather than letting an out-of-range value (or a
// scientific-notation string like "1e300", which has no fractional part
// for the decimal-places check below to catch) reach Prisma/MySQL and
// fail as an opaque 500 instead of a clean 400.
const MAX_PRICE = 99_999_999.99;
const MAX_QUANTITY = 10_000;
const MAX_YEARS_USED = 100;

// Matches the DECIMAL(10,2) column — reject anything with more precision
// than the DB will actually store, rather than silently truncating it.
//
// Compares with a tolerance rather than exact integer equality on
// `v * 100`: IEEE-754 float multiplication makes plenty of ordinary
// 2-decimal prices (19.99 * 100 === 1998.9999999999998, not 1999) fail
// `Number.isInteger` even though they're valid — this still correctly
// rejects genuine 3+-decimal input like 150.999 (off by 0.1, far past
// the tolerance).
//
// The tolerance itself must scale with the fact that float rounding
// error grows with magnitude, not stay fixed: at the top of MAX_PRICE's
// range, `v * 100` is ~1e10, where a single float's precision is already
// ~1e-6 wide — a naive 1e-9 epsilon (fine for small prices) started
// failing valid large ones like 1,234,567.89 for the same reason 19.99
// did. 1e-4 comfortably clears that ceiling while staying far below the
// smallest real violation (any 3rd-decimal-digit price is off by >= 0.1).
const PRICE_EPSILON = 1e-4;
const price = z.coerce
  .number()
  .finite("Price must be a finite number")
  .positive("Price must be greater than 0")
  .max(MAX_PRICE, `Price cannot exceed ${MAX_PRICE}`)
  .refine(
    (v) => Math.abs(v * 100 - Math.round(v * 100)) < PRICE_EPSILON,
    "Price can have at most 2 decimal places",
  );

const yearsUsed = z.coerce.number().int().min(0).max(MAX_YEARS_USED);
const quantity = z.coerce.number().int().positive().max(MAX_QUANTITY);

export const createDeviceSchema = z.object({
  assetTag: z.string().trim().min(1, "Asset tag is required"),
  deviceType: z.string().trim().min(1, "Device type is required"),
  brand: z.string().trim().min(1, "Brand is required"),
  model: z.string().trim().min(1, "Model is required"),
  cpu: z.string().trim().min(1).optional(),
  ram: z.string().trim().min(1).optional(),
  storage: z.string().trim().min(1).optional(),
  purchaseYear: z.coerce.number().int().min(1990).max(new Date().getFullYear()).optional(),
  yearsUsed: yearsUsed.optional(),
  price,
  quantity: quantity.default(1),
});
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;

// assetTag is intentionally excluded — it's a fixed physical-asset
// identifier, not something an admin should be able to silently retarget
// onto a different device after the fact.
export const updateDeviceSchema = z
  .object({
    deviceType: z.string().trim().min(1).optional(),
    brand: z.string().trim().min(1).optional(),
    model: z.string().trim().min(1).optional(),
    cpu: z.string().trim().min(1).optional(),
    ram: z.string().trim().min(1).optional(),
    storage: z.string().trim().min(1).optional(),
    purchaseYear: z.coerce.number().int().min(1990).max(new Date().getFullYear()).optional(),
    yearsUsed: yearsUsed.optional(),
    price: price.optional(),
    quantity: quantity.optional(),
    status: z.enum(["AVAILABLE", "REMOVED", "DRAWN", "SOLD"]).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: "At least one field must be provided" });
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;

export const listDevicesQuerySchema = z.object({
  status: z.enum(["AVAILABLE", "REMOVED", "DRAWN", "SOLD"]).optional(),
});
