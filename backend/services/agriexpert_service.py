import os
import sys

# Auto-detect PythonAnywhere environment & configure HTTP proxy
if "pythonanywhere" in os.environ.get("PYTHONANYWHERE_DOMAIN", "") or "PYTHONANYWHERE_SITE" in os.environ or "PYTHONANYWHERE_HOST" in os.environ:
    proxy_url = "http://proxy.server:3128"
    os.environ["HTTP_PROXY"] = proxy_url
    os.environ["HTTPS_PROXY"] = proxy_url
    os.environ["http_proxy"] = proxy_url
    os.environ["https_proxy"] = proxy_url

from anthropic import Anthropic

SYSTEM_PROMPT = """You are AgriExpert, an elite agricultural advisor embedded in the Smart Kisan platform for Indian farmers.

CONTEXT YOU RECEIVE PER REQUEST (may be partial):
- GPS location / district
- Live weather (temperature, conditions)
- Selected water source (borewell, canal, rain-fed, etc.)
- Preferred language (English or Marathi)

WHAT YOU HELP WITH:
1. Crop advisory — sowing timing, spacing, common pest/disease symptoms and general treatment approaches.
2. Marketplace guidance — listing crops, evaluating organic seed/fertilizer listings.
3. Weekly sowing calendars tailored to season and region.
4. Irrigation guidance based on crop type, soil, and stated water source.
5. Any other farming question — soil health, weather-linked decisions, storage, general scheme eligibility, farm economics.

STRICT RULES:
- Answer the farmer's SPECIFIC question about their SPECIFIC crop or situation. NEVER default to Tomato or any example crop unless the farmer explicitly asked about Tomato.
- Never invent specific numbers you weren't given: no fabricated mandi prices, no fabricated exact pesticide/fertilizer dosages, no fabricated scheme rupee amounts. Give general safe guidance and point to a local Krishi Vigyan Kendra / agri dealer / mandi board for exact figures.
- If asked something entirely outside farming, answer briefly and steer back to how you can help with their farm.
- Reply in Marathi if the language preference is Marathi, otherwise English.
- Keep answers scannable: short paragraphs, bold key terms, numbered steps for procedures.
- If you lack enough context (crop, region, season) for a specific answer, ask ONE clarifying question rather than guessing."""


def get_openai_client(api_key):
    is_pa = "pythonanywhere" in os.environ.get("PYTHONANYWHERE_DOMAIN", "") or "PYTHONANYWHERE_SITE" in os.environ or "PYTHONANYWHERE_HOST" in os.environ
    from openai import OpenAI
    if is_pa:
        try:
            import httpx
            proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY") or "http://proxy.server:3128"
            return OpenAI(api_key=api_key.strip(), http_client=httpx.Client(proxy=proxy))
        except Exception as e:
            print(f"[AgriExpert] Proxy client init note: {e}")
    return OpenAI(api_key=api_key.strip())


