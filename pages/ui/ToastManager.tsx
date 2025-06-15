// components/ui/ToastManager.tsx
"use client";
import * as Toast from "@radix-ui/react-toast";
import { useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";

let globalAddToast: (msg: string, type?: "success" | "error") => void = () => { };

export function addToast(msg: string, type: "success" | "error" = "success") {
    globalAddToast(msg, type);
}

export default function ToastManager() {
    const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);

    const removeToast = (id: number) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    const handleAddToast = useCallback(
        (message: string, type: "success" | "error" = "success") => {
            const id = Date.now();
            setToasts((prev) => [...prev, { id, message, type }]);
            setTimeout(() => removeToast(id), 5000);
        },
        []
    );


    useEffect(() => {
        globalAddToast = handleAddToast;
    }, [handleAddToast]);

    return (
        <Toast.Provider swipeDirection="right">
            <div className="fixed top-[30%] right-4 z-50 space-y-3 transform -translate-y-1/2">
                {toasts.map((toast) => (
                    <Toast.Root
                        key={toast.id}
                        duration={5000}
                        open={true}
                        onOpenChange={(open) => !open && removeToast(toast.id)}
                        className={`rounded-lg shadow-lg px-4 py-3 text-sm text-white flex items-center justify-between w-80 transition-all
              ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
                    >
                        <Toast.Description className="flex-1 pr-3">{toast.message}</Toast.Description>
                        <Toast.Action altText="Fermer" asChild>
                            <button onClick={() => removeToast(toast.id)} className="hover:text-gray-200">
                                <X className="w-4 h-4" />
                            </button>
                        </Toast.Action>
                    </Toast.Root>
                ))}
            </div>
            <Toast.Viewport className="" />
        </Toast.Provider>
    );
}