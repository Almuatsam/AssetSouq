import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import type { Device } from "@/types/device";

interface DeviceCardProps {
  device: Device;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col gap-2" data-testid="device-card">
      <h2 className="font-semibold text-ink">
        {device.brand} {device.model}
      </h2>
      <p className="text-sm text-gray">{device.deviceType}</p>
      <p className="text-sm font-medium">
        {t("devices.priceLabel")}: {device.price}
      </p>
      <Link
        to={`/devices/${device.id}`}
        className="mt-2 inline-flex items-center justify-center rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
      >
        {t("devices.viewDetails")}
      </Link>
    </Card>
  );
}
