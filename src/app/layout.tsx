import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { DataProvider } from "../entities/model/DataProvider";
import { ToastProvider } from "../entities/model/ToastProvider";
import { AuthProvider } from "../entities/model/AuthProvider";
import { AuthGuard } from "../shared/ui/AuthGuard";

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
      <body className="antialiased min-h-screen bg-[#0d0e12] text-white">
        <ToastProvider>
          <AuthProvider>
            <DataProvider>
              <AuthGuard>
                {children}
              </AuthGuard>
            </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
