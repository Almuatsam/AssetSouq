import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PasswordStrengthMeter } from "@/components/ui/PasswordStrengthMeter";
import { TextField } from "@/components/ui/TextField";
import { useChangeAdminCredentials } from "@/hooks/useAdminAccount";
import type { ChangeAdminCredentialsInput } from "@/services/adminAccountService";
import { useAuth } from "@/store/AuthContext";

// Mirrors backend/src/validators/adminAccountValidators.ts's
// changeAdminCredentialsSchema — same floor, same complexity rules, same
// upper bounds (191-char VARCHAR(191) username column; 72-byte bcrypt
// truncation point for the password). The backend re-validates
// independently and remains the source of truth; this only gives the
// admin fast, inline feedback.
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 72;
const MAX_USERNAME_LENGTH = 191;

function buildSchema(t: (key: string) => string) {
  return z
    .object({
      newUsername: z
        .string()
        .trim()
        .min(1, t("adminAccountSetup.errors.usernameRequired"))
        .max(MAX_USERNAME_LENGTH, t("adminAccountSetup.errors.usernameTooLong")),
      newPassword: z
        .string()
        .min(MIN_PASSWORD_LENGTH, t("adminAccountSetup.errors.passwordTooShort"))
        .max(MAX_PASSWORD_LENGTH, t("adminAccountSetup.errors.passwordTooLong"))
        .regex(/[a-z]/, t("adminAccountSetup.errors.passwordNeedsLowercase"))
        .regex(/[A-Z]/, t("adminAccountSetup.errors.passwordNeedsUppercase"))
        .regex(/[0-9]/, t("adminAccountSetup.errors.passwordNeedsNumber")),
      confirmPassword: z.string().min(1, t("adminAccountSetup.errors.confirmRequired")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("adminAccountSetup.errors.passwordsDoNotMatch"),
      path: ["confirmPassword"],
    });
}

interface AdminCredentialsSetupModalProps {
  open: boolean;
  onClose: () => void;
  currentUsername: string;
}

// The one-time default-admin-credential handover modal. A thin wrapper
// around Modal that only mounts its form/confirm content while open, so
// reopening it always starts fresh — see Modal.tsx's own comment on why
// that's true without extra reset logic.
//
// isSubmitting is tracked here (not just inside CredentialsSetupContent)
// so it can gate Modal's `dismissable` prop — while the credential change
// is actually in flight, Escape/overlay-click must not be able to tear
// down CredentialsSetupContent out from under the still-running mutation:
// that mutation's own success handler calls logout() + navigate() when it
// resolves, which must never fire against a dialog the admin already
// believes they cancelled.
export function AdminCredentialsSetupModal({
  open,
  onClose,
  currentUsername,
}: AdminCredentialsSetupModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="admin-credentials-setup-title"
      dismissable={!isSubmitting}
    >
      {open && (
        <CredentialsSetupContent
          onClose={onClose}
          currentUsername={currentUsername}
          onSubmittingChange={setIsSubmitting}
        />
      )}
    </Modal>
  );
}

