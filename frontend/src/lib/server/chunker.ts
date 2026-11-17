export interface TextChunk {
  filename: string;
  page_number: number;
  chunk_index: number;
  content: string;
}

export function chunkPages(
  pages: { pageNumber: number; text: string }[],
  filename: string,
  chunkSize: number = 800,
  overlap: number = 150
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let chunkCounter = 0;

  for (const page of pages) {
    const cleanText = page.text.trim();
    if (!cleanText) continue;

    // Split on paragraph boundaries when available, falling back to character slicing
    const paragraphs = cleanText.split(/\n{2,}/);
    let currentChunk = "";

    for (const rawPara of paragraphs) {
      const para = rawPara.trim();
      if (!para) continue;

      if (para.length > chunkSize) {
        // Flush any accumulated chunk first
        if (currentChunk.trim()) {
          chunks.push({
            filename,
            page_number: page.pageNumber,
            chunk_index: chunkCounter++,
            content: currentChunk.trim(),
          });
          currentChunk = "";
        }

        // Slice oversized single paragraph with overlap
        let start = 0;
        while (start < para.length) {
          const slice = para.slice(start, start + chunkSize).trim();
          if (slice) {
            chunks.push({
              filename,
              page_number: page.pageNumber,
              chunk_index: chunkCounter++,
              content: slice,
            });
          }
          if (start + chunkSize >= para.length) break;
          start += chunkSize - overlap;
        }
        continue;
      }

      if (currentChunk.length + para.length + 2 <= chunkSize) {
        currentChunk += (currentChunk ? "\n\n" : "") + para;
      } else {
        if (currentChunk.trim()) {
          chunks.push({
            filename,
            page_number: page.pageNumber,
            chunk_index: chunkCounter++,
            content: currentChunk.trim(),
          });
        }
        const overlapText =
          currentChunk.length > overlap ? currentChunk.slice(-overlap).trim() : "";
        currentChunk = overlapText ? `${overlapText}\n\n${para}` : para;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        filename,
        page_number: page.pageNumber,
        chunk_index: chunkCounter++,
        content: currentChunk.trim(),
      });
    }
  }

  return chunks;
}
