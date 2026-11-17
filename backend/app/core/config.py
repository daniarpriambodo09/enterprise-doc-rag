from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GROQ_API_KEY: str
    LLM_MODEL: str = "openai/gpt-oss-20b"
    
    GEMINI_API_KEY: str
    EMBEDDING_MODEL: str = "gemini-embedding-001"
    
    DATABASE_URL: str

    class Config:
        env_file = ".env"

settings = Settings()