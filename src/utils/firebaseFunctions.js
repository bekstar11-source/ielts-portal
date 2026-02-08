import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

/**
 * Initializes and exports the Firebase Functions instance.
 * Note: This relies on the Firebase App being initialized first (e.g., in main.jsx).
 */
let functions;

try {
  const app = getApp();
  functions = getFunctions(app); // Default region: us-central1
} catch (error) {
  console.error("Firebase Functions initialization failed. Make sure Firebase is initialized before importing this.", error);
}

/**
 * Calls the 'gradeWritingTest' Cloud Function.
 * @param {Object} data - The data to send to the function.
 * @param {string} data.testId - ID of the test.
 * @param {string} data.task1Response - Student's Task 1 answer.
 * @param {string} data.task1Prompt - Task 1 question text.
 * @param {string} data.task2Response - Student's Task 2 answer.
 * @param {string} data.task2Prompt - Task 2 question text.
 * @returns {Promise<Object>} - The result from the Cloud Function.
 */
export const callGradeWritingTest = async (data) => {
  if (!functions) throw new Error("Firebase Functions not initialized.");

  const gradeFunction = httpsCallable(functions, 'gradeWritingTest');
  try {
    const result = await gradeFunction(data);
    return result.data;
  } catch (error) {
    console.error("Error calling gradeWritingTest:", error);
    throw error;
  }
};
