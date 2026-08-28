import type { ReactNode } from "react";
import { requireCurrentUserOrRedirect } from "@/app/app/auth";
import { AppShell } from "@/components/ui/app-shell";

export default async function ProtectedAppLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const currentUser = await requireCurrentUserOrRedirect();

  return <AppShell user={{ name: currentUser.name, role: currentUser.role, organizationName: currentUser.organization.name, canManageUsers: currentUser.role === "OWNER" }}>{children}</AppShell>;
}
