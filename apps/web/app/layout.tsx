import type { Metadata, Viewport } from "next";
import { THEME_BOOT_SCRIPT } from "@/lib/prefs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Port Finder — see what is running on every port",
  description:
    "See every port running on your laptop, the app behind it, and the project it belongs to. Read-only, local and open source.",
  openGraph: {
    title: "Port Finder",
    description: "Every listening port on your laptop, the app behind it, and its project folder.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1014" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
