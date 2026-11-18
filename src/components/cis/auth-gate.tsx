import { useEffect, useState, type ReactNode } from "react";
import logo from "@/assets/abfa-logo.png.asset.json";
import { PermissionProvider } from "@/lib/auth/permissions";
import { AppShell } from "./app-shell";

function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-background" aria-busy="true">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <img src={logo.url} alt="" className="size-12" />
        در حال آماده‌سازی سامانه…
      </div>
    </div>
  );
}

/** No sign-in step for now: the workspace opens directly once the browser has hydrated. */
export function AuthGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) return <Splash />;
  return <PermissionProvider><AppShell>{children}</AppShell></PermissionProvider>;
}
