

# Godot OpenCode MCP Fork

This repo is a Godot engine fork focused on built-in MCP workflows for OpenCode.

It includes:
- Godot editor-side MCP server under `editor/debugger/opencode_mcp`
- Expanded MCP tools for scene, node, script, resource, signal, shader, theme, and project operations
- OpenCode stdio bridge under `misc/opencode_mcp_bridge`
- OpenCode config installer command (`npm run install-config` in `misc/opencode_mcp_bridge`) that upserts `mcp.godot-opencode`

## Quick setup

For a new computer, clone this repo and use the one-command setup script from the repo root.

```powershell
git clone https://github.com/chen9916/godot-opencode-mcp.git
cd godot-opencode-mcp
.\setup-godot-opencode-mcp.ps1 --project-root "C:\path\to\your\Godot\project"
```

Windows CMD users can run:

```cmd
setup-godot-opencode-mcp.cmd --project-root "C:\path\to\your\Godot\project"
```

Linux/macOS users can run:

```bash
./setup-godot-opencode-mcp.sh --project-root "/path/to/your/Godot/project"
```

The setup script:

- Validates Node.js 20+.
- Installs bridge dependencies.
- Builds the TypeScript bridge.
- Adds or updates `mcp.godot-opencode` in the current user's OpenCode config.
- Points OpenCode at the cloned bridge path on that computer.
- Prints the remaining Godot editor steps.

The setup script does not build or replace the Godot editor binary. The target computer must use a Godot editor built from this MCP-enabled source tree.

The setup script also does not create `.godot/opencode_mcp/session.json`. That file is runtime state created by the running Godot editor for the opened project.

## Required Local Steps

1. Install Node.js 20+.
2. Install OpenCode for the current user.
3. Build Godot editor from this fork, or copy/use an editor binary built from this fork.
4. Open your Godot project with that editor.
5. Enable `Editor Settings -> network/opencode_mcp/enabled = true`.
6. Run the setup script with `--project-root` pointing to that Godot project.
7. Restart or start OpenCode from that project.

To build the Godot editor from source, run from the repo root:

```bash
python -m pip install "scons>=4.0"
scons platform=windows target=editor dev_mode=yes
```

For other platforms, swap `platform=windows` for `linuxbsd` or `macos`.
Built editor binaries are written to `bin/`.

## Docs

- Engine MCP protocol docs: `editor/debugger/opencode_mcp/README.md`
- Bridge docs and troubleshooting: `misc/opencode_mcp_bridge/README.md`

## Upstream Godot

This branch is based on Godot. For upstream engine documentation and general project info, see:
- https://github.com/godotengine/godot
- https://docs.godotengine.org
