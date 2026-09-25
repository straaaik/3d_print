import type { Metadata } from "next";
import { connection } from "next/server";
import localFont from "next/font/local";
import "./globals.css";
import { AppBackground } from "../shared/ui/AppBackground";
import { AppMotionProvider } from "../shared/ui/AppMotionProvider";
import { PageTransitionProvider } from "../shared/ui/page-transition/PageTransitionProvider";

const inter = localFont({
  src: "./fonts/Inter-Variable.ttf",
  variable: "--font-inter",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-Variable.ttf",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kumo CRM • Калькулятор и учет 3D-печати",
  description: "Система учета заказов, калькулятор себестоимости 3D-печати и склад материалов",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The proxy creates a fresh CSP nonce per request. Prerendered HTML has no
  // request headers, so its scripts would be blocked by that policy.
  await connection();

  return (
    <html lang="ru" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="isolate antialiased min-h-screen text-white bg-[#0a0a0a]" suppressHydrationWarning>
        <AppBackground />
        <AppMotionProvider><PageTransitionProvider>{children}</PageTransitionProvider></AppMotionProvider>
      </body>
    </html>
  );
}
