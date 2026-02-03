import React from "react";

export default function ResumeModal({ onResume, onRestart }) {
    return (
        <div className="absolute top-0 left-0 w-full h-full bg-white/95 z-[9999] flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-10 rounded-2xl shadow-2xl border border-gray-200 text-center max-w-md animate-in fade-in zoom-in duration-300">
                <h1 className="text-2xl font-bold mb-2 text-gray-800">Testni davom ettirasizmi?</h1>
                <p className="text-gray-500 mb-6">Sizda yakunlanmagan test mavjud.</p>
                <div className="flex flex-col gap-3 w-full">
                    <button onClick={onResume} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors w-full">Continue Test</button>
                    <button onClick={onRestart} className="bg-white text-red-500 border border-red-200 px-6 py-3 rounded-lg font-bold hover:bg-red-50 transition-colors w-full">Restart Test</button>
                </div>
            </div>
        </div>
    );
}