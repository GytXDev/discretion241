import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase/config";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { FaWhatsapp } from "react-icons/fa";

export default function VerifyPage() {
    const [user, loading] = useAuthState(auth);
    const router = useRouter();

    const EMOJIS = ["🍆", "🍑", "😍", "🥵", "😈", "🙈", "🤫"];
    const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);

    const frames = Array.from({ length: 15 }, (_, i) => `/frames/frame_${i + 1}.jpeg`);
    const [frameIndexes, setFrameIndexes] = useState([0, 1, 2]);

    useEffect(() => {
        if (!loading && !user) router.push("../auth/login");

        const shuffledEmojis = [...EMOJIS].sort(() => 0.5 - Math.random());
        setSelectedEmojis(shuffledEmojis.slice(0, 3));
    }, [user, loading]);

    useEffect(() => {
        const interval = setInterval(() => {
            const uniqueIndexes = new Set<number>();
            while (uniqueIndexes.size < 3) {
                uniqueIndexes.add(Math.floor(Math.random() * frames.length));
            }
            setFrameIndexes(Array.from(uniqueIndexes));
        }, 6000);

        return () => clearInterval(interval);
    }, []);


    const message = encodeURIComponent(
        `Bonjour, je souhaite vérifier mon compte sur Discrétion241. Voici mon email : ${user?.email}. Je vais maintenant envoyer une photo de moi et un vocal (vue unique).`
    );
    const whatsappLink = `https://wa.me/241074001209?text=${message}`;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center px-4 py-10">
            {/* Cartes visuelles */}
            <div className="relative h-[280px] sm:h-[360px] w-full max-w-4xl mb-12 z-10">
                {/* Gauche */}
                <div className="absolute left-2 sm:left-[15%] rotate-[-6deg] w-32 sm:w-48 h-48 sm:h-72 rounded-2xl overflow-hidden shadow-xl border-4 border-white z-10">
                    <Image
                        key={frameIndexes[0]}
                        src={frames[frameIndexes[0]]}
                        alt="Frame gauche"
                        fill
                        className="object-cover animate-fadeIn"
                    />
                </div>
                <div className="absolute z-30 animate-float-up text-2xl" style={{ top: '4%', left: 'calc(15% + 10px)' }}>
                    {selectedEmojis[0]}
                </div>

                {/* Centre */}
                <div className="absolute left-1/2 -translate-x-1/2 w-36 sm:w-56 h-56 sm:h-80 rounded-2xl overflow-hidden shadow-2xl border-4 border-white z-20 scale-105">
                    <Image
                        key={frameIndexes[1]}
                        src={frames[frameIndexes[1]]}
                        alt="Frame centre"
                        fill
                        className="object-cover animate-fadeIn"
                    />
                </div>
                <div className="absolute z-30 text-2xl animate-bounce-slow" style={{ top: '72%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    {selectedEmojis[1]}
                </div>

                {/* Droite */}
                <div className="absolute right-2 sm:right-[15%] rotate-[6deg] w-32 sm:w-48 h-48 sm:h-72 rounded-2xl overflow-hidden shadow-xl border-4 border-white z-10">
                    <Image
                        key={frameIndexes[2]}
                        src={frames[frameIndexes[2]]}
                        alt="Frame droite"
                        fill
                        className="object-cover animate-fadeIn"
                    />
                </div>
                <div className="absolute z-30 animate-float-up text-2xl" style={{ top: '4%', right: 'calc(15% + 10px)' }}>
                    {selectedEmojis[2]}
                </div>
            </div>

            {/* Bloc de vérification */}
            <div className="text-center max-w-md w-full">
                <div className="w-[180px] h-[60px] relative mx-auto mb-2">
                    <Image
                        src="/logo.png"
                        alt="Logo"
                        width={180}
                        height={60}
                        priority
                        className="object-contain"
                    />
                </div>

                <h1 className="text-3xl font-bold mb-4">Vérification du compte</h1>
                <p className="mb-6 text-gray-700">
                    Pour apparaître sur la plateforme ou voir les contacts, votre profil doit être vérifié.
                    Cliquez ci-dessous pour nous contacter via WhatsApp.
                </p>
                <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-semibold transition"
                >
                    <FaWhatsapp className="text-xl" />
                    Vérifier mon compte
                </a>
                <p className="text-sm text-gray-500 mt-4">
                    Envoyez une <strong>photo</strong> + un <strong>vocal</strong> en vue unique à notre équipe.
                </p>
            </div>
        </div>
    );
}