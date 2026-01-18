"""Service layer for LLM integration (OpenAI GPT-4o)."""
import json
import os
import re
import time
from typing import Any, Dict, Dict, List, Optional
from openai import OpenAI
from openai import OpenAIError

try:  # pragma: no cover - defensive optional import
    from tokenc import TokenClient
    from tokenc.errors import TokenCError
except ImportError:  # pragma: no cover
    TokenClient = None  # type: ignore[assignment]

    class TokenCError(Exception):  # type: ignore[no-redef]
        """Fallback TokenC error when tokenc is unavailable."""
        pass

from app.prompts import GENUI_SYSTEM_PROMPT, get_genui_user_prompt
from app.services.unsplash import search_unsplash

code_block_pattern = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)

_PROFILE_LLM = os.getenv("GENUI_PROFILE") == "1"


def _log_profile(label: str, start: float) -> None:
    if _PROFILE_LLM:
        elapsed_ms = (time.perf_counter() - start) * 1000
        print(f"[profile] {label}: {elapsed_ms:.1f}ms")

def _parse_json_payload(content: str) -> Any:
    stripped = content.strip()
    match = code_block_pattern.search(stripped)
    if match:
        stripped = match.group(1).strip()
    return json.loads(stripped)
# Initialize OpenAI client (lazy initialization)
_client: Optional[OpenAI] = None
_tokenc_client: Optional["TokenClient"] = None


def get_openai_client() -> OpenAI:
    """Get or create OpenAI client instance."""
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY environment variable is not set. "
                "Please set it in your .env file."
            )
        _client = OpenAI(api_key=api_key)
    return _client


def get_tokenc_client() -> Optional["TokenClient"]:
    """Get or create TokenC client if API key is configured."""
    global _tokenc_client
    if TokenClient is None:
        return None
    if _tokenc_client is not None:
        return _tokenc_client
    api_key = os.getenv("TOKENC_API_KEY")
    if not api_key:
        return None
    try:
        _tokenc_client = TokenClient(api_key=api_key)
        return _tokenc_client
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Warning: Failed to initialize TokenC client: {exc}")
        return None


def compress_user_prompt(prompt: str) -> str:
    """Compress user prompt via TokenC to reduce tokens if enabled."""
    client = get_tokenc_client()
    if not client:
        return prompt

    aggressiveness_value = os.getenv("TOKENC_AGGRESSIVENESS", "0.4")
    try:
        aggressiveness = float(aggressiveness_value)
    except ValueError:
        aggressiveness = 0.4

    try:
        response = client.compress_input(
            input=prompt,
            aggressiveness=max(0.1, min(0.9, aggressiveness)),
        )
        compressed = response.output.strip()
        if compressed:
            return compressed
    except TokenCError as exc:
        print(f"Warning: TokenC compression failed: {exc}")
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Warning: Unexpected TokenC compression error: {exc}")

    return prompt


def _resolve_unsplash_url(value: str) -> str | None:
    normalized = value.strip()
    if not normalized.lower().startswith("unsplash:"):
        return None
    query = normalized.split(":", 1)[1].strip()
    if not query:
        return None
    def _fetch(query_text: str) -> List[Dict[str, Any]]:
        fetch_start = time.perf_counter()
        results = search_unsplash(query=query_text, per_page=1)
        _log_profile(f"llm.unsplash_fetch[{query_text}]", fetch_start)
        return results

    results = _fetch(query)
    if not results:
        fallback_query = None
        if "," in query:
            fallback_query = query.split(",", 1)[0].strip()
        else:
            parts = query.split()
            if len(parts) > 2:
                fallback_query = " ".join(parts[:2])

        if fallback_query and fallback_query != query:
            results = _fetch(fallback_query)
            if results:
                query = fallback_query

    if not results and _PROFILE_LLM:
        print(f"[profile] llm.unsplash_fetch_no_results[{query}]")
    if not results:
        return None
    urls = results[0].get("urls") or {}
    return (
        urls.get("regular")
        or urls.get("small")
        or urls.get("full")
        or urls.get("raw")
    )


def _is_unsplash_placeholder(value: str) -> bool:
    return value.strip().lower().startswith("unsplash:")


