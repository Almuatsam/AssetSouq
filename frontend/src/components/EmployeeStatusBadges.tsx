import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import type { Employee } from "@/types/employee";

interface EmployeeStatusBadgesProps {
  employee: Pick<Employee, "active" | "eligible" | "laptopHolder">;
}

export function EmployeeStatusBadges({ employee }: EmployeeStatusBadgesProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={employee.active ? "success" : "default"}>
        {t(employee.active ? "employeeStatus.active" : "employeeStatus.inactive")}
      </Badge>
      <Badge variant={employee.eligible ? "success" : "warning"}>
        {t(employee.eligible ? "employeeStatus.eligible" : "employeeStatus.ineligible")}
      </Badge>
      {employee.laptopHolder && <Badge variant="warning">{t("employeeStatus.laptopHolder")}</Badge>}
    </div>
  );
}
