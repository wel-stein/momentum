import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ConfirmProvider } from "@/components/ConfirmDialog";
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
          dangerouslySetInnerHTML={{ __html: THEME_NO_FLASH_SCRIPT }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
