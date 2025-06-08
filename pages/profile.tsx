import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FaTrash, FaPlus, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

export default function ProfilePage() {
    // États utilisateur et authentification
    const [user] = useAuthState(auth);
    const router = useRouter();

    // États du profil
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
        contact: ''
    });

    // États pour l'édition d'images
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pendingPhotos, setPendingPhotos] = useState<{
        file: File,
        preview: string,
        editedData?: string
    }[]>([]);
    const [editingPhoto, setEditingPhoto] = useState<{
        index: number,
        src: string
    } | null>(null);
    const [blurMode, setBlurMode] = useState<'pixelate' | 'emoji' | null>(null);
    const [selectedEmoji, setSelectedEmoji] = useState('😊');
    const [selectedArea, setSelectedArea] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
    const [pixelSize, setPixelSize] = useState(15);
    const [resizeMode, setResizeMode] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null>(null);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });

    // États UI
    const [uploading, setUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showContactForm, setShowContactForm] = useState(false);
    const [contact, setContact] = useState('');

    const [elements, setElements] = useState<Array<{
        type: 'pixelate' | 'emoji';
        x: number;
        y: number;
        width: number;
        height: number;
        emoji?: string;
        pixelSize?: number;
    }>>([]);

    const [activeElementIndex, setActiveElementIndex] = useState<number | null>(null);

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
                    preferences: data.preferences || [], description: data.description || '',
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
                    contact: data.contact || ''
                });
                setContact(data.contact || '');
            }
        };

        fetchProfile();
    }, [user]);

    // Initialisation du canvas pour l'édition
    useEffect(() => {
        if (!editingPhoto || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Dessiner les éléments existants
            elements.forEach(element => {
                if (element.type === 'pixelate') {
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(
                        canvas,
                        element.x, element.y, element.width, element.height,
                        element.x, element.y, element.pixelSize || pixelSize,
                        (element.pixelSize || pixelSize) * (element.height / element.width)
                    );
                    ctx.drawImage(
                        canvas,
                        element.x, element.y, element.pixelSize || pixelSize,
                        (element.pixelSize || pixelSize) * (element.height / element.width),
                        element.x, element.y, element.width, element.height
                    );
                } else if (element.type === 'emoji' && element.emoji) {
                    const emojiSize = Math.min(element.width, element.height) * 0.8;
                    ctx.font = `bold ${emojiSize}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(element.emoji, element.x + element.width / 2, element.y + element.height / 2);
                }
            });
        };
        img.src = editingPhoto.src;
    }, [editingPhoto, elements, pixelSize]);

    const handleResizeStart = (e: React.MouseEvent, mode: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') => {
        e.stopPropagation();
        setResizeMode(mode);
        setResizeStart({ x: e.clientX, y: e.clientY });
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const newFiles = Array.from(e.target.files).map(file => ({
            file,
            preview: URL.createObjectURL(file),
            editedData: undefined
        }));

        setPendingPhotos(prev => [
            ...prev,
            ...newFiles
        ].slice(0, 6 - profileData.photos.length));
    };

    const startEditing = (index: number) => {
        const photo = pendingPhotos[index];
        setEditingPhoto({
            index,
            src: photo.editedData || photo.preview
        });
    };

    const saveEdits = () => {
        if (!editingPhoto || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Redessiner l'image originale
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            // Appliquer tous les éléments
            elements.forEach(element => {
                if (element.type === 'pixelate') {
                    // Créer un mini-canvas pour le pixelate
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d')!;
                    tempCanvas.width = element.pixelSize || pixelSize;
                    tempCanvas.height = (element.pixelSize || pixelSize) * (element.height / element.width);

                    // Dessiner la zone à pixeliser sur le mini-canvas
                    tempCtx.drawImage(
                        canvas,
                        element.x, element.y, element.width, element.height,
                        0, 0, tempCanvas.width, tempCanvas.height
                    );

                    // Redessiner le mini-canvas agrandi sur la zone originale
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(
                        tempCanvas,
                        0, 0, tempCanvas.width, tempCanvas.height,
                        element.x, element.y, element.width, element.height
                    );
                } else if (element.type === 'emoji' && element.emoji) {
                    const emojiSize = Math.min(element.width, element.height) * 0.8;
                    ctx.font = `bold ${emojiSize}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(element.emoji, element.x + element.width / 2, element.y + element.height / 2);
                }
            });

            const dataUrl = canvas.toDataURL('image/jpeg');
            setPendingPhotos(prev => prev.map((photo, i) =>
                i === editingPhoto.index ? { ...photo, editedData: dataUrl } : photo
            ));

            setEditingPhoto(null);
            setBlurMode(null);
            setElements([]);
            setSelectedArea(null);
        };
        img.src = editingPhoto.src;
    };
    
    // Gestion des interactions avec le canvas
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (!canvasRef.current || !blurMode) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Vérifier si on clique sur un élément existant
        const clickedElementIndex = elements.findIndex(el =>
            x >= el.x && x <= el.x + el.width &&
            y >= el.y && y <= el.y + el.height
        );

        if (clickedElementIndex >= 0) {
            setActiveElementIndex(clickedElementIndex);
            setResizeMode('move');
            setResizeStart({ x: e.clientX, y: e.clientY });
            return;
        }

        // Créer un nouvel élément
        if (blurMode === 'emoji') {
            setElements(prev => [
                ...prev,
                {
                    type: 'emoji',
                    x: x - 25, // centre l'emoji
                    y: y - 25,
                    width: 50,
                    height: 50,
                    emoji: selectedEmoji
                }
            ]);
        } else {
            setSelectedArea({ x, y, width: 0, height: 0 });
            setIsSelecting(true);
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let x = (e.clientX - rect.left) * scaleX;
        let y = (e.clientY - rect.top) * scaleY;

        // Contrainte aux limites du canvas
        x = Math.max(0, Math.min(x, canvas.width));
        y = Math.max(0, Math.min(y, canvas.height));

        // Mode déplacement/redimensionnement d'élément
        if (resizeMode !== null && activeElementIndex !== null) {
            const dx = (e.clientX - resizeStart.x) * scaleX;
            const dy = (e.clientY - resizeStart.y) * scaleY;

            setResizeStart({ x: e.clientX, y: e.clientY });

            setElements(prev => {
                const newElements = [...prev];
                const element = newElements[activeElementIndex];
                const canvas = canvasRef.current!;

                if (resizeMode === 'move') {
                    // Nouvelle position avec contraintes
                    const newX = Math.max(0, Math.min(element.x + dx, canvas.width - element.width));
                    const newY = Math.max(0, Math.min(element.y + dy, canvas.height - element.height));

                    element.x = newX;
                    element.y = newY;
                } else {
                    // Redimensionnement avec contraintes
                    if (resizeMode.includes('n')) {
                        const newHeight = element.height - dy;
                        if (newHeight > 10 && element.y + dy >= 0) {
                            element.y += dy;
                            element.height = newHeight;
                        }
                    }
                    if (resizeMode.includes('s')) {
                        const newHeight = element.height + dy;
                        if (newHeight > 10 && element.y + element.height + dy <= canvas.height) {
                            element.height = newHeight;
                        }
                    }
                    if (resizeMode.includes('w')) {
                        const newWidth = element.width - dx;
                        if (newWidth > 10 && element.x + dx >= 0) {
                            element.x += dx;
                            element.width = newWidth;
                        }
                    }
                    if (resizeMode.includes('e')) {
                        const newWidth = element.width + dx;
                        if (newWidth > 10 && element.x + element.width + dx <= canvas.width) {
                            element.width = newWidth;
                        }
                    }
                }

                return newElements;
            });
        }
        // Mode sélection de zone
        else if (isSelecting && selectionStart && blurMode === 'pixelate') {
            setSelectedArea({
                x: Math.min(x, selectionStart.x),
                y: Math.min(y, selectionStart.y),
                width: Math.abs(x - selectionStart.x),
                height: Math.abs(y - selectionStart.y)
            });
        }
    };

    const handleCanvasMouseUp = () => {
        if (isSelecting && selectedArea && blurMode === 'pixelate') {
            setElements(prev => [
                ...prev,
                {
                    type: 'pixelate',
                    x: selectedArea.x,
                    y: selectedArea.y,
                    width: selectedArea.width,
                    height: selectedArea.height,
                    pixelSize: pixelSize
                }
            ]);
            setSelectedArea(null);
        }

        setIsSelecting(false);
        setResizeMode(null);
        setActiveElementIndex(null);
    };

    const removePendingPhoto = (index: number) => {
        URL.revokeObjectURL(pendingPhotos[index].preview);
        setPendingPhotos(prev => prev.filter((_, i) => i !== index));
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

    const uploadImageToServer = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('https://gytx.dev/discretion241/api/upload_image.php', {
            method: 'POST',
            body: formData,
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

            // Upload des nouvelles photos
            const uploadedUrls = await Promise.all(
                pendingPhotos.map(async photo => {
                    const blob = await fetch(photo.editedData || photo.preview).then(res => res.blob());
                    const file = new File([blob], photo.file.name, { type: 'image/jpeg' });
                    return uploadImageToServer(file);
                })
            );

            // Mise à jour complète du profil
            await updateDoc(doc(db, 'users', user!.uid), {
                ...profileData,
                photos: [...profileData.photos, ...uploadedUrls],
                lastUpdated: serverTimestamp()
            });

            setPendingPhotos([]);
            setProfileData(prev => ({
                ...prev,
                photos: [...prev.photos, ...uploadedUrls]
            }));
            setSuccessMessage("Profil mis à jour avec succès");
        } catch (error) {
            setErrorMessage("Erreur lors de la mise à jour");
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
            setSuccessMessage("Contact mis à jour");
        } catch (error) {
            setErrorMessage("Erreur lors de la mise à jour du contact");
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
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold mb-4">
                            {profileData.type === 'proposer' ? 'Détails de votre offre' : 'Détails de votre recherche'}
                        </h2>

                        {profileData.type === 'proposer' ? (
                            <div className="space-y-4">
                                {/* Champs pour "proposer" */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tarif 1 coup (CFA)</label>
                                        <input
                                            type="number"
                                            value={profileData.tarifs.un}
                                            onChange={(e) => setProfileData({ ...profileData, tarifs: { ...profileData.tarifs, un: e.target.value } })}
                                            className="w-full p-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tarif 2 coups (CFA)</label>
                                        <input
                                            type="number"
                                            value={profileData.tarifs.deux}
                                            onChange={(e) => setProfileData({ ...profileData, tarifs: { ...profileData.tarifs, deux: e.target.value } })}
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
                        ) : (
                            <div>
                                {/* Champs pour "demander" */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget approximatif (CFA)</label>
                                    <input
                                        type="number"
                                        value={profileData.tarifs.un} // Réutilise un champ tarif pour le budget
                                        onChange={(e) => setProfileData({ ...profileData, tarifs: { ...profileData.tarifs, un: e.target.value } })}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
                            <textarea
                                value={profileData.description}
                                onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                rows={3}
                                placeholder={profileData.type === 'proposer'
                                    ? "Décrivez votre offre en détails..."
                                    : "Décrivez ce que vous recherchez..."}
                                required
                            />
                        </div>
                    </div>

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

            {/* Modal d'édition d'image */}
            {editingPhoto && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* En-tête */}
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold">
                                {blurMode === 'pixelate' ? "Flouter une zone" : "Éditer la photo"}
                            </h3>
                            <div className="flex space-x-2">
                                <button
                                    onClick={saveEdits}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                                >
                                    <FaCheck /> <span>Valider</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingPhoto(null);
                                        setBlurMode(null);
                                        setSelectedArea(null);
                                    }}
                                    className="p-2 hover:bg-gray-200 rounded-full text-gray-700"
                                    aria-label="Fermer"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row h-full overflow-hidden">
                            {/* Zone d'édition principale */}
                            <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-gray-100 relative">
                                <div className="relative">
                                    <canvas
                                        ref={canvasRef}
                                        className="max-w-full max-h-[70vh] shadow-lg rounded-lg border border-gray-200 cursor-crosshair"
                                        onMouseDown={handleCanvasMouseDown}
                                        onMouseMove={handleCanvasMouseMove}
                                        onMouseUp={handleCanvasMouseUp}
                                        onMouseLeave={() => {
                                            setIsSelecting(false);
                                            setResizeMode(null);
                                        }}
                                    />

                                    {/* Zone de sélection avec poignées de redimensionnement */}
                                    {selectedArea && (
                                        <div
                                            className="absolute border-2 border-purple-500 bg-purple-100/30"
                                            style={{
                                                left: `${selectedArea.x}px`,
                                                top: `${selectedArea.y}px`,
                                                width: `${selectedArea.width}px`,
                                                height: `${selectedArea.height}px`,
                                            }}
                                        >
                                            {/* Poignées de redimensionnement */}
                                            <div className="absolute -left-1 -top-1 w-3 h-3 bg-white border-2 border-purple-500 rounded-full cursor-nwse-resize"
                                                onMouseDown={(e) => handleResizeStart(e, 'nw')}
                                            />
                                            <div className="absolute -right-1 -top-1 w-3 h-3 bg-white border-2 border-purple-500 rounded-full cursor-nesw-resize"
                                                onMouseDown={(e) => handleResizeStart(e, 'ne')}
                                            />
                                            <div className="absolute -left-1 -bottom-1 w-3 h-3 bg-white border-2 border-purple-500 rounded-full cursor-nesw-resize"
                                                onMouseDown={(e) => handleResizeStart(e, 'sw')}
                                            />
                                            <div className="absolute -right-1 -bottom-1 w-3 h-3 bg-white border-2 border-purple-500 rounded-full cursor-nwse-resize"
                                                onMouseDown={(e) => handleResizeStart(e, 'se')}
                                            />
                                            <div className="absolute -left-1 -top-1/2 w-3 h-3 bg-white border-2 border-purple-500 rounded-full cursor-ew-resize"
                                                onMouseDown={(e) => handleResizeStart(e, 'w')}
                                            />
                                            <div className="absolute -right-1 -top-1/2 w-3 h-3 bg-white border-2 border-purple-500 rounded-full cursor-ew-resize"
                                                onMouseDown={(e) => handleResizeStart(e, 'e')}
                                            />
                                            <div className="absolute -top-1 -left-1/2 w-3 h-3 bg-white border-2 border-purple-500 rounded-full cursor-ns-resize"
                                                onMouseDown={(e) => handleResizeStart(e, 'n')}
                                            />
                                            <div className="absolute -bottom-1 -left-1/2 w-3 h-3 bg-white border-2 border-purple-500 rounded-full cursor-ns-resize"
                                                onMouseDown={(e) => handleResizeStart(e, 's')}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Panneau latéral des outils */}
                            <div className="md:w-72 bg-white border-l border-gray-200 p-4 space-y-6 overflow-y-auto">
                                <div>
                                    <h4 className="font-medium text-lg mb-3">Outils de modification</h4>
                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBlurMode('pixelate');
                                                if (canvasRef.current) {
                                                    const canvas = canvasRef.current;
                                                    const size = Math.min(canvas.width, canvas.height) * 0.3;
                                                    setSelectedArea({
                                                        x: (canvas.width - size) / 2,
                                                        y: (canvas.height - size) / 2,
                                                        width: size,
                                                        height: size
                                                    });
                                                }
                                            }}
                                            className={`w-full py-3 px-4 rounded-lg flex items-center space-x-3 ${blurMode === 'pixelate' ? 'bg-purple-100 border border-purple-500' : 'border border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            <div className="w-6 h-6 bg-gray-300 rounded-sm"></div>
                                            <span>Pixeliser une zone</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setBlurMode('emoji')}
                                            className={`w-full py-3 px-4 rounded-lg flex items-center space-x-3 ${blurMode === 'emoji' ? 'bg-purple-100 border border-purple-500' : 'border border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            <span className="text-xl">😊</span>
                                            <span>Ajouter un emoji</span>
                                        </button>
                                    </div>
                                </div>

                                {blurMode === 'emoji' && (
                                    <div className="pt-2">
                                        <h5 className="text-sm font-medium mb-2">Choisissez un emoji</h5>
                                        <div className="grid grid-cols-6 gap-2">
                                            {emojis.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    onClick={() => setSelectedEmoji(emoji)}
                                                    className={`text-2xl p-2 rounded-lg flex items-center justify-center ${selectedEmoji === emoji ? 'bg-purple-100' : 'hover:bg-gray-100'}`}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {blurMode === 'pixelate' && (
                                    <div className="pt-2">
                                        <h5 className="text-sm font-medium mb-2">Intensité du flou</h5>
                                        <input
                                            type="range"
                                            min="5"
                                            max="30"
                                            value={pixelSize}
                                            onChange={(e) => setPixelSize(parseInt(e.target.value))}
                                            className="w-full"
                                        />
                                        <div className="text-xs text-gray-500 text-right">{pixelSize}px</div>
                                    </div>
                                )}

                                {selectedArea && (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium">Zone sélectionnée</span>
                                            <button
                                                onClick={() => setSelectedArea(null)}
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                Effacer
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <div className="text-gray-500">Largeur</div>
                                                <div>{Math.round(selectedArea.width)}px</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500">Hauteur</div>
                                                <div>{Math.round(selectedArea.height)}px</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500">Position X</div>
                                                <div>{Math.round(selectedArea.x)}px</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500">Position Y</div>
                                                <div>{Math.round(selectedArea.y)}px</div>
                                            </div>
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