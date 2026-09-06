import { useTranslation } from "react-i18next";

import { getPasswordStrength } from "@/utils/passwordStrength";
import type { PasswordStrength } from "@/utils/passwordStrength";

const STRENGTH_BAR_COUNT = 3;
const FILLED_BARS: Record<PasswordStrength, number> = { empty: 0, weak: 1, fair: 2, strong: 3 };
const BAR_COLOR: Record<PasswordStrength, string> = {
  empty: "bg-border",
  weak: "bg-danger",
  fair: "bg-warning",
  strong: "bg-success",
};

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { t } = useTranslation();
  const strength = getPasswordStrength(password);
  const filled = FILLED_BARS[strength];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1" role="presentation">
        {Array.from({ length: STRENGTH_BAR_COUNT }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${index < filled ? BAR_COLOR[strength] : "bg-border"}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted" aria-live="polite">
        {t(`adminAccountSetup.passwordStrength.${strength}`)}
      </p>
    </div>
  );
}
