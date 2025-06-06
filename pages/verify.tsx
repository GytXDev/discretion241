// pages/verify.tsx
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/config";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function VerifyPage() {
    const [user, loading] = useAuthState(auth);
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login"); 
        }
    }, [user, loading]);

    const whatsappNumber = "YOUR_WHATSAPP_NUMBER"; 
    const message = encodeURIComponent(
        `Bonjour, je souhaite vérifier mon compte sur Discrétion+241. Voici mon email : ${user?.email}. Je vais maintenant envoyer une photo de moi et un vocal (vue unique).`
    );

    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${message}`;

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 text-center">
            <h1 className="text-2xl font-bold mb-4 text-primary">Vérification du compte</h1>
            <p className="mb-6 max-w-md">
                Pour apparaître sur la plateforme ou voir les contacts, votre profil doit être vérifié
                manuellement. Veuillez cliquer ci-dessous pour contacter notre équipe via WhatsApp.
            </p>
            <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-semibold"
            >
                Vérifier mon compte via WhatsApp
            </a>
            <p className="mt-4 text-sm text-gray-400">
                Envoyez une <strong>photo</strong> + un <strong>vocal</strong> en vue unique avec votre email.
            </p>
        </div>
    );
}