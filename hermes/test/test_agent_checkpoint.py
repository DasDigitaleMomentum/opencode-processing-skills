"""Hermes agent-checkpoint plugin tests.

Dependency-free unittest suite driving the plugin module with fake ctx/hook
payloads, the installer in isolated homes, the pinned Hermes CLI (disable
path), and the shared cross-adapter inspection tooling.

Fails clearly (never skips) when the pinned `hermes` binary or `node` is
absent for the tests that require them.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "hermes" / "agent-checkpoint"))

import agent_checkpoint as ac  # noqa: E402

FIXTURES = REPO_ROOT / "packages" / "checkpoint-core" / "fixtures"
CORE_SRC = REPO_ROOT / "packages" / "checkpoint-core" / "src" / "index.js"
INSPECT_BIN = REPO_ROOT / "packages" / "checkpoint-core" / "bin" / "checkpoint-inspect.js"
WATCH_BIN = REPO_ROOT / "packages" / "checkpoint-core" / "bin" / "checkpoint-watch.js"
CODEX_RUNTIME = REPO_ROOT / "codex" / "checkpoint-mcp-runtime.mjs"
CLAUDE_RUNTIME = REPO_ROOT / "claude" / "agent-checkpoint" / "server" / "checkpoint-mcp-runtime.mjs"

HERMES = shutil.which("hermes")
NODE = shutil.which("node")

EXPECTED_DESCRIPTION_MD = (
    "---\n"
    "description: Plan-driven engineering workflows for documentation, planning, "
    "phased execution, reviews, and handovers.\n"
    "---\n"
)


def require_node():
    if NODE is None:
        raise unittest.TestCase.failureException(
            "node binary not found on PATH; required for cross-adapter parity tests"
        )


def require_hermes():
    if HERMES is None:
        raise unittest.TestCase.failureException(
            "hermes binary not found on PATH; pinned Hermes v0.19.0 is required for this suite"
        )


class FakeCtx:
    def __init__(self):
        self.tools = {}
        self.hooks = {}

    def register_tool(self, name, **kwargs):
        self.tools[name] = kwargs

    def register_hook(self, hook_name, callback):
        self.hooks[hook_name] = callback


class PluginTestCase(unittest.TestCase):
    def setUp(self):
        ac._reset_state()
        self._env_limit = os.environ.pop("AGENT_CHECKPOINT_CONTEXT_LIMIT_TOKENS", None)
        self._tmp = tempfile.TemporaryDirectory(prefix="hermes-checkpoint-test-")
        self.addCleanup(self._tmp.cleanup)
        self.workspace = Path(self._tmp.name) / "workspace"
        self.workspace.mkdir()
        self._cwd = os.getcwd()
        os.chdir(self.workspace)
        self.addCleanup(self._restore_cwd)

    def tearDown(self):
        if self._env_limit is not None:
            os.environ["AGENT_CHECKPOINT_CONTEXT_LIMIT_TOKENS"] = self._env_limit
        ac._reset_state()

    def _restore_cwd(self):
        os.chdir(self._cwd)

    def start_session(self, session_id="hermes-sess"):
        ac._on_session_start(session_id=session_id)

    def bind_call(self, session_id="hermes-sess", tool_name="checkpoint"):
        ac._on_pre_tool_call(
            tool_name=tool_name, session_id=session_id, task_id="task", tool_call_id="call"
        )

    def read_records(self, relative_path):
        text = (self.workspace / relative_path).read_text(encoding="utf-8")
        return text, [json.loads(line) for line in text.splitlines()]


class RegistrationTests(unittest.TestCase):
    def test_register_wires_two_tools_and_three_hooks(self):
        ctx = FakeCtx()
        ac.register(ctx)
        self.assertEqual(sorted(ctx.tools), ["checkpoint", "checkpoint_path"])
        self.assertEqual(
            sorted(ctx.hooks), ["on_session_start", "pre_api_request", "pre_tool_call"]
        )
        self.assertEqual(ctx.tools["checkpoint"]["schema"]["name"], "checkpoint")
        self.assertEqual(ctx.tools["checkpoint_path"]["schema"]["name"], "checkpoint_path")
        self.assertEqual(ctx.tools["checkpoint"]["toolset"], "agent-checkpoint")

    def test_tool_handlers_dispatch_through_registered_schema(self):
        ctx = FakeCtx()
        ac.register(ctx)
        ac._reset_state()
        with tempfile.TemporaryDirectory() as tmp:
            cwd = os.getcwd()
            os.chdir(tmp)
            self.addCleanup(os.chdir, cwd)
            ac._on_session_start(session_id="wired")
            ac._on_pre_tool_call(tool_name="checkpoint", session_id="wired")
            result = ctx.tools["checkpoint"]["handler"]({"done": "One two three", "next": "Four five six"})
            self.assertIn("Checkpoint saved.", result)
            path_result = ctx.tools["checkpoint_path"]["handler"]({"session_id": "wired"})
            self.assertEqual(path_result, ".agent-checkpoints/wired.jsonl")


class CheckpointWriteTests(PluginTestCase):
    def test_eight_field_record_with_null_metadata(self):
        self.start_session()
        self.bind_call()
        result = ac.checkpoint("Review pilot scope", "Create inspection command")
        self.assertIn("Checkpoint saved.", result)
        _, records = self.read_records(".agent-checkpoints/hermes-sess.jsonl")
        self.assertEqual(len(records), 1)
        record = records[0]
        self.assertEqual(sorted(record.keys()), sorted(ac.RECORD_FIELDS))
        self.assertEqual(record["session_id"], "hermes-sess")
        self.assertEqual(record["done"], "Review pilot scope")
        self.assertEqual(record["next"], "Create inspection command")
        self.assertIs(record["step_failed"], False)
        self.assertIsNone(record["context_used"])
        self.assertIsNone(record["agent"])
        self.assertIsNone(record["session_title"])
        self.assertTrue(ac._is_valid_utc_timestamp(record["timestamp"]))
        ac._validate_record(record)

    def test_repeated_appends_and_step_failed(self):
        self.start_session()
        self.bind_call()
        ac.checkpoint("First done step", "Second done step")
        self.bind_call()
        ac.checkpoint("Second done step", "Third done step", step_failed=True)
        _, records = self.read_records(".agent-checkpoints/hermes-sess.jsonl")
        self.assertEqual(len(records), 2)
        self.assertIs(records[0]["step_failed"], False)
        self.assertIs(records[1]["step_failed"], True)
        self.assertEqual(records[0]["next"], records[1]["done"])

    def test_validation_rejects_bad_inputs_without_partial_append(self):
        self.start_session()
        self.bind_call()
        with self.assertRaises(TypeError):
            ac.checkpoint(None, "Next step label")
        with self.assertRaises(TypeError):
            ac.checkpoint("Done step label", 42)
        with self.assertRaises(TypeError):
            ac.checkpoint("Done step label", "Next step label", step_failed="yes")
        self.assertFalse((self.workspace / ".agent-checkpoints").exists())

    def test_session_mismatch_fails_visibly(self):
        self.start_session("session-a")
        ac._on_pre_tool_call(tool_name="checkpoint", session_id="session-b")
        with self.assertRaisesRegex(ValueError, "session mismatch"):
            ac.checkpoint("Done step label", "Next step label")
        self.assertFalse((self.workspace / ".agent-checkpoints").exists())

    def test_unknown_session_fails_visibly(self):
        with self.assertRaisesRegex(ValueError, "no bound Hermes session"):
            ac.checkpoint("Done step label", "Next step label")

    def test_pre_tool_call_binds_payload_session_id(self):
        ac._on_pre_tool_call(
            tool_name="checkpoint", session_id="payload-sess", task_id="t", tool_call_id="c"
        )
        ac.checkpoint("Done step label", "Next step label")
        _, records = self.read_records(".agent-checkpoints/payload-sess.jsonl")
        self.assertEqual(records[0]["session_id"], "payload-sess")

    def test_pre_tool_call_ignores_other_tools(self):
        self.start_session("hermes-sess")
        ac._on_pre_tool_call(tool_name="terminal", session_id="other-sess")
        ac.checkpoint("Done step label", "Next step label")
        _, records = self.read_records(".agent-checkpoints/hermes-sess.jsonl")
        self.assertEqual(records[0]["session_id"], "hermes-sess")

    def test_record_rejects_non_object_and_field_sets(self):
        with self.assertRaises(TypeError):
            ac._validate_record(["not", "a", "dict"])
        legacy = {
            "timestamp": "2026-07-26T14:30:00.000Z",
            "session_id": "s",
            "done": "d",
            "next": "n",
            "step_failed": False,
            "context_used": None,
        }
        ac._validate_record(dict(legacy))
        seven = dict(legacy)
        seven["agent"] = None
        with self.assertRaises(TypeError):
            ac._validate_record(seven)
        extra = dict(legacy, agent=None, session_title=None)
        extra["remaining_tokens"] = 12
        with self.assertRaises(TypeError):
            ac._validate_record(extra)

    def test_record_field_type_ranges(self):
        base = {
            "timestamp": "2026-07-26T14:30:00.000Z",
            "session_id": "s",
            "done": "d",
            "next": "n",
            "step_failed": False,
            "context_used": None,
            "agent": None,
            "session_title": None,
        }
        ac._validate_record(dict(base))
        for bad in (-0.1, 1.1, float("nan"), float("inf"), "0.5", True):
            with self.assertRaises(TypeError, msg=f"context_used={bad!r}"):
                ac._validate_record(dict(base, context_used=bad))
        for good in (0, 0.5, 1):
            ac._validate_record(dict(base, context_used=good))
        with self.assertRaises(TypeError):
            ac._validate_record(dict(base, session_id=""))
        with self.assertRaises(TypeError):
            ac._validate_record(dict(base, step_failed=0))
        with self.assertRaises(TypeError):
            ac._validate_record(dict(base, agent="   "))
        with self.assertRaises(TypeError):
            ac._validate_record(dict(base, timestamp="2026-13-26T14:30:00.000Z"))
        with self.assertRaises(TypeError):
            ac._validate_record(dict(base, timestamp="2026-07-26 14:30:00"))
        ac._validate_record(dict(base, timestamp="2026-07-26T14:30:00Z"))
        ac._validate_record(dict(base, agent="maintainer", session_title="Demo"))


class PathParityTests(PluginTestCase):
    def test_fixture_path_cases_match_shared_contract(self):
        cases = json.loads((FIXTURES / "checkpoint-cases.json").read_text(encoding="utf-8"))
        for case in cases["pathCases"]:
            with self.subTest(sessionId=case["sessionId"]):
                self.assertEqual(ac.checkpoint_path(case["sessionId"]), case["path"])

    def test_writes_stay_contained_under_checkpoint_dir(self):
        self.start_session("../outside")
        self.bind_call("../outside")
        ac.checkpoint("Done step label", "Next step label")
        contained = self.workspace / ".agent-checkpoints" / "..%2Foutside.jsonl"
        self.assertTrue(contained.exists())
        self.assertFalse((self.workspace / "outside.jsonl").exists())
        self.assertFalse((self.workspace.parent / "outside.jsonl").exists())

    def test_unicode_session_id_encoding(self):
        self.assertEqual(ac.checkpoint_path("München"), ".agent-checkpoints/M%C3%BCnchen.jsonl")
        with self.assertRaises(TypeError):
            ac.checkpoint_path("")
        with self.assertRaises(TypeError):
            ac.checkpoint_path(None)


class TelemetryTests(PluginTestCase):
    def test_estimate_with_known_model_limit(self):
        self.start_session()
        self.bind_call()
        ac._on_pre_api_request(
            approx_input_tokens=84000, model="claude-sonnet-4-6", session_id="hermes-sess"
        )
        result = ac.checkpoint("Done step label", "Next step label")
        self.assertIn("~42%", result)
        _, records = self.read_records(".agent-checkpoints/hermes-sess.jsonl")
        self.assertAlmostEqual(records[0]["context_used"], 0.42)

    def test_env_override_supplies_limit_for_unknown_model(self):
        os.environ["AGENT_CHECKPOINT_CONTEXT_LIMIT_TOKENS"] = "100000"
        self.start_session()
        self.bind_call()
        ac._on_pre_api_request(approx_input_tokens=25000, model="mystery-model")
        result = ac.checkpoint("Done step label", "Next step label")
        self.assertIn("~25%", result)
        _, records = self.read_records(".agent-checkpoints/hermes-sess.jsonl")
        self.assertAlmostEqual(records[0]["context_used"], 0.25)

    def test_null_fallback_without_pre_api_request_data(self):
        self.start_session()
        self.bind_call()
        result = ac.checkpoint("Done step label", "Next step label")
        self.assertIn("unknown", result)
        _, records = self.read_records(".agent-checkpoints/hermes-sess.jsonl")
        self.assertIsNone(records[0]["context_used"])

    def test_null_fallback_on_invalid_payload_clears_slot(self):
        self.start_session()
        self.bind_call()
        ac._on_pre_api_request(approx_input_tokens=84000, model="claude-sonnet-4-6")
        for invalid in (-1, float("nan"), "84000", True, None):
            ac._on_pre_api_request(approx_input_tokens=invalid, model="claude-sonnet-4-6")
            context_used, remaining_k = ac._telemetry()
            self.assertIsNone(context_used, msg=f"invalid={invalid!r}")
            self.assertIsNone(remaining_k, msg=f"invalid={invalid!r}")

    def test_null_fallback_on_unknown_model(self):
        ac._on_pre_api_request(approx_input_tokens=1000, model="totally-unknown-model")
        context_used, remaining_k = ac._telemetry()
        self.assertIsNone(context_used)
        self.assertIsNone(remaining_k)

    def test_estimate_clamped_to_unit_interval(self):
        ac._on_pre_api_request(approx_input_tokens=999999, model="gpt-4")
        context_used, _ = ac._telemetry()
        self.assertEqual(context_used, 1.0)

    def test_gpt4_family_model_limits(self):
        cases = {
            "gpt-4": 4096,
            "gpt-4-32k": 16384,
            "gpt-4-turbo": 64000,
            "gpt-4-turbo-2024-04-09": 64000,
            "gpt-4o": 64000,
        }
        for model, approx in cases.items():
            with self.subTest(model=model):
                ac._reset_state()
                ac._on_pre_api_request(approx_input_tokens=approx, model=model)
                context_used, _ = ac._telemetry()
                self.assertAlmostEqual(context_used, 0.5)

    def test_unlisted_gpt4_variant_falls_back_to_null(self):
        ac._on_pre_api_request(approx_input_tokens=1000, model="gpt-4-nextgen")
        context_used, remaining_k = ac._telemetry()
        self.assertIsNone(context_used)
        self.assertIsNone(remaining_k)


class LegacyReadTests(unittest.TestCase):
    def test_legacy_six_field_records_normalize_with_null_metadata(self):
        legacy = {
            "timestamp": "2026-07-26T14:30:00.000Z",
            "session_id": "pilot-successful",
            "done": "Review pilot scope",
            "next": "Create inspection command",
            "step_failed": False,
            "context_used": None,
        }
        normalized = ac._normalize_record(legacy)
        self.assertIsNone(normalized["agent"])
        self.assertIsNone(normalized["session_title"])
        self.assertEqual(normalized["done"], "Review pilot scope")


class FixtureParityTests(PluginTestCase):
    def test_pilot_fixtures_validate_and_normalize(self):
        pilot = FIXTURES / "pilot"
        files = sorted(pilot.glob("*.jsonl"))
        self.assertGreater(len(files), 0)
        for fixture in files:
            with self.subTest(fixture=fixture.name):
                for line in fixture.read_text(encoding="utf-8").splitlines():
                    ac._normalize_record(json.loads(line))

    def test_analysis_case_records_validate(self):
        cases = json.loads((FIXTURES / "checkpoint-cases.json").read_text(encoding="utf-8"))
        for case in cases["analysisCases"]:
            for record in case["records"]:
                ac._normalize_record(record)

    def test_hermes_output_is_byte_compatible_contract_jsonl(self):
        self.start_session("München")
        self.bind_call("München")
        ac.checkpoint("Done step label", "Next step label")
        text, records = self.read_records(".agent-checkpoints/M%C3%BCnchen.jsonl")
        line = text.splitlines()[0]
        self.assertNotIn('": ', line, "JSONL must use compact separators like the JS core")
        self.assertIn("München", line, "JSONL must carry UTF-8 literals like JSON.stringify")
        self.assertEqual(
            list(records[0].keys()),
            ["timestamp", "session_id", "done", "next", "step_failed", "context_used",
             "agent", "session_title"],
        )

    def test_js_core_parses_hermes_produced_log(self):
        require_node()
        self.start_session()
        self.bind_call()
        ac.checkpoint("Review pilot scope", "Create inspection command")
        ac._on_pre_api_request(approx_input_tokens=84000, model="claude-sonnet-4-6")
        self.bind_call()
        ac.checkpoint("Create inspection command", "Run focused tests", step_failed=True)
        log_path = self.workspace / ".agent-checkpoints" / "hermes-sess.jsonl"
        script = (
            f'import {{ parseCheckpointJsonl, analyzeCheckpoints }} from "{CORE_SRC.as_posix()}";'
            f'import {{ readFile }} from "node:fs/promises";'
            f'const records = parseCheckpointJsonl(await readFile("{log_path.as_posix()}", "utf8"));'
            "const analysis = analyzeCheckpoints(records);"
            "if (records.length !== 2) throw new Error('expected 2 records');"
            "if (analysis.chainPercent !== 100) throw new Error('chain must match');"
            "if (records[1].step_failed !== true) throw new Error('step_failed lost');"
            "if (Math.abs(records[1].context_used - 0.42) > 1e-9) throw new Error('telemetry lost');"
        )
        result = subprocess.run(
            [NODE, "--input-type=module", "-e", script],
            capture_output=True, text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_no_hook_or_telemetry_state_persisted(self):
        self.start_session()
        self.bind_call()
        ac._on_pre_api_request(approx_input_tokens=84000, model="claude-sonnet-4-6")
        ac.checkpoint("Done step label", "Next step label")
        text, records = self.read_records(".agent-checkpoints/hermes-sess.jsonl")
        self.assertEqual(sorted(records[0].keys()), sorted(ac.RECORD_FIELDS))
        for forbidden in ("84000", "remaining", "percent", "claude-sonnet", ".jsonl", "approx"):
            self.assertNotIn(forbidden, text)


class InstallerTestCase(unittest.TestCase):
    """Subprocess installer runs with a disposable HERMES_HOME."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory(prefix="hermes-installer-test-")
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)
        self.home = self.root / "home"
        self.home.mkdir()
        self.hermes_home = self.root / "hermes"
        self.hermes_home.mkdir()

    def run_installer_result(self, args=(), cwd=None, sync_hermes="true"):
        config_file = self.root / "installer.yaml"
        config_file.write_text("", encoding="utf-8")
        env = dict(os.environ)
        env.update({
            "HOME": str(self.home),
            "OPS_CONFIG_FILE": str(config_file),
            "OPS_OPENCODE_HOME": str(self.root / "opencode"),
            "OPS_HERMES_HOME": str(self.hermes_home),
            "OPS_SYNC_CODEX": "false",
            "OPS_SYNC_CLAUDE": "false",
            "OPS_SYNC_CURSOR": "false",
            "OPS_SYNC_HERMES": sync_hermes,
            "OPS_ANTIGRAVITY_PATH": str(self.root / "absent-antigravity"),
        })
        return subprocess.run(
            ["bash", str(REPO_ROOT / "install.sh"), *args],
            cwd=cwd or self.root, env=env, capture_output=True, text=True,
        )

    def run_installer(self):
        result = self.run_installer_result()
        self.assertEqual(
            result.returncode, 0, f"installer failed:\n{result.stdout}\n{result.stderr}"
        )
        return result.stdout

    def write_config(self, content):
        config = self.hermes_home / "config.yaml"
        config.write_text(content, encoding="utf-8")
        return config

    def assert_preserved_except_additive(self, before, after, added_lines, removed_ok=()):
        from collections import Counter

        before_counts = Counter(before.splitlines())
        after_counts = Counter(after.splitlines())
        removed = list((before_counts - after_counts).elements())
        self.assertEqual(set(removed), set(removed_ok), f"unexpected removed lines: {removed}")
        added = list((after_counts - before_counts).elements())
        self.assertEqual(added, added_lines, f"unexpected added lines: {added}")
        # Every preexisting line keeps its relative order (subsequence check),
        # allowing only the sanctioned rewrite of a removed_ok line.
        surviving = [line for line in before.splitlines() if line not in removed_ok]
        position = 0
        for line in after.splitlines():
            if position < len(surviving) and line == surviving[position]:
                position += 1
        self.assertEqual(
            position, len(surviving), "preexisting config content was reordered"
        )


