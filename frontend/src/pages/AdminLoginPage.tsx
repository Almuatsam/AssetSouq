import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { authService } from "@/services/authService";
import { useAuth } from "@/store/AuthContext";

// Mirrors backend/src/validators/authValidators.ts's adminLoginSchema.
const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
type AdminLoginForm = z.infer<typeof adminLoginSchema>;

export default function AdminLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  // Set once, by AdminCredentialsSetupModal's navigate() call after a
  // successful one-time credential change — read only at mount so it
  // doesn't linger across an unrelated failed login attempt on this page.
  const [credentialsChangedSuccess] = useState(
    () => Boolean((location.state as { credentialsChangedSuccess?: boolean } | null)?.credentialsChangedSuccess),
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginForm>({ resolver: zodResolver(adminLoginSchema) });

  const onSubmit = async ({ username, password }: AdminLoginForm) => {
    setServerError(null);
    try {
      const session = await authService.loginAdmin(username, password);
      login(session);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("common.error"));
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-sm"
      >
        <h1 className="mb-6 text-xl font-semibold text-ink">{t("auth.adminLoginTitle")}</h1>

        {credentialsChangedSuccess && (
          <p role="status" className="mb-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {t("adminAccountSetup.successMessage")}
          </p>
        )}

        <TextField
          label={t("auth.username")}
          error={errors.username?.message}
          autoComplete="username"
          {...register("username")}
        />

        <div className="mt-4">
          <TextField
            label={t("auth.password")}
            type="password"
            error={errors.password?.message}
            autoComplete="current-password"
            {...register("password")}
          />
        </div>

        {serverError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {serverError}
          </p>
        )}

        <Button type="submit" isLoading={isSubmitting} className="mt-6 w-full">
          {isSubmitting ? t("auth.loggingIn") : t("auth.login")}
        </Button>
      </form>
    </main>
  );
}
