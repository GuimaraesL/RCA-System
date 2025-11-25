import { GoogleGenAI, Type } from "@google/genai";
import { IshikawaDiagram } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeFailure = async (
  assetName: string,
  problemDescription: string
): Promise<IshikawaDiagram> => {
  if (!apiKey) {
    console.warn("API Key missing for Gemini");
    return { machine: [], method: [], material: [], manpower: [], measurement: [], environment: [] };
  }

  const model = "gemini-2.5-flash";
  const prompt = `
    Acting as a Senior Reliability Engineer, analyze the following equipment failure.
    Asset: ${assetName}
    Problem: ${problemDescription}

    Generate an Ishikawa (Fishbone) diagram structure. 
    For each category (Man, Machine, Material, Method, Environment, Measurement), provide a list of potential root causes or contributing factors.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            machine: { type: Type.ARRAY, items: { type: Type.STRING } },
            method: { type: Type.ARRAY, items: { type: Type.STRING } },
            material: { type: Type.ARRAY, items: { type: Type.STRING } },
            manpower: { type: Type.ARRAY, items: { type: Type.STRING } },
            measurement: { type: Type.ARRAY, items: { type: Type.STRING } },
            environment: { type: Type.ARRAY, items: { type: Type.STRING } },
          }
        }
      }
    });

    const text = response.text;
    if (!text) return { machine: [], method: [], material: [], manpower: [], measurement: [], environment: [] };
    
    return JSON.parse(text) as IshikawaDiagram;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return { machine: [], method: [], material: [], manpower: [], measurement: [], environment: [] };
  }
};
