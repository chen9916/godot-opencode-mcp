import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const script_dir = path.dirname(fileURLToPath(import.meta.url));
const bridge_root = path.resolve(script_dir, "..");
const package_name = "godot-opencode-mcp-bridge";

function parse_args(argv) {
	const options = {
		output: path.join(bridge_root, "portable", package_name),
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case "--output": {
				i++;
				if (i >= argv.length) {
					throw new Error("--output requires a path value.");
				}
				options.output = path.resolve(argv[i]);
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
		"Build a portable OpenCode Godot MCP bridge folder.",
		"",
		"Usage:",
		"  npm run portable -- [--output <path>]",
		"",
		"Default output:",
		`  ${path.join("portable", package_name)}`,
	].join("\n") + "\n");
}

function npm_command() {
	return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function run(command, args, cwd) {
	await new Promise((resolve, reject) => {
		const child = spawn(command, args, { cwd, shell: process.platform === "win32", stdio: "inherit" });
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

async function path_exists(file_path) {
	try {
		await fs.access(file_path);
		return true;
	} catch {
		return false;
	}
}

async function copy_required(src, dst) {
	if (!(await path_exists(src))) {
		throw new Error(`Required path is missing: ${src}`);
	}
	await fs.cp(src, dst, { recursive: true });
}

async function write_file(file_path, content, mode) {
	await fs.writeFile(file_path, content, "utf8");
	if (mode !== undefined) {
		try {
			await fs.chmod(file_path, mode);
		} catch {
			// chmod is best effort on Windows.
		}
	}
}

async function write_launchers(output_dir) {
	await write_file(path.join(output_dir, "run-bridge.cmd"), [
		"@echo off",
		"node \"%~dp0dist\\main.js\" %*",
		"",
	].join("\r\n"));

	await write_file(path.join(output_dir, "install-opencode-config.cmd"), [
		"@echo off",
		"node \"%~dp0dist\\main.js\" --install-opencode-config %*",
		"",
	].join("\r\n"));

	await write_file(path.join(output_dir, "setup.cmd"), [
		"@echo off",
		"node \"%~dp0setup.mjs\" %*",
		"",
	].join("\r\n"));

	await write_file(path.join(output_dir, "run-bridge.ps1"), [
		"$ErrorActionPreference = \"Stop\"",
		"$Root = Split-Path -Parent $MyInvocation.MyCommand.Path",
		"$Main = Join-Path $Root \"dist/main.js\"",
		"& node $Main @args",
		"exit $LASTEXITCODE",
		"",
	].join("\n"));

	await write_file(path.join(output_dir, "install-opencode-config.ps1"), [
		"$ErrorActionPreference = \"Stop\"",
		"$Root = Split-Path -Parent $MyInvocation.MyCommand.Path",
		"$Main = Join-Path $Root \"dist/main.js\"",
		"& node $Main --install-opencode-config @args",
		"exit $LASTEXITCODE",
		"",
	].join("\n"));

	await write_file(path.join(output_dir, "setup.ps1"), [
		"$ErrorActionPreference = \"Stop\"",
		"$Root = Split-Path -Parent $MyInvocation.MyCommand.Path",
		"$Setup = Join-Path $Root \"setup.mjs\"",
		"& node $Setup @args",
		"exit $LASTEXITCODE",
		"",
	].join("\n"));

	await write_file(path.join(output_dir, "run-bridge.sh"), [
		"#!/usr/bin/env sh",
		"set -eu",
		"DIR=$(CDPATH= cd -- \"$(dirname -- \"$0\")\" && pwd)",
		"exec node \"$DIR/dist/main.js\" \"$@\"",
		"",
	].join("\n"), 0o755);

	await write_file(path.join(output_dir, "install-opencode-config.sh"), [
		"#!/usr/bin/env sh",
		"set -eu",
		"DIR=$(CDPATH= cd -- \"$(dirname -- \"$0\")\" && pwd)",
		"exec node \"$DIR/dist/main.js\" --install-opencode-config \"$@\"",
		"",
	].join("\n"), 0o755);

	await write_file(path.join(output_dir, "setup.sh"), [
		"#!/usr/bin/env sh",
		"set -eu",
		"DIR=$(CDPATH= cd -- \"$(dirname -- \"$0\")\" && pwd)",
		"exec node \"$DIR/setup.mjs\" \"$@\"",
		"",
	].join("\n"), 0o755);
}

async function main() {
	const options = parse_args(process.argv.slice(2));
	if (options.help) {
		print_help();
		return;
	}

	const output_dir = path.resolve(options.output);
	await run(npm_command(), ["run", "build"], bridge_root);

	await fs.rm(output_dir, { recursive: true, force: true });
	await fs.mkdir(output_dir, { recursive: true });

	await copy_required(path.join(bridge_root, "dist"), path.join(output_dir, "dist"));
	await copy_required(path.join(bridge_root, "package.json"), path.join(output_dir, "package.json"));
	await copy_required(path.join(bridge_root, "package-lock.json"), path.join(output_dir, "package-lock.json"));
	await copy_required(path.join(bridge_root, "PORTABLE_DEPLOYMENT.md"), path.join(output_dir, "README.md"));
	await copy_required(path.join(bridge_root, "scripts", "setup.mjs"), path.join(output_dir, "setup.mjs"));

	await write_launchers(output_dir);
	await run(npm_command(), ["ci", "--omit=dev"], output_dir);

	process.stdout.write(`Portable bridge written to: ${output_dir}\n`);
}

void main().catch((error) => {
	process.stderr.write(`Portable package failed: ${error instanceof Error ? error.message : String(error)}\n`);
	process.exit(1);
});
