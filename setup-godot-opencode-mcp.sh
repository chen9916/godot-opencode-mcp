#!/usr/bin/env sh
set -eu
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$DIR/misc/opencode_mcp_bridge/scripts/setup.mjs" "$@"
