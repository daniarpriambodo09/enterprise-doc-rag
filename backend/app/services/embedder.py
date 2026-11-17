from google import genai
from google.genai import types
from typing import List
from app.core.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

def get_embedding(text: str) -> List[float]:
    response = client.models.embed_content(
        model=settings.EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=768),
    )
    return response.embeddings[0].values

def get_batch_embeddings(texts: List[str]) -> List[List[float]]:
    response = client.models.embed_content(
        model=settings.EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(output_dimensionality=768),
    )
    return [emb.values for emb in response.embeddings]