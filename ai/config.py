"""
config.py — Central configuration via pydantic-settings.
All values are loaded from ai/.env with type validation.
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Data ─────────────────────────────────────────────────────────────
    excel_path: str = "../src/data/demands.xlsx"
    chroma_path: str = "./chroma_store"
    collection_name: str = "bp3_demands"

    # ── Embedding ─────────────────────────────────────────────────────────
    embed_model: str = "all-MiniLM-L6-v2"
    top_k: int = 8

    # ── LLM ──────────────────────────────────────────────────────────────
    llm_backend: str = "ollama"          # "ollama" | "openai"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"

    # ── Server ────────────────────────────────────────────────────────────
    ai_port: int = 8000
    rate_limit_rpm: int = 20
    allowed_origins: str = "http://localhost:5173,http://localhost:3001"

    @property
    def excel_absolute_path(self) -> Path:
        """Resolve the Excel path relative to this config file's directory."""
        p = Path(self.excel_path)
        if p.is_absolute():
            return p
        return (Path(__file__).parent / self.excel_path).resolve()

    @property
    def chroma_absolute_path(self) -> Path:
        p = Path(self.chroma_path)
        if p.is_absolute():
            return p
        return (Path(__file__).parent / self.chroma_path).resolve()

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


# Singleton instance — import this everywhere
settings = Settings()
