import { checkAnswer } from '../src/utils/ieltsScoring.js';

// Replicating the updated Choice.jsx logic
const opt = {
    label: "B",
    text: "monitor the balance between goods given and received"
};

const rawText = opt.text;
// Updated logic prioritizing opt.label
const optId = typeof opt === 'object' ? (opt.label || opt.id || rawText) : opt;

// getOptionValue logic from CommonComponents.jsx
const getOptionValue = (text) => {
    if (!text) return "";
    const match = String(text).match(/^([A-Z]|[ivxIVX]+)[\.\)\s]/);
    return match ? match[1].trim() : text;
};

const cleanOptionValue = getOptionValue(String(optId));
console.log("Selected option value stored in userAnswers (label):", cleanOptionValue);

// Correct answer in DB is "B"
const correctAnswer = "B";

const isCorrect = checkAnswer(correctAnswer, cleanOptionValue);
console.log("Is user answer graded as correct?", isCorrect);
