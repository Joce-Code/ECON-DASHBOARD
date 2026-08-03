import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Focus Tracker | Motor de Respostas Institucional",
  description: "Painel de Inteligência e Observabilidade Econômica para Tesouraria e Estratégia.",
};

import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${jetbrains.variable} font-sans antialiased bg-[#090d16] text-slate-300 flex flex-col min-h-screen relative overflow-x-hidden`}
      >
        {/* Luzes de Fundo Ambientais (Glassmorphism 2026) */}
        <div className="ambient-orb-1" />
        <div className="ambient-orb-2" />

        <main className="max-w-7xl mx-auto p-4 md:p-8 w-full flex-grow relative z-10">
          <header className="mb-8 border-b border-slate-800/80 pb-4 flex items-center justify-between backdrop-blur-md bg-[#090d16]/50 rounded-xl px-4 py-3 border">
            <Link href="/" className="hover:opacity-80 transition-opacity flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Focus Tracker <span className="text-slate-500 text-sm font-normal hidden sm:inline ml-2">Grau Institucional</span>
              </h1>
            </Link>
            
            {session && (
              <nav className="flex items-center gap-4 text-sm font-medium">
                <Link href="/" className="text-slate-300 hover:text-cyan-400 transition-colors">Painel</Link>
                <Link href="/news" className="text-slate-300 hover:text-cyan-400 transition-colors">Notícias & Ativo</Link>
                <Link href="/simulator" className="text-slate-300 hover:text-cyan-400 transition-colors">Simulador</Link>
                <Link href="/settings" className="text-slate-300 hover:text-cyan-400 transition-colors">Alertas</Link>
                <form action={async () => {
                  "use server"
                  const supabase = await createClient();
                  await supabase.auth.signOut();
                  redirect("/login");
                }}>
                  <button type="submit" className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer">
                    Sair
                  </button>
                </form>
              </nav>
            )}
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
