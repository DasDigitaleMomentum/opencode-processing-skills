#!/usr/bin/env python3
"""Bounded real-native live smokes for checkpoint-watch."""

from __future__ import annotations

import datetime as dt
import fcntl
import json
import os
import pathlib
import pty
import re
import select
import signal
import struct
import subprocess
import sys
import termios
import time


CURSOR_SHOW = b"\x1b[?25h"
CURSOR_HIDE = b"\x1b[?25l"
CLEAR_FRAME = b"\x1b[H\x1b[2J"
TIMEOUT_SECONDS = 8.0


def fail(message: str) -> None:
    raise AssertionError(message)


def checkpoint(
    session: str,
    timestamp: str,
    title: str,
    *,
    done: str = "Previous work completed",
    next_work: str = "Continue planned work",
    step_failed: bool = False,
    context_used: float | None = None,
    agent: str = "maintainer-direct",
) -> dict[str, object]:
    return {
        "timestamp": timestamp,
        "session_id": session,
        "done": done,
        "next": next_work,
        "step_failed": step_failed,
        "context_used": context_used,
        "agent": agent,
        "session_title": title,
    }


def legacy_checkpoint(session: str, timestamp: str, done: str, next_work: str) -> dict[str, object]:
    return {
        "timestamp": timestamp,
        "session_id": session,
        "done": done,
        "next": next_work,
        "step_failed": False,
        "context_used": None,
    }


def session_status(session: str, timestamp: str, status: str) -> dict[str, object]:
    return {
        "timestamp": timestamp,
        "session_id": session,
        "event": "session_status",
        "status": status,
    }


def write_log(root: pathlib.Path, name: str, records: list[dict[str, object]]) -> None:
    checkpoint_root = root / ".agent-checkpoints"
    checkpoint_root.mkdir(parents=True, exist_ok=True)
    payload = "".join(json.dumps(record, separators=(",", ":")) + "\n" for record in records)
    (checkpoint_root / name).write_text(payload, encoding="utf-8")


def utc_timestamp(offset_seconds: float = 0.0) -> str:
    value = dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=offset_seconds)
    return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def read_available(fd: int, deadline: float, required: bytes | None = None) -> bytes:
    data = bytearray()
    quiet_since: float | None = None
    while time.monotonic() < deadline:
        readable, _, _ = select.select([fd], [], [], 0.05)
        if readable:
            try:
                chunk = os.read(fd, 65536)
            except OSError as error:
                if error.errno == 5:  # PTY EOF on Linux.
                    break
                raise
            if not chunk:
                break
            data.extend(chunk)
            quiet_since = None
            continue
        if required is not None and required in data:
            if quiet_since is None:
                quiet_since = time.monotonic()
            elif time.monotonic() - quiet_since >= 0.15:
                return bytes(data)
    if required is not None and required not in data:
        fail(f"timed out waiting for {required!r}; output={bytes(data)!r}")
    return bytes(data)


def terminate_child(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=1.0)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=1.0)


def assert_frame_width(data: bytes, columns: int, label: str) -> None:
    clean = data
    for control in (CURSOR_HIDE, CURSOR_SHOW, CLEAR_FRAME):
        clean = clean.replace(control, b"")
    lines = clean.decode("utf-8", errors="replace").replace("\r", "").splitlines()
    oversized = [line for line in lines if len(line) > columns]
    if oversized:
        fail(f"{label} exceeded {columns} columns: {oversized!r}")


