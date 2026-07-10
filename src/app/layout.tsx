import type { Metadata } from "next";
import type { ReactNode } from "react";
import { appConfig } from "@/lib/app";
import "./globals.css";

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