def _hydrate_unsplash_sources(payload: Any) -> None:
    """Replace unsplash:<query> placeholders with real Unsplash image URLs."""
    messages = payload
    if isinstance(payload, dict):
        messages = payload.get("messages", [])

    def _walk(value: Any) -> Any:
        if isinstance(value, dict):
            for key, item in list(value.items()):
                value[key] = _walk(item)
            return value
        if isinstance(value, list):
            return [_walk(item) for item in value]
        if isinstance(value, str):
            if _is_unsplash_placeholder(value):
                resolved = _resolve_unsplash_url(value)
                return resolved if resolved else None
            return value
        return value

    for message in messages:
        if not isinstance(message, dict):
            continue

        if message.get("type") == "surfaceUpdate":
            components = message.get("components")
            if not isinstance(components, list):
                continue
            filtered_components: List[dict] = []
            for component in components:
                if not isinstance(component, dict):
                    continue
                comp_def = component.get("component")
                if not isinstance(comp_def, dict):
                    filtered_components.append(component)
                    continue

                removed = False
                for key in ("Image", "Icon"):
                    if key not in comp_def:
                        continue
                    props = comp_def.get(key)
                    if not isinstance(props, dict):
                        continue
                    source = props.get("source")
                    url_value = None
                    url_target = None

                    if isinstance(source, dict):
                        candidate_url = source.get("url")
                        if isinstance(candidate_url, str) and _is_unsplash_placeholder(candidate_url):
                            url_value = candidate_url
                            url_target = ("source", source)
                    elif isinstance(source, str) and _is_unsplash_placeholder(source):
                        url_value = source
                        url_target = ("source", props)

                    candidate_url_field = props.get("url")
                    if url_value is None and isinstance(candidate_url_field, str) and _is_unsplash_placeholder(candidate_url_field):
                        url_value = candidate_url_field
                        url_target = ("url", props)

                    if url_value is None:
                        continue

                    resolved = _resolve_unsplash_url(url_value)
                    if resolved:
                        if url_target and url_target[0] == "source":
                            if url_target[1] is props:
                                props["source"] = resolved
                            else:
                                url_target[1]["url"] = resolved
                        elif url_target and url_target[0] == "url":
                            props["url"] = resolved
                    else:
                        removed = True
                        break

                if not removed:
                    filtered_components.append(component)

            message["components"] = filtered_components
            continue

        if message.get("type") == "dataModelUpdate":
            data = message.get("data")
            if isinstance(data, dict):
                message["data"] = _walk(data)

