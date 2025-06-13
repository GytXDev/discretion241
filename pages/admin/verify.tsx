import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';

interface UserProfile {
    uid: string;
    pseudo: string;
    genre: string;
    age: number;
    type: 'proposer' | 'demander';
    photos: string[];
    isVerified: boolean;
    step: string;
    createdAt: any;
    contact?: string;
    email?: string;
    ville?: string;
}

export default function AdminVerificationPage() {
    const [user] = useAuthState(auth);
    const router = useRouter();
    const [unverifiedUsers, setUnverifiedUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    // Vérifier si l'utilisateur est admin
    useEffect(() => {
        const checkAdmin = async () => {
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    setIsAdmin(true);
                } else {
                    router.push('/');
                }
            } else {
                router.push('/login');
            }
        };
        checkAdmin();
    }, [user, router]);

    // Charger les utilisateurs non vérifiés
    useEffect(() => {
        if (!isAdmin) return;

        const fetchUnverifiedUsers = async () => {
            try {
                const q = query(
                    collection(db, 'users'),
                    where('isVerified', '==', false),
                    where('step', '==', 'verification')
                );
                const snapshot = await getDocs(q);
                const users = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
                setUnverifiedUsers(users);
            } catch (error) {
                console.error('Error fetching unverified users:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUnverifiedUsers();
    }, [isAdmin]);

    const handleDecision = async () => {
        if (decision === null || !unverifiedUsers[currentIndex]) return;

        const currentUser = unverifiedUsers[currentIndex];
        setLoading(true);

        try {
            if (decision === 'approve') {
                // Approuver l'utilisateur
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    isVerified: true,
                    step: 'complete',
                    verifiedAt: new Date(),
                    verifiedBy: user?.uid
                });
            } else {
                // Rejeter l'utilisateur avec une raison
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    isVerified: false,
                    step: 'rejected',
                    rejectionReason,
                    rejectedAt: new Date(),
                    rejectedBy: user?.uid
                });
            }

            // Passer à l'utilisateur suivant
            const newUsers = [...unverifiedUsers];
            newUsers.splice(currentIndex, 1);
            setUnverifiedUsers(newUsers);
            setCurrentIndex(Math.min(currentIndex, newUsers.length - 1));
            setDecision(null);
            setRejectionReason('');
        } catch (error) {
            console.error('Error updating user:', error);
        } finally {
            setLoading(false);
        }
    };

    const currentUser = unverifiedUsers[currentIndex];

    if (!isAdmin) {
        return <div>Vérification des permissions...</div>;
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="spinner"></div>
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    if (unverifiedUsers.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
                    <h1 className="text-2xl font-bold mb-4">Aucun utilisateur à vérifier</h1>
                    <p>Tous les comptes ont été vérifiés.</p>
                    <button
                        onClick={() => router.push('/')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Retour au tableau de bord
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-blue-600 text-white">
                    <h1 className="text-xl font-bold">Vérification des comptes</h1>
                    <p className="text-sm">
                        {currentIndex + 1} sur {unverifiedUsers.length} utilisateurs à vérifier
                    </p>
                </div>

                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Photos de l'utilisateur */}
                        <div className="md:w-1/2">
                            <h2 className="text-lg font-semibold mb-2">Photos</h2>
                            <div className="grid grid-cols-2 gap-2">
                                {currentUser.photos.map((photo, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                                        <Image
                                            src={photo}
                                            alt={`Photo ${index + 1}`}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Informations de l'utilisateur */}
                        <div className="md:w-1/2">
                            <h2 className="text-lg font-semibold mb-2">Informations</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500">Pseudo</p>
                                    <p className="font-medium">{currentUser.pseudo}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">Âge déclaré</p>
                                    <p className="font-medium">{currentUser.age} ans</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">Genre</p>
                                    <p className="font-medium capitalize">{currentUser.genre}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">Type de compte</p>
                                    <p className="font-medium capitalize">
                                        {currentUser.type === 'proposer' ? 'Je propose' : 'Je recherche'}
                                    </p>
                                </div>

                                {currentUser.contact && (
                                    <div>
                                        <p className="text-sm text-gray-500">Contact</p>
                                        <p className="font-medium">{currentUser.contact}</p>
                                    </div>
                                )}

                                {currentUser.email && (
                                    <div>
                                        <p className="text-sm text-gray-500">Email</p>
                                        <p className="font-medium">{currentUser.email}</p>
                                    </div>
                                )}

                                {currentUser.ville && (
                                    <div>
                                        <p className="text-sm text-gray-500">Ville</p>
                                        <p className="font-medium capitalize">{currentUser.ville}</p>
                                    </div>
                                )}


                                <div>
                                    <p className="text-sm text-gray-500">Date d'inscription</p>
                                    <p className="font-medium">
                                        {currentUser.createdAt?.toDate().toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Zone de décision */}
                    <div className="mt-8 border-t pt-6">
                        <h2 className="text-lg font-semibold mb-4">Vérification</h2>

                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => setDecision('approve')}
                                    className={`flex-1 py-3 rounded-lg font-medium ${decision === 'approve'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                                        }`}
                                >
                                    Approuver le compte
                                </button>
                                <button
                                    onClick={() => setDecision('reject')}
                                    className={`flex-1 py-3 rounded-lg font-medium ${decision === 'reject'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                                        }`}
                                >
                                    Rejeter le compte
                                </button>
                            </div>

                            {decision === 'reject' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Raison du rejet
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="w-full p-3 border rounded-lg"
                                        placeholder="Ex: Âge suspect, photos inappropriées..."
                                        rows={3}
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-4 pt-4">
                                <button
                                    onClick={() => {
                                        setDecision(null);
                                        setRejectionReason('');
                                    }}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleDecision}
                                    disabled={!decision || (decision === 'reject' && !rejectionReason)}
                                    className={`px-4 py-2 rounded-lg text-white ${decision === 'approve'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                        } ${!decision || (decision === 'reject' && !rejectionReason)
                                            ? 'opacity-50 cursor-not-allowed'
                                            : ''
                                        }`}
                                >
                                    Confirmer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}