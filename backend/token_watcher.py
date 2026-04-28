"""
Watches /proc/1/environ for token changes and rewrites .orchids_runtime.
Runs as a background thread inside the FastAPI process.
"""
import os
import time
import threading
import logging

logger = logging.getLogger(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUNTIME_FILE = os.path.join(BASE_DIR, "data", ".orchids_runtime")


def _read_proc_env():
    env = {}
    try:
        with open("/proc/1/environ", "rb") as f:
            for entry in f.read().split(b"\x00"):
                if b"=" in entry:
                    k, v = entry.split(b"=", 1)
                    env[k.decode(errors="replace")] = v.decode(errors="replace")
    except Exception:
        pass
    return env


def _write_runtime(env):
    auth = env.get("ANTHROPIC_AUTH_TOKEN", "")
    base = env.get("ANTHROPIC_BASE_URL", "")
    hdrs = env.get("ANTHROPIC_CUSTOM_HEADERS", "")
    os.makedirs(os.path.dirname(RUNTIME_FILE), exist_ok=True)
    with open(RUNTIME_FILE, "w") as f:
        f.write(f"ANTHROPIC_AUTH_TOKEN={auth}\nANTHROPIC_BASE_URL={base}\nANTHROPIC_CUSTOM_HEADERS={hdrs}\n")


def _read_runtime_token():
    try:
        with open(RUNTIME_FILE) as f:
            for line in f:
                if line.startswith("ANTHROPIC_AUTH_TOKEN="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return ""


def start_watcher():
    """Poll /proc/1/environ every 5s; update runtime file when token changes."""
    def _loop():
        while True:
            try:
                proc_env = _read_proc_env()
                new_token = proc_env.get("ANTHROPIC_AUTH_TOKEN", "")
                if new_token and new_token != _read_runtime_token():
                    logger.info("Token rotated — updating runtime credentials.")
                    _write_runtime(proc_env)
            except Exception as e:
                logger.warning(f"Token watcher error: {e}")
            time.sleep(5)

    t = threading.Thread(target=_loop, daemon=True)
    t.start()
    logger.info("Token watcher started.")
