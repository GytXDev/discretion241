import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import useImageEditor from '@/hooks/useImageEditor';
import { FaSmile, FaTimes, FaTrash, FaPlus, FaEdit, FaTint } from 'react-icons/fa';

interface Profile {
    pseudo: string;
    type: string;
    genre: string;
    age: string;
    preferences: string[];
    description: string;
    tarifs: { un_coup: string; deux_coups: string; nuit: string };
    ville: string;
    quartier: string;
    deplace: boolean;
    recoit: boolean;
    photos: string[];
    contact: string;
}

export default function ProfilePage() {
    const [user] = useAuthState(auth);
    const router = useRouter();

    const [profileData, setProfileData] = useState<Profile>({
        pseudo: '',
        type: '',
        genre: '',
        age: '',
        preferences: [],
        description: '',
        tarifs: { un_coup: '', deux_coups: '', nuit: '' },
        ville: '',
        quartier: '',
        deplace: false,
        recoit: false,
        photos: [],
        contact: ''
    });

    const [pendingPhotos, setPendingPhotos] = useState<{ file: File; preview: string; editedData?: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showContactForm, setShowContactForm] = useState(false);
    const [contact, setContact] = useState('');

    const {
        canvasRef,
        editingPhoto,
        setEditingPhoto,
        elements,
        setElements,
        activeTool,
        setActiveTool,
        pixelSize,
        setPixelSize,
        selectedElementId,
        emojis,
        addElement,
        removeElement,
        saveEdits,
        drawCanvas
    } = useImageEditor();


    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchData = async () => {
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (snap.exists()) {
                const data = snap.data() as Profile;
                setProfileData({
                    ...data,
                    photos: data.photos || [],
                    tarifs: data.tarifs || { un: '', deux: '', nuit: '' }
                });
                setContact(data.contact || '');
            }
        };

        fetchData();
    }, [user, router]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files)
            .filter(file => file.type.startsWith('image/'))
            .map(file => ({
                file,
                preview: URL.createObjectURL(file),
                editedData: undefined
            }));
        setPendingPhotos(prev => {
            const updated = [...prev, ...newFiles].slice(0, 6 - profileData.photos.length);
            if (updated.length > prev.length) {
                // Ouvre le modal sur la nouvelle photo la plus récente
                setEditingPhoto({ index: prev.length, src: updated[prev.length].preview });
            }
            return updated;
        });

    };

    const removePhoto = async (index: number) => {
        try {
            await deleteImageFromServer(profileData.photos[index]);

            const updatedPhotos = [...profileData.photos];
            updatedPhotos.splice(index, 1);

            await updateDoc(doc(db, 'users', user!.uid), {
                photos: updatedPhotos,
                lastUpdated: serverTimestamp()
            });

            setProfileData(prev => ({ ...prev, photos: updatedPhotos }));
        } catch (error) {
            setErrorMessage("Erreur lors de la suppression");
        }
    };

    const removePendingPhoto = (index: number) => {
        const updated = [...pendingPhotos];
        updated.splice(index, 1);
        setPendingPhotos(updated);
    };

    const startEditing = (index: number) => {
        const photo = pendingPhotos[index];
        setEditingPhoto({ index, src: photo.editedData || photo.preview });
    };

    const confirmEdits = async () => {
        if (!editingPhoto) return;
        const dataUrl = await saveEdits();
        if (!dataUrl) return;
        setPendingPhotos(prev =>
            prev.map((photo, i) =>
                i === editingPhoto.index
                    ? { ...photo, editedData: dataUrl }
                    : photo
            )
        );
        setEditingPhoto(null);
    };

    const uploadImageToServer = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch('https://gytx.dev/discretion241/api/upload_image.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (!response.ok || !data.url) throw new Error(data.message || "Échec de l'upload");
        return data.url;
    };

    const deleteImageFromServer = async (imageUrl: string) => {
        const filename = imageUrl.split('/').pop();
        if (!filename) throw new Error("Nom de fichier invalide");

        const response = await fetch('https://gytx.dev/discretion241/api/delete_image.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename }),
        });

        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            throw new Error(data.message || 'Échec de la suppression');
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setUploading(true);
            const uploadedUrls = await Promise.all(
                pendingPhotos.map(async photo => {
                    const blob = await fetch(photo.editedData || photo.preview).then(res => res.blob());
                    const file = new File([blob], photo.file.name, { type: 'image/jpeg' });
                    return uploadImageToServer(file);
                })
            );
            await updateDoc(doc(db, 'users', user!.uid), {
                ...profileData,
                photos: [...profileData.photos, ...uploadedUrls],
                lastUpdated: serverTimestamp()
            });
            setPendingPhotos([]);
            setProfileData(prev => ({ ...prev, photos: [...prev.photos, ...uploadedUrls] }));
            setSuccessMessage('Profil mis à jour avec succès');
        } catch (error) {
            setErrorMessage((error as Error).message || 'Erreur lors de la mise à jour');
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
            setSuccessMessage('Contact mis à jour');
        } catch (error) {
            setErrorMessage((error as Error).message || 'Erreur lors de la mise à jour du contact');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 py-6 px-4">
            <div className="max-w-4xl mx-auto">
                {/* En-tête */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Mon Profil</h1>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
                    >
                        Retour
                    </button>
                </div>

                {/* Messages d'état */}
                {errorMessage && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
                        {errorMessage}
                    </div>
                )}
                {successMessage && (
                    <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded">
                        {successMessage}
                    </div>
                )}

                {/* Formulaire principal */}
                <form onSubmit={handleProfileUpdate} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Section Informations de base */}
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold mb-4">Informations principales</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Type de profil */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vous êtes</label>
                                <div className="flex space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => setProfileData({ ...profileData, type: 'proposer' })}
                                        className={`flex-1 py-2 px-4 rounded-lg border ${profileData.type === 'proposer' ? 'bg-purple-100 border-purple-500' : 'border-gray-300'}`}
                                    >
                                        Je propose un service
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setProfileData({ ...profileData, type: 'demander' })}
                                        className={`flex-1 py-2 px-4 rounded-lg border ${profileData.type === 'demander' ? 'bg-purple-100 border-purple-500' : 'border-gray-300'}`}
                                    >
                                        Je recherche un service
                                    </button>
                                </div>
                            </div>

                            {/* Champs communs */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pseudo*</label>
                                <input
                                    type="text"
                                    value={profileData.pseudo}
                                    onChange={(e) => setProfileData({ ...profileData, pseudo: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Genre*</label>
                                <select
                                    value={profileData.genre}
                                    onChange={(e) => setProfileData({ ...profileData, genre: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                    required
                                >
                                    <option value="">Sélectionnez...</option>
                                    <option value="homme">Homme</option>
                                    <option value="femme">Femme</option>
                                    <option value="autre">Autre</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Âge*</label>
                                <input
                                    type="number"
                                    value={profileData.age}
                                    onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ville*</label>
                                <input
                                    type="text"
                                    value={profileData.ville}
                                    onChange={(e) => setProfileData({ ...profileData, ville: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section spécifique au type de profil */}
                    {profileData.type === 'proposer' && (
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-semibold mb-4">Détails de votre offre</h2>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tarif 1 coup (CFA)</label>
                                        <input
                                            type="number"
                                            value={profileData.tarifs.un_coup}
                                            onChange={(e) => setProfileData({ ...profileData, tarifs: { ...profileData.tarifs, un_coup: e.target.value } })}
                                            className="w-full p-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tarif 2 coups (CFA)</label>
                                        <input
                                            type="number"
                                            value={profileData.tarifs.deux_coups}
                                            onChange={(e) => setProfileData({ ...profileData, tarifs: { ...profileData.tarifs, deux_coups: e.target.value } })}
                                            className="w-full p-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tarif nuit (CFA)</label>
                                        <input
                                            type="number"
                                            value={profileData.tarifs.nuit}
                                            onChange={(e) => setProfileData({ ...profileData, tarifs: { ...profileData.tarifs, nuit: e.target.value } })}
                                            className="w-full p-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                </div>

                                <div className="flex space-x-4">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={profileData.deplace}
                                            onChange={(e) => setProfileData({ ...profileData, deplace: e.target.checked })}
                                            className="rounded border-gray-300"
                                        />
                                        <span className="text-sm text-gray-700">Je me déplace</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={profileData.recoit}
                                            onChange={(e) => setProfileData({ ...profileData, recoit: e.target.checked })}
                                            className="rounded border-gray-300"
                                        />
                                        <span className="text-sm text-gray-700">Je reçois</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Section Photos */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Photos</h2>
                            <span className="text-sm text-gray-500">
                                {profileData.photos.length + pendingPhotos.length}/6 photos
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                            {/* Photos existantes */}
                            {profileData.photos.map((photo, index) => (
                                <div
                                    key={`existing-${index}`}
                                    className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 transition-all"
                                >
                                    <img
                                        src={photo}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        alt={`Photo ${index + 1}`}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removePhoto(index);
                                        }}
                                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                        aria-label="Supprimer la photo"
                                    >
                                        <FaTrash className="text-sm" />
                                    </button>
                                </div>
                            ))}

                            {/* Nouvelles photos */}
                            {pendingPhotos.map((photo, index) => (
                                <div
                                    key={`pending-${index}`}
                                    className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 transition-all"
                                >
                                    <img
                                        src={photo.editedData || photo.preview}
                                        className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                                        onClick={() => startEditing(index)}
                                        alt={`Nouvelle photo ${index + 1}`}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removePendingPhoto(index);
                                        }}
                                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                        aria-label="Supprimer la photo"
                                    >
                                        <FaTrash className="text-sm" />
                                    </button>
                                    {photo.editedData && (
                                        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                            Modifié
                                        </div>
                                    )}
                                    <button
                                        onClick={() => startEditing(index)}
                                        className="absolute bottom-2 right-2 p-2 bg-white text-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 border border-gray-200"
                                        aria-label="Modifier la photo"
                                    >
                                        <FaEdit className="text-sm" />
                                    </button>
                                </div>
                            ))}

                            {/* Bouton d'ajout */}
                            {profileData.photos.length + pendingPhotos.length < 6 && (
                                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-all hover:border-purple-400 group">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-2 group-hover:bg-purple-200 transition-colors">
                                        <FaPlus />
                                    </div>
                                    <span className="text-xs text-gray-500 group-hover:text-purple-600 transition-colors">Ajouter des photos</span>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Bouton de contact */}
                    <div className="p-6 border-b border-gray-200">
                        <button
                            type="button"
                            onClick={() => setShowContactForm(true)}
                            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                        >
                            {profileData.contact ? 'Modifier mon contact' : 'Ajouter un contact'}
                        </button>
                    </div>

                    {/* Bouton de soumission */}
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                        <button
                            type="submit"
                            disabled={uploading}
                            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
                        >
                            {uploading ? 'Enregistrement en cours...' : 'Mettre à jour mon profil'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Modal d'édition d'image simplifié */}
            {editingPhoto && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">

                        {/* Header */}
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold">Éditer la photo</h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={confirmEdits}
                                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                    >
                                        Valider
                                    </button>
                                    <button
                                        onClick={() => setEditingPhoto(null)}
                                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>

                            {/* Texte explicatif */}
                            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 p-3 rounded-md leading-relaxed">
                                🛡️ Utilisez le flou ou les émojis pour masquer certaines zones sensibles.<br />
                                Ces modifications apparaîtront sur votre profil public et aident à protéger votre identité.
                            </div>
                        </div>

                        {/* Corps du modal */}
                        <div className="flex flex-col md:flex-row h-full overflow-hidden">

                            {/* Canvas */}
                            <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-gray-50 relative">
                                <canvas
                                    ref={canvasRef}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '80vh',
                                        width: 'auto',
                                        height: 'auto',
                                        touchAction: 'none',
                                        userSelect: 'none',
                                        cursor: selectedElementId ? 'grab' : 'default',
                                        border: '1px solid #ccc',
                                    }}
                                />
                            </div>

                            {/* Outils */}
                            <div className="md:w-64 bg-white border-l border-gray-200 p-4 space-y-4 overflow-y-auto">
                                <h4 className="font-medium text-base mb-2">Outils</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => addElement('pixelate')}
                                        className={`py-2 px-3 rounded-md text-sm flex items-center justify-center space-x-1.5 
                ${activeTool === 'pixelate' ? 'bg-blue-100 text-blue-600 border border-blue-300' : 'border border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        <FaTint /> <span>Flou</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveTool(activeTool === 'emoji' ? null : 'emoji')}
                                        className={`py-2 px-3 rounded-md text-sm flex items-center justify-center space-x-1.5 
                ${activeTool === 'emoji' ? 'bg-blue-100 text-blue-600 border border-blue-300' : 'border border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        <FaSmile /> <span>Emoji</span>
                                    </button>

                                    <button
                                        onClick={() => removeElement()}
                                        className="px-3 py-2 text-sm border rounded hover:bg-gray-100"
                                    >
                                        Supprimer sélection
                                    </button>

                                    <button
                                        onClick={() => setElements([])}
                                        className="px-3 py-2 text-sm border rounded hover:bg-gray-100"
                                    >
                                        Réinitialiser
                                    </button>
                                </div>

                                {/* Sliders contextuels */}
                                {selectedElementId && (
                                    <div className="pt-4 border-t border-gray-100 space-y-4">

                                        {/* Taille de la sélection */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Taille de la sélection
                                            </label>
                                            <input
                                                type="range"
                                                min={20}
                                                max={300}
                                                step={1}
                                                value={
                                                    elements.find(el => el.id === selectedElementId)?.width || 50
                                                }
                                                onChange={(e) => {
                                                    const newSize = parseInt(e.target.value);
                                                    setElements(prev =>
                                                        prev.map(el =>
                                                            el.id === selectedElementId
                                                                ? { ...el, width: newSize, height: newSize }
                                                                : el
                                                        )
                                                    );
                                                    drawCanvas();
                                                }}
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Taille des pixels (si flou) */}
                                        {elements.find(el => el.id === selectedElementId)?.type === 'pixelate' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Taille des pixels
                                                </label>
                                                <input
                                                    type="range"
                                                    min={10}
                                                    max={100}
                                                    step={1}
                                                    value={
                                                        elements.find(el => el.id === selectedElementId)?.pixelSize ?? pixelSize
                                                    }
                                                    onChange={(e) => {
                                                        const newPixelSize = parseInt(e.target.value);
                                                        setElements(prev =>
                                                            prev.map(el =>
                                                                el.id === selectedElementId
                                                                    ? { ...el, pixelSize: newPixelSize }
                                                                    : el
                                                            )
                                                        );
                                                        drawCanvas();
                                                    }}
                                                    className="w-full"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Choix des emojis */}
                                {activeTool === 'emoji' && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {emojis.slice(0, 12).map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => addElement('emoji', emoji)}
                                                    className="text-2xl p-1 hover:bg-gray-100 rounded-md"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de contact */}
            {showContactForm && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Modifier le contact</h3>
                            <button
                                onClick={() => setShowContactForm(false)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleContactSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Contact*</label>
                                <input
                                    type="text"
                                    value={contact}
                                    onChange={(e) => setContact(e.target.value)}
                                    placeholder="Numéro ou lien de contact"
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