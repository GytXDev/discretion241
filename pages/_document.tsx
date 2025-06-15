import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="fr"> {/* Langue "fr" pour le public gabonais */}
      <Head>
        {/* Favicon (SVG et fallback ICO si nécessaire) */}
        <link rel="icon" href="/logo_.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Couleur de thème pour mobile */}
        <meta name="theme-color" content="#2e1065" />

        {/* SEO de base */}
        <meta name="description" content="Discretion241 – Rencontres confidentielles et services adultes au Gabon. Plateforme élégante, sécurisée et réservée aux membres vérifiés." />
        <meta name="keywords" content="rencontre, Gabon, discretion, services, adults only, Discretion241, Airtel Money" />

        {/* Open Graph (pour partage réseaux sociaux) */}
        <meta property="og:title" content="Discretion241 – Services discrets entre adultes" />
        <meta property="og:description" content="Plateforme confidentielle au Gabon pour rencontres et services privés. Rejoignez la communauté Discretion241." />
        <meta property="og:image" content="/logo_.svg" />
        <meta property="og:url" content="https://www.discretion241.com" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Discretion241" />
        <meta name="twitter:description" content="Rejoignez Discretion241 – une plateforme sécurisée pour services entre adultes au Gabon." />
        <meta name="twitter:image" content="/logo_.svg" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

