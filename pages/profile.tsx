import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import NextImage from 'next/image';
import { FaTrash, FaEdit, FaPlus, FaCheck, FaTimes } from 'react-icons/fa';

export default function ProfilePage() {
    const [user] = useAuthState(auth);
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);
    const [blurMode, setBlurMode] = useState<'pixelate' | 'emoji' | null>(null);
    const [selectedEmoji, setSelectedEmoji] = useState('😊');
    const [contact, setContact] = useState('');
    const [showContactForm, setShowContactForm] = useState(false);
    const img = new Image();

    // Données du profil
    const [profileData, setProfileData] = useState({
        pseudo: '',
        type: '',
        genre: '',
        age: '',
        preferences: [] as string[],
        description: '',
        tarifs: { un: '', deux: '', nuit: '' },
        ville: '',
        quartier: '',
        deplace: false,
        recoit: false,
        photos: [] as string[],
        blurredPhotos: [] as string[],
        contact: '',
        isVerified: false
    });

    const [photos, setPhotos] = useState<File[]>([]);
    const [previewPhotos, setPreviewPhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const emojis = ['😊', '❤️', '🌸', '🌟', '🔞', '💋', '🍑', '💦', '👄', '👅'];

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchProfile = async () => {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setProfileData({
                    pseudo: data.pseudo || '',
                    type: data.type || '',
                    genre: data.genre || '',
                    age: data.age?.toString() || '',
                    preferences: data.preferences || [],
                    description: data.description || '',
                    tarifs: {
                        un: data.tarifs?.un_coup?.toString() || '',
                        deux: data.tarifs?.deux_coups?.toString() || '',
                        nuit: data.tarifs?.nuit?.toString() || ''
                    },
                    ville: data.ville || '',
                    quartier: data.quartier || '',
                    deplace: data.deplace || false,
                    recoit: data.recoit || false,
                    photos: data.photos || [],
                    blurredPhotos: data.blurredPhotos || [],
                    contact: data.contact || '',
                    isVerified: data.isVerified || false
                });
                setContact(data.contact || '');
                setPreviewPhotos(data.photos || []);
            }
        };

        fetchProfile();
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newPhotos = [...photos, ...files].slice(0, 6 - profileData.photos.length);
            const newPreviews = [
                ...previewPhotos,
                ...files.map(file => URL.createObjectURL(file))
            ].slice(0, 6);

            setPhotos(newPhotos);
            setPreviewPhotos(newPreviews);
        }
    };

    const uploadImageToServer = async (imageFile: File): Promise<string> => {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await fetch('https://gytx.dev/discretion241/api/upload_image.php', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
            throw new Error(data.message || "Échec de l'upload");
        }

        return data.url;
    };

    const deleteImageFromServer = async (imageUrl: string) => {
        try {
            const filename = imageUrl.split('/').pop();
            const response = await fetch('https://gytx.dev/discretion241/api/delete_image.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filename }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Échec de la suppression");
            }

            return true;
        } catch (error) {
            console.error("Erreur suppression image:", error);
            return false;
        }
    };

    const removePhoto = async (index: number) => {
        if (index < profileData.photos.length) {
            // Supprimer une photo existante du serveur
            try {
                const photoUrl = profileData.photos[index];
                await deleteImageFromServer(photoUrl);

                // Mettre à jour les tableaux
                const updatedPhotos = [...profileData.photos];
                updatedPhotos.splice(index, 1);

                const updatedBlurredPhotos = [...profileData.blurredPhotos];
                updatedBlurredPhotos.splice(index, 1);

                const updatedPreviewPhotos = [...previewPhotos];
                updatedPreviewPhotos.splice(index, 1);

                // Mettre à jour Firestore
                await updateDoc(doc(db, 'users', user!.uid), {
                    photos: updatedPhotos,
                    blurredPhotos: updatedBlurredPhotos,
                    lastUpdated: serverTimestamp()
                });

                setProfileData(prev => ({
                    ...prev,
                    photos: updatedPhotos,
                    blurredPhotos: updatedBlurredPhotos
                }));
                setPreviewPhotos(updatedPreviewPhotos);
            } catch (error) {
                console.error("Erreur suppression photo:", error);
                setErrorMessage("Erreur lors de la suppression de la photo");
            }
        } else {
            // Supprimer une nouvelle photo non encore uploadée
            const photoIndex = index - profileData.photos.length;
            const newPhotos = [...photos];
            newPhotos.splice(photoIndex, 1);

            const newPreviews = [...previewPhotos];
            newPreviews.splice(index, 1);

            setPhotos(newPhotos);
            setPreviewPhotos(newPreviews);
        }
    };

    const startEditingPhoto = (index: number) => {
        setEditingPhotoIndex(index);
        setBlurMode(null);
    };

    const applyBlurEffect = async (type: 'pixelate' | 'emoji') => {
        if (editingPhotoIndex === null || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = previewPhotos[editingPhotoIndex];

        await new Promise((resolve) => {
            img.onload = resolve;
        });

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        if (type === 'pixelate') {
            // Effet de pixelisation
            const size = Math.floor(img.width / 20);
            for (let y = 0; y < img.height; y += size) {
                for (let x = 0; x < img.width; x += size) {
                    const pixel = ctx.getImageData(x, y, size, size);
                    ctx.fillStyle = `rgb(${pixel.data[0]}, ${pixel.data[1]}, ${pixel.data[2]})`;
                    ctx.fillRect(x, y, size, size);
                }
            }
        } else if (type === 'emoji') {
            // Ajout d'emoji
            ctx.font = `${Math.floor(img.width / 5)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(selectedEmoji, img.width / 2, img.height / 2);
        }

        // Mettre à jour la preview
        const updatedPreviews = [...previewPhotos];
        updatedPreviews[editingPhotoIndex] = canvas.toDataURL('image/jpeg');
        setPreviewPhotos(updatedPreviews);

        // Si c'est une photo existante, marquer comme floutée
        if (editingPhotoIndex < profileData.photos.length) {
            const updatedBlurred = [...profileData.blurredPhotos];
            updatedBlurred[editingPhotoIndex] = true;
            setProfileData(prev => ({ ...prev, blurredPhotos: updatedBlurred }));
        }
    };

    const savePhotoEdits = async () => {
        if (editingPhotoIndex === null) return;

        try {
            setUploading(true);

            // Si c'est une nouvelle photo
            if (editingPhotoIndex >= profileData.photos.length) {
                const photoIndex = editingPhotoIndex - profileData.photos.length;
                const photoFile = photos[photoIndex];

                // Upload de la photo originale ou modifiée
                let photoUrl: string;
                if (blurMode) {
                    // Si floutage appliqué, uploader la version canvas
                    const canvas = canvasRef.current!;
                    const blob = await new Promise<Blob | null>(resolve => {
                        canvas.toBlob(resolve, 'image/jpeg', 0.8);
                    });

                    if (blob) {
                        const file = new File([blob!], photoFile.name, { type: 'image/jpeg' });
                        photoUrl = await uploadImageToServer(file);
                    } else {
                        throw new Error("Erreur de conversion de l'image");
                    }
                } else {
                    // Sinon uploader l'originale
                    photoUrl = await uploadImageToServer(photoFile);
                }

                const updatedPhotos = [...profileData.photos, photoUrl];
                const updatedBlurred = [...profileData.blurredPhotos, blurMode !== null];

                await updateDoc(doc(db, 'users', user!.uid), {
                    photos: updatedPhotos,
                    blurredPhotos: updatedBlurred,
                    lastUpdated: serverTimestamp()
                });

                setProfileData(prev => ({
                    ...prev,
                    photos: updatedPhotos,
                    blurredPhotos: updatedBlurred
                }));
            } else {
                // Si c'est une photo existante qui a été modifiée
                const photoUrl = profileData.photos[editingPhotoIndex];
                const canvas = canvasRef.current!;
                const blob = await new Promise<Blob | null>(resolve => {
                    canvas.toBlob(resolve, 'image/jpeg', 0.8);
                });

                if (blob) {
                    // Supprimer l'ancienne image
                    await deleteImageFromServer(photoUrl);

                    // Uploader la nouvelle version
                    const file = new File([blob!], `edited_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    const newPhotoUrl = await uploadImageToServer(file);

                    const updatedPhotos = [...profileData.photos];
                    updatedPhotos[editingPhotoIndex] = newPhotoUrl;

                    const updatedBlurred = [...profileData.blurredPhotos];
                    updatedBlurred[editingPhotoIndex] = blurMode !== null;

                    await updateDoc(doc(db, 'users', user!.uid), {
                        photos: updatedPhotos,
                        blurredPhotos: updatedBlurred,
                        lastUpdated: serverTimestamp()
                    });

                    setProfileData(prev => ({
                        ...prev,
                        photos: updatedPhotos,
                        blurredPhotos: updatedBlurred
                    }));
                }
            }

            setEditingPhotoIndex(null);
            setBlurMode(null);
            setSuccessMessage("Modifications enregistrées avec succès");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Erreur sauvegarde photo:", error);
            setErrorMessage("Erreur lors de l'enregistrement des modifications");
        } finally {
            setUploading(false);
        }
    };

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateDoc(doc(db, 'users', user!.uid), {
                contact,
                lastUpdated: serverTimestamp()
            });
            setProfileData(prev => ({ ...prev, contact }));
            setShowContactForm(false);
            setSuccessMessage("Contact enregistré avec succès");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Erreur enregistrement contact:", error);
            setErrorMessage("Erreur lors de l'enregistrement du contact");
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setUploading(true);

            // Upload des nouvelles photos
            const newPhotoUrls = [];
            for (const photo of photos) {
                const url = await uploadImageToServer(photo);
                newPhotoUrls.push(url);
            }

            // Mise à jour des données dans Firestore
            const updatedData = {
                ...profileData,
                photos: [...profileData.photos, ...newPhotoUrls],
                blurredPhotos: [...profileData.blurredPhotos, ...Array(newPhotoUrls.length).fill(false)],
                age: parseInt(profileData.age) || 0,
                tarifs: {
                    un_coup: parseInt(profileData.tarifs.un) || 0,
                    deux_coups: parseInt(profileData.tarifs.deux) || 0,
                    nuit: parseInt(profileData.tarifs.nuit) || 0
                },
                lastUpdated: serverTimestamp()
            };

            await updateDoc(doc(db, 'users', user!.uid), updatedData);

            setSuccessMessage("Profil mis à jour avec succès");
            setTimeout(() => setSuccessMessage(''), 3000);
            setPhotos([]);
        } catch (error) {
            console.error("Erreur mise à jour profil:", error);
            setErrorMessage("Erreur lors de la mise à jour du profil");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 py-10 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Mon Profil</h1>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                        Retour
                    </button>
                </div>

                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-6">
                        {errorMessage}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded mb-6">
                        {successMessage}
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <h2 className="text-xl font-bold mb-4">Informations du profil</h2>

                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        {/* ... (le reste du formulaire reste identique) ... */}
                    </form>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Photos</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        {profileData.type === 'proposer'
                            ? 'Minimum 2 photos (maximum 6)'
                            : 'Minimum 1 photo (maximum 6)'}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                        {previewPhotos.map((photo, index) => (
                            <div key={index} className="relative group aspect-square rounded-xl overflow-hidden">
                                <img
                                    src={photo}
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-2">
                                    <button
                                        onClick={() => startEditingPhoto(index)}
                                        className="p-2 bg-white/80 rounded-full hover:bg-white"
                                        title="Modifier"
                                    >
                                        <FaEdit className="text-gray-800" />
                                    </button>
                                    <button
                                        onClick={() => removePhoto(index)}
                                        className="p-2 bg-white/80 rounded-full hover:bg-white"
                                        title="Supprimer"
                                    >
                                        <FaTrash className="text-red-600" />
                                    </button>
                                </div>
                                {profileData.blurredPhotos[index] && (
                                    <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                                        Flouté
                                    </div>
                                )}
                            </div>
                        ))}

                        {previewPhotos.length < 6 && (
                            <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <FaPlus className="text-gray-400 text-2xl mb-2" />
                                <span className="text-sm text-gray-500">Ajouter des photos</span>
                            </label>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal d'édition de photo */}
            {editingPhotoIndex !== null && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Modifier la photo</h3>
                                <button
                                    onClick={() => setEditingPhotoIndex(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                                        <canvas
                                            ref={canvasRef}
                                            className="w-full h-auto max-h-[60vh] object-contain"
                                        />
                                    </div>
                                </div>

                                <div className="md:w-64 space-y-4">
                                    <div>
                                        <h4 className="font-medium mb-2">Options de floutage</h4>
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => setBlurMode('pixelate')}
                                                className={`w-full py-2 px-4 rounded-lg border ${blurMode === 'pixelate' ? 'bg-purple-100 border-purple-500' : 'border-gray-300'}`}
                                            >
                                                Pixeliser
                                            </button>
                                            <button
                                                onClick={() => setBlurMode('emoji')}
                                                className={`w-full py-2 px-4 rounded-lg border ${blurMode === 'emoji' ? 'bg-purple-100 border-purple-500' : 'border-gray-300'}`}
                                            >
                                                Ajouter emoji
                                            </button>
                                        </div>
                                    </div>

                                    {blurMode === 'emoji' && (
                                        <div>
                                            <h4 className="font-medium mb-2">Choisir un emoji</h4>
                                            <div className="grid grid-cols-5 gap-2">
                                                {emojis.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => setSelectedEmoji(emoji)}
                                                        className={`text-2xl p-2 rounded-lg ${selectedEmoji === emoji ? 'bg-purple-100' : 'hover:bg-gray-100'}`}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {blurMode && (
                                        <button
                                            onClick={() => applyBlurEffect(blurMode)}
                                            className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                        >
                                            Appliquer
                                        </button>
                                    )}

                                    <div className="pt-4 border-t">
                                        <button
                                            onClick={savePhotoEdits}
                                            disabled={uploading}
                                            className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {uploading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal d'ajout de contact */}
            {showContactForm && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">
                                {profileData.contact ? 'Modifier le contact' : 'Ajouter un contact'}
                            </h3>
                            <button
                                onClick={() => setShowContactForm(false)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleContactSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Numéro de téléphone ou lien</label>
                                <input
                                    type="text"
                                    value={contact}
                                    onChange={(e) => setContact(e.target.value)}
                                    placeholder="Ex: +241 01234567 ou @mon_lien"
                                    className="w-full p-3 border border-gray-300 rounded-lg"
                                    required
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowContactForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}