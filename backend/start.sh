#!/bin/bash
cd /home/user/app/backend
mkdir -p ./data/pdfs ./data/chroma

# Write credentials to runtime file (Orchids dev environment)
python3 - <<PYEOF
import os
auth = os.environ.get('ANTHROPIC_AUTH_TOKEN', '') or os.environ.get('ANTHROPIC_API_KEY', '')
base = os.environ.get('ANTHROPIC_BASE_URL', '')
hdrs = os.environ.get('ANTHROPIC_CUSTOM_HEADERS', '')
if auth:
    os.makedirs('./data', exist_ok=True)
    with open('./data/.orchids_runtime', 'w') as f:
        f.write(f'ANTHROPIC_AUTH_TOKEN={auth}\nANTHROPIC_BASE_URL={base}\nANTHROPIC_CUSTOM_HEADERS={hdrs}\n')
    print(f'[start.sh] Credentials written. Token: {auth[:20]}...')
else:
    print('[start.sh] No credentials found in environment.')
PYEOF

PORT="${PORT:-8000}"

exec env \
  ANTHROPIC_AUTH_TOKEN="${ANTHROPIC_AUTH_TOKEN}" \
  ANTHROPIC_API_KEY="${ANTHROPIC_AUTH_TOKEN:-${ANTHROPIC_API_KEY}}" \
  ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL}" \
  ANTHROPIC_CUSTOM_HEADERS="${ANTHROPIC_CUSTOM_HEADERS}" \
  uvicorn main:app --host 0.0.0.0 --port "$PORT" --log-level warning
