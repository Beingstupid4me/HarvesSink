"""
HarvesSink – LLM Sustainability Nudge (RAG-Lite).
Optional external feature — not polished, not required for core flow.
"""

from typing import Optional
from app.schemas import SensorReading, SustainabilityNudge
from app.config import settings


SYSTEM_PROMPT = """You are a water conservation expert for the HarvesSink system.
Based on the sensor metrics provided, tell the user:
1. What activity they are likely doing (washing dishes, vegetables, laundry, etc.)
2. A short, actionable tip to be more water-efficient.
3. Any environmental impact insight.
Keep responses under 60 words. Be friendly and practical."""


async def generate_nudge(reading: SensorReading) -> Optional[SustainabilityNudge]:
    """
    Calls the LLM API to generate a sustainability nudge.
    Returns None if LLM is disabled or fails.
    """
    if not settings.llm_enabled or not settings.openai_api_key:
        return _fallback_nudge(reading)

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)

        user_msg = (
            f"Current water metrics — pH: {reading.ph}, TDS: {reading.tds} ppm, "
            f"Turbidity: {reading.turbidity} NTU"
        )

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=120,
            temperature=0.7,
        )

        text = response.choices[0].message.content or ""
        return SustainabilityNudge(message=text, activity_guess="", tip=text)

    except Exception:
        return _fallback_nudge(reading)


def _fallback_nudge(reading: SensorReading) -> SustainabilityNudge:
    """Simple rule-based fallback when LLM is unavailable."""
    if reading.tds > 400 and reading.turbidity > 8:
        return SustainabilityNudge(
            message="Looks like a heavy cleaning activity.",
            activity_guess="Dishwashing",
            tip="Try soaking dishes first to reduce water usage by ~30%.",
        )
    if reading.turbidity > 5:
        return SustainabilityNudge(
            message="Moderate turbidity detected.",
            activity_guess="Vegetable washing",
            tip="Reuse this water for plants — it's rich in nutrients!",
        )
    return SustainabilityNudge(
        message="Water quality looks good!",
        activity_guess="General use",
        tip="Great quality for rainwater harvesting.",
    )
