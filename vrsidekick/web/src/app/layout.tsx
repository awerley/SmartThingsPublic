import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "VR Sidekick — help for your vacation rental",
  description: "Find trusted local Sidekicks for turnovers, lawn care, pool service, repairs and more.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#111b47", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
