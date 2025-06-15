import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../../firebase/config';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import Image from 'next/image';

export default function LoginPage() {
  const [user, loading] = useAuthState(auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (user) checkIfProfileExists();
  }, [user]);

  const checkIfProfileExists = async () => {
    const docRef = doc(db, 'users', user?.uid || '');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      router.push('/');
    } else {
      router.push('../profile/complete_profile');
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setErrorMessage("Erreur lors de la connexion avec Google. Veuillez réessayer.");
    }
  };

  const loginWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setErrorMessage("Aucun compte trouvé avec cet email.");
      } else if (err.code === 'auth/wrong-password') {
        setErrorMessage("Mot de passe incorrect.");
      } else {
        setErrorMessage("Une erreur s'est produite. Veuillez réessayer.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center px-4 py-10">
      <Image src="/logo.png" alt="Logo" width={180} height={60} priority className="mb-6" />

      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-center mb-6">Connexion</h1>

        <button
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-2 py-2 mb-4 rounded-full bg-white border border-gray-300 hover:bg-gray-100 font-semibold transition"
        >
          <Image src="/icons/google_icon.png" alt="Google" width={20} height={20} />
          Se connecter avec Google
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

        <form onSubmit={loginWithEmail} className="space-y-4">
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
          <button
            type="submit"
            className="w-full py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition"
          >
            Connexion
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Pas encore inscrit ?{' '}
          <button
            onClick={() => router.push('/auth/register')}
            className="text-pink-600 hover:underline"
          >
            Créer un compte
          </button>
        </p>
      </div>
    </div>
  );
}