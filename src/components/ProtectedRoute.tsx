import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageSpinner } from "@/components/ui/Spinner";
import type { MemberRole } from "@/lib/database.types";

interface Props {
  children: ReactNode;
  /** If set, role must be one of these. */
  allowRoles?: MemberRole[];
}

export function ProtectedRoute({ children, allowRoles }: Props) {
  const { loading, session, profile } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner />;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!profile) return <PageSpinner />;

  if (allowRoles && !allowRoles.includes(profile.role)) {
    return (
      <Navigate
        to={profile.role === "client" ? "/portal" : "/"}
        replace
      />
    );
  }
  return <>{children}</>;
}
