import { useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../../firebase/config';
import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const redirectToProfile = async () => {
        try {
            await router.push("/profile/complete_profile");
        } catch (err) {
            console.error("Erreur de redirection :", err);
            window.location.href = "/profile/complete_profile";
        }
    };

    const registerWithGoogle = async () => {
        setErrorMessage('');
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const cred = await signInWithPopup(auth, provider);
            const uid = cred.user.uid;

            await setDoc(doc(db, "users", uid), {
                email: cred.user.email,
                isVerified: false,
                step: 'profile',
                type: '',
                createdAt: serverTimestamp(),
            });

            await redirectToProfile();
        } catch (err) {
            console.error("Erreur Google Auth:", err);
            setErrorMessage("Erreur avec Google. Veuillez réessayer.");
        } finally {
            setLoading(false);
        }
    };

    const registerWithEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!email || !password || !confirmPassword) {
            setErrorMessage("Tous les champs sont obligatoires.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage("Les mots de passe ne correspondent pas.");
            return;
        }

        if (password.length < 6) {
            setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
            return;
        }

        setLoading(true);

        try {
            if (auth.currentUser) {
                await auth.signOut();
            }
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const uid = cred.user.uid;

            await setDoc(doc(db, "users", uid), {
                email,
                isVerified: false,
                step: 'profile',
                type: '',
                createdAt: serverTimestamp(),
            });

            await redirectToProfile();
        } catch (err: any) {
            console.error("Erreur Email Auth:", err);

            // Assurez-vous que err.code existe
            if (err.code) {
                switch (err.code) {
                    case 'auth/email-already-in-use':
                        setErrorMessage("Un compte existe déjà avec cet email. Essayez de vous connecter.");
                        break;
                    case 'auth/invalid-email':
                        setErrorMessage("L'email fourni n'est pas valide.");
                        break;
                    case 'auth/weak-password':
                        setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
                        break;
                    default:
                        setErrorMessage("Une erreur s'est produite lors de l'inscription.");
                }
            } else {
                setErrorMessage("Une erreur inconnue s'est produite.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center px-4 py-10">
            <Image src="/logo.png" alt="Logo" width={180} height={60} priority className="mb-6" />

            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm border border-gray-200">
                <h1 className="text-2xl font-bold text-center mb-6">Créer un compte</h1>

                <button
                    onClick={registerWithGoogle}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2 mb-4 rounded-full bg-white border border-gray-300 hover:bg-gray-100 font-semibold transition"
                >
                    <Image src="/icons/google_icon.png" alt="Google" width={20} height={20} />
                    S'inscrire avec Google
                </button>

                <div className="flex items-center my-4">
                    <div className="flex-grow h-px bg-gray-300" />
                    <span className="px-2 text-sm text-gray-400">ou</span>
                    <div className="flex-grow h-px bg-gray-300" />
                </div>

                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded mb-4">
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={registerWithEmail} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full p-3 rounded border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Mot de passe"
                        className="w-full p-3 rounded border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Confirmez le mot de passe"
                        className="w-full p-3 rounded border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition"
                    >
                        {loading ? "Chargement..." : "S'inscrire"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Déjà inscrit ?{' '}
                    <button
                        onClick={() => router.push('/auth/login')}
                        className="text-pink-600 hover:underline"
                    >
                        Connexion
                    </button>
                </p>
            </div>
        </div>
    );
}