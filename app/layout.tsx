import type { Metadata } from "next";
import { Playfair_Display, Lora } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
});

const lora = Lora({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Biblioteka Neurochirurgiczna",
  description: "Prywatna biblioteka podręczników neurochirurgicznych w PDF.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${playfair.variable} ${lora.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="text-center text-xs py-4 bg-[var(--wood-dark)] text-[var(--parchment-dark)] opacity-60">
          built by Kacper Prokop
        </footer>
      </body>
    </html>
  );
}
