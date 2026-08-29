import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";

import i18n from "@/utils/i18n";
import { AuthProvider } from "@/store/AuthContext";
import { TourProvider } from "@/store/TourContext";

// Shared test harness: every provider a page under test might reach for
// (routing, i18n, react-query, auth, the guided tour), so individual test
// files only worry about the component-specific setup. TourProvider sits
// outside MemoryRouter here, mirroring main.tsx's real provider order
// (TourProvider is router-agnostic and wraps BrowserRouter there — see
// store/TourContext.tsx's top-of-file comment).
export function renderWithProviders(ui: ReactElement, { route = "/" } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <TourProvider>
            <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
          </TourProvider>
        </AuthProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}
