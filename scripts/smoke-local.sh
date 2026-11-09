#!/usr/bin/env bash
set -euo pipefail

# Use a new database and no working-tree dev server.
state_dir=$(mktemp -d)
log_file="$state_dir/server.log"
server_pid=
cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -rf -- "$state_dir"
}
trap cleanup EXIT

for migration in drizzle/*.sql; do
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js \
    d1 execute DB --local --config dist/server/wrangler.json \
    --persist-to "$state_dir" --file "$migration"
done

VINEXT_NO_DEV_LOCK=1 BRIDGE_LOCAL_D1_PATH="$state_dir" node node_modules/vinext/dist/cli.js dev --hostname 127.0.0.1 --port 5174 >"$log_file" 2>&1 &
server_pid=$!
if ! node tests/browser.test.mjs; then
  cat "$log_file"
  exit 1
fi
