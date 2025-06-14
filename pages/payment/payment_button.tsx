import { useEffect, useState } from "react";
import { getDoc, doc } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import { FiEdit2 } from "react-icons/fi";

interface Props {
    profileName: string;
    profileUid: string;
    onSuccess: () => void; // callback pour afficher le contact
}

export default function PaymentButton({ profileName, profileUid, onSuccess }: Props) {
    const [showModal, setShowModal] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [user] = useAuthState(auth);

    const showSnackbar = (message: string) => {
        setSnackbar(message);
        setTimeout(() => setSnackbar(""), 4000);
    };

    const handleClose = () => {
        setShowModal(false);
        setPhoneNumber("");
        setIsEditing(false);
    };

    const validateAndPay = async () => {
        const cleaned = phoneNumber.replace(/\s+/g, '');
        const prefix = cleaned.slice(0, 3);

        if (/^(060|062|065|066)/.test(prefix)) {
            showSnackbar("Moov Money n'est pas encore supporté.");
            return;
        }

        if (!/^07[47]/.test(prefix)) {
            showSnackbar("Seuls les numéros Airtel (074, 077) sont acceptés.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("https://gytx.dev/api/airtelmoney-web.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    numero: cleaned,
                    amount: "1000"
                })
            });

            const text = await res.text();
            try {
                const result = JSON.parse(text);

                if (result.status_message && result.status_message.includes("successfully processed")) {
                    showSnackbar("Paiement réussi !");
                    onSuccess(); // Affiche le contact
                    handleClose();
                } else {
                    showSnackbar(result.status_message || "Échec du paiement. Veuillez réessayer.");
                }
            } catch (jsonErr) {
                console.error("Erreur de parsing JSON:", text);
                showSnackbar("Réponse inattendue du serveur.");
            }
        } catch (err) {
            console.error(err);
            showSnackbar("Erreur de connexion au serveur.");
        } finally {
            setLoading(false);
        }
    };

    const openModalAndCheckUser = async () => {
        if (!user) return;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            const phone = data?.contact || "";
            setPhoneNumber(phone);
            setShowModal(true);
        } else {
            showSnackbar("Impossible de récupérer votre numéro.");
        }
    };

    return (
        <>
            <button
                onClick={openModalAndCheckUser}
                className="mt-4 w-full py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition"
            >
                Voir le contact
            </button>

            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
                    <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-xl relative">
                        <h2 className="text-xl font-bold mb-4 text-center">Paiement sécurisé</h2>

                        <p className="text-sm text-gray-700 mb-4">
                            Pour voir le contact de <strong>{profileName}</strong>, un paiement de <strong>1 000 CFA</strong> est requis.
                        </p>

                        <div className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                            Paiement via :
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="px-2 py-1 border rounded text-sm w-full"
                                    placeholder="Ex: 074XXXXXXX"
                                />
                            ) : (
                                <>
                                    <strong>{phoneNumber}</strong>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-purple-600 hover:text-purple-800"
                                        title="Modifier le numéro"
                                    >
                                        <FiEdit2 className="inline-block" />
                                    </button>
                                </>
                            )}
                        </div>

                        <button
                            onClick={validateAndPay}
                            disabled={loading}
                            className="w-full py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Paiement en cours...
                                </div>
                            ) : "Nous faire confiance, Payer 1000 CFA"}
                        </button>

                        <button
                            onClick={handleClose}
                            className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}

            {snackbar && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full shadow-lg z-50 text-sm animate-fade-in-out">
                    {snackbar}
                </div>
            )}
        </>
    );
}