class InstallerIsolationTests(InstallerTestCase):
    def test_plugin_files_installed(self):
        self.run_installer()
        dest = self.hermes_home / "plugins" / "agent-checkpoint"
        for name in ("plugin.yaml", "agent_checkpoint.py", "__init__.py", "README.md"):
            self.assertTrue((dest / name).is_file(), f"missing {name}")

    def test_config_created_when_absent(self):
        output = self.run_installer()
        config = self.hermes_home / "config.yaml"
        self.assertEqual(
            config.read_text(encoding="utf-8"),
            "plugins:\n  enabled:\n    - agent-checkpoint\n",
        )
        self.assertIn("agent-checkpoint", output)

    def test_config_preserved_when_no_plugins_key(self):
        before = "model: gpt-4\nverbose: true\ncustom:\n  key: value\n"
        config = self.write_config(before)
        self.run_installer()
        after = config.read_text(encoding="utf-8")
        self.assertEqual(
            after,
            before + "plugins:\n  enabled:\n    - agent-checkpoint\n",
        )

    def test_config_preserved_with_plugins_block_without_enabled(self):
        before = (
            "_config_version: 33\n"
            "plugins:\n"
            "  disabled:\n"
            "    - other-plugin\n"
            "security:\n"
            "  redact_secrets: true\n"
        )
        config = self.write_config(before)
        self.run_installer()
        after = config.read_text(encoding="utf-8")
        self.assertEqual(
            after,
            "_config_version: 33\n"
            "plugins:\n"
            "  enabled:\n"
            "    - agent-checkpoint\n"
            "  disabled:\n"
            "    - other-plugin\n"
            "security:\n"
            "  redact_secrets: true\n",
        )

    def test_config_preserved_with_existing_enabled_entries(self):
        before = (
            "_config_version: 33\n"
            "plugins:\n"
            "  enabled:\n"
            "    - disk-cleanup\n"
            "    - spotify\n"
            "other: value\n"
        )
        config = self.write_config(before)
        self.run_installer()
        after = config.read_text(encoding="utf-8")
        self.assert_preserved_except_additive(before, after, ["    - agent-checkpoint"])
        self.assertIn("    - disk-cleanup\n    - spotify\n    - agent-checkpoint\n", after)

    def test_config_preserved_with_inline_empty_enabled_list(self):
        before = (
            "_config_version: 33\n"
            "plugins:\n"
            "  enabled: []\n"
            "  disabled:\n"
            "    - other-plugin\n"
            "\n"
            "# comment block\n"
            "model: gpt-4\n"
        )
        config = self.write_config(before)
        self.run_installer()
        after = config.read_text(encoding="utf-8")
        self.assert_preserved_except_additive(
            before,
            after,
            ["  enabled:", "    - agent-checkpoint"],
            removed_ok=("  enabled: []",),
        )

    def test_disabled_plugin_entry_stops_loudly(self):
        # Hermes' deny-list vetoes even enabled-listed plugins; only the
        # documented `hermes plugins enable` flow may remove the entry.
        before = (
            "_config_version: 33\n"
            "plugins:\n"
            "  enabled: []\n"
            "  disabled:\n"
            "    - agent-checkpoint\n"
            "\n"
            "# comment block\n"
            "model: gpt-4\n"
        )
        config = self.write_config(before)
        result = self.run_installer_result()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("plugins.disabled", result.stderr)
        self.assertIn("hermes plugins enable agent-checkpoint", result.stderr)
        self.assertEqual(config.read_text(encoding="utf-8"), before)

    def test_inline_disabled_list_stops_loudly(self):
        before = "_config_version: 33\nplugins:\n  disabled: [agent-checkpoint]\n"
        config = self.write_config(before)
        result = self.run_installer_result()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("plugins.disabled", result.stderr)
        self.assertIn("hermes plugins enable agent-checkpoint", result.stderr)
        self.assertEqual(config.read_text(encoding="utf-8"), before)

    def test_inline_plugins_dict_stops_loudly(self):
        before = "plugins: {enabled: [other-plugin]}\nmodel: gpt-4\n"
        config = self.write_config(before)
        result = self.run_installer_result()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unsupported inline plugins form", result.stderr)
        self.assertIn("hermes plugins enable agent-checkpoint", result.stderr)
        self.assertEqual(config.read_text(encoding="utf-8"), before)

    def test_disabled_target_skips_plugin(self):
        result = self.run_installer_result(sync_hermes="false")
        self.assertEqual(
            result.returncode, 0, f"installer failed:\n{result.stdout}\n{result.stderr}"
        )
        self.assertFalse((self.hermes_home / "plugins" / "agent-checkpoint").exists())
        self.assertFalse((self.hermes_home / "config.yaml").exists())

    def test_project_mode_skips_plugin(self):
        project = self.root / "project"
        project.mkdir()
        result = self.run_installer_result(args=("--project",), cwd=project)
        self.assertEqual(
            result.returncode, 0, f"installer failed:\n{result.stdout}\n{result.stderr}"
        )
        self.assertFalse((self.hermes_home / "plugins" / "agent-checkpoint").exists())
        self.assertFalse((self.hermes_home / "config.yaml").exists())

    def test_idempotent_second_run(self):
        self.run_installer()
        config = self.hermes_home / "config.yaml"
        first = config.read_text(encoding="utf-8")
        snapshot = {
            path.relative_to(self.hermes_home): path.read_bytes()
            for path in (self.hermes_home / "plugins").rglob("*")
            if path.is_file()
        }
        output = self.run_installer()
        self.assertEqual(config.read_text(encoding="utf-8"), first)
        self.assertIn("Present: config.yaml plugins.enabled entry", output)
        for relative, content in snapshot.items():
            self.assertEqual((self.hermes_home / relative).read_bytes(), content)

    def test_symlinked_plugin_destination_preserved(self):
        plugins_dir = self.hermes_home / "plugins"
        plugins_dir.mkdir()
        elsewhere = self.root / "elsewhere"
        elsewhere.mkdir()
        sentinel = elsewhere / "sentinel.txt"
        sentinel.write_text("keep me", encoding="utf-8")
        (plugins_dir / "agent-checkpoint").symlink_to(elsewhere)
        output = self.run_installer()
        link = plugins_dir / "agent-checkpoint"
        self.assertTrue(link.is_symlink())
        self.assertEqual(link.resolve(), elsewhere.resolve())
        self.assertEqual(sentinel.read_text(encoding="utf-8"), "keep me")
        self.assertIn("Symlink (skipping): plugins/agent-checkpoint", output)
        # Enablement still applies (the symlink makes the plugin present).
        config = (self.hermes_home / "config.yaml").read_text(encoding="utf-8")
        self.assertIn("    - agent-checkpoint", config)

    def test_skills_output_and_description_unchanged(self):
        self.run_installer()
        skills = self.hermes_home / "skills" / "processing"
        skill_names = sorted(
            path.name for path in (REPO_ROOT / "skills").iterdir() if path.is_dir()
        )
        installed = sorted(
            path.name for path in skills.iterdir() if path.is_dir()
        )
        self.assertEqual(installed, skill_names)
        for name in skill_names:
            self.assertTrue((skills / name / "SKILL.md").is_file())
        description = skills / "DESCRIPTION.md"
        self.assertEqual(
            description.read_text(encoding="utf-8"), EXPECTED_DESCRIPTION_MD
        )

    def test_disable_and_removal_path(self):
        require_hermes()
        self.run_installer()
        env = dict(os.environ, HERMES_HOME=str(self.hermes_home))

        def plugins_list():
            result = subprocess.run(
                [HERMES, "plugins", "list", "--json"],
                env=env, capture_output=True, text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            return {entry["name"]: entry for entry in json.loads(result.stdout)}

        entries = plugins_list()
        self.assertIn("agent-checkpoint", entries)
        self.assertEqual(entries["agent-checkpoint"]["status"], "enabled")
        self.assertEqual(entries["agent-checkpoint"]["source"], "user")

        disabled = subprocess.run(
            [HERMES, "plugins", "disable", "agent-checkpoint"],
            env=env, capture_output=True, text=True,
        )
        self.assertEqual(disabled.returncode, 0, disabled.stderr)
        entries = plugins_list()
        self.assertEqual(entries["agent-checkpoint"]["status"], "disabled")

        shutil.rmtree(self.hermes_home / "plugins" / "agent-checkpoint")
        entries = plugins_list()
        self.assertNotIn("agent-checkpoint", entries)


class InspectionParityTests(PluginTestCase):
    """checkpoint-inspect and checkpoint-watch read all four harness logs."""

    NODE_DRIVER = """
import * as checkpointCore from {core};
import {{ createMcpRuntime as createCodex }} from {codex};
import {{ createMcpRuntime as createClaude }} from {claude};

const workspace = process.env.PARITY_WORKSPACE;
const codex = createCodex({{ checkpointCore }});
const codexResult = await codex.callTool("checkpoint", {{
  done: "Codex session checked",
  next: "Codex next step",
  _workspace_root: workspace,
  _checkpoint_session_id: "codex-sess",
}});
if (JSON.stringify(codexResult).includes("requires")) throw new Error("codex write failed");
process.env.CLAUDE_PROJECT_DIR = workspace;
const claude = createClaude({{ checkpointCore }});
const claudeResult = await claude.callTool("checkpoint", {{
  done: "Claude session checked",
  next: "Claude next step",
  _checkpoint_session_id: "claude-sess",
  _telemetry_session_id: "claude-sess",
}});
if (JSON.stringify(claudeResult).includes("requires")) throw new Error("claude write failed");
"""

    def run_node(self, script, cwd):
        require_node()
        result = subprocess.run(
            [NODE, "--input-type=module", "-e", script],
            cwd=cwd, capture_output=True, text=True,
            env=dict(os.environ, PARITY_WORKSPACE=str(self.workspace)),
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def test_cross_adapter_inspection_parity(self):
        require_node()
        # core/pilot fixture log
        checkpoint_dir = self.workspace / ".agent-checkpoints"
        checkpoint_dir.mkdir()
        shutil.copy(
            FIXTURES / "pilot" / "successful.jsonl",
            checkpoint_dir / "pilot-successful.jsonl",
        )
        # real Codex/Claude-format records via the adapters' own runtimes
        driver = self.NODE_DRIVER.format(
            core=repr(CORE_SRC.as_uri()),
            codex=repr(CODEX_RUNTIME.as_uri()),
            claude=repr(CLAUDE_RUNTIME.as_uri()),
        )
        self.run_node(driver, self.workspace)
        # Hermes log via the plugin
        self.start_session("hermes-sess")
        self.bind_call("hermes-sess")
        ac.checkpoint("Hermes session checked", "Hermes next step")

        logs = {
            "pilot-successful.jsonl": "pilot-successful",
            "codex-sess.jsonl": "codex-sess",
            "claude-sess.jsonl": "claude-sess",
            "hermes-sess.jsonl": "hermes-sess",
        }
        self.assertEqual(
            sorted(path.name for path in checkpoint_dir.glob("*.jsonl")), sorted(logs)
        )
        for filename, session in logs.items():
            with self.subTest(log=filename):
                result = subprocess.run(
                    [NODE, str(INSPECT_BIN), f".agent-checkpoints/{filename}"],
                    cwd=self.workspace, capture_output=True, text=True,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn(f"Session: {session}", result.stdout)
                self.assertIn("Work status:", result.stdout)
        # checkpoint-watch --once reads all four unchanged
        watch = subprocess.run(
            [NODE, str(WATCH_BIN), "--once"],
            cwd=self.workspace, capture_output=True, text=True,
        )
        self.assertEqual(watch.returncode, 0, watch.stderr)
        # The dashboard truncates the SESSION column; assert each harness row
        # via its unique session-id prefix.
        for prefix in ("pilot-s", "codex-s", "claude-", "hermes-"):
            self.assertIn(prefix, watch.stdout)
        # step-1 guard: inspection works through a symlinked bin path
        link_dir = Path(self._tmp.name) / "linked-bin"
        link_dir.mkdir()
        (link_dir / "checkpoint-inspect.js").symlink_to(INSPECT_BIN)
        via_link = subprocess.run(
            [NODE, str(link_dir / "checkpoint-inspect.js"),
             ".agent-checkpoints/hermes-sess.jsonl"],
            cwd=self.workspace, capture_output=True, text=True,
        )
        self.assertEqual(via_link.returncode, 0, via_link.stderr)
        self.assertIn("Session: hermes-sess", via_link.stdout)


if __name__ == "__main__":
    unittest.main()
