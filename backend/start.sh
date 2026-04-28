#!/bin/bash
cd /home/user/app/backend
mkdir -p ./data

exec env \
  ANTHROPIC_AUTH_TOKEN="${ANTHROPIC_AUTH_TOKEN}" \
  ANTHROPIC_API_KEY="${ANTHROPIC_AUTH_TOKEN:-${ANTHROPIC_API_KEY}}" \
  ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL}" \
  ANTHROPIC_CUSTOM_HEADERS="${ANTHROPIC_CUSTOM_HEADERS}" \
  uvicorn main:app --host 0.0.0.0 --port 8000 --log-level warning
