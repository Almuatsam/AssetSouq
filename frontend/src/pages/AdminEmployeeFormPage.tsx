import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { TextField } from "@/components/ui/TextField";
import { useAdminEmployee, useCreateEmployee, useUpdateEmployee } from "@/hooks/useAdminEmployees";

// Mirrors backend/src/validators/adminEmployeeValidators.ts.
const employeeFormSchema = z.object({
  staffNumber: z.string().trim().min(1, "Staff number is required"),
  name: z.string().trim().min(1, "Name is required"),
  department: z.string().trim().min(1, "Department is required"),
  email: z.string().trim().email("Invalid email address"),
  laptopHolder: z.boolean(),
  eligible: z.boolean(),
  active: z.boolean(),
});
type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export default function AdminEmployeeFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = id !== undefined;
  const employeeId = Number(id);

  const {
    data: existingEmployee,
    isLoading: isLoadingEmployee,
    isError: isEmployeeError,
  } = useAdminEmployee(isEditMode ? employeeId : NaN);
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      staffNumber: "",
      name: "",
      department: "",
      email: "",
      laptopHolder: false,
      eligible: true,
      active: true,
    },
    values: existingEmployee
      ? {
          staffNumber: existingEmployee.staffNumber,
          name: existingEmployee.name,
          department: existingEmployee.department,
          email: existingEmployee.email,
          laptopHolder: existingEmployee.laptopHolder,
          eligible: existingEmployee.eligible,
          active: existingEmployee.active,
        }
      : undefined,
  });

  const onSubmit = async (values: EmployeeFormValues) => {
    setServerError(null);
    try {
      if (isEditMode) {
        // active is only ever set here (edit mode) — a new employee is
        // always created active, mirroring the backend's schema (see
        // adminEmployeeValidators.ts: createEmployeeSchema has no active
        // field at all, it's Prisma's own column default).
        await updateEmployee.mutateAsync({
          id: employeeId,
          data: {
            name: values.name,
            department: values.department,
            email: values.email,
            laptopHolder: values.laptopHolder,
            eligible: values.eligible,
            active: values.active,
          },
        });
      } else {
        await createEmployee.mutateAsync({
          staffNumber: values.staffNumber,
          name: values.name,
          department: values.department,
          email: values.email,
          laptopHolder: values.laptopHolder,
          eligible: values.eligible,
        });
      }
      navigate("/admin/employees", { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const isBusy = isSubmitting || createEmployee.isPending || updateEmployee.isPending;

  if (isEditMode && isLoadingEmployee) {
    return (
      <main className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-xl">
          <LoadingIndicator />
        </div>
      </main>
    );
  }

  if (isEditMode && (isEmployeeError || !Number.isFinite(employeeId))) {
    return (
      <main className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-xl">
          <p role="alert" className="text-danger">
            {t("adminEmployeeForm.loadError")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <Link to="/admin/employees" className="text-sm text-primary hover:underline">
          &larr; {t("adminEmployees.title")}
        </Link>

        <Card>
          <h1 className="mb-6 text-xl font-semibold text-primary">
            {isEditMode ? t("adminEmployeeForm.editTitle") : t("adminEmployeeForm.createTitle")}
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <TextField
              label={t("adminEmployeeForm.staffNumber")}
              error={errors.staffNumber?.message}
              disabled={isEditMode}
              {...register("staffNumber")}
            />
            <TextField label={t("adminEmployeeForm.name")} error={errors.name?.message} {...register("name")} />
            <TextField
              label={t("adminEmployeeForm.department")}
              error={errors.department?.message}
              {...register("department")}
            />
            <TextField
              label={t("adminEmployeeForm.email")}
              type="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Checkbox label={t("adminEmployeeForm.laptopHolder")} {...register("laptopHolder")} />
            <Checkbox label={t("adminEmployeeForm.eligible")} {...register("eligible")} />
            {isEditMode && <Checkbox label={t("adminEmployeeForm.active")} {...register("active")} />}

            {serverError && (
              <p role="alert" className="text-sm text-danger">
                {serverError}
              </p>
            )}

            <div className="mt-2 flex gap-3">
              <Button type="submit" isLoading={isBusy}>
                {isBusy ? t("adminEmployeeForm.saving") : t("adminEmployeeForm.save")}
              </Button>
              <Link
                to="/admin/employees"
                className="inline-flex items-center justify-center rounded-md border border-gray/30 px-4 py-2 text-sm font-medium text-gray transition hover:bg-gray/10"
              >
                {t("adminEmployeeForm.cancel")}
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
