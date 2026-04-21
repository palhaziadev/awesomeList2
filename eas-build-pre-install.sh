#!/usr/bin/env bash
set -euo pipefail

if [ -n "${GOOGLE_SERVICES_JSON:-}" ]; then
  echo "$GOOGLE_SERVICES_JSON" > google-services.json
  echo "google-services.json written from EAS secret."
else
  echo "WARNING: GOOGLE_SERVICES_JSON secret not set."
fi
