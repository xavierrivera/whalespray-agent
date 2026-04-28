#!/bin/bash
cd /home/user/app/backend
mkdir -p ./data

# Write current Orchids credentials to runtime file (python will read this on each request)
python3 -c "
import os
auth = os.environ.get('ANTHROPIC_AUTH_TOKEN', '')
base = os.environ.get('ANTHROPIC_BASE_URL', '')
hdrs = os.environ.get('ANTHROPIC_CUSTOM_HEADERS', '')
with open('./data/.orchids_runtime', 'w') as f:
    f.write(f'ANTHROPIC_AUTH_TOKEN={auth}\nANTHROPIC_BASE_URL={base}\nANTHROPIC_CUSTOM_HEADERS={hdrs}\n')
print('Credentials written.')
"

exec env \
  ANTHROPIC_AUTH_TOKEN="${ANTHROPIC_AUTH_TOKEN}" \
  ANTHROPIC_API_KEY="${ANTHROPIC_AUTH_TOKEN:-${ANTHROPIC_API_KEY}}" \
  ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL}" \
  ANTHROPIC_CUSTOM_HEADERS="${ANTHROPIC_CUSTOM_HEADERS}" \
  uvicorn main:app --host 0.0.0.0 --port 8000 --log-level warning
