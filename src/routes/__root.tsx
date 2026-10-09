import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ThemeBridge } from "@/components/nexus/ThemeBridge";
import appCss from "../styles.css?url";

const APP_NAME = "Nexus Runner";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Run HTML, deep JSON schemas, and Flutter-style Dart in a sealed live stage.",
      },
      { name: "theme-color", content: "#0c0e12" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Sora:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem("nexus-runner-v1")||"null");if(!t)return;var e=document.documentElement;if(t.theme)e.dataset.theme=t.theme;if(t.contrast)e.dataset.contrast="high";if(t.fontScale)e.dataset.scale=String(t.fontScale);if(t.accent)e.style.setProperty("--color-accent",t.accent);}catch(err){}})();`,
          }}
        />
        <PreviewHostBridge />
        <AuthProvider>
          <ThemeBridge />
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
