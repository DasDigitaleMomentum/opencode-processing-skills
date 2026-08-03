"""Hermes agent-checkpoint plugin tests.

Dependency-free unittest suite driving the plugin module with fake ctx/hook
payloads, the installer in isolated homes, the pinned Hermes CLI (disable
path), and the shared cross-adapter inspection tooling.

Fails clearly (never skips) when the pinned `hermes` binary or `node` is
absent for the tests that require them.
"""

import json
import os
import re
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
OPENCODE_RUNTIME = REPO_ROOT / "opencode" / "checkpoint-runtime.mjs"
CODEX_HOOK = REPO_ROOT / "codex" / "checkpoint-hook.mjs"
CLAUDE_HOOK = REPO_ROOT / "claude" / "agent-checkpoint" / "scripts" / "checkpoint-hook.mjs"

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
    result = subprocess.run(
        [HERMES, "--version"], capture_output=True, text=True
    )
    if result.returncode != 0:
        raise unittest.TestCase.failureException(
            f"could not read Hermes version: {result.stderr or result.stdout}"
        )
    output = f"{result.stdout}\n{result.stderr}"
    match = re.search(r"(?:^|\D)(\d+)\.(\d+)\.(\d+)(?:\D|$)", output)
    if match is None:
        raise unittest.TestCase.failureException(
            f"could not parse Hermes version from: {output.strip()}"
        )
    version = tuple(int(part) for part in match.groups())
    if version != (0, 19, 0):
        raise unittest.TestCase.failureException(
            f"Hermes v{'.'.join(map(str, version))} does not match the required pinned version v0.19.0"
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
        self._tmp = tempfile.TemporaryDirectory(prefix="hermes-checkpoint-test-")
        self.addCleanup(self._tmp.cleanup)
        self.workspace = Path(self._tmp.name) / "workspace"
        self.workspace.mkdir()
        self._cwd = os.getcwd()
        os.chdir(self.workspace)
        self.addCleanup(self._restore_cwd)

    def tearDown(self):
        ac._reset_state()

    def _restore_cwd(self):
        os.chdir(self._cwd)

    def start_session(self, session_id="hermes-sess"):
        ac._on_session_start(session_id=session_id)

    def bind_call(self, session_id="hermes-sess", tool_name="checkpoint"):
        ac._on_pre_tool_call(
            tool_name=tool_name, session_id=session_id, task_id="task", tool_call_id="call"
        )

    def read_records(self, relative_path, *, include_status=False):
        text = (self.workspace / relative_path).read_text(encoding="utf-8")
        records = [json.loads(line) for line in text.splitlines()]
        if not include_status:
            records = [record for record in records if record.get("event") != "session_status"]
        return text, records


class RegistrationTests(unittest.TestCase):
    def test_register_wires_two_tools_and_five_hooks(self):
        ctx = FakeCtx()
        ac.register(ctx)
        self.assertEqual(sorted(ctx.tools), ["checkpoint", "checkpoint_path"])
        self.assertEqual(
            sorted(ctx.hooks),
            ["on_session_start", "pre_api_request", "pre_llm_call", "pre_tool_call", "subagent_start"],
        )
        self.assertEqual(ctx.tools["checkpoint"]["schema"]["name"], "checkpoint")
        close_schema = ctx.tools["checkpoint"]["schema"]["parameters"]["properties"][
            "close_session"
        ]
        self.assertEqual(close_schema["type"], "boolean")
        self.assertIs(close_schema["default"], False)
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
            result = ctx.tools["checkpoint"]["handler"](
                {"done": "One two three", "next": "Four five six"}, session_id="wired"
            )
            self.assertIn("Checkpoint saved.", result)
            path_result = ctx.tools["checkpoint_path"]["handler"]({"session_id": "wired"})
            self.assertEqual(path_result, ".agent-checkpoints/wired.jsonl")

    def test_pre_llm_call_injects_complete_instruction_for_parent_and_child(self):
        ctx = FakeCtx()
        ac.register(ctx)
        required = (
            "parents and subagents",
            "role-appropriate bounded units",
            "exactly three words",
            "reuse the previous `next` text verbatim",
            "same parallel tool-call block",
            "step_failed=true",
            "previous completed step or latest harness snapshot",
            "reported **input usage**",
            "Across providers",
            "approximately 220k input tokens are a soft planning signal",
            "At or above approximately 272k input tokens",
            "372k input rejection boundary is emergency headroom",
            "final checkpoint",
            "close_session=true",
            "Maintainer or parent leaves it false",
            "Closure is independent",
            "compact digest or handoff",
            "does not prove work quality",
        )
        for platform in ("cli", "subagent"):
            with self.subTest(platform=platform):
                result = ctx.hooks["pre_llm_call"](platform=platform, session_id="session")
                self.assertEqual(set(result), {"context"})
                for clause in required:
                    self.assertIn(clause, result["context"])


class CheckpointWriteTests(PluginTestCase):
    def test_session_start_appends_exact_parent_owned_open_only(self):
        self.start_session("parent")
        text, records = self.read_records(
            ".agent-checkpoints/parent.jsonl", include_status=True
        )
        self.assertEqual(len(records), 1)
        self.assertEqual(
            list(records[0].keys()),
            ["timestamp", "session_id", "event", "status"],
        )
        self.assertEqual(records[0]["session_id"], "parent")
        self.assertEqual(records[0]["event"], "session_status")
        self.assertEqual(records[0]["status"], "open")
        self.assertTrue(ac._is_valid_utc_timestamp(records[0]["timestamp"]))
        self.assertNotIn('": ', text)

        ac._on_subagent_start(parent_session_id="parent", child_session_id="child")
        self.assertFalse((self.workspace / ".agent-checkpoints/child.jsonl").exists())
        _, after_child = self.read_records(
            ".agent-checkpoints/parent.jsonl", include_status=True
        )
        self.assertEqual(after_child, records)

    def test_continued_session_checkpoint_lazily_confirms_open(self):
        self.bind_call("continued")
        ac.checkpoint(
            "Continued session checkpoint",
            "Confirm session open",
            _native_session_id="continued",
        )
        _, records = self.read_records(
            ".agent-checkpoints/continued.jsonl", include_status=True
        )
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0]["status"], "open")
        self.assertNotIn("event", records[1])

    def test_status_record_contract_is_exact(self):
        record = ac._create_status_record(
            "parent", "open", clock=lambda: "2026-07-26T14:30:00Z"
        )
        self.assertEqual(
            record,
            {
                "timestamp": "2026-07-26T14:30:00.000Z",
                "session_id": "parent",
                "event": "session_status",
                "status": "open",
            },
        )
        ac._validate_status_record(record)
        for bad in (
            dict(record, status="OPEN"),
            dict(record, status="closed", extra=True),
            dict(record, event="session_start"),
            {key: value for key, value in record.items() if key != "status"},
        ):
            with self.subTest(record=bad):
                with self.assertRaises(TypeError):
                    ac._validate_status_record(bad)

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

    def test_declared_close_and_parent_reopen_preserve_root_owned_log(self):
        self.start_session("parent")
        ac._on_subagent_start(parent_session_id="parent", child_session_id="child")
        self.bind_call("child")
        clock_calls = []

        def clock():
            clock_calls.append(True)
            return "2026-07-26T14:30:00Z"

        ac.checkpoint(
            "Child final work",
            "Return child digest",
            step_failed=True,
            close_session=True,
            _clock=clock,
            _native_session_id="child",
        )
        _, closed = self.read_records(
            ".agent-checkpoints/parent.jsonl", include_status=True
        )
        self.assertEqual(len(clock_calls), 1)
        self.assertEqual(
            [record.get("status", "checkpoint") for record in closed],
            ["open", "open", "checkpoint", "closed"],
        )
        self.assertEqual(
            [record["timestamp"] for record in closed[1:]],
            ["2026-07-26T14:30:00.000Z"] * 3,
        )
        self.assertTrue(closed[2]["step_failed"])
        self.assertFalse((self.workspace / ".agent-checkpoints/child.jsonl").exists())

        self.bind_call("parent")
        ac.checkpoint(
            "Return child digest",
            "Resume parent session",
            close_session=False,
            _native_session_id="parent",
        )
        _, reopened = self.read_records(
            ".agent-checkpoints/parent.jsonl", include_status=True
        )
        self.assertEqual(
            [record.get("status", "checkpoint") for record in reopened[-2:]],
            ["open", "checkpoint"],
        )

    def test_validation_rejects_bad_inputs_without_partial_append(self):
        self.start_session()
        self.bind_call()
        with self.assertRaises(TypeError):
            ac.checkpoint(None, "Next step label")
        with self.assertRaises(TypeError):
            ac.checkpoint("Done step label", 42)
        with self.assertRaises(TypeError):
            ac.checkpoint("Done step label", "Next step label", step_failed="yes")
        for value in (None, "true", 1, [], {}):
            with self.subTest(close_session=value):
                with self.assertRaisesRegex(TypeError, "close_session must be a boolean"):
                    ac.checkpoint(
                        "Done step label", "Next step label", close_session=value
                    )
                with self.assertRaisesRegex(TypeError, "close_session must be a boolean"):
                    ac._handle_checkpoint(
                        {
                            "done": "Done step label",
                            "next": "Next step label",
                            "close_session": value,
                        },
                        session_id="hermes-sess",
                    )
        _, records = self.read_records(
            ".agent-checkpoints/hermes-sess.jsonl", include_status=True
        )
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["status"], "open")

    def test_pre_tool_call_initializes_unseen_resumed_parent(self):
        self.start_session("session-a")
        ac._on_pre_tool_call(tool_name="checkpoint", session_id="session-b")
        ac.checkpoint(
            "Done step label", "Next step label", _native_session_id="session-b"
        )
        _, records = self.read_records(".agent-checkpoints/session-b.jsonl")
        self.assertEqual(records[0]["session_id"], "session-b")

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

    def test_parent_child_and_resumed_parent_share_parent_log(self):
        self.start_session("parent")
        ac._on_subagent_start(parent_session_id="parent", child_session_id="child")
        for native_id, done in (
            ("parent", "Parent wrote checkpoint"),
            ("child", "Child wrote checkpoint"),
            ("parent", "Parent resumed checkpoint"),
        ):
            self.bind_call(native_id)
            ac.checkpoint(done, "Continue parent session", _native_session_id=native_id)
        _, records = self.read_records(".agent-checkpoints/parent.jsonl")
        self.assertEqual([record["session_id"] for record in records], ["parent"] * 3)
        self.assertFalse((self.workspace / ".agent-checkpoints/child.jsonl").exists())

    def test_nested_child_resolves_transitively_to_root_parent(self):
        self.start_session("root")
        ac._on_subagent_start(parent_session_id="root", child_session_id="child")
        ac._on_subagent_start(parent_session_id="child", child_session_id="grandchild")
        self.bind_call("grandchild")
        ac.checkpoint(
            "Nested child checkpoint", "Resume root session", _native_session_id="grandchild"
        )
        _, records = self.read_records(".agent-checkpoints/root.jsonl")
        self.assertEqual(records[0]["session_id"], "root")

    def test_interleaved_parent_trees_isolate_binding_and_telemetry(self):
        ctx = FakeCtx()
        ac.register(ctx)
        self.start_session("parent-a")
        ac._on_subagent_start(parent_session_id="parent-a", child_session_id="child-a")
        self.start_session("parent-b")
        ac._on_subagent_start(parent_session_id="parent-b", child_session_id="child-b")
        ac._on_pre_api_request(
            session_id="child-a", approx_input_tokens=20000, model="claude-sonnet-4-6"
        )
        ac._on_pre_api_request(
            session_id="child-b", approx_input_tokens=100000, model="claude-sonnet-4-6"
        )
        self.bind_call("child-b")
        self.bind_call("child-a")
        ctx.tools["checkpoint"]["handler"](
            {"done": "Child A checkpoint", "next": "Resume parent A"},
            session_id="child-a",
        )
        ctx.tools["checkpoint"]["handler"](
            {"done": "Child B checkpoint", "next": "Resume parent B"},
            session_id="child-b",
        )
        _, records_a = self.read_records(".agent-checkpoints/parent-a.jsonl")
        _, records_b = self.read_records(".agent-checkpoints/parent-b.jsonl")
        self.assertAlmostEqual(records_a[0]["context_used"], 0.1)
        self.assertAlmostEqual(records_b[0]["context_used"], 0.5)
        self.assertFalse((self.workspace / ".agent-checkpoints/child-a.jsonl").exists())
        self.assertFalse((self.workspace / ".agent-checkpoints/child-b.jsonl").exists())

    def test_invalid_subagent_identity_fails_visibly(self):
        for parent_id, child_id in (("", "child"), ("parent", ""), (None, "child")):
            with self.subTest(parent_id=parent_id, child_id=child_id):
                with self.assertRaisesRegex(TypeError, "non-empty string"):
                    ac._on_subagent_start(
                        parent_session_id=parent_id, child_session_id=child_id
                    )

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
    def test_estimate_with_common_input_limit(self):
        self.start_session()
        self.bind_call()
        ac._on_pre_api_request(
            approx_input_tokens=186000, model="claude-sonnet-4-6", session_id="hermes-sess"
        )
        result = ac.checkpoint("Done step label", "Next step label")
        self.assertIn("Input usage (latest harness telemetry, 372k limit): ~50%", result)
        self.assertIn("Input K-tokens (latest harness telemetry): ~186k", result)
        self.assertIn("Remaining input K-tokens (to 372k limit): ~186k", result)
        _, records = self.read_records(".agent-checkpoints/hermes-sess.jsonl")
        self.assertAlmostEqual(records[0]["context_used"], 0.5)

    def test_model_does_not_change_common_input_limit(self):
        self.start_session()
        self.bind_call()
        ac._on_pre_api_request(
            session_id="hermes-sess", approx_input_tokens=93000, model="mystery-model"
        )
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
        ac._on_pre_api_request(
            session_id="hermes-sess", approx_input_tokens=84000, model="claude-sonnet-4-6"
        )
        for invalid in (-1, float("nan"), "84000", True, None):
            ac._on_pre_api_request(
                session_id="hermes-sess", approx_input_tokens=invalid, model="claude-sonnet-4-6"
            )
            context_used, used_k, remaining_k = ac._telemetry("hermes-sess")
            self.assertIsNone(context_used, msg=f"invalid={invalid!r}")
            self.assertIsNone(used_k, msg=f"invalid={invalid!r}")
            self.assertIsNone(remaining_k, msg=f"invalid={invalid!r}")

    def test_unknown_model_still_uses_common_input_limit(self):
        ac._on_pre_api_request(
            session_id="hermes-sess", approx_input_tokens=1000, model="totally-unknown-model"
        )
        context_used, used_k, remaining_k = ac._telemetry("hermes-sess")
        self.assertAlmostEqual(context_used, 1000 / 372000)
        self.assertEqual(used_k, 1)
        self.assertEqual(remaining_k, 371)

    def test_estimate_clamped_to_unit_interval(self):
        self.start_session()
        self.bind_call()
        for approx in (372001, 999999):
            with self.subTest(approx=approx):
                ac._on_pre_api_request(
                    session_id="hermes-sess", approx_input_tokens=approx, model="gpt-4"
                )
                context_used, used_k, remaining_k = ac._telemetry("hermes-sess")
                self.assertEqual(context_used, 1.0)
                self.assertEqual(used_k, round(approx / 1000))
                self.assertEqual(remaining_k, 0)
                result = ac.checkpoint("Done step label", "Next step label")
                self.assertIn("~0k", result)
                self.assertNotRegex(result, r"~-\d+k")

    def test_all_model_families_share_input_limit(self):
        for model in ("gpt-4", "gpt-4o", "claude-sonnet-4-6", "mystery-model"):
            with self.subTest(model=model):
                ac._reset_state()
                ac._on_pre_api_request(
                    session_id="hermes-sess", approx_input_tokens=186000, model=model
                )
                context_used, _, _ = ac._telemetry("hermes-sess")
                self.assertAlmostEqual(context_used, 0.5)

    def test_missing_model_still_uses_common_input_limit(self):
        ac._on_pre_api_request(
            session_id="hermes-sess", approx_input_tokens=186000, model=None
        )
        context_used, used_k, remaining_k = ac._telemetry("hermes-sess")
        self.assertAlmostEqual(context_used, 0.5)
        self.assertEqual(used_k, 186)
        self.assertEqual(remaining_k, 186)


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
        line = next(line for line in text.splitlines() if '"done"' in line)
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
        ac._on_pre_api_request(
            session_id="hermes-sess", approx_input_tokens=84000, model="claude-sonnet-4-6"
        )
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
        ac._on_pre_api_request(
            session_id="hermes-sess", approx_input_tokens=84000, model="claude-sonnet-4-6"
        )
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
        output = self.run_installer()
        dest = self.hermes_home / "plugins" / "agent-checkpoint"
        for name in (
            "plugin.yaml",
            "agent_checkpoint.py",
            "checkpoint-instruction.md",
            "__init__.py",
            "README.md",
        ):
            self.assertTrue((dest / name).is_file(), f"missing {name}")
        self.assertEqual(
            (dest / "checkpoint-instruction.md").read_bytes(),
            (REPO_ROOT / "hermes/agent-checkpoint/checkpoint-instruction.md").read_bytes(),
        )
        self.assertRegex(
            output,
            r"(?is)stop every live checkpoint-watch dashboard.*OpenCode.*codex.*Claude Code.*Hermes",
        )
        self.assertLess(output.index("Launch command:"), output.index("Start/restart Hermes"))

    def test_shared_reader_symlink_stops_before_hermes_copy_or_enablement(self):
        opencode_home = self.root / "opencode"
        linked_bin = (
            opencode_home
            / "lib"
            / "opencode-processing-skills"
            / "checkpoint-watch"
            / "bin"
        )
        linked_bin.parent.mkdir(parents=True)
        protected = self.root / "protected-watcher-bin"
        protected.mkdir()
        protected_file = protected / "checkpoint-watch.js"
        protected_file.write_text("stale protected watcher\n", encoding="utf-8")
        linked_bin.symlink_to(protected, target_is_directory=True)

        result = self.run_installer_result()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn(str(linked_bin), result.stderr)
        self.assertRegex(result.stderr, r"(?is)required checkpoint reader/core.*rerun")
        self.assertNotIn("Step 1.", result.stdout)
        self.assertEqual(
            protected_file.read_text(encoding="utf-8"), "stale protected watcher\n"
        )
        self.assertTrue(linked_bin.is_symlink())
        self.assertFalse((self.hermes_home / "plugins" / "agent-checkpoint").exists())
        self.assertFalse((self.hermes_home / "config.yaml").exists())

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
        for entry in ("agent-checkpoint", "'agent-checkpoint'", '"agent-checkpoint"'):
            with self.subTest(entry=entry):
                before = (
                    "_config_version: 33\n"
                    "plugins:\n"
                    "  enabled: []\n"
                    "  disabled:\n"
                    f"    - {entry}\n"
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
        for entry in ("agent-checkpoint", "'agent-checkpoint'", '"agent-checkpoint"'):
            with self.subTest(entry=entry):
                before = f"_config_version: 33\nplugins:\n  disabled: [{entry}]\n"
                config = self.write_config(before)
                result = self.run_installer_result()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("plugins.disabled", result.stderr)
                self.assertIn("hermes plugins enable agent-checkpoint", result.stderr)
                self.assertEqual(config.read_text(encoding="utf-8"), before)

    def test_disabled_near_matches_do_not_stop_installation(self):
        for disabled in (
            "  disabled:\n    - agent-checkpoint-extra\n",
            "  disabled:\n    - 'agent-checkpoint-extra'\n",
            '  disabled: ["agent-checkpoint-extra"]\n',
        ):
            with self.subTest(disabled=disabled):
                before = "plugins:\n" + disabled
                config = self.write_config(before)
                result = self.run_installer_result()
                self.assertEqual(result.returncode, 0, result.stderr)
                after = config.read_text(encoding="utf-8")
                self.assertIn("    - agent-checkpoint\n", after)
                self.assertIn("agent-checkpoint-extra", after)

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
import {{ createOpenCodeCheckpointPlugin }} from {opencode};
import {{ createMcpRuntime as createCodex }} from {codex};
import {{ createMcpRuntime as createClaude }} from {claude};
import {{ handleSessionStart as codexStart }} from {codex_hook};
import {{
  handleSessionStart as claudeStart,
  handleSubagentStart as claudeChildStart,
  handleSessionEnd as claudeEnd,
}} from {claude_hook};

const workspace = process.env.PARITY_WORKSPACE;
function schema() {{
  return {{ optional() {{ return this; }}, default() {{ return this; }} }};
}}
function fakeTool(definition) {{ return definition; }}
fakeTool.schema = {{ string: schema, boolean: schema }};

const makeOpenCode = createOpenCodeCheckpointPlugin({{
  tool: fakeTool,
  checkpointCore,
}});
const opencode = await makeOpenCode({{ worktree: workspace }});
await opencode.event({{ event: {{ type: "session.created", properties: {{ info: {{ id: "opencode-sess" }} }} }} }});
await opencode.tool.checkpoint.execute(
  {{ done: "OpenCode session checked", next: "OpenCode next step", step_failed: false }},
  {{ worktree: workspace, sessionID: "opencode-sess", agent: "maintainer" }},
);
await opencode.event({{ event: {{ type: "session.created", properties: {{ info: {{ id: "opencode-status-only" }} }} }} }});

await codexStart({{ hook_event_name: "SessionStart", session_id: "codex-sess", cwd: workspace }});
const codex = createCodex({{ checkpointCore }});
const codexResult = await codex.callTool("checkpoint", {{
  done: "Codex session checked",
  next: "Codex next step",
  _workspace_root: workspace,
  _checkpoint_session_id: "codex-sess",
}});
if (JSON.stringify(codexResult).includes("requires")) throw new Error("codex write failed");
process.env.CLAUDE_PROJECT_DIR = workspace;
await claudeStart({{ hook_event_name: "SessionStart", session_id: "claude-sess", cwd: workspace }});
await claudeChildStart({{
  hook_event_name: "SubagentStart",
  session_id: "claude-sess",
  agent_id: "child",
  agent_type: "implementer",
  cwd: workspace,
}});
const claude = createClaude({{ checkpointCore }});
const claudeResult = await claude.callTool("checkpoint", {{
  done: "Claude session checked",
  next: "Claude next step",
  _checkpoint_session_id: "claude-sess",
  _telemetry_session_id: "claude-sess",
}});
if (JSON.stringify(claudeResult).includes("requires")) throw new Error("claude write failed");
await claudeEnd({{ hook_event_name: "SessionEnd", session_id: "claude-sess", cwd: workspace }});
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
        # Stage the command hooks with their installed sibling core layout.
        installed = Path(self._tmp.name) / "installed-adapters"
        codex_installed = installed / "codex"
        claude_installed = installed / "claude"
        (claude_installed / "scripts").mkdir(parents=True)
        (claude_installed / "instructions").mkdir()
        (claude_installed / "server").mkdir()
        codex_installed.mkdir(parents=True)
        shutil.copy(CODEX_HOOK, codex_installed / "checkpoint-hook.mjs")
        shutil.copy(CORE_SRC, codex_installed / "checkpoint-core.mjs")
        shutil.copy(
            REPO_ROOT / "codex" / "checkpoint-instruction.md",
            codex_installed / "checkpoint-instruction.md",
        )
        shutil.copy(CLAUDE_HOOK, claude_installed / "scripts" / "checkpoint-hook.mjs")
        shutil.copy(CORE_SRC, claude_installed / "server" / "checkpoint-core.mjs")
        shutil.copy(
            REPO_ROOT / "claude" / "agent-checkpoint" / "instructions" / "checkpoint.md",
            claude_installed / "instructions" / "checkpoint.md",
        )

        # Real status/checkpoint records via all four adapters' own writers.
        driver = self.NODE_DRIVER.format(
            core=repr(CORE_SRC.as_uri()),
            opencode=repr(OPENCODE_RUNTIME.as_uri()),
            codex=repr(CODEX_RUNTIME.as_uri()),
            claude=repr(CLAUDE_RUNTIME.as_uri()),
            codex_hook=repr((codex_installed / "checkpoint-hook.mjs").as_uri()),
            claude_hook=repr((claude_installed / "scripts" / "checkpoint-hook.mjs").as_uri()),
        )
        self.run_node(driver, self.workspace)
        # Hermes log via the plugin
        self.start_session("hermes-sess")
        self.bind_call("hermes-sess")
        ac.checkpoint("Hermes session checked", "Hermes next step")

        # Continued-session checkpointing lazily confirms the observed session open.
        self.bind_call("hermes-continued")
        ac.checkpoint(
            "Hermes continued check",
            "Hermes open state",
            _native_session_id="hermes-continued",
        )

        logs = {
            "pilot-successful.jsonl": ("pilot-successful", "UNKNOWN"),
            "opencode-sess.jsonl": ("opencode-sess", "OPEN"),
            "opencode-status-only.jsonl": ("opencode-status-only", "OPEN"),
            "codex-sess.jsonl": ("codex-sess", "OPEN"),
            "claude-sess.jsonl": ("claude-sess", "CLOSED"),
            "claude-sess--child.jsonl": ("claude-sess--child", "OPEN"),
            "hermes-sess.jsonl": ("hermes-sess", "OPEN"),
            "hermes-continued.jsonl": ("hermes-continued", "OPEN"),
        }
        self.assertEqual(
            sorted(path.name for path in checkpoint_dir.glob("*.jsonl")), sorted(logs)
        )
        for filename, (session, state) in logs.items():
            with self.subTest(log=filename):
                result = subprocess.run(
                    [NODE, str(INSPECT_BIN), f".agent-checkpoints/{filename}"],
                    cwd=self.workspace, capture_output=True, text=True,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn(f"Session: {session}", result.stdout)
                self.assertIn(f"Session state: {state}", result.stdout)
                self.assertIn("Work status:", result.stdout)
                if filename in {"opencode-status-only.jsonl", "claude-sess--child.jsonl"}:
                    self.assertIn("Chain: 0/0 (n/a)", result.stdout)
                    self.assertIn("Work: 0/0 (n/a)", result.stdout)
                    self.assertIn("Three-word compliance: 0/0 (n/a)", result.stdout)
        # checkpoint-watch --once reads all four unchanged
        watch = subprocess.run(
            [NODE, str(WATCH_BIN), "--once"],
            cwd=self.workspace, capture_output=True, text=True,
        )
        self.assertEqual(watch.returncode, 0, watch.stderr)
        self.assertIn(
            "AGENT NAME AGE STATE CP C/W/3 % INPUT DONE CURRENT",
            " ".join(watch.stdout.split()),
        )
        for session, _ in logs.values():
            self.assertNotIn(session, watch.stdout)
        data_rows = [
            line for line in watch.stdout.splitlines()
            if any(state in line for state in ("OPEN", "CLOSED", "UNKNOWN", "ERROR"))
            and not line.startswith("Checkpoint sessions")
        ]
        self.assertEqual(sum("OPEN" in row for row in data_rows), 6)
        # The dated pilot fixture is hidden by the default three-hour cutoff.
        self.assertEqual(sum("UNKNOWN" in row for row in data_rows), 0)
        closed_rows = [row for row in data_rows if "CLOSED" in row]
        self.assertEqual(len(closed_rows), 1)
        self.assertIn("—", closed_rows[0])
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
