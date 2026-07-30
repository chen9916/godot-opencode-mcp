#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MIN_NODE_MAJOR = 20;

function parse_args(argv) {
	const options = {
		install_deps: true,
		build: true,
		install_opencode_config: true,
		dry_run: false,
		force_deps: false,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case "--project-root": {
				i++;
				if (i >= argv.length) {
					throw new Error("--project-root requires a path value.");
				}
				options.project_root = path.resolve(argv[i]);
			} break;
			case "--session-file": {
				i++;
				if (i >= argv.length) {
					throw new Error("--session-file requires a path value.");
				}
				options.session_file = path.resolve(argv[i]);
			} break;
			case "--config-path": {
				i++;
				if (i >= argv.length) {
					throw new Error("--config-path requires a path value.");
				}
				options.config_path = path.resolve(argv[i]);
			} break;
			case "--skip-deps": {
				options.install_deps = false;
			} break;
			case "--skip-build": {
				options.build = false;
			} break;
			case "--skip-opencode-config": {
				options.install_opencode_config = false;
			} break;
			case "--force-deps": {
				options.force_deps = true;
			} break;
			case "--check-only": {
				options.install_deps = false;
				options.build = false;
				options.install_opencode_config = false;
			} break;
			case "--dry-run": {
				options.dry_run = true;
			} break;
			case "--help":
			case "-h": {
				options.help = true;
			} break;
			default:
				throw new Error(`Unknown argument: ${arg}`);
		}
	}

	return options;
}

function print_help() {
	process.stdout.write([
		"Set up the OpenCode Godot MCP bridge on this machine.",
		"",
		"Usage from a source checkout:",
		"  node misc/opencode_mcp_bridge/scripts/setup.mjs [options]",
		"  npm run setup -- [options]",
		"",
		"Usage from a portable bridge folder:",
		"  node setup.mjs [options]",
		"",
		"Options:",
		"  --project-root <path>       Optional Godot project root to pin in OpenCode config.",
		"  --session-file <path>       Optional explicit .godot/opencode_mcp/session.json path.",
		"  --config-path <path>        Optional OpenCode config file override.",
		"  --skip-deps                 Do not run npm ci.",
		"  --skip-build                Do not build TypeScript sources.",
		"  --skip-opencode-config      Do not update OpenCode config.",
		"  --force-deps                Run npm ci even when node_modules exists in a portable copy.",
		"  --check-only                Validate paths/runtime only; make no changes.",
		"  --dry-run                   Print commands without running them.",
		"  --help                      Show this help text.",
	].join("\n") + "\n");
}

async function exists(file_path) {
	try {
		await fs.access(file_path);
		return true;
	} catch {
		return false;
	}
}

async function read_json(file_path) {
	return JSON.parse(await fs.readFile(file_path, "utf8"));
}

function npm_command() {
	return process.platform === "win32" ? "npm.cmd" : "npm";
}

function node_command() {
	return process.execPath || "node";
}

function quote_arg(arg) {
	return /\s/.test(arg) ? `"${arg}"` : arg;
}

async function run(command, args, cwd, dry_run) {
	const rendered = [command, ...args].map(quote_arg).join(" ");
	process.stdout.write(`> ${rendered}\n`);
	if (dry_run) {
		return;
	}

	await new Promise((resolve, reject) => {
		const child = spawn(command, args, { cwd, shell: process.platform === "win32" && /\.cmd$/i.test(command), stdio: "inherit" });
		child.on("error", reject);
		child.on("exit", (code, signal) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`${command} ${args.join(" ")} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}.`));
		});
	});
}

async function find_bridge_root() {
	const script_path = fileURLToPath(import.meta.url);
	const script_dir = path.dirname(script_path);
	const candidates = [script_dir, path.resolve(script_dir, "..")];

	for (const candidate of candidates) {
		const package_path = path.join(candidate, "package.json");
		if (!(await exists(package_path))) {
			continue;
		}
		try {
			const package_json = await read_json(package_path);
			if (package_json.name === "opencode-godot-mcp-bridge") {
				return candidate;
			}
		} catch {
			// Keep looking.
		}
	}

	throw new Error("Could not locate opencode-godot-mcp-bridge package root.");
}

async function find_repo_root_from_bridge(bridge_root) {
	let cursor = bridge_root;
	while (true) {
		if (await exists(path.join(cursor, "editor", "debugger", "opencode_mcp", "opencode_mcp_server.cpp"))) {
			return cursor;
		}

		const parent = path.dirname(cursor);
		if (parent === cursor) {
			return null;
		}
		cursor = parent;
	}
}

