import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import type { BadgeVariant } from "@/components/ui/Badge";
import type { RegistrationStatus } from "@/types/device";

const STATUS_BADGE_VARIANT: Record<RegistrationStatus, BadgeVariant> = {
  PENDING: "default",
  ELIGIBLE: "success",
  INELIGIBLE: "danger",
  WITHDRAWN: "default",
};

interface RegistrationStatusBadgeProps {
  status: RegistrationStatus;
}

// Uses its own short labels (adminRegistrations.statusValues.*) rather
// than the employee-facing registrationStatus.statusValues.* namespace —
// that one holds full sentences ("Eligible — awaiting draw") meant for a
// paragraph on the employee's own status page, too verbose for a compact
// table badge here.
export function RegistrationStatusBadge({ status }: RegistrationStatusBadgeProps) {
  const { t } = useTranslation();

  return <Badge variant={STATUS_BADGE_VARIANT[status]}>{t(`adminRegistrations.statusValues.${status}`)}</Badge>;
}
