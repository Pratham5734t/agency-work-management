import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { ClientDetailPage } from "@/pages/ClientDetailPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { TasksPage } from "@/pages/TasksPage";
import { TeamPage } from "@/pages/TeamPage";
import { TimeLogsPage } from "@/pages/TimeLogsPage";
import { InvoicesPage } from "@/pages/InvoicesPage";
import { InvoiceDetailPage } from "@/pages/InvoiceDetailPage";
import { ClientPortalPage } from "@/pages/portal/ClientPortalPage";
import { ClientPortalProjectsPage } from "@/pages/portal/ClientPortalProjectsPage";
import { ClientPortalProjectDetailPage } from "@/pages/portal/ClientPortalProjectDetailPage";
import { ClientPortalInvoicesPage } from "@/pages/portal/ClientPortalInvoicesPage";
import { useAuth } from "@/contexts/AuthContext";

const STAFF_ROLES = ["admin", "manager", "member"] as const;

function StaffLayout() {
  return (
    <ProtectedRoute allowRoles={[...STAFF_ROLES]}>
      <Layout />
    </ProtectedRoute>
  );
}

function ClientLayout() {
  return (
    <ProtectedRoute allowRoles={["client"]}>
      <Layout />
    </ProtectedRoute>
  );
}

function HomeRedirect() {
  const { loading, session, profile } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return null;
  return profile.role === "client" ? (
    <Navigate to="/portal" replace />
  ) : (
    <DashboardPage />
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-5xl">🤔</div>
        <h1 className="mt-3 text-xl font-semibold text-slate-900">
          Page not found
        </h1>
        <a href="/" className="mt-4 inline-block text-brand-600 hover:underline">
          Go home
        </a>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  {
    element: <StaffLayout />,
    children: [
      { path: "/", element: <HomeRedirect /> },
      { path: "/clients", element: <ClientsPage /> },
      { path: "/clients/:id", element: <ClientDetailPage /> },
      { path: "/projects", element: <ProjectsPage /> },
      { path: "/projects/:id", element: <ProjectDetailPage /> },
      { path: "/tasks", element: <TasksPage /> },
      { path: "/time", element: <TimeLogsPage /> },
      { path: "/invoices", element: <InvoicesPage /> },
      { path: "/invoices/:id", element: <InvoiceDetailPage /> },
      { path: "/team", element: <TeamPage /> },
    ],
  },
  {
    element: <ClientLayout />,
    children: [
      { path: "/portal", element: <ClientPortalPage /> },
      { path: "/portal/projects", element: <ClientPortalProjectsPage /> },
      {
        path: "/portal/projects/:id",
        element: <ClientPortalProjectDetailPage />,
      },
      { path: "/portal/invoices", element: <ClientPortalInvoicesPage /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
