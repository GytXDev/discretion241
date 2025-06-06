// pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";

// Import de Poppins via next/font/google
import { Poppins } from "next/font/google";

// Charger Poppins (poids réguliers et semi-bold) avec un fallback sans-serif
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-poppins",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    // On applique la classe variable à tout le <body>
    <main className={`${poppins.variable} font-sans`}>
      <Component {...pageProps} />
    </main>
  );
}