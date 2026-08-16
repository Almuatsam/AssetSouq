import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { TextField } from "@/components/ui/TextField";
import { useCreateDevice, useUpdateDevice } from "@/hooks/useAdminDevices";
import { useDevice } from "@/hooks/useDevices";

// Mirrors backend/src/validators/adminDeviceValidators.ts. Optional
// numeric fields (purchaseYear, yearsUsed) stay as plain strings here —
// RHF/Zod coercion on possibly-empty text inputs is more trouble than
// it's worth — and are parsed to number|undefined in onSubmit instead.
// Range bounds below mirror the backend's constants exactly.
const MAX_QUANTITY = 10_000;
const MAX_YEARS_USED = 100;
const MIN_PURCHASE_YEAR = 1990;
const CURRENT_YEAR = new Date().getFullYear();

const priceIsValidDecimal = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-4;

// z.coerce.number() turns an empty string into 0 (Number("") === 0), which
// then fails .positive() and silently blocks submission on an untouched
// optional field. Preprocess blanks to undefined first so "optional" means
// what it says.
const optionalPositiveInt = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.coerce.number().int().positive().max(MAX_QUANTITY, `Quantity cannot exceed ${MAX_QUANTITY}`).optional(),
);

// purchaseYear/yearsUsed stay string-typed (see comment above) but still get
// a real range check via refine, rather than accepting any digit string the
// number-typed input happens to produce.
const optionalYearString = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= min && Number(v) <= max), message);

const deviceFormSchema = z.object({
  assetTag: z.string().trim().min(1, "Asset tag is required"),
  deviceType: z.string().trim().min(1, "Device type is required"),
  brand: z.string().trim().min(1, "Brand is required"),
  model: z.string().trim().min(1, "Model is required"),
  cpu: z.string().trim().optional(),
  ram: z.string().trim().optional(),
  storage: z.string().trim().optional(),
  purchaseYear: optionalYearString(
    MIN_PURCHASE_YEAR,
    CURRENT_YEAR,
    `Purchase year must be between ${MIN_PURCHASE_YEAR} and ${CURRENT_YEAR}`,
  ),
  yearsUsed: optionalYearString(0, MAX_YEARS_USED, `Years used must be between 0 and ${MAX_YEARS_USED}`),
  price: z.coerce
    .number()
    .positive("Price must be greater than 0")
    .refine(priceIsValidDecimal, "Price can have at most 2 decimal places"),
  quantity: optionalPositiveInt,
});
type DeviceFormValues = z.infer<typeof deviceFormSchema>;

export default function AdminDeviceFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = id !== undefined;
  const deviceId = Number(id);

  const { data: existingDevice, isLoading: isLoadingDevice, isError: isDeviceError } = useDevice(
    isEditMode ? deviceId : NaN,
  );
  const createDevice = useCreateDevice();
  const updateDevice = useUpdateDevice();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    values: existingDevice
      ? {
          assetTag: existingDevice.assetTag,
          deviceType: existingDevice.deviceType,
          brand: existingDevice.brand,
          model: existingDevice.model,
          cpu: existingDevice.cpu ?? "",
          ram: existingDevice.ram ?? "",
          storage: existingDevice.storage ?? "",
          purchaseYear: existingDevice.purchaseYear?.toString() ?? "",
          yearsUsed: existingDevice.yearsUsed?.toString() ?? "",
          price: Number(existingDevice.price),
          quantity: existingDevice.quantity,
        }
      : undefined,
  });

  const onSubmit = async (values: DeviceFormValues) => {
    setServerError(null);
    const shared = {
      deviceType: values.deviceType,
      brand: values.brand,
      model: values.model,
      cpu: values.cpu || undefined,
      ram: values.ram || undefined,
      storage: values.storage || undefined,
      purchaseYear: values.purchaseYear ? Number(values.purchaseYear) : undefined,
      yearsUsed: values.yearsUsed ? Number(values.yearsUsed) : undefined,
      price: values.price,
      quantity: values.quantity,
    };

    try {
      if (isEditMode) {
        await updateDevice.mutateAsync({ id: deviceId, data: shared });
      } else {
        await createDevice.mutateAsync({ ...shared, assetTag: values.assetTag });
      }
      navigate("/admin/devices", { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const isBusy = isSubmitting || createDevice.isPending || updateDevice.isPending;

  if (isEditMode && isLoadingDevice) {
    return (
      <main className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-xl">
          <LoadingIndicator />
        </div>
      </main>
    );
  }

  if (isEditMode && (isDeviceError || !Number.isFinite(deviceId))) {
    return (
      <main className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-xl">
          <p role="alert" className="text-danger">
            {t("adminDeviceForm.loadError")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <Link to="/admin/devices" className="text-sm text-primary hover:underline">
          &larr; {t("adminDevices.title")}
        </Link>

        <Card>
          <h1 className="mb-6 text-xl font-semibold text-ink">
            {isEditMode ? t("adminDeviceForm.editTitle") : t("adminDeviceForm.createTitle")}
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <TextField
              label={t("adminDeviceForm.assetTag")}
              error={errors.assetTag?.message}
              disabled={isEditMode}
              {...register("assetTag")}
            />
            <TextField
              label={t("adminDeviceForm.deviceType")}
              error={errors.deviceType?.message}
              {...register("deviceType")}
            />
            <TextField label={t("adminDeviceForm.brand")} error={errors.brand?.message} {...register("brand")} />
            <TextField label={t("adminDeviceForm.model")} error={errors.model?.message} {...register("model")} />
            <TextField label={t("adminDeviceForm.cpu")} {...register("cpu")} />
            <TextField label={t("adminDeviceForm.ram")} {...register("ram")} />
            <TextField label={t("adminDeviceForm.storage")} {...register("storage")} />
            <TextField
              label={t("adminDeviceForm.purchaseYear")}
              type="number"
              error={errors.purchaseYear?.message}
              {...register("purchaseYear")}
            />
            <TextField
              label={t("adminDeviceForm.yearsUsed")}
              type="number"
              error={errors.yearsUsed?.message}
              {...register("yearsUsed")}
            />
            <TextField
              label={t("adminDeviceForm.price")}
              type="number"
              step="0.01"
              error={errors.price?.message}
              {...register("price")}
            />
            <TextField
              label={t("adminDeviceForm.quantity")}
              type="number"
              error={errors.quantity?.message}
              {...register("quantity")}
            />

            {serverError && (
              <p role="alert" className="text-sm text-danger">
                {serverError}
              </p>
            )}

            <div className="mt-2 flex gap-3">
              <Button type="submit" isLoading={isBusy}>
                {isBusy ? t("adminDeviceForm.saving") : t("adminDeviceForm.save")}
              </Button>
              <Link
                to="/admin/devices"
                className="inline-flex items-center justify-center rounded-md border border-gray/30 px-4 py-2 text-sm font-medium text-gray transition hover:bg-gray/10"
              >
                {t("adminDeviceForm.cancel")}
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
