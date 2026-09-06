import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminCredentialsSetupModal } from "@/components/AdminCredentialsSetupModal";
import { adminAccountService } from "@/services/adminAccountService";
import { AuthProvider } from "@/store/AuthContext";
import i18n from "@/utils/i18n";
import { getStoredSession, setStoredSession } from "@/utils/authStorage";

vi.mock("@/services/adminAccountService", () => ({
  adminAccountService: { changeCredentials: vi.fn() },
}));

const mockedChangeCredentials = adminAccountService.changeCredentials as unknown as ReturnType<
  typeof vi.fn
>;

function renderModal({ open = true, onClose = vi.fn() } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <MemoryRouter initialEntries={["/admin/dashboard"]}>
            <Routes>
              <Route
                path="/admin/dashboard"
                element={
                  <AdminCredentialsSetupModal open={open} onClose={onClose} currentUsername="dev_admin" />
                }
              />
              <Route path="/admin/login" element={<div>LOGIN_PAGE</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

const validNewCredentials = {
  newUsername: "company_admin",
  newPassword: "CompanyPass123",
  confirmPassword: "CompanyPass123",
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/new username/i), validNewCredentials.newUsername);
  await user.type(screen.getByLabelText(/^new password$/i), validNewCredentials.newPassword);
  await user.type(screen.getByLabelText(/confirm new password/i), validNewCredentials.confirmPassword);
}

