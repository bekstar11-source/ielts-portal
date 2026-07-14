import fs from 'fs';
import { calculateSectionScore } from '../src/utils/ieltsScoring.js';

// Read mock test data
const testData = JSON.parse(fs.readFileSync('./matched_test_prod.json', 'utf8'));

// Prepare user answers matching exactly the correct answers
const userAnswers = {};

const walk = (obj) => {
    if (!obj) return;
    const answer = obj.answer || obj.correct_answer || obj.correctAnswer || obj.correct_answer_value;
    if (obj.id && answer) {
        userAnswers[String(obj.id)] = answer;
    }
    const CONTAINER_KEYS = ['sections', 'questions', 'groups', 'passages', 'items', 'parts', 'content', 'rows', 'cells'];
    for (const key of CONTAINER_KEYS) {
        const val = obj[key];
        if (val && Array.isArray(val)) {
            val.forEach(walk);
        } else if (val && typeof val === 'object') {
            walk(val);
        }
    }
};

walk(testData);

console.log("Extracted correct answers:", userAnswers);

// Grade the answers
const scoreResult = calculateSectionScore(testData, userAnswers);
console.log("Grading result with 100% correct answers:", scoreResult);

// Let's test with slightly different user answers (e.g. lowercase, spaces, different order for multi-answer)
const alteredAnswers = { ...userAnswers };

// Alter single MCQ answers:
// If answer is "B", try "b" or "B. option text"
if (alteredAnswers["14"] === "B") alteredAnswers["14"] = "b";
if (alteredAnswers["15"] === "C") alteredAnswers["15"] = "c";

// Alter pick-two answers:
// If answer is "D,E", try "e, d" or "D, E" or "d,e"
if (alteredAnswers["35–36"] === "D,E") alteredAnswers["35–36"] = "e, d";

console.log("Altered user answers for testing robustness:", {
    "14": alteredAnswers["14"],
    "15": alteredAnswers["15"],
    "35–36": alteredAnswers["35–36"]
});

const alteredResult = calculateSectionScore(testData, alteredAnswers);
console.log("Grading result with altered answers:", alteredResult);
