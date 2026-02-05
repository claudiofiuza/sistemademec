
import { GoogleGenAI } from "@google/genai";

// Initialize with just the API key property as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeServiceScreenshot = async (imageBase64: string, prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64.split(',')[1],
            },
          },
          { text: prompt },
        ],
      },
      config: {
        systemInstruction: "You are a specialized mechanic assistant. Analyze images of car mod menus or garage scenes to identify vehicle models and visible upgrades."
      }
    });
    // response.text is a property, not a method
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Could not analyze image.";
  }
};

export const generateServiceSummary = async (record: any) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a professional mechanic's report for a ${record.vehicleModel} with plate ${record.plate}. The parts installed were: ${record.parts.map((p: any) => p.name).join(', ')}. Total cost ${record.totalAmount}. Keep it short and immersive for roleplay.`
    });
    // response.text is a property, not a method
    return response.text;
  } catch (error) {
    return "A high-performance service was completed on the vehicle.";
  }
};
