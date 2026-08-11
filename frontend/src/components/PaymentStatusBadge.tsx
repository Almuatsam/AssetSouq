import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import type { BadgeVariant } from "@/components/ui/Badge";
import type { PaymentStatus } from "@/types/winner";

const STATUS_BADGE_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  PENDING: "warning",
  PAID: "success",
  NON_PAYMENT: "danger",
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const { t } = useTranslation();

  return <Badge variant={STATUS_BADGE_VARIANT[status]}>{t(`adminWinners.paymentStatusValues.${status}`)}</Badge>;
}
