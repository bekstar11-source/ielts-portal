// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const { transcribePodcast } = require("./transcribePodcast");
const { analyzeSpeaking } = require("./analyzeSpeaking");
const { generateVocab } = require("./generateVocab");
const { translateWord } = require("./translateWord");
const { checkWriting } = require("./checkWriting");
const { telegramWebhook, verifyTelegramOTP } = require("./telegramBot");
const { verifyAccessKey } = require("./verifyAccessKey");
const { getSanitizedTest } = require("./getSanitizedTest");
const { submitTestAnswers } = require("./submitTestAnswers");
const { submitMockExam } = require("./submitMockExam");

exports.transcribePodcast = functions
    .runWith({ timeoutSeconds: 300, memory: "512MB" })
    .https.onCall(transcribePodcast);

exports.analyzeSpeaking = functions
    .runWith({ timeoutSeconds: 120, memory: "256MB" })
    .https.onCall(analyzeSpeaking);

exports.generateVocab = functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(generateVocab);

exports.translateWord = functions
    .runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onCall(translateWord);

exports.checkWriting = functions
    .runWith({ timeoutSeconds: 120, memory: "256MB" })
    .https.onCall(checkWriting);

exports.verifyAccessKey = functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(verifyAccessKey);

exports.getSanitizedTest = functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(getSanitizedTest);

exports.submitTestAnswers = functions
    .runWith({ timeoutSeconds: 90, memory: "256MB" })
    .https.onCall(submitTestAnswers);

exports.submitMockExam = functions
    .runWith({ timeoutSeconds: 120, memory: "256MB" })
    .https.onCall(submitMockExam);

exports.telegramWebhook = telegramWebhook;
exports.verifyTelegramOTP = verifyTelegramOTP;
