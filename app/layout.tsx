import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import {
  ThemeProvider,
  THEME_NO_FLASH_SCRIPT,
} from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Momentum — Boards that move",
  description:
    "A modern boards app for kanban, table, and timeline planning.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // Runs before React hydration so the .dark class is on <html>
          // before paint — no flash of light theme on dark loads.
          dangerouslySetInnerHTML={{ __html: THEME_NO_FLASH_SCRIPT }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
