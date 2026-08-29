import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";
import "./utils/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/store/AuthContext";
import { TourProvider } from "@/store/TourContext";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {/* TourProvider is router-agnostic and sits outside BrowserRouter
              on purpose — see store/TourContext.tsx's top-of-file comment.
              components/tour/TourRouteSync.tsx (mounted inside <App/>) is
              the router-aware half. */}
          <TourProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </TourProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
