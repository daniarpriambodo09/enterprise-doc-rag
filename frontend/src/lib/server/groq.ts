import Groq from "groq-sdk";

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not configured.");
  }
  return new Groq({ apiKey });
}

const VISION_MODEL_PATTERN = /vision|llama-4|scout|maverick/i;

async function discoverGroqVisionModels(groq: Groq): Promise<string[]> {
  const list = await groq.models.list();
  const available = (list.data ?? [])
    .filter(
      (m) =>
        (m as { active?: boolean }).active !== false &&
        VISION_MODEL_PATTERN.test(m.id)
    )
    .map((m) => m.id);

  const envModel = process.env.GROQ_VISION_MODEL?.trim();
  const ordered = envModel && available.includes(envModel)
    ? [envModel, ...available.filter((id) => id !== envModel)]
    : available;

  return Array.from(new Set(ordered));
}

export async function extractImageContentWithGroq(
  base64Image: string,
  pageNumber: number
): Promise<string> {
  const groq = getGroqClient();
  const visionModels = await discoverGroqVisionModels(groq);

  if (visionModels.length === 0) {
    throw new Error("NO_GROQ_VISION_MODEL");
  }

  const imageUrl = base64Image.startsWith("data:image/")
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`;

  let lastError: unknown = null;

  for (const model of visionModels) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Anda adalah sistem OCR dan analisis dokumen visual yang sangat akurat.
Ekstrak seluruh teks yang terlihat pada halaman ${pageNumber} ini secara lengkap dan rapi (pertahankan struktur tabel dalam format tabel Markdown serta daftar poin-poinnya).
Jika terdapat gambar, grafik, chart, atau diagram, sertakan deskripsi singkat dan jelas dengan awalan: [Analisis Visual/Gambar Halaman ${pageNumber}]: ...`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_completion_tokens: 2048,
      });

      const content = (completion.choices?.[0]?.message?.content || "").trim();
      if (content) return content;
    } catch (err) {
      lastError = err;
      console.warn(
        `[Groq Vision] Model ${model} failed:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("NO_GROQ_VISION_MODEL");
}
