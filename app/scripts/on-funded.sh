#!/usr/bin/env bash
# Watches the business key for devnet SOL, then runs the one-time devnet setup straight away.
# Safe to leave running: the setup script is idempotent and refuses mainnet.
cd "$(dirname "$0")/.." || exit 1
LOG=/workspace/projects/allowance/faucet-setup.log
ADDR=35shvgpo6JPgbYtGCz668U7PgxMBdkPgsPe8GukkdPBV
for _ in $(seq 1 500); do
  BAL=$(curl -s --max-time 15 https://api.devnet.solana.com -X POST -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getBalance\",\"params\":[\"$ADDR\"]}" \
    | grep -o '"value":[0-9]*' | cut -d: -f2)
  echo "$(date -u +%H:%M:%S) balance=${BAL:-unknown}" >> "$LOG"
  if [ -n "$BAL" ] && [ "$BAL" -ge 10000000 ]; then
    echo "$(date -u +%H:%M:%S) FUNDED — running devnet setup" >> "$LOG"
    node scripts/setup-devnet.mjs >> "$LOG" 2>&1
    echo "$(date -u +%H:%M:%S) setup finished (exit $?)" >> "$LOG"
    touch /workspace/projects/allowance/FUNDED
    exit 0
  fi
  sleep 60
done
echo "$(date -u +%H:%M:%S) gave up waiting" >> "$LOG"
