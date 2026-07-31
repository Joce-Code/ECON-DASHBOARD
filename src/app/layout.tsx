import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Focus Tracker | Motor de Respostas Institucional",
  description: "Painel de Inteligência e Observabilidade Econômica para Tesouraria e Estratégia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${jetbrains.variable} font-sans antialiased bg-[#090d16] text-slate-300`}
      >
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <header className="mb-8 border-b border-slate-800 pb-4">
            <h1 className="text-2xl font-bold text-white tracking-tight">Focus Tracker <span className="text-slate-500 text-sm font-normal ml-2">Grau Institucional</span></h1>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