def generate_json_with_unsplash(
    text: str,
    system_prompt: str,
    user_prompt: str,
    model: str = "gpt-4o",
    temperature: float = 0.7,
    max_tokens: int = 2000,
) -> List[Any]:
    llm_start = time.perf_counter()
    json_candidates = generate_json_response_candidates(
        text=text,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    _log_profile("llm.generate_candidates", llm_start)

    hydrate_start = time.perf_counter()
    for candidate in json_candidates:
        _hydrate_unsplash_sources(candidate)
    _log_profile("llm.hydrate_unsplash", hydrate_start)

    return json_candidates

def generate_json_response_candidates(
    text: str,
    system_prompt: str,
    user_prompt: Optional[str] = None,
    model: str = "gpt-4o",
    temperature: float = 0.7,
    max_tokens: int = 2000,
) -> List[Any]:
    """
    Generate JSON candidates from text using OpenAI GPT-4o.
    
    This base helper returns every completion choice from the OpenAI response,
    parsed into JSON so that callers can evaluate multiple candidates (if the API
    returns more than one).
    
    Args:
        text: The input text to process (e.g., transcript from user speech)
        system_prompt: System prompt that defines the task and expected JSON format
        user_prompt: Optional user prompt template. If None, uses default template.
            Use {text} placeholder to inject the text.
        model: OpenAI model to use (default: gpt-4o)
        temperature: Sampling temperature (0.0 to 2.0)
        max_tokens: Maximum tokens in response
        
    Returns:
        List of parsed JSON payloads (one per completion choice)
        
    Raises:
        ValueError: If API key is not set or response is empty
        OpenAIError: If API call fails
    """
    client = get_openai_client()
    
    # Default user prompt if not provided
    if user_prompt is None:
        user_prompt = "Generate JSON based on this input: {text}"
    
    # Format user prompt with the text (safe for JSON braces in prompts)
    formatted_user_prompt = user_prompt.replace("{text}", text)
    formatted_user_prompt = compress_user_prompt(formatted_user_prompt)
    
    def _extract_payload(payload: Any) -> Any:
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            messages = payload.get("messages")
            if isinstance(messages, list):
                return {"messages": messages, "summary": payload.get("summary")}
            raise ValueError("Response JSON object must include a 'messages' array.")
        raise ValueError("Response JSON must be either an array or an object with 'messages'.")
    
    code_block_pattern = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)
    
    def _parse_json_payload(content: str) -> Any:
        """Extract JSON even when wrapped in Markdown code fences."""
        stripped = content.strip()
        match = code_block_pattern.search(stripped)
        if match:
            stripped = match.group(1).strip()
        return json.loads(stripped)
    
    try:
        request_start = time.perf_counter()
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": formatted_user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        _log_profile("llm.openai_request", request_start)
        
        # Extract and parse each JSON content from the response
        json_candidates: List[Any] = []
        parse_errors: List[str] = []
        parse_start = time.perf_counter()
        for idx, choice in enumerate(response.choices):
            content = choice.message.content
            if not content:
                parse_errors.append(f"Choice {idx} returned empty content.")
                continue
            try:
                parsed_payload = _parse_json_payload(content)
                json_candidates.append(_extract_payload(parsed_payload))
            except (json.JSONDecodeError, ValueError) as exc:
                parse_errors.append(f"Choice {idx} invalid JSON: {exc}")
        
        if json_candidates:
            _log_profile("llm.parse_candidates", parse_start)
            return json_candidates
        
        if parse_errors:
            _log_profile("llm.parse_candidates", parse_start)
            raise ValueError(
                "OpenAI returned choices but none contained valid JSON. "
                + "; ".join(parse_errors)
            )
        
        _log_profile("llm.parse_candidates", parse_start)
        raise ValueError("Empty response from OpenAI")
        
    except OpenAIError as e:
        raise OpenAIError(f"OpenAI API error: {str(e)}") from e
    except Exception as e:
        raise RuntimeError(f"Unexpected error calling OpenAI: {str(e)}") from e


def get_genui_system_prompt() -> str:
    """
    Get the system prompt for generating GenUI schema JSON.
    Includes information about the GenUI schema format.
    """
    return GENUI_SYSTEM_PROMPT


def generate_genui_message_candidates(
    accumulated_text: str,
    current_text: str,
    deltas_summary: str | None = None,
    model: str = "gpt-4o",
    temperature: float = 0.7,
    max_tokens: int = 2000,
) -> List[Any]:
    """
    Generate GenUI schema JSON from accumulated and current text.
    
    Args:
        accumulated_text: All previous text from the session
        current_text: The most recent text input
        deltas_summary: Short summary of prior updates
        model: OpenAI model to use (default: gpt-4o)
        temperature: Sampling temperature (0.0 to 2.0)
        max_tokens: Maximum tokens in response
        
    Returns:
        List of parsed JSON payloads generated by the LLM (one per completion choice)
    """
    system_prompt = get_genui_system_prompt()
    
    # Combine accumulated and current text
    full_text = accumulated_text.strip()
    if full_text:
        full_text += " " + current_text.strip()
    else:
        full_text = current_text.strip()
    
    # Get user prompt from prompts module
    user_prompt = get_genui_user_prompt(
        accumulated_text,
        current_text,
        deltas_summary=deltas_summary,
    )
    print("LLM context:")
    print(f"- accumulated_text: {accumulated_text!r}")
    print(f"- deltas_summary: {deltas_summary!r}")
    print(f"- current_text: {current_text!r}")
    print(f"- full_text: {full_text!r}")
    print(f"- user_prompt: {user_prompt}")
    
    return generate_json_with_unsplash(
        text=full_text,
        system_prompt=system_prompt,
        user_prompt=compress_user_prompt(user_prompt),
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    )


__all__ = [
    "generate_json_response_candidates",
    "generate_json_with_unsplash",
    "get_openai_client",
    "generate_genui_message_candidates",
    "get_genui_system_prompt",
]
