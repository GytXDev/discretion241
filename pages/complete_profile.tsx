import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';
import useImageEditor from '@/hooks/useImageEditor';
import { FaSmile, FaTimes, FaTint } from 'react-icons/fa';

export default function CompleteProfilePage() {
    const [user] = useAuthState(auth);
    const router = useRouter();

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

    const dataURLtoFile = (dataUrl: string, filename: string): File => {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        return new File([u8arr], filename, { type: mime });
    };

    const [pseudo, setPseudo] = useState('');
    const [type, setType] = useState<'proposer' | 'demander' | ''>('');
    const [genre, setGenre] = useState('');
    const [age, setAge] = useState('');
    const [preferences, setPreferences] = useState<string[]>([]);
    const [description, setDescription] = useState('');
    const [tarifs, setTarifs] = useState({ un: '', deux: '', nuit: '' });
    const [ville, setVille] = useState('');
    const [quartier, setQuartier] = useState('');
    const [deplace, setDeplace] = useState(false);
    const [recoit, setRecoit] = useState(false);
    const [photos, setPhotos] = useState<File[]>([]);
    const [previewPhotos, setPreviewPhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [contact, setContact] = useState('');


    const villes = ['Libreville', 'Franceville', 'Moanda', 'Port Gentil', 'Oyem'];
    const genres = ['femme', 'homme', 'autre'];
    const preferenceOptions = ['femmes', 'hommes', 'tous'];

    useEffect(() => {
        if (!user) router.push('/login');

    }, [user]);

    useEffect(() => {
        // Copie des URLs actuelles pour le nettoyage
        const currentPreviews = [...previewPhotos];

        return () => {
            currentPreviews.forEach(url => {
                try {
                    URL.revokeObjectURL(url);
                } catch (e) {
                    console.warn("Erreur lors de la libération de l'URL", e);
                }
            });
        };
    }, [previewPhotos]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);

            const newPhotos = [...photos, ...files].slice(0, 6); // max 6
            const newPreviews = [
                ...previewPhotos,
                ...files.map(file => URL.createObjectURL(file)),
            ].slice(0, 6);

            setPhotos(newPhotos);
            setPreviewPhotos(newPreviews);
        }
    };

    const confirmEdits = async () => {
        const edited = await saveEdits();
        if (edited && editingPhoto) {
            const newPhotos = [...photos];
            const newPreviews = [...previewPhotos];
            newPhotos[editingPhoto.index] = dataURLtoFile(edited, `edited_${Date.now()}.jpg`);
            newPreviews[editingPhoto.index] = edited;
            setPhotos(newPhotos);
            setPreviewPhotos(newPreviews);
            setEditingPhoto(null);
        }
    };


    const handleImageUpload = async (): Promise<string[]> => {
        const urls: string[] = [];

        for (let i = 0; i < photos.length; i++) {
            const img = photos[i];
            let retries = 0;
            let uploaded = false;

            while (retries < 3 && !uploaded) {
                try {
                    const formData = new FormData();
                    formData.append('image', img);

                    const response = await fetch('https://gytx.dev/discretion241/api/upload_image.php', {
                        method: 'POST',
                        body: formData,
                    });

                    const data = await response.json();

                    if (!response.ok || !data.url) {
                        throw new Error(data.message || "Upload failed");
                    }

                    urls.push(data.url);
                    uploaded = true;

                } catch (error) {
                    retries++;
                    if (retries === 3) {
                        throw new Error(`Échec après 3 tentatives: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                }
            }
        }

        return urls;
    };

    const togglePreference = (pref: string) => {
        if (pref === 'tous') {
            setPreferences(['tous']);
        } else {
            if (preferences.includes('tous')) {
                setPreferences([pref]);
            } else if (preferences.includes(pref)) {
                setPreferences(preferences.filter(p => p !== pref));
            } else {
                setPreferences([...preferences, pref]);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!pseudo || !type || !genre || !age || preferences.length === 0) {
            return setErrorMessage("Tous les champs sont obligatoires.");
        }

        if ((type === 'proposer' && photos.length < 2) || (type === 'demander' && photos.length < 1)) {
            return setErrorMessage(`Nombre de photos insuffisant (${type === 'proposer' ? '2 minimum' : '1 minimum'}).`);
        }

        // Validation du format du contact (nouveaux préfixes)
        useEffect(() => {
            const contactRegex = /^(060|062|065|066|074|077)\d{6}$/;
            if (contact && !contactRegex.test(contact)) {
                setErrorMessage("Le contact doit commencer par 060, 062, 065, 066, 074 ou 077 et contenir 8 chiffres au total");
            } else {
                setErrorMessage('');
            }
        }, [contact]);



        setUploading(true);
        try {
            // 1. Upload des images
            const uploadedURLs = await handleImageUpload();

            // 2. Enregistrement dans Firestore
            const userData = {
                uid: user?.uid,
                email: user?.email,
                pseudo,
                genre,
                age: parseInt(age),
                type,
                role: 'user',
                contact,
                preferences: preferences.includes('tous') ? ['femmes', 'hommes'] : preferences,
                description: type === 'proposer' ? description : '',
                tarifs: type === 'proposer' ? {
                    un_coup: parseInt(tarifs.un) || 0,
                    deux_coups: parseInt(tarifs.deux) || 0,
                    nuit: parseInt(tarifs.nuit) || 0,
                } : null,
                deplace,
                recoit,
                ville,
                quartier,
                photos: uploadedURLs,
                isVerified: false,
                step: 'verification',
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
            };

            await setDoc(doc(db, 'users', user!.uid), userData);
            router.push('/verify');
        } catch (err) {
            console.error("Erreur enregistrement:", err);
            setErrorMessage(
                err instanceof Error
                    ? err.message
                    : "Une erreur est survenue lors de l'enregistrement"
            );
        } finally {
            setUploading(false);
        }
    };

    const nextStep = () => {
        if (currentStep === 1 && (!pseudo || !type || !genre || !age)) {
            return setErrorMessage("Veuillez remplir tous les champs obligatoires.");
        }
        if (currentStep === 2 && preferences.length === 0) {
            return setErrorMessage("Veuillez sélectionner au moins une préférence.");
        }
        setCurrentStep(prev => prev + 1);
        setErrorMessage('');
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
        setErrorMessage('');
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center px-4 py-10">
            <Image src="/logo.png" alt="Logo" width={180} height={60} priority className="mb-6" />

            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-xl border border-gray-200">
                <div className="flex justify-between mb-6">
                    {[1, 2, 3].map(step => (
                        <div key={step} className={`w-8 h-8 rounded-full flex items-center justify-center 
                            ${currentStep >= step ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {step}
                        </div>
                    ))}
                </div>

                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded mb-4">
                        {errorMessage}
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-center mb-4">Informations de base</h2>

                        <input
                            type="text"
                            placeholder="Pseudo (ex: La Déesse du 💦)"
                            className="w-full p-4 rounded-2xl border border-gray-300 bg-gray-50 text-lg"
                            value={pseudo}
                            onChange={(e) => setPseudo(e.target.value)}
                            required
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as 'proposer' | 'demander' | '')}
                                required
                                className="p-4 border border-gray-300 bg-gray-50 rounded-2xl"
                            >
                                <option value="">Type de profil</option>
                                <option value="proposer">Je propose</option>
                                <option value="demander">Je recherche</option>
                            </select>

                            <select
                                value={genre}
                                onChange={(e) => setGenre(e.target.value)}
                                required
                                className="p-4 border border-gray-300 bg-gray-50 rounded-2xl"
                            >
                                <option value="">Genre</option>
                                {genres.map(g => (
                                    <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        <input
                            type="number"
                            placeholder="Âge"
                            className="w-full p-4 rounded-2xl border border-gray-300 bg-gray-50 text-lg"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            required
                        />

                        <input
                            type="text"
                            placeholder="Contact (ex: 077123456)"
                            className="w-full p-4 rounded-2xl border border-gray-300 bg-gray-50 text-lg"
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            required
                            pattern="(060|062|065|066|074|077)\d{6}"
                            title="Le numéro doit commencer par 060, 062, 065, 066, 074 ou 077 et contenir 8 chiffres"
                        />

                        <button
                            onClick={nextStep}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-lg hover:opacity-90 transition mt-4"
                        >
                            Continuer
                        </button>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-center mb-4">Préférences</h2>

                        <div>
                            <h3 className="text-lg font-medium mb-3">Je suis intéressé(e) par :</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {preferenceOptions.map(pref => (
                                    <button
                                        key={pref}
                                        type="button"
                                        onClick={() => togglePreference(pref)}
                                        className={`p-3 rounded-xl border-2 ${preferences.includes(pref) ?
                                            'border-purple-600 bg-purple-50 text-purple-600' :
                                            'border-gray-300 bg-white'}`}
                                    >
                                        {pref.charAt(0).toUpperCase() + pref.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {type === 'proposer' && (
                            <>
                                <div>
                                    <h3 className="text-lg font-medium mb-3">Tarifs (optionnel)</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="flex flex-col items-center">
                                            <label className="text-sm mb-1">1 coup</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50"
                                                value={tarifs.un}
                                                onChange={(e) => setTarifs({ ...tarifs, un: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <label className="text-sm mb-1">2 coups</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50"
                                                value={tarifs.deux}
                                                onChange={(e) => setTarifs({ ...tarifs, deux: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <label className="text-sm mb-1">Nuit</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50"
                                                value={tarifs.nuit}
                                                onChange={(e) => setTarifs({ ...tarifs, nuit: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium mb-3">Localisation</h3>
                                    <select
                                        value={ville}
                                        onChange={(e) => setVille(e.target.value)}
                                        className="w-full p-4 border border-gray-300 bg-gray-50 rounded-2xl mb-3"
                                    >
                                        <option value="">Sélectionnez une ville</option>
                                        {villes.map(v => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Quartier (optionnel)"
                                        value={quartier}
                                        onChange={(e) => setQuartier(e.target.value)}
                                        className="w-full p-4 border border-gray-300 bg-gray-50 rounded-2xl"
                                    />
                                </div>

                                <div className="flex justify-between">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={deplace}
                                            onChange={() => setDeplace(!deplace)}
                                            className="w-5 h-5 rounded border-gray-300"
                                        />
                                        <span>Je me déplace</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={recoit}
                                            onChange={() => setRecoit(!recoit)}
                                            className="w-5 h-5 rounded border-gray-300"
                                        />
                                        <span>Je reçois</span>
                                    </label>
                                </div>

                                <textarea
                                    placeholder="Description (optionnel)"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-4 rounded-2xl border border-gray-300 bg-gray-50"
                                    rows={3}
                                />
                            </>
                        )}

                        <div className="flex justify-between mt-6">
                            <button
                                type="button"
                                onClick={prevStep}
                                className="py-3 px-6 rounded-2xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition"
                            >
                                Retour
                            </button>
                            <button
                                type="button"
                                onClick={nextStep}
                                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition"
                            >
                                Suivant
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-center mb-4">Photos de profil</h2>

                        <div className="text-center mb-4">
                            <p className="text-gray-600 mb-2">
                                {type === 'proposer' ?
                                    "Ajoutez au moins 2 photos (max 6)" :
                                    "Ajoutez au moins 1 photo (max 6)"}
                            </p>
                            <p className="text-sm text-gray-500">
                                Utilisez le flou ou les émojis pour masquer certaines zones sensibles ex. visage
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {previewPhotos.map((preview, index) => (
                                <div key={index} className="relative aspect-square rounded-xl overflow-hidden">
                                    <img
                                        src={preview}
                                        alt={`Preview ${index}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        onClick={() => {
                                            const newPhotos = [...photos];
                                            const newPreviews = [...previewPhotos];
                                            newPhotos.splice(index, 1);
                                            newPreviews.splice(index, 1);
                                            setPhotos(newPhotos);
                                            setPreviewPhotos(newPreviews);
                                        }}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                                    >
                                        ×
                                    </button>

                                    <button
                                        onClick={() => setEditingPhoto({ index, src: preview })}
                                        className="absolute bottom-1 right-1 bg-white text-gray-700 rounded-full px-2 py-1 text-xs shadow hover:bg-gray-100"
                                    >
                                        Modifier
                                    </button>
                                </div>

                            ))}

                            {previewPhotos.length < 6 && (
                                <label className="aspect-square flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 cursor-pointer">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <div className="text-gray-400 text-4xl">+</div>
                                </label>
                            )}
                        </div>

                        <div className="flex justify-between mt-6">
                            <button
                                type="button"
                                onClick={prevStep}
                                className="py-3 px-6 rounded-2xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition"
                            >
                                Retour
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={uploading || (type === 'proposer' ? photos.length < 2 : photos.length < 1)}
                                className={`py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition ${(type === 'proposer' ? photos.length < 2 : photos.length < 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {uploading ? "Enregistrement..." : "Terminer"}
                            </button>
                        </div>
                    </div>
                )}


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

                {uploading && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg max-w-sm w-full text-center">
                            <h3 className="font-medium mb-2">Envoi en cours...</h3>
                            <progress
                                value={uploadProgress}
                                max="100"
                                className="w-full h-2 rounded"
                            />
                            <p className="mt-2 text-sm">{uploadProgress}%</p>
                        </div>
                    </div>
                )}




                <p className="mt-6 text-sm text-center text-gray-600">
                    Après validation, contactez le support via WhatsApp pour vérification.
                </p>
            </div>
        </div>
    );
}