def get_agriexpert_reply(message, history=None, context=None):
    """
    Returns an AI-generated reply for the given farmer message.

    Raises RuntimeError if no valid API key (OPENAI_API_KEY or ANTHROPIC_API_KEY)
    is configured — callers must surface this as HTTP 502, never disguise it as advice.
    """
    openai_key = os.environ.get("OPENAI_API_KEY")
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")

    # ── Diagnostic logging (always on) ────────────────────────────────────────
    print(f"[AgriExpert] Received message: \"{message}\"")
    print(f"[AgriExpert] OPENAI_API_KEY set: {bool(openai_key and openai_key.strip() and 'your_api_key' not in openai_key)}")
    print(f"[AgriExpert] ANTHROPIC_API_KEY set: {bool(anthropic_key and anthropic_key.strip() and 'xxxxxxxx' not in anthropic_key)}")

    history = history or []
    context = context or {}

    location = context.get("location")
    if isinstance(location, dict):
        loc_str = f"Lat {location.get('lat')}, Lon {location.get('lon')}"
    else:
        loc_str = str(location or "unknown")

    weather = context.get("weather")
    if isinstance(weather, dict):
        w_str = f"{weather.get('temp', '')}°C {weather.get('forecast') or weather.get('conditions') or ''}".strip()
    else:
        w_str = str(weather or "unknown")

    context_block = (
        f"[Live context]\n"
        f"Location: {loc_str}\n"
        f"Weather: {w_str}\n"
        f"Water source: {context.get('waterSource', 'not selected')}\n"
        f"Language: {context.get('language', 'English')}"
    )

    # 1. Try OpenAI ChatGPT API if OPENAI_API_KEY is configured
    if openai_key and openai_key.strip() and "your_api_key" not in openai_key:
        try:
            client = get_openai_client(openai_key)
            model_name = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            raw_history = history[-10:] if isinstance(history, list) else []
            for item in raw_history:
                role = "assistant" if item.get("role") == "assistant" or item.get("sender") == "ai" else "user"
                content = item.get("content") or item.get("text") or ""
                if content and str(content).strip():
                    messages.append({"role": role, "content": str(content).strip()})

            user_content = f"{context_block}\n\nFarmer's question: {message}"
            messages.append({"role": "user", "content": user_content})

            print(f"[AgriExpert] Sending to OpenAI ({model_name}), messages count: {len(messages)}")
            print(f"[AgriExpert] User content: {user_content[:200]}")

            completion = client.chat.completions.create(
                model=model_name,
                messages=messages,
                max_tokens=1024,
                temperature=0.7
            )
            reply = completion.choices[0].message.content
            if reply and reply.strip():
                print(f"[AgriExpert] OpenAI reply received ({len(reply)} chars)")
                return reply.strip()
        except Exception as e:
            print(f"[AgriExpert] OpenAI error: {e}")

    # 2. Try Anthropic API if ANTHROPIC_API_KEY is configured
    # NOTE: Only check that the key is non-empty and not a placeholder —
    # do NOT gate on a specific key prefix like "sk-ant-" because Anthropic
    # has issued keys under multiple prefix formats.
    if anthropic_key and anthropic_key.strip() and "xxxxxxxx" not in anthropic_key:
        try:
            client = Anthropic(api_key=anthropic_key.strip())
            chat_model = os.environ.get("CLAUDE_CHAT_MODEL", "claude-haiku-4-5-20251001")
            fallback_models = [chat_model, "claude-3-5-haiku-20241022", "claude-3-haiku-20240307"]

            formatted_history = []
            raw_history = history[-10:] if isinstance(history, list) else []
            for item in raw_history:
                role = "assistant" if item.get("role") == "assistant" or item.get("sender") == "ai" else "user"
                content = item.get("content") or item.get("text") or ""
                if content and str(content).strip():
                    formatted_history.append({"role": role, "content": str(content).strip()})

            messages = []
            for msg in formatted_history:
                if not messages:
                    if msg["role"] == "user":
                        messages.append(msg)
                else:
                    if msg["role"] != messages[-1]["role"]:
                        messages.append(msg)
                    else:
                        messages[-1]["content"] += "\n\n" + msg["content"]

            user_query = f"{context_block}\n\nFarmer's question: {message}"
            if messages and messages[-1]["role"] == "user":
                messages[-1]["content"] += "\n\n" + user_query
            else:
                messages.append({"role": "user", "content": user_query})

            print(f"[AgriExpert] Sending to Anthropic Claude, messages count: {len(messages)}")
            print(f"[AgriExpert] User content: {messages[-1]['content'][:200]}")

            for model_to_use in list(dict.fromkeys(fallback_models)):
                try:
                    response = client.messages.create(
                        model=model_to_use,
                        max_tokens=1024,
                        system=SYSTEM_PROMPT,
                        messages=messages,
                    )
                    if response:
                        reply = next((b.text for b in response.content if b.type == "text"), "")
                        if reply:
                            print(f"[AgriExpert] Anthropic ({model_to_use}) reply received ({len(reply)} chars)")
                            return reply
                except Exception as err:
                    print(f"[AgriExpert] Model {model_to_use} failed: {err}")
                    continue
        except Exception as err:
            print(f"[AgriExpert] Anthropic client error: {err}")

    # 3. No valid API key — raise so the caller can return HTTP 502.
    # Never return a hardcoded advisory string: a fabricated response is worse
    # than a visible error because it silently misleads the farmer.
    print("[AgriExpert] ERROR: No valid OPENAI_API_KEY or ANTHROPIC_API_KEY found. Raising error.")
    raise RuntimeError(
        "AgriExpert AI service is not configured. "
        "Set OPENAI_API_KEY or ANTHROPIC_API_KEY in the PythonAnywhere environment variables."
    )
