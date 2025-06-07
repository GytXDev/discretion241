import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/config";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

export default function VerifyPage() {
    const [user, loading] = useAuthState(auth);
    const router = useRouter();
    const [randomFrames, setRandomFrames] = useState<string[]>([]);
    const EMOJIS = ["🍆", "🍑", "😍", "🥵", "😈", "🙈", "🤫"];
    const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }

        // Initialisation des frames et emojis aléatoires
        const frames = Array.from({ length: 5 }, (_, i) => `/frames/frame_${i + 1}.jpeg`);
        const shuffledFrames = [...frames].sort(() => 0.5 - Math.random());
        setRandomFrames(shuffledFrames.slice(0, 3));

        const shuffledEmojis = [...EMOJIS].sort(() => 0.5 - Math.random());
        setSelectedEmojis(shuffledEmojis.slice(0, 3));
    }, [user, loading]);

    const whatsappNumber = "YOUR_WHATSAPP_NUMBER";
    const message = encodeURIComponent(
        `Bonjour, je souhaite vérifier mon compte sur Discrétion+241. Voici mon email : ${user?.email}. Je vais maintenant envoyer une photo de moi et un vocal (vue unique).`
    );

    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${message}`;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center px-4 py-10">
            <div className="relative h-[280px] sm:h-[360px] w-full max-w-4xl mb-12 z-10">
                {/* Gauche */}
                {randomFrames[0] && (
                    <>
                        <div className="absolute left-2 sm:left-[15%] rotate-[-6deg] w-32 sm:w-48 h-48 sm:h-72 rounded-2xl overflow-hidden shadow-xl border-4 border-white z-10">
                            <Image
                                src={randomFrames[0]}
                                alt="Gauche"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div
                            className="absolute z-30 animate-float-up text-2xl"
                            style={{
                                top: '4%',
                                left: 'calc(15% + 10px)',
                                animationDelay: '0s',
                            }}
                        >
                            {selectedEmojis[0]}
                        </div>
                    </>
                )}

                {/* Centre */}
                {randomFrames[1] && (
                    <>
                        <div className="absolute left-1/2 -translate-x-1/2 w-36 sm:w-56 h-56 sm:h-80 rounded-2xl overflow-hidden shadow-2xl border-4 border-white z-20 scale-105">
                            <Image
                                src={randomFrames[1]}
                                alt="Centre"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div
                            className="absolute z-30 text-2xl animate-bounce-slow"
                            style={{
                                top: '72%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                animationDelay: '0.2s',
                            }}
                        >
                            {selectedEmojis[1]}
                        </div>
                    </>
                )}

                {/* Droite */}
                {randomFrames[2] && (
                    <>
                        <div className="absolute right-2 sm:right-[15%] rotate-[6deg] w-32 sm:w-48 h-48 sm:h-72 rounded-2xl overflow-hidden shadow-xl border-4 border-white z-10">
                            <Image
                                src={randomFrames[2]}
                                alt="Droite"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div
                            className="absolute z-30 animate-float-up text-2xl"
                            style={{
                                top: '4%',
                                right: 'calc(15% + 10px)',
                                animationDelay: '0.4s',
                            }}
                        >
                            {selectedEmojis[2]}
                        </div>
                    </>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md border border-gray-200 text-center">
                <h1 className="text-2xl font-bold mb-4 text-purple-600">Vérification du compte</h1>
                <p className="mb-6">
                    Pour apparaître sur la plateforme ou voir les contacts, votre profil doit être vérifié
                    manuellement. Veuillez cliquer ci-dessous pour contacter notre équipe via WhatsApp.
                </p>
                <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-semibold mb-4"
                >
                    Vérifier mon compte via WhatsApp
                </a>
                <p className="text-sm text-gray-500">
                    Envoyez une <strong>photo</strong> + un <strong>vocal</strong> en vue unique au contact sur WhatsApp.
                </p>
            </div>
        </div>
    );
}