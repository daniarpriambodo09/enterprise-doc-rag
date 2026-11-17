import { GoogleGenAI } from "@google/genai";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({ apiKey });
}

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";

export async function getEmbedding(text: string): Promise<number[]> {
  const ai = getGeminiClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: 768,
    },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values) {
    throw new Error("Failed to generate query embedding from Gemini.");
  }
  return values;
}

export async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const ai = getGeminiClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
    config: {
      outputDimensionality: 768,
    },
  });

  const embeddings = response.embeddings?.map((e) => e.values ?? []);
  if (!embeddings || embeddings.length !== texts.length) {
    throw new Error("Failed to generate batch embeddings from Gemini.");
  }
  return embeddings;
}
