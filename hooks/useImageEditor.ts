import { useState, useRef, useEffect, useCallback } from 'react';

export type CanvasElement = {
    id: string;
    type: 'pixelate' | 'emoji';
    x: number;
    y: number;
    width: number;
    height: number;
    pixelSize?: number;
    emoji?: string;
};

export type EditingPhoto = {
    index: number;
    src: string;
} | null;

export default function useImageEditor() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [editingPhoto, setEditingPhoto] = useState<EditingPhoto>(null);
    const [elements, setElements] = useState<CanvasElement[]>([]);
    const elementsRef = useRef(elements);
    const [activeTool, setActiveTool] = useState<'pixelate' | 'emoji' | null>(null);
    const [pixelSize, setPixelSize] = useState(15);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const emojis = ['😊', '❤️', '🌸', '🌟', '🔞', '💋', '🍑', '💦', '👄', '👅'];

    // Mettre à jour la ref des éléments
    useEffect(() => {
        elementsRef.current = elements;
    }, [elements]);

    // draw image and elements
    const drawCanvas = useCallback(() => {
        if (!editingPhoto || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // load image
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            // draw elements
            elementsRef.current.forEach(el => {
                if (el.type === 'pixelate') applyPixelation(ctx, el);
                else if (el.emoji) drawEmoji(ctx, el);
            });
        };
        img.src = editingPhoto.src;
    }, [editingPhoto]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas, selectedElementId]);

    // interaction handlers
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onMouseDown = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            // find topmost element under pointer
            const hit = [...elementsRef.current].reverse().find(el =>
                x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
            );
            if (hit) {
                setSelectedElementId(hit.id);
                setIsDragging(true);
                setDragOffset({ x: x - hit.x, y: y - hit.y });
            } else if (activeTool) {
                // Ajouter un nouvel élément si un outil est sélectionné
                const size = Math.min(canvas.width, canvas.height) * (activeTool === 'pixelate' ? 0.3 : 0.2);
                const el: CanvasElement = {
                    id: Date.now().toString(),
                    type: activeTool,
                    x: x - size / 2,
                    y: y - size / 2,
                    width: size,
                    height: size,
                    ...(activeTool === 'pixelate' ? { pixelSize } : { emoji: emojis[0] })
                };
                setElements(prev => [...prev, el]);
                setSelectedElementId(el.id);
                setActiveTool(null);
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging || !selectedElementId) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left - dragOffset.x;
            const y = e.clientY - rect.top - dragOffset.y;
            setElements(prev => prev.map(el =>
                el.id === selectedElementId ? { ...el, x, y } : el
            ));
        };

        const onMouseUp = () => {
            if (isDragging) setIsDragging(false);
        };

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, selectedElementId, dragOffset, activeTool, pixelSize, emojis]);

    const applyPixelation = (ctx: CanvasRenderingContext2D, el: CanvasElement) => {
        const size = el.pixelSize || pixelSize;
        const temp = document.createElement('canvas');
        temp.width = size;
        temp.height = size;
        const tctx = temp.getContext('2d');
        if (!tctx) return;
        tctx.drawImage(
            canvasRef.current!, el.x, el.y, el.width, el.height,
            0, 0, size, size
        );
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            temp, 0, 0, size, size,
            el.x, el.y, el.width, el.height
        );
    };

    const drawEmoji = (ctx: CanvasRenderingContext2D, el: CanvasElement) => {
        const fontSize = Math.min(el.width, el.height) * 0.8;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.emoji!, el.x + el.width / 2, el.y + el.height / 2);
    };

    const addElement = (type: 'pixelate' | 'emoji', emoji?: string) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const size = Math.min(canvas.width, canvas.height) * (type === 'pixelate' ? 0.3 : 0.2);
        const el: CanvasElement = {
            id: Date.now().toString(), type,
            x: (canvas.width - size) / 2, y: (canvas.height - size) / 2,
            width: size, height: size,
            ...(type === 'pixelate' ? { pixelSize } : { emoji })
        };
        setElements(prev => [...prev, el]);
        setSelectedElementId(el.id);
        setActiveTool(null);
        drawCanvas();
    };

    const removeElement = () => {
        if (!selectedElementId) return;
        setElements(prev => prev.filter(el => el.id !== selectedElementId));
        setSelectedElementId(null);
        drawCanvas();
    };

    // Dans ton hook useImageEditor
    const saveEdits = async (): Promise<string | null> => {
        if (!canvasRef.current || !editingPhoto) return null;

        // On crée un canvas « offscreen »
        const off = document.createElement('canvas');
        off.width = canvasRef.current.width;
        off.height = canvasRef.current.height;
        const ctxOff = off.getContext('2d');
        if (!ctxOff) return null;

        // Crée et charge l'image
        const img = new Image();
        img.src = editingPhoto.src;

        // On attend que l'image soit chargée
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Erreur de chargement de l'image"));
        });

        // Dessin de base
        ctxOff.drawImage(img, 0, 0, off.width, off.height);

        // Applique tes éléments un par un
        elementsRef.current.forEach(el => {
            if (el.type === 'pixelate') {
                const size = el.pixelSize ?? pixelSize;
                // on réutilise ta logique pixelate dans off-screen
                const tmp = document.createElement('canvas');
                tmp.width = size; tmp.height = size;
                const tctx = tmp.getContext('2d');
                if (!tctx) return;
                tctx.drawImage(off, el.x, el.y, el.width, el.height, 0, 0, size, size);
                ctxOff.imageSmoothingEnabled = false;
                ctxOff.drawImage(tmp, 0, 0, size, size, el.x, el.y, el.width, el.height);
            } else if (el.emoji) {
                const fontSize = Math.min(el.width, el.height) * 0.8;
                ctxOff.font = `bold ${fontSize}px Arial`;
                ctxOff.textAlign = 'center';
                ctxOff.textBaseline = 'middle';
                ctxOff.fillText(el.emoji, el.x + el.width / 2, el.y + el.height / 2);
            }
        });

        // Enfin on génère le dataURL
        return off.toDataURL('image/jpeg');
    };


    return {
        canvasRef, editingPhoto, setEditingPhoto,
        elements, activeTool, setActiveTool, pixelSize, setPixelSize,
        selectedElementId, emojis, addElement, removeElement,
        saveEdits, drawCanvas
    };
}