import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { useDevice } from "@/hooks/useDevices";
import { useRegisterInterest } from "@/hooks/useRegisterInterest";

// Mirrors backend/src/validators/registrationValidators.ts's agreed check.
const registerSchema = z.object({
  agreed: z.boolean().refine((v) => v === true, {
    message: "You must agree to the Terms & Conditions",
  }),
});
type RegisterForm = z.infer<typeof registerSchema>;

export default function DeviceDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const deviceId = Number(id);
  const hasValidId = Number.isFinite(deviceId);

  const { data: device, isLoading, isError } = useDevice(deviceId);
  const registerMutation = useRegisterInterest();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { agreed: false } });

  if (!hasValidId) {
    return <Navigate to="/devices" replace />;
  }

  const onSubmit = async ({ agreed }: RegisterForm) => {
    setServerError(null);
    try {
      await registerMutation.mutateAsync({ deviceId, agreed });
      navigate("/devices", { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const isBusy = isSubmitting || registerMutation.isPending;

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link to="/devices" className="text-sm text-primary hover:underline">
          &larr; {t("devices.title")}
        </Link>

        {isLoading ? (
          <LoadingIndicator />
        ) : isError || !device ? (
          <p role="alert" className="text-danger">
            {t("deviceDetail.loadError")}
          </p>
        ) : (
          <>
            <Card className="flex flex-col gap-3">
              <h1 className="text-xl font-semibold text-primary">
                {device.brand} {device.model}
              </h1>
              <p className="text-sm text-gray">
                {device.deviceType} · {device.assetTag}
              </p>
              <p className="text-lg font-semibold">
                {t("devices.priceLabel")}: {device.price}
              </p>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {device.cpu && (
                  <>
                    <dt className="text-gray">{t("deviceDetail.cpu")}</dt>
                    <dd>{device.cpu}</dd>
                  </>
                )}
                {device.ram && (
                  <>
                    <dt className="text-gray">{t("deviceDetail.ram")}</dt>
                    <dd>{device.ram}</dd>
                  </>
                )}
                {device.storage && (
                  <>
                    <dt className="text-gray">{t("deviceDetail.storage")}</dt>
                    <dd>{device.storage}</dd>
                  </>
                )}
                {device.purchaseYear && (
                  <>
                    <dt className="text-gray">{t("deviceDetail.purchaseYear")}</dt>
                    <dd>{device.purchaseYear}</dd>
                  </>
                )}
                {device.yearsUsed != null && (
                  <>
                    <dt className="text-gray">{t("deviceDetail.yearsUsed")}</dt>
                    <dd>{device.yearsUsed}</dd>
                  </>
                )}
              </dl>
            </Card>

            {device.status !== "AVAILABLE" ? (
              <p role="alert" className="text-danger">
                {t("deviceDetail.notAvailable")}
              </p>
            ) : (
              <Card className="flex flex-col gap-4">
                <div>
                  <h2 className="font-semibold text-primary">{t("deviceDetail.termsTitle")}</h2>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray">
                    <li>{t("deviceDetail.termsAsIs")}</li>
                    <li>{t("deviceDetail.termsNoSupport")}</li>
                    <li>{t("deviceDetail.termsFactoryReset")}</li>
                    <li>{t("deviceDetail.termsApproval")}</li>
                  </ul>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1 accent-primary" {...register("agreed")} />
                    <span>{t("deviceDetail.agreeLabel")}</span>
                  </label>
                  {errors.agreed && (
                    <p role="alert" className="text-sm text-danger">
                      {errors.agreed.message}
                    </p>
                  )}
                  {serverError && (
                    <p role="alert" className="text-sm text-danger">
                      {serverError}
                    </p>
                  )}
                  <Button type="submit" isLoading={isBusy}>
                    {isBusy ? t("deviceDetail.registering") : t("deviceDetail.registerCta")}
                  </Button>
                </form>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
