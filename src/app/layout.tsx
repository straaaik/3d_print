import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppBackground } from "../shared/ui/AppBackground";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "3D Labs • Калькулятор и учет 3D-печати",
  description: "Система учета заказов, калькулятор себестоимости 3D-печати и склад материалов",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="isolate antialiased min-h-screen text-white bg-[#0a0a0a]">
        <AppBackground />
        {children}
      </body>
    </html>
  );
}
