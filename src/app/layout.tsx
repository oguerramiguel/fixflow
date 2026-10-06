import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { appConfig } from "@/lib/app";
import "./globals.css";

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap"
});

const themeInitializer = `(() => {
  try {
    const storedTheme = localStorage.getItem("fixflow-theme");
    const theme = storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {}
})();`;

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/brand/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { url: "/brand/app-icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/app-icon-512x512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: { url: "/brand/app-icon-180x180.png", sizes: "180x180", type: "image/png" }
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
