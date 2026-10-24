import re
import ipaddress
from urllib.parse import urlparse
from backend.app.core.config import settings

SAFE_DEV_PORTS = {5001, 3000, 5173, 8000, 8080, 8001}

def is_url_allowed(url: str) -> bool:
    """
    Validates target URL against safety boundaries.
    Only allows HTTP/HTTPS schemes and whitelisted hosts.
    Prevents loopback access outside allowed dev targets, AWS/GCP cloud metadata (169.254.169.254, metadata.google.internal),
    and private internal infrastructure IP ranges.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
            
        hostname = parsed.hostname
        if not hostname:
            return False

        hostname_lower = hostname.lower()

        # 1. Block cloud metadata endpoints
        if (
            hostname_lower == "169.254.169.254"
            or hostname_lower.startswith("169.254.")
            or "metadata.google" in hostname_lower
            or "metadata.internal" in hostname_lower
        ):
            return False

        # 2. Permitted Local Development Targets (DevStore on port 5001 or standard test dev servers)
        if hostname_lower in ("127.0.0.1", "localhost"):
            port = parsed.port or (80 if parsed.scheme == "http" else 443)
            # Allow loopback ONLY on permitted development/sample app ports
            if port in SAFE_DEV_PORTS:
                return True
            return False

        # 3. Check Explicit Domain Whitelist
        for allowed in settings.ALLOWED_HOSTS:
            if hostname_lower == allowed.lower() or hostname_lower.endswith("." + allowed.lower()):
                return True

        # 4. If ALLOW_ALL_HOSTS is enabled, still enforce strict protection against private/internal CIDRs
        if getattr(settings, "ALLOW_ALL_HOSTS", False) or "*" in settings.ALLOWED_HOSTS:
            try:
                ip = ipaddress.ip_address(hostname)
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
                    return False
            except ValueError:
                # Hostname is a domain name (not an IP literal)
                pass
            return True

        return False
    except Exception:
        return False

def sanitize_logs(text: str) -> str:
    """Redacts sensitive credentials, tokens, and passwords from logs and prompts."""
    if not text:
        return ""
    # Redact passwords
    text = re.sub(r'(password["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', r'\1[REDACTED]\3', text, flags=re.IGNORECASE)
    # Redact API keys / tokens
    text = re.sub(r'(token["\']?\s*[:=]\s*["\'])([^"\']+)(["\'])', r'\1[REDACTED]\3', text, flags=re.IGNORECASE)
    # Redact authorization headers
    text = re.sub(r'(authorization["\']?\s*[:=]\s*["\'])(Bearer\s+[^"\']+)(["\'])', r'\1Bearer [REDACTED]\3', text, flags=re.IGNORECASE)
    return text
