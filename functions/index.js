// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const { transcribePodcast } = require("./transcribePodcast");
const { analyzeSpeaking } = require("./analyzeSpeaking");
const { generateVocab } = require("./generateVocab");

exports.transcribePodcast = functions
    .runWith({ timeoutSeconds: 300, memory: "512MB" })
    .https.onCall(transcribePodcast);

exports.analyzeSpeaking = functions
    .runWith({ timeoutSeconds: 120, memory: "256MB" })
    .https.onCall(analyzeSpeaking);

exports.generateVocab = functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onCall(generateVocab);
