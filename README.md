# Godot OpenCode MCP Fork

This repo is a Godot engine fork focused on built-in MCP workflows for OpenCode.

It includes:
- Godot editor-side MCP server under `editor/debugger/opencode_mcp`
- Expanded MCP tools for scene, node, script, resource, signal, shader, theme, and project operations
- OpenCode stdio bridge under `misc/opencode_mcp_bridge`
- OpenCode config installer command that upserts `mcp.godot-opencode`

## Quick setup

1. Build Godot editor from this fork (run from repo root):

```bash
python -m pip install "scons>=4.0"
scons platform=windows target=editor dev_mode=yes
```

For other platforms, swap `platform=windows` for `linuxbsd` or `macos`.
Built editor binaries are written to `bin/`.

2. Build the bridge package:

```bash
cd misc/opencode_mcp_bridge
npm ci
npm run build
```

3. Install OpenCode MCP config:

```bash
node dist/main.js --install-opencode-config --project-root "<path-to-godot-project>"
```

4. Restart OpenCode.
5. In Godot Editor Settings, enable `network/opencode_mcp/enabled`.
6. If needed, click `Refresh MCP Session` under `network/opencode_mcp`.

## Docs

- Engine MCP protocol docs: `editor/debugger/opencode_mcp/README.md`
- Bridge docs and troubleshooting: `misc/opencode_mcp_bridge/README.md`

## Upstream Godot

This branch is based on Godot. For upstream engine documentation and general project info, see:
- https://github.com/godotengine/godot
- https://docs.godotengine.org
