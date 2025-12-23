
import { GoogleGenAI } from "@google/genai";

// Initialize the API client safely. 
// In a real app, ensure process.env.API_KEY is set. 
// For this demo, we handle the missing key gracefully in the UI.
// We check typeof process !== 'undefined' to avoid crashing in browser environments where process is not available.
const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!ai) {
    // Mock response if no API key is present to allow UI testing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("I'm LIA, your AI assistant. To make me fully functional, please provide a valid Gemini API Key in the environment variables. For now, I'm just simulating a response!");
      }, 1000);
    });
  }

  try {
    const model = 'gemini-2.5-flash'; 
    const response = await ai.models.generateContent({
      model: model,
      contents: message,
      config: {
        systemInstruction: "You are LIA, a helpful, professional, and slightly witty AI assistant for the Luminnus Dashboard. Keep responses concise and formatted for a chat interface.",
      }
    });
    
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error processing your request.";
  }
};