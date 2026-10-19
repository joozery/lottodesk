import { AuthGate } from "@/components/auth/auth-provider";
import { RouteGuard } from "@/components/auth/route-guard";
import { AppShell } from "@/components/layout/app-shell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGate>
      <AppShell>
        <RouteGuard>{children}</RouteGuard>
      </AppShell>
    </AuthGate>
  );
}
