"""
OpenRouter AI Service — multi-model abstraction layer.
Supports Claude, GPT-4o, Gemini with automatic fallback,
retry logic, rate limiting, and structured outputs.
"""
import json
import asyncio
from typing import Any, Optional, Type, TypeVar
from pydantic import BaseModel
from openai import AsyncOpenAI
from tenacity import (
    retry, stop_after_attempt, wait_exponential,
    retry_if_exception_type, before_sleep_log
)
import structlog
from app.core.config import settings

logger = structlog.get_logger()

T = TypeVar("T", bound=BaseModel)

MODELS = {
    "claude": "anthropic/claude-3.5-sonnet",
    "gpt4o": "openai/gpt-4o",
    "gemini": "google/gemini-pro-1.5",
    "fast": "anthropic/claude-3-haiku",
    "embed": "openai/text-embedding-3-small",
}


class AIService:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
        )
        self.default_model = settings.OPENROUTER_DEFAULT_MODEL
        self.fallback_model = settings.OPENROUTER_FALLBACK_MODEL

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
    )
    async def complete(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 2000,
        system: Optional[str] = None,
    ) -> str:
        model = model or self.default_model
        if system:
            messages = [{"role": "system", "content": system}] + messages
        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                extra_headers={"HTTP-Referer": "https://talentos.ai", "X-Title": "TalentOS"},
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error("AI completion failed", model=model, error=str(e))
            if model != self.fallback_model:
                logger.info("Falling back to", model=self.fallback_model)
                return await self.complete(messages, model=self.fallback_model, temperature=temperature, max_tokens=max_tokens)
            raise

    async def complete_structured(
        self,
        messages: list[dict],
        schema: Type[T],
        model: Optional[str] = None,
        system: Optional[str] = None,
    ) -> T:
        """Return a validated Pydantic model from AI response."""
        schema_json = schema.model_json_schema()
        structured_system = (
            (system or "") + f"\n\nYou MUST respond with valid JSON matching this schema:\n{json.dumps(schema_json, indent=2)}\nRespond with ONLY the JSON object, no markdown, no explanation."
        )
        raw = await self.complete(messages, model=model, system=structured_system, temperature=0.0)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return schema.model_validate_json(raw.strip())

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=5))
    async def embed(self, text: str) -> list[float]:
        """Generate 1536-dim embedding via OpenRouter."""
        response = await self.client.embeddings.create(
            model=MODELS["embed"],
            input=text[:8000],
        )
        return response.data[0].embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple texts concurrently."""
        tasks = [self.embed(t) for t in texts]
        return await asyncio.gather(*tasks)


ai_service = AIService()
