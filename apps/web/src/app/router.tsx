import { createBrowserRouter } from "react-router-dom"

import { AdminRoute } from "@/features/auth/components/AdminRoute"
import { GuestRoute } from "@/features/auth/components/GuestRoute"
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute"
import { AdminPage } from "@/features/auth/pages/AdminPage"
import { ChangePasswordPage } from "@/features/auth/pages/ChangePasswordPage"
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage"
import { LoginPage } from "@/features/auth/pages/LoginPage"
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage"
import { SignupPage } from "@/features/auth/pages/SignupPage"
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage"
import { PlannerPage } from "@/features/planner/pages/PlannerPage"
import { TradingPage } from "@/features/trading/pages/TradingPage"
import { TradingClassicPage } from "@/features/trading/pages/TradingClassicPage"
import { TradingV2PreviewPage } from "@/features/trading/pages/TradingV2PreviewPage"
import { CreateJournalPage } from "@/features/trading/pages/CreateJournalPage"
import { BooksPage } from "@/features/books/pages/BooksPage"
import { FinancePage } from "@/features/finance/pages/FinancePage"
import { HealthPage } from "@/features/health/pages/HealthPage"
import { Navigate } from "react-router-dom"

import { AiPage } from "@/features/ai/pages/AiPage"
import { ImportReviewPage } from "@/features/ai/pages/ImportReviewPage"
import { ImportUnderstandingPage } from "@/features/ai/pages/ImportUnderstandingPage"
import { ImportUploadPage } from "@/features/ai/pages/ImportUploadPage"
import { KnowledgeInboxPage } from "@/features/ai/pages/KnowledgeInboxPage"
import { ReviewExperiencePreviewPage } from "@/features/ai/pages/ReviewExperiencePreviewPage"
import { KnowledgePage } from "@/features/knowledge/pages/KnowledgePage"
import { DashboardLayout } from "@/shared/components/layout/DashboardLayout"
import { PlaceholderPage } from "@/shared/components/PlaceholderPage"

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          { path: "planner", element: <PlannerPage /> },
          { path: "tasks", element: <PlaceholderPage title="Tasks" /> },
          { path: "goals", element: <PlaceholderPage title="Goals" /> },
          { path: "trading", element: <TradingPage /> },
          { path: "trading/journals/new", element: <CreateJournalPage /> },
          { path: "trading/journals/:journalId/edit", element: <CreateJournalPage /> },
          { path: "trading/classic", element: <TradingClassicPage /> },
          { path: "trading/v2-preview", element: <TradingV2PreviewPage /> },
          { path: "books", element: <BooksPage /> },
          { path: "knowledge", element: <KnowledgePage /> },
          { path: "finance", element: <FinancePage /> },
          { path: "health", element: <HealthPage /> },
          { path: "career", element: <PlaceholderPage title="Career" /> },
          { path: "notes", element: <PlaceholderPage title="Notes" /> },
          {
            path: "ai",
            children: [
              { index: true, element: <AiPage /> },
              { path: "imports", element: <ImportUploadPage /> },
              { path: "imports/:jobId/understand", element: <ImportUnderstandingPage /> },
              { path: "imports/review", element: <Navigate to="/ai/imports" replace /> },
              { path: "imports/review/:jobId", element: <ImportReviewPage /> },
              { path: "imports/review-preview", element: <ReviewExperiencePreviewPage /> },
              { path: "imports/:jobId", element: <ImportUploadPage /> },
              { path: "knowledge/inbox", element: <KnowledgeInboxPage /> },
            ],
          },
          { path: "settings", element: <PlaceholderPage title="Settings" /> },
          { path: "change-password", element: <ChangePasswordPage /> },
          {
            element: <AdminRoute />,
            children: [{ path: "admin", element: <AdminPage /> }],
          },
        ],
      },
    ],
  },
])