async function list_godot_binaries(repo_root) {
	if (!repo_root) {
		return [];
	}
	const bin_dir = path.join(repo_root, "bin");
	if (!(await exists(bin_dir))) {
		return [];
	}

	const entries = await fs.readdir(bin_dir);
	return entries
		.filter((entry) => /^godot/i.test(entry) && !/\.(exp|lib|pdb)$/i.test(entry))
		.map((entry) => path.join(bin_dir, entry));
}

function check_node_version() {
	const major = Number.parseInt(process.versions.node.split(".")[0], 10);
	if (!Number.isInteger(major) || major < MIN_NODE_MAJOR) {
		throw new Error(`Node.js ${MIN_NODE_MAJOR}+ is required. Current Node.js is ${process.versions.node}.`);
	}
}

async function validate_project_root(project_root) {
	if (!project_root) {
		return ["No --project-root provided. The bridge will auto-detect a session from OpenCode cwd or recent Godot projects."];
	}

	if (!(await exists(project_root))) {
		throw new Error(`Project root does not exist: ${project_root}`);
	}

	if (!(await exists(path.join(project_root, "project.godot")))) {
		return [`Project root does not contain project.godot: ${project_root}`];
	}

	return [];
}

async function maybe_install_dependencies(bridge_root, source_checkout, options) {
	if (!options.install_deps) {
		return;
	}

	const node_modules_path = path.join(bridge_root, "node_modules");
	if (!source_checkout && !options.force_deps && await exists(node_modules_path)) {
		process.stdout.write("Portable node_modules already present. Skipping npm ci.\n");
		return;
	}

	const args = source_checkout ? ["ci"] : ["ci", "--omit=dev"];
	await run(npm_command(), args, bridge_root, options.dry_run);
}

async function maybe_build(bridge_root, source_checkout, options) {
	const main_path = path.join(bridge_root, "dist", "main.js");
	if (source_checkout && options.build) {
		await run(npm_command(), ["run", "build"], bridge_root, options.dry_run);
		return;
	}

	if (!(await exists(main_path)) && !options.dry_run) {
		throw new Error(`Bridge runtime is missing: ${main_path}. Run without --skip-build from a source checkout, or rebuild the portable package.`);
	}
}

async function maybe_install_opencode_config(bridge_root, options) {
	if (!options.install_opencode_config) {
		return;
	}

	const args = [path.join(bridge_root, "dist", "main.js"), "--install-opencode-config"];
	if (options.project_root) {
		args.push("--project-root", options.project_root);
	}
	if (options.session_file) {
		args.push("--session-file", options.session_file);
	}
	if (options.config_path) {
		args.push("--config-path", options.config_path);
	}

	await run(node_command(), args, bridge_root, options.dry_run);
}

async function main() {
	const options = parse_args(process.argv.slice(2));
	if (options.help) {
		print_help();
		return;
	}

	check_node_version();

	const bridge_root = await find_bridge_root();
	const source_checkout = await exists(path.join(bridge_root, "src", "main.ts"));
	const repo_root = await find_repo_root_from_bridge(bridge_root);
	const project_warnings = await validate_project_root(options.project_root);

	process.stdout.write(`Bridge root: ${bridge_root}\n`);
	process.stdout.write(`Mode: ${source_checkout ? "source checkout" : "portable copy"}\n`);
	process.stdout.write(`Node.js: ${process.versions.node}\n`);

	for (const warning of project_warnings) {
		process.stdout.write(`Warning: ${warning}\n`);
	}

	await maybe_install_dependencies(bridge_root, source_checkout, options);
	await maybe_build(bridge_root, source_checkout, options);
	await maybe_install_opencode_config(bridge_root, options);

	const binaries = await list_godot_binaries(repo_root);
	if (binaries.length > 0) {
		process.stdout.write(`Godot binaries found: ${binaries.join(", ")}\n`);
	} else {
		process.stdout.write("Warning: No built Godot editor binary was found under this repo's bin directory. Build or install a Godot editor that includes editor/debugger/opencode_mcp.\n");
	}

	const completion_label = options.dry_run ? "Dry run complete." : (!options.install_deps && !options.build && !options.install_opencode_config ? "Check complete." : "Setup complete.");
	process.stdout.write([
		"",
		completion_label,
		"Next steps:",
		"1. Open the target project in the custom Godot editor.",
		"2. Enable Editor Settings -> network/opencode_mcp/enabled.",
		"3. Restart OpenCode so it reloads mcp.godot-opencode.",
		"4. If the bridge cannot find a session, rerun setup with --project-root pointing at the Godot project that contains project.godot.",
	].join("\n") + "\n");
}

void main().catch((error) => {
	process.stderr.write(`Setup failed: ${error instanceof Error ? error.message : String(error)}\n`);
	process.exit(1);
});
