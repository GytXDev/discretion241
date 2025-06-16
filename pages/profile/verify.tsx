import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import Image from "next/image";
import { FiEdit2 } from "react-icons/fi";

export default function VerifyPage() {
    const [user, loading] = useAuthState(auth);
    const router = useRouter();

    const EMOJIS = ["🍆", "🍑", "😍", "🥵", "😈", "🙈", "🤫"];
    const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
    const frames = Array.from({ length: 15 }, (_, i) => `/frames/frame_${i + 1}.jpeg`);
    const [frameIndexes, setFrameIndexes] = useState([0, 1, 2]);

    const [phone, setPhone] = useState("");
    const [loadingPay, setLoadingPay] = useState(false);
    const [message, setMessage] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push("../auth/login");

        const shuffled = [...EMOJIS].sort(() => 0.5 - Math.random());
        setSelectedEmojis(shuffled.slice(0, 3));
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

    useEffect(() => {
        const fetchPhone = async () => {
            if (user) {
                const snap = await getDoc(doc(db, "users", user.uid));
                const data = snap.data();
                setPhone(data?.contact || "");
            }
        };
        fetchPhone();
    }, [user]);

    const handlePayment = async () => {
        const cleaned = phone.replace(/\s+/g, "");
        const prefix = cleaned.slice(0, 3);

        if (!/^07[47]/.test(prefix)) {
            setMessage("Seuls les numéros Airtel (074, 077) sont acceptés.");
            return;
        }

        setLoadingPay(true);
        setMessage("");

        try {
            const res = await fetch("https://gytx.dev/api/airtelmoney-web.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    numero: cleaned,
                    amount: "2000"
                }),
            });

            const text = await res.text();
            const result = JSON.parse(text);

            if (result.status_message?.includes("successfully processed")) {
                await updateDoc(doc(db, "users", user!.uid), {
                    isVerified: true,
                    step: "complete",
                });
                router.push("/");
            } else {
                setMessage(result.status_message || "Échec du paiement.");
            }
        } catch (err) {
            console.error(err);
            setMessage("Erreur réseau ou serveur.");
        } finally {
            setLoadingPay(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center px-4 py-10">
            {/* Images animées */}
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

            {/* Bloc vérification */}
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
                    Pour apparaître sur la plateforme, un paiement unique de{" "}
                    <strong>2000 CFA</strong> est requis.
                </p>

                <div className="text-sm text-gray-600 mb-4 flex items-center gap-2 justify-center">
                    Numéro :
                    {isEditing ? (
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="px-2 py-1 border rounded text-sm w-full max-w-[150px]"
                            placeholder="074XXXXXXX"
                        />
                    ) : (
                        <>
                            <strong>{phone}</strong>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-purple-600 hover:text-purple-800"
                                title="Modifier"
                            >
                                <FiEdit2 className="inline-block" />
                            </button>
                        </>
                    )}
                </div>

                <button
                    onClick={handlePayment}
                    disabled={loadingPay}
                    className="w-full py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:opacity-90 transition"
                >
                    {loadingPay ? (
                        <div className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Paiement en cours...
                        </div>
                    ) : (
                        "Nous faire confiance – Payer 2000 CFA & Rejoindre"
                    )}
                </button>


                {message && (
                    <p className="text-sm text-red-500 mt-3">{message}</p>
                )}
            </div>
        </div>
    );
}