"use client";

import { createContext, useContext } from "react";
import { can, type SessionUser } from "@/lib/rbac";

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionUser | null {
  return useContext(SessionContext);
}

export function useCan() {
  const user = useSession();
  return (resource: string, action: string) => can(user?.permissions, resource, action);
}
