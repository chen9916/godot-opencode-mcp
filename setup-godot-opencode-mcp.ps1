$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Setup = Join-Path $Root "misc/opencode_mcp_bridge/scripts/setup.mjs"
& node $Setup @args
exit $LASTEXITCODE
