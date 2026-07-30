# OpenCode Godot MCP bridge

This package exposes a local MCP stdio server for OpenCode and forwards tool calls to Godot's editor-hosted JSON-RPC endpoint.

## What it does

- Reads Godot session metadata from `.godot/opencode_mcp/session.json`.
- Connects to `127.0.0.1:<session-port>` and forwards tool calls to Godot JSON-RPC.
- Exposes `godot.*` MCP tools for scene/node/script/resource operations.
- Can install a local OpenCode MCP config entry.

## Tool mapping

- `godot.scene.get_active` -> `scene.get_active`
- `godot.scene.get_tree` -> `scene.get_tree`
- `godot.node.get_properties` -> `node.get_properties`
- `godot.node.get_properties_batch` -> `node.get_properties_batch`
- `godot.node.create` -> `node.create`
- `godot.node.create_batch` -> `node.create_batch`
- `godot.node.create_from_template` -> `node.create_from_template`
- `godot.node.delete` -> `node.delete`
- `godot.node.delete_batch` -> `node.delete_batch`
- `godot.node.duplicate` -> `node.duplicate`
- `godot.node.duplicate_batch` -> `node.duplicate_batch`
- `godot.node.reparent` -> `node.reparent`
- `godot.node.set_properties` -> `node.set_properties`
- `godot.node.set_properties_batch` -> `node.set_properties_batch`
- `godot.script.get_active` -> `script.get_active`
- `godot.script.get` -> `script.get`
- `godot.script.apply_text_edits` -> `script.apply_text_edits`
- `godot.lsp` -> `lsp.query`
- `godot.script.attach` -> `script.attach`
- `godot.resource.save` -> `resource.save`
- `godot.resource.reload` -> `resource.reload`
- `godot.resource.create` -> `resource.create`
- `godot.resource.set_properties` -> `resource.set_properties`
- `godot.docs.class_lookup` -> `docs.class_lookup`
- `godot.docs.member_lookup` -> `docs.member_lookup`
- `godot.docs.search` -> `docs.search`
- `godot.docs.inheritance` -> `docs.inheritance`
- `godot.docs.examples` -> `docs.examples`
- `godot.docs.list_versions` -> `docs.list_versions`

`godot.scene.get_tree` accepts optional `root_path` to inspect a subtree directly.
`godot.script.get_active` and `godot.script.get` support workspace-aware resolution via `workspace` (`auto`, `scene_view`, `script_editor`).
In `script_editor` workspace, source/version come from the active tab buffer.
`godot.script.apply_text_edits` requires non-empty `edits`, and can resolve the target from `script_path`, `node_path`, or `workspace` when both are omitted.
In `script_editor` workspace, edits apply to the active tab buffer first, then sync to the script resource.
`godot.lsp` supports `goToDefinition`, `findReferences`, `hover`, and `documentSymbol` for GDScript targets.
When `workspace=script_editor` and `script_path` is provided, it must match the active tab script path or the call returns conflict.
`godot.script.attach` supports workspace-aware defaults (`node_path` from selected node, `script_path` from active tab in `script_editor` workspace).
Batch node mutations (`godot.node.create_batch`, `godot.node.duplicate_batch`, `godot.node.delete_batch`, `godot.node.set_properties_batch`) accept `mode` (`atomic` or `best_effort`) and return per-item results with `item_id` correlation.
`godot.node.create_batch` and `godot.node.create_from_template` support `preview_only` dry-run validation.
`godot.node.set_properties`, `godot.resource.create`, and `godot.resource.set_properties` accept either `properties` or `property_entries` (`[{ name, value }]`) for deterministic payloads.
For deterministic mutation, use one of `properties` or `property_entries` (not both).
Typed coercion accepts vectors (array/dict), colors (`Color(r,g,b[,a])`/hex/array/dict), and resource refs (`res://`, `uid://`, `{path}`, `{uid}`, or `null`).
`godot.resource.save` returns conflict if disk state diverged; use `godot.resource.reload` to sync from disk before saving.
After successful script or resource edits, call `godot.resource.save` to persist changes to disk.
Docs tools read from Godot's runtime help database, so built-in and indexed script class docs share the same source as the editor Help panel.

## Capability map

