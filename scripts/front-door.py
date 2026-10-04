#!/usr/bin/env python3
"""Switch the installed kit between passive and active (fork tool, see FORK.md).

passive: every skill is explicit-only. A person can type its slash command;
         no agent picks one up on its own, on Claude Code or on Codex.
active:  the port's own behaviour, byte for byte.

The manifest records exactly what passive added, so active removes only that.
Both commands are safe to run twice.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "plugins" / "pstack"
SKILLS = ROOT / "skills"
MANIFEST = ROOT / ".front-door.json"
FLAG = "disable-model-invocation: true\n"
CODEX_POLICY = "policy:\n  allow_implicit_invocation: false\n"
NOTE_OPEN, NOTE_CLOSE = "<!-- front-door:off -->\n", "<!-- /front-door:off -->\n"
NOTE = (
    NOTE_OPEN
    + "> **Front door off.** Sibling pstack skills are explicit-only in this install. "
    "Where this file names a skill, read `../<skill-name>/SKILL.md` and follow it; "
    "the Skill tool refuses it.\n"
    + NOTE_CLOSE
)
ROUTER = SKILLS / "poteto-mode" / "SKILL.md"


def frontmatter_end(lines):
    assert lines[0] == "---\n", "SKILL.md must open with frontmatter"
    return lines.index("---\n", 1)


def passive():
    if MANIFEST.exists():
        return status()
    flagged, codex = [], []
    for skill in sorted(p for p in SKILLS.iterdir() if (p / "SKILL.md").exists()):
        path = skill / "SKILL.md"
        lines = path.read_text().splitlines(keepends=True)
        end = frontmatter_end(lines)
        if not any(l.startswith("disable-model-invocation:") for l in lines[1:end]):
            lines.insert(end, FLAG)
            path.write_text("".join(lines))
            flagged.append(skill.name)
        policy = skill / "agents" / "openai.yaml"
        if not policy.exists():
            policy.parent.mkdir(exist_ok=True)
            policy.write_text(CODEX_POLICY)
            codex.append(skill.name)
    text = ROUTER.read_text()
    heading = "# Poteto mode\n"
    assert heading in text and NOTE_OPEN not in text
    ROUTER.write_text(text.replace(heading, heading + "\n" + NOTE, 1))
    MANIFEST.write_text(json.dumps({"state": "passive", "flagged": flagged, "codex": codex}, indent=1) + "\n")
    status()


def active():
    if not MANIFEST.exists():
        return status()
    m = json.loads(MANIFEST.read_text())
    for name in m["flagged"]:
        path = SKILLS / name / "SKILL.md"
        lines = path.read_text().splitlines(keepends=True)
        end = frontmatter_end(lines)
        del lines[lines.index(FLAG, 1, end)]
        path.write_text("".join(lines))
    for name in m["codex"]:
        policy = SKILLS / name / "agents" / "openai.yaml"
        policy.unlink()
        if not any(policy.parent.iterdir()):
            policy.parent.rmdir()
    ROUTER.write_text(ROUTER.read_text().replace("\n" + NOTE, "", 1))
    MANIFEST.unlink()
    status()


def status():
    if MANIFEST.exists():
        m = json.loads(MANIFEST.read_text())
        print(f"passive: {len(m['flagged'])} skills flagged explicit-only, {len(m['codex'])} Codex policies")
    else:
        print("active: the port's own behaviour")


if __name__ == "__main__":
    {"passive": passive, "active": active, "status": status}[sys.argv[1] if len(sys.argv) > 1 else "status"]()