def run_contract_parity(binary: pathlib.Path, workspace: pathlib.Path) -> None:
    root = workspace / "contract-parity"
    (root / ".agent-checkpoints").mkdir(parents=True, exist_ok=True)
    write_log(
        root,
        "unknown.jsonl",
        [legacy_checkpoint("unknown", utc_timestamp(-3), "Unknown legacy marker", "Continue legacy work")],
    )
    write_log(
        root,
        "open.jsonl",
        [
            legacy_checkpoint("open", utc_timestamp(-7), "Legacy work completed", "Current work started"),
            checkpoint(
                "open",
                utc_timestamp(-6),
                "native-open",
                done="Current work started",
                next_work="Continue planned work",
                step_failed=True,
                context_used=0.5,
                agent="delegate-strong",
            ),
            session_status("open", utc_timestamp(-4), "closed"),
            # Physical order, not timestamp order, reopens this mixed log.
            session_status("open", utc_timestamp(-5), "open"),
        ],
    )
    write_log(
        root,
        "closed.jsonl",
        [
            session_status("closed", utc_timestamp(-4), "open"),
            checkpoint(
                "closed",
                utc_timestamp(-3),
                "native-closed",
                done="Closed work completed",
                next_work="No further work",
                context_used=0.25,
                agent="implementer",
            ),
            session_status("closed", utc_timestamp(-2), "closed"),
        ],
    )

    result = subprocess.run(
        [str(binary), "--once"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=TIMEOUT_SECONDS,
    )
    if result.returncode != 0:
        fail(f"native contract snapshot exited {result.returncode}: {result.stderr!r}")
    data_rows = [
        line
        for line in result.stdout.splitlines()
        if any(state in line for state in ("OPEN", "CLOSED", "UNKNOWN", "ERROR"))
        and not line.startswith("Checkpoint sessions")
    ]
    if len(data_rows) != 3:
        fail(f"native contract snapshot did not render exactly three rows: {result.stdout!r}")
    open_row = next((line for line in data_rows if "native-open" in line), "")
    closed_row = next((line for line in data_rows if "native-closed" in line), "")
    unknown_row = next((line for line in data_rows if "UNKNOWN" in line), "")
    if not re.search(r"delegate-strong\s+native-open.*OPEN\s+2\s+100/50/100%\s+50%", open_row):
        fail(f"native mixed OPEN identity/metrics mismatch: {open_row!r}")
    if not re.search(r"implementer\s+native-closed.*CLOSED\s+1\s+n/a/100/100%\s+25%", closed_row):
        fail(f"native mixed CLOSED identity/metrics mismatch: {closed_row!r}")
    if "—" not in closed_row:
        fail(f"native CLOSED row retained current work: {closed_row!r}")
    if not re.search(r"^-\s+-.*UNKNOWN\s+1\s+n/a/100/100%\s+unknown", unknown_row):
        fail(f"native legacy UNKNOWN identity/metrics mismatch: {unknown_row!r}")


def run_non_tty(binary: pathlib.Path, workspace: pathlib.Path) -> None:
    root = workspace / "non-tty"
    (root / ".agent-checkpoints").mkdir(parents=True, exist_ok=True)
    environment = os.environ.copy()
    environment["CHECKPOINT_WATCH_REFRESH_MS"] = "60000"
    process = subprocess.Popen(
        [str(binary)],
        cwd=root,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=environment,
    )
    try:
        if process.stdout is None or process.stderr is None:
            fail("native non-TTY pipes were not created")
        initial = read_available(process.stdout.fileno(), time.monotonic() + TIMEOUT_SECONDS, b"Checkpoint sessions")
        if process.poll() is not None:
            stderr = process.stderr.read()
            fail(f"native non-TTY watcher exited during setup: {process.returncode}; {stderr!r}")
        time.sleep(0.15)  # Initial output precedes fs.watch registration.
        write_log(root, "native-refresh.jsonl", [checkpoint("native-refresh", utc_timestamp(), "native-refresh-marker")])
        refreshed = read_available(process.stdout.fileno(), time.monotonic() + TIMEOUT_SECONDS, b"native-refresh-marker")
        process.send_signal(signal.SIGTERM)
        process.wait(timeout=TIMEOUT_SECONDS)
        trailing = read_available(process.stdout.fileno(), time.monotonic() + 0.5)
        stderr = process.stderr.read()
        output = initial + refreshed + trailing
        if process.returncode != 0:
            fail(f"native non-TTY watcher exited {process.returncode}: {stderr!r}")
        if CURSOR_SHOW not in output:
            fail(f"native non-TTY watcher did not restore cursor: {output!r}")
    finally:
        terminate_child(process)


def run_pty(binary: pathlib.Path, workspace: pathlib.Path, columns: int) -> None:
    root = workspace / f"pty-{columns}"
    (root / ".agent-checkpoints").mkdir(parents=True, exist_ok=True)
    write_log(root, "fresh.jsonl", [checkpoint("fresh", utc_timestamp(-1), "pty-fresh")])
    write_log(root, "old.jsonl", [checkpoint("old", utc_timestamp(-(3 * 60 * 60) - 1), "pty-old")])

    master_fd, slave_fd = pty.openpty()
    process: subprocess.Popen[bytes] | None = None
    original = termios.tcgetattr(slave_fd)
    fcntl.ioctl(slave_fd, termios.TIOCSWINSZ, struct.pack("HHHH", 30, columns, 0, 0))
    environment = os.environ.copy()
    environment["CHECKPOINT_WATCH_REFRESH_MS"] = "60000"
    try:
        process = subprocess.Popen(
            [str(binary)],
            cwd=root,
            stdin=slave_fd,
            stdout=slave_fd,
            stderr=slave_fd,
            env=environment,
            close_fds=True,
            start_new_session=True,
        )
        initial = read_available(master_fd, time.monotonic() + TIMEOUT_SECONDS, b"pty-fresh")
        assert_frame_width(initial, columns, f"initial {columns}-column PTY frame")
        if b"pty-old" in initial:
            fail(f"old PTY row was visible initially: {initial!r}")
        if process.poll() is not None:
            fail(f"native PTY watcher exited during setup: {process.returncode}; {initial!r}")

        time.sleep(0.15)  # Initial output precedes fs.watch registration.
        write_log(root, "filesystem.jsonl", [checkpoint("filesystem", utc_timestamp(), "pty-new")])
        filesystem_frame = read_available(
            master_fd,
            time.monotonic() + TIMEOUT_SECONDS,
            b"pty-new",
        )
        assert_frame_width(filesystem_frame, columns, f"filesystem {columns}-column PTY frame")
        if CLEAR_FRAME not in filesystem_frame:
            fail(f"filesystem update did not produce a complete redraw: {filesystem_frame!r}")

        os.write(master_fd, b"v")
        shown = read_available(master_fd, time.monotonic() + TIMEOUT_SECONDS, b"pty-old")
        assert_frame_width(shown, columns, f"shown-old {columns}-column PTY frame")
        if b"\r\n\r\n" not in shown and b"\n\n" not in shown:
            fail(f"old unclosed PTY paragraph was not separated: {shown!r}")

        os.write(master_fd, b"v")
        hidden = read_available(master_fd, time.monotonic() + TIMEOUT_SECONDS, b"pty-new")
        assert_frame_width(hidden, columns, f"hidden-old {columns}-column PTY frame")
        if b"pty-old" in hidden:
            fail(f"second lowercase v did not hide old PTY rows: {hidden!r}")

        os.write(master_fd, b"\x03")
        process.wait(timeout=TIMEOUT_SECONDS)
        trailing = read_available(master_fd, time.monotonic() + 0.5)
        output = initial + filesystem_frame + shown + hidden + trailing
        if process.returncode != 0:
            fail(f"native PTY watcher exited {process.returncode}: {output!r}")
        restored = termios.tcgetattr(slave_fd)
        if restored[:4] != original[:4]:
            fail(f"native PTY flags were not restored: before={original[:4]!r} after={restored[:4]!r}")
        if CURSOR_SHOW not in output:
            fail(f"native PTY watcher did not restore cursor: {output!r}")
    finally:
        if process is not None:
            terminate_child(process)
        os.close(master_fd)
        os.close(slave_fd)


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: native-checkpoint-watch-smoke.py <native-binary> <workspace>", file=sys.stderr)
        return 2
    binary = pathlib.Path(sys.argv[1]).resolve()
    workspace = pathlib.Path(sys.argv[2]).resolve()
    if not binary.is_file() or not os.access(binary, os.X_OK):
        fail(f"native binary is not executable: {binary}")
    workspace.mkdir(parents=True, exist_ok=True)
    run_contract_parity(binary, workspace)
    run_non_tty(binary, workspace)
    run_pty(binary, workspace, 80)
    run_pty(binary, workspace, 120)
    print("native checkpoint-watch live smokes passed")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # Keep final-gate failures concise and actionable.
        print(f"native-checkpoint-watch-smoke: {error}", file=sys.stderr)
        raise SystemExit(1)
