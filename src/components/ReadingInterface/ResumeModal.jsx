import React from "react";

const ResumeModal = ({ show, onRestart, onResume }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[3000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
        <h3 className="text-lg font-bold text-gray-900">Resume Test?</h3>
        <p className="text-sm text-gray-500 mt-2">
          We found a previous unfinished session. Would you like to continue?
        </p>
        <div className="flex gap-3 mt-6">
          <button onClick={onRestart} className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">Restart</button>
          <button onClick={onResume} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Continue</button>
        </div>
      </div>
    </div>
  );
};

export default ResumeModal;