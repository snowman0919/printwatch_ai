#!/usr/bin/env python3
import json
import re
import stat
import sys
from pathlib import Path

REQUIRED = {
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "OLLAMA_BASE_URL",
    "OLLAMA_MODEL",
    "DEVICE_TOKENS_JSON",
}
PRINTERS = {"printer-1", "printer-2", "printer-3"}


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values


def validate(values: dict[str, str]) -> list[str]:
    errors = [f"missing {key}" for key in sorted(REQUIRED) if not values.get(key)]
    errors += [f"replace placeholder {key}" for key in sorted(REQUIRED) if "replace" in values.get(key, "").lower()]
    if values.get("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") and not values["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"].startswith("pk_live_"):
        errors.append("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a production key")
    if values.get("CLERK_SECRET_KEY") and not values["CLERK_SECRET_KEY"].startswith("sk_live_"):
        errors.append("CLERK_SECRET_KEY must be a production key")
    if values.get("OLLAMA_BASE_URL") and values["OLLAMA_BASE_URL"].rstrip("/") != "http://100.90.167.128:11434/v1":
        errors.append("OLLAMA_BASE_URL must target the approved Ollama endpoint")
    if values.get("OLLAMA_MODEL") and values["OLLAMA_MODEL"] != "Qwythos-v2-9B:Q4":
        errors.append("OLLAMA_MODEL must be Qwythos-v2-9B:Q4")
    try:
        tokens = json.loads(values.get("DEVICE_TOKENS_JSON", ""))
        if set(tokens) != PRINTERS:
            errors.append("DEVICE_TOKENS_JSON must contain exactly printer-1, printer-2, printer-3")
        elif any(not isinstance(token, str) or re.fullmatch(r"[A-Za-z0-9_-]{24,}", token) is None for token in tokens.values()):
            errors.append("every device token must be at least 24 URL-safe characters")
        elif len(set(tokens.values())) != 3:
            errors.append("device tokens must be unique")
    except (json.JSONDecodeError, TypeError):
        errors.append("DEVICE_TOKENS_JSON must be valid JSON")
    return errors


def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else ".env")
    if not path.is_file():
        print(f"missing {path}", file=sys.stderr)
        return 2
    if stat.S_IMODE(path.stat().st_mode) != 0o600:
        print(f"{path} must have mode 600", file=sys.stderr)
        return 2
    errors = validate(read_env(path))
    if errors:
        print("invalid production environment:", file=sys.stderr)
        print("\n".join(f"- {error}" for error in errors), file=sys.stderr)
        return 2
    print("production environment: valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
