import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthGate } from "@/components/cis/auth-gate";
import { buttonVariants } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PersianText } from "@/components/cis/persian-text";
import { DirectionProvider } from "@radix-ui/react-direction";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">۴۰۴</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">صفحه موردنظر پیدا نشد</h2>
        <p className="mt-2 text-sm text-muted-foreground">نشانی واردشده درست نیست یا این صفحه جابه‌جا شده است.</p>
        <div className="mt-6">
          <Link to="/" className={buttonVariants()}>بازگشت به میز کار</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">نمایش این صفحه با خطا روبه‌رو شد</h1>
        <p className="mt-2 text-sm text-muted-foreground">اطلاعات شما از بین نرفته است. دوباره تلاش کنید یا به میز کار برگردید.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className={buttonVariants()}>تلاش دوباره</button>
          <a href="/" className={buttonVariants({ variant: "outline" })}>میز کار</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "سامانه امور مشترکین آب و فاضلاب" },
      { name: "description", content: "سامانه یکپارچه مدیریت مشترکین آب و فاضلاب" },
      { property: "og:title", content: "سامانه امور مشترکین آب و فاضلاب" },
      { property: "og:description", content: "سامانه یکپارچه مدیریت مشترکین آب و فاضلاب" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;800&display=swap" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      {/* Radix parts (tabs, menus, selects, radio groups…) default to LTR; this makes all of them right-to-left. */}
      <DirectionProvider dir="rtl">
        <TooltipProvider delayDuration={300}><AuthGate><Outlet /></AuthGate></TooltipProvider>
      </DirectionProvider>
      <Toaster position="top-left" richColors closeButton />
      <PersianText />
    </QueryClientProvider>
  );
}