- `read_scene`: `scene.get_active`, `scene.get_tree`, `node.get_properties`, `node.get_properties_batch`
- `write_scene`: `node.create`, `node.create_batch`, `node.create_from_template`, `node.delete`, `node.delete_batch`, `node.duplicate`, `node.duplicate_batch`, `node.reparent`, `node.set_properties`, `node.set_properties_batch`, `script.attach`
- `read_script`: `script.get_active`, `script.get`, `lsp.query`
- `write_script`: `script.apply_text_edits`
- `save_resource`: `resource.save`, `resource.reload`
- `write_resource`: `resource.create`, `resource.set_properties`
- `read_docs`: `docs.class_lookup`, `docs.member_lookup`, `docs.search`, `docs.inheritance`, `docs.examples`, `docs.list_versions`

## Prerequisites

- Node.js 20+
- OpenCode installed for the current user.
- A Godot editor binary built from a source tree that includes `editor/debugger/opencode_mcp`.
- Godot editor running with OpenCode MCP enabled:
  - `Editor Settings -> network/opencode_mcp/enabled = true`

## Deployment specification

The bridge is deployable in two supported forms:

- Source checkout: the full Godot source tree is copied/downloaded to the new PC, then `setup-godot-opencode-mcp.*` installs dependencies, builds the bridge, and configures OpenCode from that location.
- Portable bridge folder: `npm run portable` produces `portable/godot-opencode-mcp-bridge`, which can be copied to a new PC and initialized there with `setup.*` without rebuilding TypeScript.

The setup command completes every machine-local bridge step that can be automated:

- Validates Node.js 20+.
- Installs bridge dependencies when running from source.
- Builds `dist/main.js` when running from source.
- Validates bundled `dist/main.js` and `node_modules` when running from a portable copy.
- Upserts `mcp.godot-opencode` into the current user's OpenCode config with the absolute path for the folder on that PC.
- Accepts `--project-root`, `--session-file`, and `--config-path` for explicit deployment targets.

The setup command intentionally does not copy session metadata. `.godot/opencode_mcp/session.json` is runtime state generated by the currently running Godot editor, contains the editor process ID and port, and expires.

The setup command also cannot replace the Godot editor binary. The target PC must use an editor build that includes the Godot-side MCP server in `editor/debugger/opencode_mcp`.

## Install and build

```bash
npm ci
npm run typecheck
npm run build
```

## One-command setup

From this package:

```bash
npm run setup -- --project-root "<path-to-godot-project>"
```

From the repository root:

```bash
./setup-godot-opencode-mcp.sh --project-root "<path-to-godot-project>"
```

On Windows, use `setup-godot-opencode-mcp.ps1` or `setup-godot-opencode-mcp.cmd` from the repository root.

The setup command verifies Node.js, installs bridge dependencies, builds `dist`, upserts `mcp.godot-opencode` in the current user's OpenCode config, and prints the remaining Godot editor steps.

For copy-to-another-PC deployment, build `portable/godot-opencode-mcp-bridge` with:

```bash
npm run portable
```

Then run `setup.ps1`, `setup.cmd`, or `setup.sh` from the copied portable folder.

## Run bridge manually

From this folder:

```bash
node dist/main.js
```

Session discovery defaults to current working directory and walks upward to find `.godot/opencode_mcp/session.json`.

Optional flags:

- `--project-root "<path-to-godot-project>"`
- `--session-file "<absolute-path-to-session.json>"`
- `--timeout-ms 15000`

## Install OpenCode MCP config

This command upserts `mcp.godot-opencode` into `%USERPROFILE%/.config/opencode/opencode.json` with a local command entry.

```bash
node dist/main.js --install-opencode-config
```

Optional: add `--project-root "<path-to-godot-project>"` to pin a project explicitly.

Optional config target override:

```bash
node dist/main.js --install-opencode-config --config-path "C:/Users/<you>/.config/opencode/opencode.json"
```

The installer is idempotent and creates a timestamped backup before writing.

## Manual OpenCode config entry (fallback)

```json
{
  "mcp": {
    "godot-opencode": {
      "type": "local",
      "command": [
        "node",
        "C:/.../misc/opencode_mcp_bridge/dist/main.js"
      ],
      "enabled": true
    }
  }
}
```

## Troubleshooting

- `SESSION_ERROR: Session file not found`
  - Open the project in Godot and enable `network/opencode_mcp/enabled`.
- `SESSION_ERROR: Session metadata is expired`
  - Restart or toggle the MCP setting in the editor.
- `TRANSPORT_ERROR: Could not connect`
  - Confirm the editor is running and `session.json` port matches the active session.

## Security notes

- Godot endpoint is localhost-only (`127.0.0.1`).
