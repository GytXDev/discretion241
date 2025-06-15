// pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Poppins } from "next/font/google";
import Head from "next/head";

// Import de la police
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-poppins",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* Default meta fallback */}
      <Head>
        <title>Discretion241 – Plateforme confidentielle au Gabon</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main
        className={`${poppins.variable} font-sans`}
      >
        <Component {...pageProps} />
      </main>

    </>
  );
}
