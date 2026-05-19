const admin = require("firebase-admin");

admin.initializeApp({
  projectId: "ielts-portal-v1"
});

const db = admin.firestore();

async function check() {
    try {
        const doc = await db.collection("tests").doc("ielts_listening_practice_test_50").get();
        if (!doc.exists) {
            console.log("Document does not exist!");
            return;
        }
        const data = doc.data();
        console.log("Document loaded successfully!");
        data.questions.forEach((q, idx) => {
            console.log(`Question Group ${idx} type:`, q.type);
            if (q.items) {
                console.log("  items:", q.items.map(it => ({ id: it.id, answer: it.answer, correct_answer: it.correct_answer, correctAnswer: it.correctAnswer, correct_answer_value: it.correct_answer_value })));
            }
            if (q.questions) {
                console.log("  questions:", q.questions.map(it => ({ id: it.id, answer: it.answer, correct_answer: it.correct_answer, correctAnswer: it.correctAnswer, correct_answer_value: it.correct_answer_value })));
            }
        });
    } catch (e) {
        console.error("Error:", e);
    }
}
check();
