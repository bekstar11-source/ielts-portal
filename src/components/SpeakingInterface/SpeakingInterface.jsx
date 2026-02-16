import React, { useState, useRef, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase/firebase";

export default function SpeakingInterface({
    testData,
    userAnswers: parentAnswers,
    onAnswerChange: setParentAnswer,
    isReviewMode,
    textSize
}) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState(parentAnswers?.audioAnswer || "");
    const [recordingTime, setRecordingTime] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    useEffect(() => {
        // Load existing audio if available
        if (parentAnswers?.audioAnswer) {
            setAudioURL(parentAnswers.audioAnswer);
        }
    }, [parentAnswers]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullScreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullScreen(false);
            }
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioURL(url);

                // Upload to Firebase
                setUploading(true);
                try {
                    const storageRef = ref(storage, `speaking/${Date.now()}_speaking.webm`);
                    await uploadBytes(storageRef, audioBlob);
                    const downloadURL = await getDownloadURL(storageRef);

                    setAudioURL(downloadURL);
                    if (setParentAnswer) {
                        setParentAnswer('audioAnswer', downloadURL);
                    }
                } catch (error) {
                    console.error("Upload error:", error);
                    alert("Audio upload failed: " + error.message);
                } finally {
                    setUploading(false);
                }

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Microphone access error:", error);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!testData) {
        return <div className="p-10 text-center text-gray-500">Speaking test data not found</div>;
    }

    const taskPrompt = testData.passage || testData.script || "No task description available.";

    return (
        <div className={`flex flex-col h-screen w-screen bg-gradient-to-br from-purple-50 to-blue-50 overflow-hidden ${textSize || 'text-base'}`}>

            {/* Full Screen Toggle */}
            <button
                onClick={toggleFullScreen}
                className="absolute top-4 right-5 z-50 bg-white border border-gray-200 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50"
            >
                {isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
            </button>

            {/* Header */}
            <div className="bg-white border-b px-8 py-4 shadow-sm">
                <h1 className="text-2xl font-bold text-purple-700">🎤 IELTS Speaking Test</h1>
                <p className="text-sm text-gray-500 mt-1">Record your spoken response to the task below</p>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
                <div className="max-w-3xl w-full space-y-8">

                    {/* Task Card */}
                    <div className="bg-white rounded-xl shadow-lg border border-purple-100 p-8">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-2xl">📝</span> Task Description
                        </h2>
                        <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-lg">
                            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {taskPrompt}
                            </p>
                        </div>
                    </div>

                    {/* Recording Controls */}
                    <div className="bg-white rounded-xl shadow-lg border border-purple-100 p-8">
                        <div className="text-center space-y-6">

                            {/* Recording Status */}
                            {isRecording && (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-lg font-bold text-red-600">Recording...</span>
                                    <span className="text-2xl font-mono text-gray-700">{formatTime(recordingTime)}</span>
                                </div>
                            )}

                            {uploading && (
                                <div className="text-blue-600 font-bold">⏳ Uploading audio...</div>
                            )}

                            {/* Record Button */}
                            {!isRecording && !audioURL && !uploading && (
                                <button
                                    onClick={startRecording}
                                    disabled={isReviewMode}
                                    className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full shadow-lg transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center gap-3 mx-auto"
                                >
                                    <span className="text-2xl">🎙️</span>
                                    Start Recording
                                </button>
                            )}

                            {/* Stop Button */}
                            {isRecording && (
                                <button
                                    onClick={stopRecording}
                                    className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-lg transition transform hover:scale-105 text-lg flex items-center gap-3 mx-auto"
                                >
                                    <span className="text-2xl">⏹️</span>
                                    Stop Recording
                                </button>
                            )}

                            {/* Audio Player */}
                            {audioURL && !isRecording && !uploading && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center gap-2 text-green-600 font-bold">
                                        <span className="text-2xl">✅</span>
                                        Recording Complete
                                    </div>
                                    <audio
                                        controls
                                        src={audioURL}
                                        className="w-full max-w-md mx-auto rounded-lg shadow-md"
                                    />
                                    {!isReviewMode && (
                                        <button
                                            onClick={() => {
                                                setAudioURL("");
                                                if (setParentAnswer) {
                                                    setParentAnswer('audioAnswer', "");
                                                }
                                            }}
                                            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition text-sm"
                                        >
                                            🔄 Record Again
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="font-bold text-blue-800 mb-2">📌 Instructions:</h3>
                        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                            <li>Click "Start Recording" to begin</li>
                            <li>Speak clearly into your microphone</li>
                            <li>Click "Stop Recording" when finished</li>
                            <li>You can listen to your recording before submitting</li>
                            <li>Click "Record Again" if you want to re-record</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
