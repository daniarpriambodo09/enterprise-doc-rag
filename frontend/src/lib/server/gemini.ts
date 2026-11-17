import { GoogleGenAI, Type } from "@google/genai";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({ apiKey });
}

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";
const MULTIMODAL_MODEL = process.env.VISION_MODEL || "gemini-3.8-flash";
const MAX_INLINE_PDF_BYTES = 15 * 1024 * 1024; // 15 MB limit for inline multimodal ingestion

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

interface GeminiMultimodalPage {
  page_number?: number;
  text?: string;
  visual_descriptions?: string[];
}

export async function extractMultimodalPdfContent(
  pdfBuffer: Buffer
): Promise<ExtractedPdfPage[]> {
  if (pdfBuffer.byteLength > MAX_INLINE_PDF_BYTES) {
    throw new Error(
      "Ukuran PDF melebihi batas 15 MB untuk ekstraksi multimodal inline."
    );
  }

  const ai = getGeminiClient();
  const base64Pdf = pdfBuffer.toString("base64");

  const prompt = `Anda adalah sistem ekstraksi dokumen perusahaan multimodal yang sangat teliti.
Tugas Anda adalah mengekstrak seluruh konten dari setiap halaman PDF ini ke dalam format JSON terstruktur.

Untuk SETIAP halaman:
1. "page_number": nomor halaman (integer, dimulai dari 1).
2. "text": seluruh teks asli yang terbaca pada halaman tersebut. Jika terdapat tabel, pertahankan strukturnya dalam format tabel Markdown yang rapi.
3. "visual_descriptions": array string berisi deskripsi detail dari setiap gambar, foto, diagram, flowchart, grafik/chart (termasuk label sumbu, angka, dan tren), serta tabel visual yang ada pada halaman tersebut. Jika tidak ada elemen visual khusus di halaman tersebut, kembalikan array kosong [].

Pastikan seluruh halaman diekstrak tanpa melewatkan informasi penting.`;

  const response = await ai.models.generateContent({
    model: MULTIMODAL_MODEL,
    contents: [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Pdf,
        },
      },
      prompt,
    ],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                page_number: { type: Type.INTEGER },
                text: { type: Type.STRING },
                visual_descriptions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["page_number", "text", "visual_descriptions"],
            },
          },
        },
        required: ["pages"],
      },
    },
  });

  const rawJson = response.text;
  if (!rawJson) {
    throw new Error(`Respons kosong dari ${MULTIMODAL_MODEL} saat ekstraksi PDF.`);
  }

  const parsed = JSON.parse(rawJson) as { pages?: GeminiMultimodalPage[] };
  if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
    throw new Error("Format JSON ekstraksi multimodal tidak memiliki daftar halaman.");
  }

  return parsed.pages.map((page, idx) => {
    const pageNum = Number(page.page_number) || idx + 1;
    const textPart = (page.text || "").trim();
    const visuals = Array.isArray(page.visual_descriptions)
      ? page.visual_descriptions
          .map((desc) => desc.trim())
          .filter(Boolean)
          .map((desc) => `[Analisis Visual/Gambar Halaman ${pageNum}]: ${desc}`)
      : [];

    const combined = [textPart, ...visuals].filter(Boolean).join("\n\n");
    return {
      pageNumber: pageNum,
      text: combined,
    };
  });
}

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
