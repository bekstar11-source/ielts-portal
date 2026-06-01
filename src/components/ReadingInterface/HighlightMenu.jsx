import React, { useState, useEffect } from "react";
import { BookPlus, Check, ArrowRightLeft, Loader2, StickyNote, Eraser } from "lucide-react";

export default function HighlightMenu({ position, onHighlight, onClear, onClearAllHighlights, onAddDictionary, isReviewMode, onAddToWordBank, onAddNote, source }) {
    const [isAdded, setIsAdded] = useState(false);
    const [isWBAdded, setIsWBAdded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset state when position changes (new selection)
    useEffect(() => {
        setIsAdded(false);
        setIsWBAdded(false);
        setIsProcessing(false);
    }, [position]);

    if (!position) return null;

    const handleAddNote = (e) => {
        e.preventDefault();
        if (onAddNote) onAddNote();
    };

    const handleClearAll = (e) => {
        e.preventDefault();
        if (onClearAllHighlights) onClearAllHighlights();
    };

    const handleAddDict = async (e) => {
        e.preventDefault();
        if (isProcessing || isAdded) return;
        
        setIsProcessing(true);
        const success = await onAddDictionary();
        if (success) {
            setIsAdded(true);
            setTimeout(() => {
                onClear();
                setIsAdded(false);
                setIsProcessing(false);
            }, 1000);
        } else {
            setIsProcessing(false);
        }
    };

    const handleAddToWB = (e) => {
        e.preventDefault();
        if (isProcessing || isWBAdded) return;

        if (onAddToWordBank) {
            const selection = window.getSelection();
            const word = selection ? selection.toString().trim() : "";

            let contextSentence = "";
            try {
                if (selection.anchorNode && selection.anchorNode.parentNode) {
                    let node = selection.anchorNode.parentNode;
                    while (node && node.nodeName !== 'P' && node.nodeName !== 'DIV' && node.nodeName !== 'TD' && node.nodeName !== 'LI') {
                        if (node.nodeName === 'BODY') break;
                        node = node.parentNode;
                    }
                    contextSentence = (node || selection.anchorNode.parentNode).textContent.trim();
                    if (contextSentence.length > 250) {
                        contextSentence = contextSentence.substring(0, 250) + "...";
                    }
                }
            } catch (err) { }

            if (word) {
                onAddToWordBank(word, source || "passage", contextSentence);
                setIsWBAdded(true);
                setIsProcessing(true);
                setTimeout(() => {
                    onClear();
                    setIsWBAdded(false);
                    setIsProcessing(false);
                }, 800);
            }
        }
    };

    const triggerHaptic = () => {
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(30);
    };

    return (
        <div
            className="absolute z-[1000] flex items-center gap-1 bg-gray-900/90 backdrop-blur-md text-white px-1.5 py-1 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] -translate-x-1/2 touch-none transition-all duration-75 ease-out"
            style={{
                top: position.top,
                left: position.left
            }}
            onPointerDown={(e) => e.preventDefault()} // Selection o'chmasligi uchun muhim
        >
            <div className="flex items-center gap-0">
                <button
                    className="flex items-center justify-center w-7 h-7 hover:bg-white/10 rounded-lg transition-all active:scale-95 group"
                    onPointerDown={(e) => { e.preventDefault(); triggerHaptic(); onHighlight('yellow'); }}
                    title="Highlight"
                >
                    <div className="w-3.5 h-3.5 rounded-full bg-yellow-300 border border-yellow-400 group-hover:scale-110 shadow-sm transition-transform"></div>
                </button>
            </div>

            <div className="w-[1px] h-4 bg-white/20 mx-0"></div>

            <button
                className="flex items-center justify-center w-7 h-7 hover:bg-white/10 rounded-lg transition-all active:scale-95 group text-yellow-400"
                onPointerDown={(e) => { e.preventDefault(); triggerHaptic(); handleAddNote(e); }}
                title="Note qo'shish"
            >
                <StickyNote size={16} className="group-hover:scale-110 transition-transform" />
            </button>

            <div className="w-[1px] h-4 bg-white/20 mx-0"></div>

            <button
                className={`flex items-center justify-center w-7 h-7 hover:bg-white/10 rounded-lg transition-all active:scale-95 group ${isAdded ? 'text-green-400' : 'text-blue-400'}`}
                onPointerDown={(e) => { e.preventDefault(); triggerHaptic(); handleAddDict(e); }}
                title="Lug'atga qo'shish"
                disabled={isAdded || isProcessing}
            >
                {isAdded ? (
                    <Check size={16} />
                ) : isProcessing && !isWBAdded ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <BookPlus size={16} className="group-hover:scale-110 transition-transform" />
                )}
            </button>

            {/* WordBank tugmasi — faqat Review rejimida */}
            {isReviewMode && onAddToWordBank && (
                <>
                    <div className="w-[1px] h-4 bg-white/20 mx-0"></div>
                    <button
                        className={`flex items-center justify-center w-7 h-7 hover:bg-white/10 rounded-lg transition-all active:scale-95 group ${isWBAdded ? 'text-green-400' : 'text-emerald-400'}`}
                        onPointerDown={(e) => { e.preventDefault(); triggerHaptic(); handleAddToWB(e); }}
                        title="Paraphrase Map'ga qo'shish"
                        disabled={isWBAdded || isProcessing}
                    >
                        {isWBAdded ? (
                            <Check size={16} />
                        ) : isProcessing && isWBAdded ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <ArrowRightLeft size={16} className="group-hover:scale-110 transition-transform" />
                        )}
                    </button>
                </>
            )}

            <div className="w-[1px] h-4 bg-white/20 mx-0"></div>

            <button
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-0"
                onPointerDown={(e) => { e.preventDefault(); triggerHaptic(); onClear(); }}
                title="Menyuni yopish"
            >
                <span className="text-lg leading-none">&times;</span>
            </button>
        </div>
    );
}