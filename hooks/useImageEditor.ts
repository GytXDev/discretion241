// hooks/useImageEditor.ts
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
    const elementsRef = useRef<CanvasElement[]>([]);
    const [activeTool, setActiveTool] = useState<'pixelate' | 'emoji' | null>(null);
    const [pixelSize, setPixelSize] = useState(15);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [resizeHandleIndex, setResizeHandleIndex] = useState<number | null>(null);

    const emojis = ['😊', '❤️', '🌸', '🌟', '🔞', '💋', '🍑', '💦', '👄', '👅'];

    useEffect(() => {
        elementsRef.current = elements;
    }, [elements]);

    const drawCanvas = useCallback(() => {
        if (!editingPhoto || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            // Redimensionnement proportionnel avec un maximum raisonnable
            const maxWidth = 800;
            const maxHeight = 600;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = width * ratio;
                height = height * ratio;
            }

            canvas.width = width;
            canvas.height = height;

            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Dessiner les éléments flou ou emoji
            elementsRef.current.forEach(el => {
                if (el.type === 'pixelate') applyPixelation(ctx, el);
                else if (el.emoji) drawEmoji(ctx, el);

                // Encadrer l’élément sélectionné
                if (el.id === selectedElementId) {
                    ctx.strokeStyle = 'rgba(0, 123, 255, 0.9)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(el.x, el.y, el.width, el.height);

                    const handleRadius = 5;
                    const positions = [
                        [el.x, el.y],
                        [el.x + el.width / 2, el.y],
                        [el.x + el.width, el.y],
                        [el.x + el.width, el.y + el.height / 2],
                        [el.x + el.width, el.y + el.height],
                        [el.x + el.width / 2, el.y + el.height],
                        [el.x, el.y + el.height],
                        [el.x, el.y + el.height / 2],
                    ];

                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = 'black';
                    positions.forEach(([cx, cy]) => {
                        ctx.beginPath();
                        ctx.arc(cx, cy, handleRadius, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    });
                }
            });
        };
        img.src = editingPhoto.src;
    }, [editingPhoto, selectedElementId]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas, selectedElementId]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const getPointerPos = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        const onPointerDown = (e: PointerEvent) => {
            const { x, y } = getPointerPos(e);
            const hit = [...elementsRef.current].reverse().find(el =>
                x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
            );
            if (hit) {
                setSelectedElementId(hit.id);
                drawCanvas();
                canvas.style.cursor = 'grabbing';

                const handleRadius = 6;
                const positions = [
                    [hit.x, hit.y],
                    [hit.x + hit.width / 2, hit.y],
                    [hit.x + hit.width, hit.y],
                    [hit.x + hit.width, hit.y + hit.height / 2],
                    [hit.x + hit.width, hit.y + hit.height],
                    [hit.x + hit.width / 2, hit.y + hit.height],
                    [hit.x, hit.y + hit.height],
                    [hit.x, hit.y + hit.height / 2],
                ];
                const clickedHandle = positions.findIndex(([cx, cy]) =>
                    Math.hypot(cx - x, cy - y) <= handleRadius
                );
                if (clickedHandle !== -1) {
                    setResizeHandleIndex(clickedHandle);
                    setIsDragging(true);
                    return;
                }

                setIsDragging(true);
                setDragOffset({ x: x - hit.x, y: y - hit.y });
            } else if (activeTool) {
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
                const newElements = [...elementsRef.current, el];
                elementsRef.current = newElements;
                setElements(newElements);
                setSelectedElementId(el.id);
                setActiveTool(null);
                drawCanvas();
            }
        };

        const onPointerMove = (e: PointerEvent) => {
            const { x, y } = getPointerPos(e);
            const hoveredHandle = (() => {
                if (!selectedElementId) return null;
                const el = elementsRef.current.find(el => el.id === selectedElementId);
                if (!el) return null;
                const positions = [
                    [el.x, el.y],
                    [el.x + el.width / 2, el.y],
                    [el.x + el.width, el.y],
                    [el.x + el.width, el.y + el.height / 2],
                    [el.x + el.width, el.y + el.height],
                    [el.x + el.width / 2, el.y + el.height],
                    [el.x, el.y + el.height],
                    [el.x, el.y + el.height / 2],
                ];
                return positions.findIndex(([cx, cy]) => Math.hypot(cx - x, cy - y) <= 6);
            })();

            if (hoveredHandle !== -1 && hoveredHandle !== null) {
                canvas.style.cursor = 'nwse-resize';
            } else if (selectedElementId) {
                canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
            } else {
                canvas.style.cursor = 'default';
            }

            if (!selectedElementId) return;

            if (resizeHandleIndex !== null) {
                setElements(prev => {
                    const updated = [...prev];
                    const el = updated.find(e => e.id === selectedElementId);
                    if (!el) return prev;

                    const minSize = 20;

                    const original = { ...el };

                    switch (resizeHandleIndex) {
                        case 0: // top-left
                            el.width += el.x - x;
                            el.height += el.y - y;
                            el.x = x;
                            el.y = y;
                            break;
                        case 2: // top-right
                            el.width = x - el.x;
                            el.height += el.y - y;
                            el.y = y;
                            break;
                        case 4: // bottom-right
                            el.width = x - el.x;
                            el.height = y - el.y;
                            break;
                        case 6: // bottom-left
                            el.width += el.x - x;
                            el.height = y - el.y;
                            el.x = x;
                            break;
                        default:
                            break;
                    }

                    el.width = Math.max(minSize, el.width);
                    el.height = Math.max(minSize, el.height);

                    requestAnimationFrame(drawCanvas);
                    return updated;
                });
                return;
            }

            if (!isDragging) return;
            const newX = x - dragOffset.x;
            const newY = y - dragOffset.y;

            setElements(prev => {
                const updated = prev.map(el =>
                    el.id === selectedElementId ? { ...el, x: newX, y: newY } : el
                );
                requestAnimationFrame(drawCanvas);
                return updated;
            });
        };

        const onPointerUp = () => {
            setIsDragging(false);
            setResizeHandleIndex(null);
            canvas.style.cursor = selectedElementId ? 'grab' : 'default';
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        return () => {
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [isDragging, selectedElementId, dragOffset, activeTool, pixelSize, emojis, resizeHandleIndex, drawCanvas]);

    const applyPixelation = (ctx: CanvasRenderingContext2D, el: CanvasElement) => {
        const size = el.pixelSize || pixelSize;
        const temp = document.createElement('canvas');
        temp.width = size;
        temp.height = size;
        const tctx = temp.getContext('2d');
        if (!tctx) return;
        tctx.drawImage(canvasRef.current!, el.x, el.y, el.width, el.height, 0, 0, size, size);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(temp, 0, 0, size, size, el.x, el.y, el.width, el.height);
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
        const newElements = [...elementsRef.current, el];
        elementsRef.current = newElements;
        setElements(newElements);
        setSelectedElementId(el.id);
        setActiveTool(null);
        drawCanvas();
    };

    const removeElement = () => {
        if (!selectedElementId) return;
        const filtered = elementsRef.current.filter(el => el.id !== selectedElementId);
        elementsRef.current = filtered;
        setElements(filtered);
        setSelectedElementId(null);
        drawCanvas();
    };

    const saveEdits = async (): Promise<string | null> => {
        if (!canvasRef.current || !editingPhoto) return null;
        const off = document.createElement('canvas');
        off.width = canvasRef.current.width;
        off.height = canvasRef.current.height;
        const ctxOff = off.getContext('2d');
        if (!ctxOff) return null;
        const img = new Image();
        img.src = editingPhoto.src;
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Erreur de chargement de l'image"));
        });
        ctxOff.drawImage(img, 0, 0, off.width, off.height);
        elementsRef.current.forEach(el => {
            if (el.type === 'pixelate') {
                const size = el.pixelSize ?? pixelSize;
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
        return off.toDataURL('image/jpeg');
    };

    return {
        canvasRef, editingPhoto, setEditingPhoto,
        elements, setElements, activeTool, setActiveTool, pixelSize, setPixelSize,
        selectedElementId, emojis, addElement, removeElement,
        saveEdits, drawCanvas
    };
}