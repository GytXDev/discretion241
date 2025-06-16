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
      {/* Fallback global pour le SEO */}
      <Head>
        <title>Discretion241 – Plateforme confidentielle au Gabon</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Rencontres discrètes, sécurisées et réservées aux membres au Gabon. Paiement simple via Airtel Money." />
        <meta name="keywords" content="Discretion241, Gabon, rencontre, adulte, Airtel Money, confidentiel" />

        {/* Favicon & Apple */}
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Open Graph par défaut */}
        <meta property="og:title" content="Discretion241 – Services discrets au Gabon" />
        <meta property="og:description" content="Plateforme confidentielle pour rencontres adultes au Gabon. Rejoignez une communauté exclusive." />
        <meta property="og:image" content="/cover.jpg" />
        <meta property="og:url" content="https://www.discretion241.com" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Discretion241" />
        <meta name="twitter:description" content="Rencontres discrètes et vérifiées entre adultes – 100% gabonais." />
        <meta name="twitter:image" content="/cover.jpg" />
      </Head>

      <main className={`${poppins.variable} font-sans`}>
        <Component {...pageProps} />
      </main>
    </>
  );
}
