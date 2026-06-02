// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const { transcribePodcast } = require("./transcribePodcast");
const { analyzeSpeaking } = require("./analyzeSpeaking");
const { generateVocab } = require("./generateVocab");
const { translateWord } = require("./translateWord");
const { checkWriting } = require("./checkWriting");
const { beautifyArticle } = require("./beautifyArticle");
const { telegramWebhook, verifyTelegramOTP } = require("./telegramBot");
const { verifyAccessKey } = require("./verifyAccessKey");
const { getSanitizedTest } = require("./getSanitizedTest");
const { submitTestAnswers } = require("./submitTestAnswers");
const { submitMockExam } = require("./submitMockExam");
const { shareTest } = require("./shareTest");

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

exports.beautifyArticle = functions
    .runWith({ timeoutSeconds: 90, memory: "256MB" })
    .https.onCall(beautifyArticle);

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

exports.sharePodcast = functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onRequest(async (req, res) => {
        const fetch = require("node-fetch");
        const pathParts = req.path.split('/');
        const podcastId = pathParts[pathParts.length - 1];

        if (!podcastId) {
            return res.redirect("/podcasts");
        }

        try {
            const db = admin.firestore();
            const snap = await db.collection("podcasts").doc(podcastId).get();
            if (!snap.exists) {
                return res.redirect("/podcasts");
            }
            const podcast = snap.data();

            // Fetch index.html from hosting
            const host = req.headers.host || "englev.uz";
            const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
            const indexUrl = `${protocol}://${host}/index.html`;

            const indexRes = await fetch(indexUrl);
            if (!indexRes.ok) {
                throw new Error(`Failed to fetch index.html: ${indexRes.statusText}`);
            }
            let html = await indexRes.text();

            const title = podcast.title || "ENGLEV | Podcast";
            const description = podcast.description || "ENGLEV platformasida ajoyib podcast";
            const thumbnail = podcast.thumbnail || "https://englev.uz/ielts_mock_showcase.png";

            // Escape function to prevent XSS and malformed tags
            const escapeHtml = (str) => {
                if (!str) return "";
                return str
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            };

            const setMetaTag = (htmlContent, propertyOrName, value, isProperty = true) => {
                const attr = isProperty ? "property" : "name";
                const regex = new RegExp(`<meta[^>]*${attr}="${propertyOrName}"[^>]*>`, "i");
                const newTag = `<meta ${attr}="${propertyOrName}" content="${escapeHtml(value)}" />`;
                if (regex.test(htmlContent)) {
                    return htmlContent.replace(regex, newTag);
                } else {
                    return htmlContent.replace("</head>", `${newTag}\n</head>`);
                }
            };

            html = setMetaTag(html, "og:title", title, true);
            html = setMetaTag(html, "og:description", description, true);
            html = setMetaTag(html, "og:image", thumbnail, true);
            html = setMetaTag(html, "twitter:title", title, false);
            html = setMetaTag(html, "twitter:description", description, false);
            html = setMetaTag(html, "twitter:image", thumbnail, false);

            // Also update standard <title>
            html = html.replace(/<title>[^<]*<\/title>/gi, `<title>${escapeHtml(title)}</title>`);

            res.status(200).send(html);
        } catch (error) {
            console.error("Error generating dynamic og metadata:", error);
            res.redirect("/podcasts");
        }
    });

exports.shareTest = functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onRequest(shareTest);

exports.telegramWebhook = telegramWebhook;
exports.verifyTelegramOTP = verifyTelegramOTP;
