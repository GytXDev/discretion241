import { useState, useEffect } from "react";
import Image from "next/image";

export default function PrivacyModal({ onAccept }: { onAccept?: () => void}) {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const alreadyAccepted = localStorage.getItem("discretion_privacy_accepted");
        if (!alreadyAccepted) setShowModal(true);
    }, []);

    const handleAccept = () => {
        localStorage.setItem("discretion_privacy_accepted", "true");
        setShowModal(false);
        if(onAccept) onAccept();
    };

    if (!showModal) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white max-w-2xl w-full rounded-xl shadow-2xl overflow-hidden border border-gray-100">
                {/* Header avec gradient */}
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
                    <h2 className="text-center text-xl font-bold text-white">Politique de Confidentialité</h2>
                    <p className="text-center text-purple-100 text-sm mt-1">Dernière mise à jour : 9 Juin 2025</p>
                </div>

                {/* Contenu avec scroll */}
                <div className="max-h-[60vh] overflow-y-auto p-5 sm:p-6">
                    <div className="prose prose-sm text-gray-700 space-y-5">
                        <p className="text-gray-800">
                            Chez Discretion241, la confidentialité est au cœur de tout ce que nous faisons. Notre objectif est de vous offrir une plateforme discrète, sécurisée et respectueuse de votre vie privée.
                        </p>

                        <div className="space-y-4">
                            <Section
                                title="1. Les données que nous collectons"
                                items={[
                                    "Email, pseudo, âge, genre, ville, quartier (optionnel)",
                                    "Préférences et description de profil",
                                    "Photos de profil (modifiées ou non)",
                                    "Historique de paiements pour accéder aux profils",
                                    "Actions sur la plateforme (inscription, connexions, etc.)"
                                ]}
                                note="✅ Vos données sont stockées dans Firebase (Google). ❌ Nous ne vendons ni ne partageons vos infos."
                            />

                            <Section
                                title="2. Vos photos, votre contrôle"
                                content="Vous pouvez flouter certaines parties de l'image ou ajouter des émojis pour masquer une zone. Ces modifications sont respectées sur votre profil public. Pour la vérification, une photo non floutée est demandée en privé via WhatsApp."
                            />

                            <Section
                                title="3. Vérification de profil via WhatsApp"
                                items={[
                                    "Email utilisé à l'inscription",
                                    "Photo claire non floutée",
                                    "Vocal en vue unique"
                                ]}
                                note="Ce contenu est envoyé uniquement à notre équipe pour vérifier votre identité."
                            />

                            <Section
                                title="4. Paiements et accès"
                                content={
                                    <>
                                        - <strong>2 000 CFA</strong> : Frais d'intégration pour apparaître sur la plateforme<br />
                                        - <strong>1 000 CFA</strong> : Accès au numéro d’un profil pendant 24h<br />
                                        <br />
                                        Paiements sécurisés via <strong>Airtel Money (074 / 077 uniquement)</strong><br />
                                        Aucune donnée bancaire n’est stockée sur nos serveurs.
                                    </>
                                }
                            />


                            <Section
                                title="5. Suppression de vos données"
                                items={[
                                    "Supprimer vos photos dans 'Mon compte'",
                                    "Demander la suppression complète via WhatsApp"
                                ]}
                                note="Les données sont supprimées sous 72h."
                            />

                            <Section
                                title="6. Ce que nous ne faisons pas"
                                items={[
                                    "❌ Pas de tracking hors du site",
                                    "❌ Pas de revente de vos données",
                                    "❌ Pas d'affichage sans votre accord"
                                ]}
                            />

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="font-semibold text-gray-800 mb-2">📞 Contact</h3>
                                <p className="text-gray-700">
                                    Pour toute question, vérification ou suppression de compte :<br />
                                    👉 support@discretion241.com
                                </p>
                            </div>
                        </div>

                        <p className="text-gray-500 text-sm italic">
                            Merci d'avoir lu. Chez Discretion241, votre confidentialité n'est pas un choix, c'est une promesse.
                        </p>
                    </div>
                </div>

                {/* Footer avec bouton */}
                <div className="border-t border-gray-200 p-5 bg-gray-50">
                    <button
                        onClick={handleAccept}
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition shadow-md hover:shadow-lg"
                    >
                        J'accepte et je continue
                    </button>
                </div>
            </div>
        </div>
    );
}

// Composant helper pour les sections
function Section({ title, items, content, note }: {
    title: string;
    items?: string[];
    content?: React.ReactNode;
    note?: string;
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
            {note && <p className="text-sm text-gray-600">{note}</p>}
        </div>
    );
}