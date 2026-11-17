import Groq from "groq-sdk";

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not configured.");
  }
  return new Groq({ apiKey });
}

export async function extractImageContentWithGroq(
  base64Image: string,
  pageNumber: number
): Promise<string> {
  const groq = getGroqClient();
  const model =
    process.env.GROQ_VISION_MODEL ||
    "meta-llama/llama-4-scout-17b-16e-instruct";

  const imageUrl = base64Image.startsWith("data:image/")
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`;

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

  return (completion.choices?.[0]?.message?.content || "").trim();
}
