import React from 'react';

const MockExamSectionIntro = ({ title, duration, format, questions, onStart, color = "orange" }) => {
    return (
        <div className={`min-h-screen bg-gradient-to-br from-white via-${color}-50/50 to-white flex items-center justify-center p-4`}>
            <div className={`bg-white/90 backdrop-blur-md max-w-lg w-full p-8 rounded-[32px] text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-${color}-100/60`}>
                <h1 className="text-3xl font-black mb-4 text-gray-900 tracking-tight">{title}</h1>
                <div className={`text-left bg-${color}-50/50 p-6 rounded-2xl mb-8 space-y-3 text-sm text-gray-700 border border-${color}-100 shadow-sm shadow-${color}-100/20`}>
                    <p><b className="text-gray-900">Duration:</b> {duration}</p>
                    <p><b className="text-gray-900">Format:</b> {format}</p>
                    {questions && <p><b className="text-gray-900">Questions:</b> {questions}</p>}
                </div>
                <button onClick={onStart} className={`w-full bg-gradient-to-r from-${color}-400 to-${color}-500 text-white py-4 rounded-2xl font-black text-lg hover:from-${color}-500 hover:to-${color}-600 transition-all shadow-lg shadow-${color}-500/25 active:scale-[0.98]`}>
                    Start {title} Test
                </button>
            </div>
        </div>
    );
};

export default MockExamSectionIntro;
