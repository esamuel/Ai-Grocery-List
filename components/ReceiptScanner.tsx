
import React, { useState, useRef } from 'react';
import { analyzeReceiptImage, type ReceiptAnalysisResult, type ReceiptItem } from '../services/geminiService';
import { CameraIcon } from './icons/CameraIcon';

interface ReceiptScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (result: ReceiptAnalysisResult) => void;
    language: 'en' | 'he' | 'es';
    currency: string;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
    isOpen,
    onClose,
    onConfirm,
    language,
    currency
}) => {
    const [image, setImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<ReceiptAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setResult(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setIsAnalyzing(true);
        setError(null);
        try {
            const analysis = await analyzeReceiptImage(image, language);
            setResult(analysis);
        } catch (err: any) {
            console.error(err);
            setError(err.message || (language === 'he' ? 'שגיאה בניתוח הקבלה. נסה שוב.' : language === 'es' ? 'Error al analizar el recibo. Inténtalo de nuevo.' : 'Error analyzing receipt. Try again.'));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleEditItem = (index: number, field: keyof ReceiptItem, value: any) => {
        if (!result) return;
        const newItems = [...result.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setResult({ ...result, items: newItems });
    };

    const handleRemoveItem = (index: number) => {
        if (!result) return;
        const newItems = result.items.filter((_, i) => i !== index);
        setResult({ ...result, items: newItems });
    };

    const handleConfirm = () => {
        if (result) {
            onConfirm(result);
            handleReset();
            onClose();
        }
    };

    const handleReset = () => {
        setImage(null);
        setResult(null);
        setError(null);
        setIsAnalyzing(false);
    };

    const getCurrencySymbol = (curr: string) => {
        switch (curr) {
            case 'USD': return '$';
            case 'ILS': return '₪';
            case 'EUR': return '€';
            default: return curr;
        }
    };

    const symbol = getCurrencySymbol(currency);

    const t = {
        en: {
            title: "Scan Receipt",
            subtitle: "Convert your receipt into readable data",
            upload: "Upload or Take Photo",
            analyze: "Analyze Receipt",
            analyzing: "Analyzing with AI...",
            confirm: "Add to Purchases",
            cancel: "Cancel",
            store: "Store",
            date: "Date",
            total: "Total",
            items: "Items Found",
            name: "Name",
            price: "Price",
            qty: "Qty",
            category: "Category",
            retake: "Retake Photo"
        },
        he: {
            title: "סריקת קבלה",
            subtitle: "הפוך את הקבלה לנתונים קריאים",
            upload: "העלה או צלם תמונה",
            analyze: "נתח קבלה",
            analyzing: "מנתח עם בינה מלאכותית...",
            confirm: "הוסף לרכישות",
            cancel: "ביטול",
            store: "חנות",
            date: "תאריך",
            total: "סה״כ",
            items: "פריטים שנמצאו",
            name: "שם",
            price: "מחיר",
            qty: "כמות",
            category: "קטגוריה",
            retake: "צלם שוב"
        },
        es: {
            title: "Escanear Recibo",
            subtitle: "Convierte tu recibo en datos legibles",
            upload: "Subir o Tomar Foto",
            analyze: "Analizar Recibo",
            analyzing: "Analizando con IA...",
            confirm: "Añadir a Compras",
            cancel: "Cancelar",
            store: "Tienda",
            date: "Fecha",
            total: "Total",
            items: "Artículos Encontrados",
            name: "Nombre",
            price: "Precio",
            qty: "Cant",
            category: "Categoría",
            retake: "Volver a capturar"
        }
    }[language];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{t.title}</h2>
                        <p className="text-gray-500 text-sm">{t.subtitle}</p>
                    </div>
                    <button
                        onClick={() => { handleReset(); onClose(); }}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {!image ? (
                        /* Upload State */
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-3 border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                        >
                            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <CameraIcon className="w-10 h-10" />
                            </div>
                            <p className="text-lg font-semibold text-gray-700">{t.upload}</p>
                            <p className="text-sm text-gray-400 mt-2">JPEG or PNG</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                            />
                        </div>
                    ) : !result ? (
                        /* Preview State */
                        <div className="space-y-4">
                            <div className="relative rounded-2xl overflow-hidden shadow-md max-h-[400px]">
                                <img src={image} alt="Receipt" className="w-full h-full object-contain bg-gray-100" />
                                <button
                                    onClick={handleReset}
                                    className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur-md hover:bg-black/70 transition-colors"
                                >
                                    {t.retake}
                                </button>
                            </div>
                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-3 ${isAnalyzing ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] active:scale-[0.98]'
                                    }`}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        {t.analyzing}
                                    </>
                                ) : (
                                    <>✨ {t.analyze}</>
                                )}
                            </button>
                            {error && <p className="text-red-500 text-center font-medium">{error}</p>}
                        </div>
                    ) : (
                        /* Result State */
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.store}</label>
                                    <input
                                        type="text"
                                        value={result.storeName}
                                        onChange={(e) => setResult({ ...result, storeName: e.target.value })}
                                        className="w-full bg-transparent font-semibold text-gray-800 border-none p-0 focus:ring-0"
                                    />
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.date}</label>
                                    <input
                                        type="date"
                                        value={result.purchaseDate}
                                        onChange={(e) => setResult({ ...result, purchaseDate: e.target.value })}
                                        className="w-full bg-transparent font-semibold text-gray-800 border-none p-0 focus:ring-0"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <span>🛒</span> {t.items} ({result.items.length})
                                </h3>
                                <div className="space-y-2">
                                    {result.items.map((item, idx) => (
                                        <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex gap-4">
                                                <div className="flex-1 flex flex-col gap-2">
                                                    <input
                                                        type="text"
                                                        value={item.name}
                                                        onChange={(e) => handleEditItem(idx, 'name', e.target.value)}
                                                        className="font-bold text-gray-800 border-none p-0 focus:ring-0 w-full"
                                                        placeholder={t.name}
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-medium">
                                                            {item.category}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg text-green-700 font-bold">
                                                        <span>{symbol}</span>
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => handleEditItem(idx, 'price', parseFloat(e.target.value))}
                                                            className="w-16 bg-transparent border-none p-0 focus:ring-0 text-right"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveItem(idx)}
                                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl text-white flex justify-between items-center shadow-xl">
                                <div>
                                    <p className="text-gray-400 text-sm font-medium uppercase tracking-widest mb-1">{t.total}</p>
                                    <p className="text-3xl font-black">{symbol}{result.totalAmount.toFixed(2)}</p>
                                </div>
                                <button
                                    onClick={handleConfirm}
                                    className="bg-green-500 hover:bg-green-400 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg hover:shadow-green-500/30 active:scale-95"
                                >
                                    {t.confirm}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Internal icon if not imported
const TrashIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);
