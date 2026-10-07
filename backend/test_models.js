const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
dotenv.config();

async function checkModels() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const models = await ai.models.list(); // or whatever the method is to list models
    for await (const m of models) {
        console.log(m.name);
    }
  } catch (e) {
    console.error("Error listing models:", e);
  }
}
checkModels();
