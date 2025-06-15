import { useState, useEffect } from "react";
import Image from "next/image";

export default function TermsModal() {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const alreadyAccepted = localStorage.getItem("discretion_terms_accepted");
        if (!alreadyAccepted) setShowModal(true);
    }, []);

    const handleAccept = () => {
        localStorage.setItem("discretion_terms_accepted", "true");
        setShowModal(false);
    };

    if (!showModal) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white max-w-2xl w-full rounded-xl shadow-2xl overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-5">
                    <div className="flex justify-center mb-3">
                        <Image
                            src="/logo.png"
                            alt="Discretion241 Logo"
                            width={120}
                            height={48}
                            className="filter brightness-0 invert"
                        />
                    </div>
                    <h2 className="text-center text-xl font-bold text-white">Conditions d’utilisation</h2>
                    <p className="text-center text-purple-100 text-sm mt-1">Dernière mise à jour : 15 Juin 2025</p>
                </div>

                {/* Contenu */}
                <div className="max-h-[60vh] overflow-y-auto p-5 sm:p-6">
                    <div className="prose prose-sm text-gray-700 space-y-5">
                        <p className="text-gray-800">
                            Bienvenue sur Discretion241. En accédant à notre plateforme, vous vous engagez à respecter nos règles pour garantir un espace sûr, respectueux et confidentiel.
                        </p>

                        <Section
                            title="❌ Ce que vous ne devez pas faire"
                            items={[
                                "Publier de faux profils ou usurper l'identité de quelqu’un d’autre.",
                                "Partager des contenus non consensuels, illégaux ou à caractère choquant.",
                                "Diffuser les coordonnées ou images d’un tiers sans son accord.",
                                "Tenir des propos violents, insultants, racistes, sexistes ou discriminatoires.",
                                "Spammer ou envoyer des messages automatisés à d'autres membres.",
                                "Capturer ou enregistrer les profils ou conversations sans autorisation."
                            ]}
                        />

                        <Section
                            title="⚠️ Sanctions"
                            items={[
                                "Suspension immédiate du compte.",
                                "Suppression définitive sans remboursement.",
                                "Signalement aux autorités compétentes si nécessaire."
                            ]}
                        />

                        <Section
                            title="✅ Engagement de Discretion241"
                            items={[
                                "Créer un espace sérieux, respectueux et local.",
                                "Protéger vos données et votre anonymat.",
                                "Permettre des interactions adultes consenties dans un cadre confidentiel."
                            ]}
                        />

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-semibold text-gray-800 mb-2">📞 Assistance</h3>
                            <p className="text-gray-700">
                                Pour signaler un abus ou poser une question :<br />
                                👉 WhatsApp [numéro à insérer]
                            </p>
                        </div>

                        <p className="text-gray-500 text-sm italic">
                            Merci de respecter ces conditions. Ensemble, créons une communauté de confiance.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-5 bg-gray-50">
                    <button
                        onClick={handleAccept}
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition shadow-md hover:shadow-lg"
                    >
                        J’accepte les conditions
                    </button>
                </div>
            </div>
        </div>
    );
}

function Section({
    title,
    items,
    content
}: {
    title: string;
    items?: string[];
    content?: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <h3 className="font-semibold text-gray-800">{title}</h3>
            {content && <p className="text-gray-700">{content}</p>}
            {items && (
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    {items.map((item, i) => (
                        <li key={i}>{item}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