function CredentialsSetupContent({
  onClose,
  currentUsername,
  onSubmittingChange,
}: {
  onClose: () => void;
  currentUsername: string;
  onSubmittingChange: (isSubmitting: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [pendingInput, setPendingInput] = useState<ChangeAdminCredentialsInput | null>(null);
  const changeCredentials = useChangeAdminCredentials();
  const schema = useMemo(() => buildSchema(t), [t]);

  useEffect(() => {
    onSubmittingChange(changeCredentials.isPending);
  }, [changeCredentials.isPending, onSubmittingChange]);

  // Moves focus to the new step's heading whenever the wizard advances or
  // goes back — useFocusTrap (hooks/useFocusTrap.ts, used by Modal) only
  // runs its own initial-focus logic once, when the dialog opens, since
  // its effect depends on `active` alone; it has no way to know this
  // component swapped its entire children out for a different step. On
  // the very first mount this races harmlessly with useFocusTrap's own
  // initial-focus effect in the parent — React fires child effects before
  // parent effects, so useFocusTrap's "focus the first focusable element"
  // still wins for the opening step, and this only takes over for the
  // step *transitions* it can't see.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangeAdminCredentialsInput>({ resolver: zodResolver(schema) });

  const newPassword = watch("newPassword") ?? "";
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const goToConfirm = (values: ChangeAdminCredentialsInput) => {
    setPendingInput(values);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!pendingInput) return;
    try {
      await changeCredentials.mutateAsync(pendingInput);
      // The backend has already invalidated any token issued before this
      // moment (see backend/src/utils/adminSessionInvalidation.ts) — this
      // clears the frontend's own copy and sends the admin to log in
      // again with the new credentials, completing the flow the spec
      // describes rather than leaving a now-stale session in place.
      logout();
      navigate("/admin/login", { replace: true, state: { credentialsChangedSuccess: true } });
    } catch {
      // changeCredentials.error is rendered below; nothing else to do —
      // the admin can retry from the confirm step.
    }
  };

  if (step === "confirm") {
    return (
      <div className="flex flex-col gap-4">
        <h2
          ref={headingRef}
          tabIndex={-1}
          id="admin-credentials-setup-title"
          className="text-lg font-semibold text-ink outline-none"
        >
          {t("adminAccountSetup.confirmTitle")}
        </h2>
        <p className="text-sm text-ink">{t("adminAccountSetup.confirmMessage")}</p>

        {changeCredentials.isError && (
          <p role="alert" className="text-sm text-danger">
            {changeCredentials.error instanceof Error
              ? changeCredentials.error.message
              : t("common.error")}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep("form")}
            disabled={changeCredentials.isPending}
          >
            {t("adminAccountSetup.confirmBack")}
          </Button>
          <Button type="button" isLoading={changeCredentials.isPending} onClick={handleConfirm}>
            {t("adminAccountSetup.confirmSubmit")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(goToConfirm)} noValidate className="flex flex-col gap-4">
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          id="admin-credentials-setup-title"
          className="text-lg font-semibold text-ink outline-none"
        >
          {t("adminAccountSetup.modalTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("adminAccountSetup.modalDescription")}</p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted">
          {t("adminAccountSetup.currentUsernameLabel")}
        </span>
        <span className="text-sm text-ink">{currentUsername}</span>
      </div>

      <TextField
        label={t("adminAccountSetup.newUsernameLabel")}
        error={errors.newUsername?.message}
        autoComplete="username"
        {...register("newUsername")}
      />

      <div className="flex flex-col gap-1">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextField
              label={t("adminAccountSetup.newPasswordLabel")}
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              error={errors.newPassword?.message}
              autoComplete="new-password"
              {...register("newPassword")}
            />
          </div>
          <button
            type="button"
            aria-pressed={showNewPassword}
            aria-controls="newPassword"
            onClick={() => setShowNewPassword((prev) => !prev)}
            className="mb-2 text-xs font-medium text-primary hover:underline"
          >
            {showNewPassword ? t("adminAccountSetup.hidePassword") : t("adminAccountSetup.showPassword")}
          </button>
        </div>
        <PasswordStrengthMeter password={newPassword} />
        <p className="text-xs text-muted">{t("adminAccountSetup.passwordRequirements")}</p>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextField
            label={t("adminAccountSetup.confirmPasswordLabel")}
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        </div>
        <button
          type="button"
          aria-pressed={showConfirmPassword}
          aria-controls="confirmPassword"
          onClick={() => setShowConfirmPassword((prev) => !prev)}
          className="mb-2 text-xs font-medium text-primary hover:underline"
        >
          {showConfirmPassword ? t("adminAccountSetup.hidePassword") : t("adminAccountSetup.showPassword")}
        </button>
      </div>

      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("adminAccountSetup.cancel")}
        </Button>
        <Button type="submit">{t("adminAccountSetup.submit")}</Button>
      </div>
    </form>
  );
}
