import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "../components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TanyaDoc — Analisis Dokumen PDF oleh Daniar Priambodo",
  description:
    "Asisten analisis dokumen perusahaan berbasis Hybrid Search, pgvector, dan LLM dengan sitasi halaman akurat. Portfolio by Daniar Priambodo.",
  authors: [{ name: "Daniar Priambodo" }],
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem('tanyadoc_theme');
    if (t === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full dark antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-900 dark:selection:text-indigo-200 transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
