import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import type { BadgeVariant } from "@/components/ui/Badge";
import type { DeviceStatus } from "@/types/device";

const STATUS_BADGE_VARIANT: Record<DeviceStatus, BadgeVariant> = {
  AVAILABLE: "success",
  REMOVED: "default",
  DRAWN: "warning",
  SOLD: "default",
};

interface DeviceStatusBadgeProps {
  status: DeviceStatus;
}

export function DeviceStatusBadge({ status }: DeviceStatusBadgeProps) {
  const { t } = useTranslation();

  return <Badge variant={STATUS_BADGE_VARIANT[status]}>{t(`deviceStatus.${status}`)}</Badge>;
}
