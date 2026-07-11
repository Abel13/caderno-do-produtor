import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

export const metadata: Metadata = {
  title: { default: "Caderno do Produtor", template: "%s · Caderno do Produtor" },
  description: "Gestão da lavoura cafeeira no campo e no escritório.",
  manifest: "/manifest.webmanifest",
  applicationName: "Caderno do Produtor",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Caderno do Produtor" }
};
export const viewport: Viewport = { themeColor: "#065f46", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}<ServiceWorkerRegistration /></body></html>;
}