describe("AdminCredentialsSetupModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setStoredSession({
      token: "old-token",
      user: {
        role: "ADMIN",
        admin: { id: 1, username: "dev_admin", lastLogin: null, credentialsChangedAt: null },
      },
    });
  });

  it("renders nothing when closed", () => {
    // Act
    renderModal({ open: false });

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the current username and the modal's title/description when open", () => {
    // Act
    renderModal();

    // Assert
    expect(screen.getByRole("heading", { name: /complete admin account setup/i })).toBeInTheDocument();
    expect(screen.getByText(/can only be completed once/i)).toBeInTheDocument();
    expect(screen.getByText("dev_admin")).toBeInTheDocument();
  });

  it("rejects an empty new username", async () => {
    // Arrange
    const user = userEvent.setup();
    renderModal();

    // Act
    await user.type(screen.getByLabelText(/^new password$/i), validNewCredentials.newPassword);
    await user.type(screen.getByLabelText(/confirm new password/i), validNewCredentials.confirmPassword);
    await user.click(screen.getByRole("button", { name: /change credentials/i }));

    // Assert
    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
    expect(mockedChangeCredentials).not.toHaveBeenCalled();
  });

  it("rejects a password that fails the strength policy", async () => {
    // Arrange
    const user = userEvent.setup();
    renderModal();

    // Act
    await user.type(screen.getByLabelText(/new username/i), "company_admin");
    await user.type(screen.getByLabelText(/^new password$/i), "short1");
    await user.type(screen.getByLabelText(/confirm new password/i), "short1");
    await user.click(screen.getByRole("button", { name: /change credentials/i }));

    // Assert — anchored the same way as the uppercase test above, since
    // the always-visible requirements hint also contains "at least 12
    // characters".
    expect(await screen.findByText(/password must be at least 12 characters/i)).toBeInTheDocument();
  });

  it("rejects a password missing an uppercase letter", async () => {
    // Arrange
    const user = userEvent.setup();
    renderModal();

    // Act
    await user.type(screen.getByLabelText(/new username/i), "company_admin");
    await user.type(screen.getByLabelText(/^new password$/i), "alllowercase123");
    await user.type(screen.getByLabelText(/confirm new password/i), "alllowercase123");
    await user.click(screen.getByRole("button", { name: /change credentials/i }));

    // Assert — anchored on the validator's own "Password must ..." wording
    // rather than a bare substring: the always-visible password
    // requirements hint below the field also contains "include an
    // uppercase letter", so an unanchored match would find both.
    expect(await screen.findByText(/password must include an uppercase letter/i)).toBeInTheDocument();
  });

  it("rejects mismatched passwords", async () => {
    // Arrange
    const user = userEvent.setup();
    renderModal();

    // Act
    await user.type(screen.getByLabelText(/new username/i), "company_admin");
    await user.type(screen.getByLabelText(/^new password$/i), "CompanyPass123");
    await user.type(screen.getByLabelText(/confirm new password/i), "SomethingElse123");
    await user.click(screen.getByRole("button", { name: /change credentials/i }));

    // Assert
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(mockedChangeCredentials).not.toHaveBeenCalled();
  });

  it("toggles the new-password field between hidden and visible text", async () => {
    // Arrange
    const user = userEvent.setup();
    renderModal();

    // Act / Assert
    expect(screen.getByLabelText(/^new password$/i)).toHaveAttribute("type", "password");
    await user.click(screen.getAllByRole("button", { name: /show password/i })[0]);
    expect(screen.getByLabelText(/^new password$/i)).toHaveAttribute("type", "text");
  });

  it("shows a confirmation step (not the browser confirm dialog) before submitting", async () => {
    // Arrange
    const user = userEvent.setup();
    renderModal();

    // Act
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /change credentials/i }));

    // Assert
    expect(
      await screen.findByText(/are you sure you want to change the administrator credentials/i),
    ).toBeInTheDocument();
    expect(mockedChangeCredentials).not.toHaveBeenCalled();
  });

  it("returns to the form when Back is clicked from the confirmation step", async () => {
    // Arrange
    const user = userEvent.setup();
    renderModal();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /change credentials/i }));

    // Act
    await user.click(await screen.findByRole("button", { name: /back/i }));

    // Assert
    expect(screen.getByLabelText(/new username/i)).toBeInTheDocument();
  });

  it("moves focus to the new step's heading on both the form-to-confirm and confirm-to-form transitions", async () => {
    // Arrange — useFocusTrap only runs its own initial-focus logic once,
    // on open; without a dedicated fix, focus is silently dropped to
    // <body> on every step transition instead.
    const user = userEvent.setup();
    renderModal();
    await fillValidForm(user);

    // Act
    await user.click(screen.getByRole("button", { name: /change credentials/i }));

    // Assert
    expect(await screen.findByRole("heading", { name: /confirm credential change/i })).toHaveFocus();

    // Act
    await user.click(screen.getByRole("button", { name: /back/i }));

    // Assert
    expect(screen.getByRole("heading", { name: /complete admin account setup/i })).toHaveFocus();
  });

  it("cannot be dismissed via Escape while the credential change is in flight, preventing a forced logout on an already-dismissed dialog", async () => {
    // Arrange — a mutation that never resolves on its own, so isPending
    // stays true for the duration of this test.
    let resolveChange!: (value: unknown) => void;
    mockedChangeCredentials.mockReturnValue(
      new Promise((resolve) => {
        resolveChange = resolve;
      }),
    );
    const user = userEvent.setup();
    renderModal();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /change credentials/i }));
    await user.click(await screen.findByRole("button", { name: /yes, change credentials/i }));

    // Act — attempt to dismiss while the mutation is still pending.
    await user.keyboard("{Escape}");

    // Assert — still open, mutation still in flight.
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Cleanup — resolve so the mutation doesn't leak into the next test.
    resolveChange({
      id: 1,
      username: "company_admin",
      lastLogin: null,
      credentialsChangedAt: "2026-01-01T00:00:00.000Z",
    });
    await screen.findByText("LOGIN_PAGE");
  });

  it("submits on confirmation, clears the session, and navigates to the login page", async () => {
    // Arrange
    mockedChangeCredentials.mockResolvedValue({
      id: 1,
      username: "company_admin",
      lastLogin: null,
      credentialsChangedAt: "2026-01-01T00:00:00.000Z",
    });
    const user = userEvent.setup();
    renderModal();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /change credentials/i }));

    // Act
    await user.click(await screen.findByRole("button", { name: /yes, change credentials/i }));

    // Assert
    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
    expect(mockedChangeCredentials).toHaveBeenCalledWith(validNewCredentials);
    expect(getStoredSession()).toBeNull();
  });

  it("shows the server error on the confirmation step and does not navigate away when the change fails", async () => {
    // Arrange
    mockedChangeCredentials.mockRejectedValue(
      new Error("The one-time admin credential setup has already been completed"),
    );
    const user = userEvent.setup();
    renderModal();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /change credentials/i }));

    // Act
    await user.click(await screen.findByRole("button", { name: /yes, change credentials/i }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(/already been completed/i);
    await waitFor(() => expect(screen.queryByText("LOGIN_PAGE")).not.toBeInTheDocument());
    expect(getStoredSession()).not.toBeNull();
  });

  it("calls onClose when Cancel is clicked on the form step", async () => {
    // Arrange
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderModal({ onClose });

    // Act
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    // Assert
    expect(onClose).toHaveBeenCalled();
  });
});
