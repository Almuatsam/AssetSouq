import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import type { BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Registration, RegistrationStatus } from "@/types/device";

const STATUS_BADGE_VARIANT: Record<RegistrationStatus, BadgeVariant> = {
  PENDING: "default",
  ELIGIBLE: "success",
  INELIGIBLE: "danger",
  WITHDRAWN: "default",
};

interface RegistrationStatusCardProps {
  registration: Registration;
}

export function RegistrationStatusCard({ registration }: RegistrationStatusCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold text-ink">{t("registrationStatus.title")}</h2>
      <p className="text-sm text-gray">{t("registrationStatus.subtitle")}</p>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray">{t("registrationStatus.device")}:</span>
        <span className="font-medium">
          {registration.device.brand} {registration.device.model}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray">{t("registrationStatus.price")}:</span>
        <span className="font-medium">{registration.device.price}</span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray">{t("registrationStatus.status")}:</span>
        <Badge variant={STATUS_BADGE_VARIANT[registration.status]}>
          {t(`registrationStatus.statusValues.${registration.status}`)}
        </Badge>
      </div>
    </Card>
  );
}
