import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import ReadingInterface from '../../components/ReadingInterface/ReadingInterface';
import ListeningInterface from '../../components/ListeningInterface/ListeningInterface';
import ResultsCalculatingScreen from '../../components/TestSolving/ResultsCalculatingScreen';
import { useTrialLogic } from '../../hooks/useTrialLogic';

const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function TrialSolving() {
  const navigate = useNavigate();
  const {
    stage, stageIndex, isLastStage, totalStages,
    test, loading, error, saving,
    userAnswers, handleSelectAnswer,
    flaggedQuestions, toggleFlag,
    timeLeft, textSize,
    isFullScreen, handleToggleFullScreen,
    activePart, setActivePart, audioTime,
    finishStage,
  } = useTrialLogic();

  if (loading) {
    return (
      <div className="flex flex-col h-[100dvh] items-center justify-center bg-[#F7F4EE] text-center px-6">
        <Loader2 size={36} className="animate-spin text-[#4A5FE8] mb-5" />
        <h3 className="text-[18px] font-bold text-[#1E1B16] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Test yuklanmoqda
        </h3>
        <p className="text-[14px] text-[#6b6559]">Biroz kuting...</p>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="flex flex-col h-[100dvh] items-center justify-center bg-[#F7F4EE] text-center px-6">
        <AlertCircle size={36} className="text-red-500 mb-4" />
        <h3 className="text-[18px] font-bold text-[#1E1B16] mb-2">Testni ochib bo'lmadi</h3>
        <p className="text-[14px] text-[#6b6559] max-w-sm mb-6">{error || 'Test topilmadi.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-full bg-[#1E1B16] text-white font-bold text-[14px]"
        >
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }

  const isReading = test.type === 'reading';
  const isListening = test.type === 'listening';
  // Oxirgi daqiqada taymer qizaradi — imtihon bosimini his qildirish uchun.
  const isUrgent = timeLeft !== null && timeLeft <= 60;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F7F4EE] select-none" style={{ fontFamily: "'Public Sans', sans-serif" }}>
      {saving && <ResultsCalculatingScreen accent="#4A5FE8" />}

      <header className="h-[64px] bg-white border-b border-[#e5ddd0] flex items-center justify-between px-4 md:px-6 shrink-0 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8a8577] shrink-0">
            Bepul test · {stageIndex + 1}/{totalStages}
          </span>
          <h1 className="text-[15px] font-bold text-[#1E1B16] truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {stage === 'reading' ? 'Reading' : 'Listening'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[14px] tabular-nums ${
            isUrgent ? 'bg-red-50 text-red-600' : 'bg-[#F7F4EE] text-[#1E1B16]'
          }`}>
            <Clock size={15} />
            {formatTime(timeLeft)}
          </div>

          <button
            onClick={finishStage}
            disabled={saving}
            className="flex items-center gap-2 px-4 md:px-5 py-2 bg-[#1E1B16] hover:bg-black text-white rounded-full font-bold text-[13px] transition-colors disabled:opacity-50"
          >
            {saving
              ? <Loader2 size={16} className="animate-spin" />
              : <><CheckCircle size={16} /> {isLastStage ? 'Yakunlash' : 'Keyingisi'}</>}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {isReading ? (
          <div className="w-full h-full">
            <ReadingInterface
              testData={test}
              userAnswers={userAnswers}
              onAnswerChange={handleSelectAnswer}
              onFlag={toggleFlag}
              flaggedQuestions={flaggedQuestions}
              isReviewMode={false}
              textSize={textSize}
            />
          </div>
        ) : isListening ? (
          <div className="w-full h-full">
            <ListeningInterface
              testData={test}
              userAnswers={userAnswers}
              onAnswerChange={handleSelectAnswer}
              onFlag={toggleFlag}
              flaggedQuestions={flaggedQuestions}
              isReviewMode={false}
              textSize={textSize}
              testMode="exam"
              onToggleFullScreen={handleToggleFullScreen}
              isFullScreen={isFullScreen}
              activePart={activePart}
              setActivePart={setActivePart}
              audioCurrentTime={audioTime}
            />
          </div>
        ) : (
          <div className="p-10 text-center text-[#6b6559] w-full flex items-center justify-center">
            Bu bosqich uchun test turi noto'g'ri sozlangan.
          </div>
        )}
      </div>
    </div>
  );
}
