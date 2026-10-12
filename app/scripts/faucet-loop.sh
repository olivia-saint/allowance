#!/usr/bin/env bash
# Keeps trying the public devnet faucet (it often runs dry and refills). Exits on success.
A=35shvgpo6JPgbYtGCz668U7PgxMBdkPgsPe8GukkdPBV
for i in $(seq 1 120); do
  B=$(curl -s --max-time 15 https://api.devnet.solana.com -X POST -H 'content-type: application/json' \
      -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getBalance\",\"params\":[\"$A\"]}" | grep -o '"value":[0-9]*' | cut -d: -f2)
  echo "$(date -u +%H:%M:%S) balance=${B:-?}"
  if [ "${B:-0}" -gt 1000000 ]; then echo "FUNDED"; exit 0; fi
  R=$(curl -s --max-time 15 https://api.devnet.solana.com -X POST -H 'content-type: application/json' \
      -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"requestAirdrop\",\"params\":[\"$A\",1000000000]}")
  echo "  airdrop: $(echo "$R" | head -c 160)"
  echo "$R" | grep -q '"result"' && { echo "AIRDROPPED"; exit 0; }
  sleep 180
done
