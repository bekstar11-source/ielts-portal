const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { GoogleGenerativeAI } = require("@google/generative-ai");

initializeApp();
const db = getFirestore();

// Initialize Gemini API (Make sure API Key is set in environment variables)
// Run: firebase functions:config:set gemini.key="YOUR_API_KEY"
// Or use: defineSecret("GEMINI_API_KEY")
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE");

exports.gradeWritingTest = onCall(async (request) => {
  // 1. Authenticate User
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const { testId, task1Response, task1Prompt, task2Response, task2Prompt } = request.data;
  const userId = request.auth.uid;

  if (!testId) {
    throw new HttpsError("invalid-argument", "Test ID is required.");
  }

  try {
    // 2. Construct the Prompt for Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `
      You are a strict, professional IELTS Examiner. Your task is to grade an IELTS Writing Test consisting of Task 1 and Task 2.

      Assessment Criteria:
      1. Task Achievement (Task 1) / Task Response (Task 2)
      2. Coherence & Cohesion
      3. Lexical Resource
      4. Grammatical Range & Accuracy

      Strictly follow the official IELTS Band Descriptors (0-9 scale).

      Input:
      Task 1 Prompt: ${task1Prompt || "N/A"}
      Task 1 Response: ${task1Response || "No response provided."}

      Task 2 Prompt: ${task2Prompt || "N/A"}
      Task 2 Response: ${task2Response || "No response provided."}

      Output Requirement:
      Return a valid JSON object ONLY. No markdown formatting.
      The JSON structure must be:
      {
        "overallBand": number,
        "task1": {
          "band": number,
          "criteria": {
            "taskAchievement": { "score": number, "feedback": string },
            "coherenceCohesion": { "score": number, "feedback": string },
            "lexicalResource": { "score": number, "feedback": string },
            "grammaticalRange": { "score": number, "feedback": string }
          },
          "generalFeedback": string,
          "improvements": string[]
        },
        "task2": {
          "band": number,
          "criteria": {
            "taskResponse": { "score": number, "feedback": string },
            "coherenceCohesion": { "score": number, "feedback": string },
            "lexicalResource": { "score": number, "feedback": string },
            "grammaticalRange": { "score": number, "feedback": string }
          },
          "generalFeedback": string,
          "improvements": string[]
        }
      }
    `;

    // 3. Call Gemini API
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    let text = response.text();

    // Clean up response if it contains markdown code blocks
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const gradingResult = JSON.parse(text);

    // 4. Save to Firestore (Status: review_pending)
    const resultRef = await db.collection("results").add({
      userId: userId,
      testId: testId,
      type: "writing",
      date: new Date().toISOString(),
      status: "review_pending", // HIDDEN from student until approved
      aiGrading: gradingResult,
      userAnswers: {
        task1: task1Response,
        task2: task2Response
      },
      score: null, // Will be set by teacher
      bandScore: null // Will be set by teacher
    });

    return {
      success: true,
      resultId: resultRef.id,
      message: "Test submitted for review."
    };

  } catch (error) {
    console.error("Error grading writing test:", error);
    throw new HttpsError("internal", "AI Grading failed. Please try again later.", error.message);
  }
});
