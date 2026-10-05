# Install this kit on your machine

For a teammate who runs Claude Code or Codex. It takes about two minutes. Your sessions work exactly as before until the front door is switched on: the kit installs passive, so a skill runs only when you type its command.

## Claude Code (Mac or Windows)

In a terminal:

```bash
claude plugin marketplace add "https://github.com/fitziboy3-source/open-pstack.git#adam/release"
```

```bash
claude plugin install pstack@open-pstack
```

Or inside Claude Code, type `/plugin marketplace add https://github.com/fitziboy3-source/open-pstack.git#adam/release`, then `/plugin install pstack@open-pstack`.

Start a new session. Type `/pstack:bro` after any reply to check it loaded: it restates the reply in plain words.

On Windows the session hook needs Git for Windows (it supplies `bash`). Without it the kit still works; only the automatic start of the router, once switched on, is skipped.

## Codex

```bash
codex plugin marketplace add fitziboy3-source/open-pstack --ref adam/release
```

```bash
codex plugin add pstack@open-pstack
```

Start a new Codex task so it finds the skills.

## What you get

57 skills from Lauren Tan's pstack, as commands named `/pstack:<skill>`. The ones to try first:

| Command | Use it when |
|---|---|
| `/pstack:poteto-mode <goal>` | You want a task done her way: it picks a playbook, builds, and proves the result |
| `/pstack:how <question>` | You want to know how a part of the code works |
| `/pstack:why <question>` | You want to know why something was built this way |
| `/pstack:bro` | A reply was too technical |

Do not run `/pstack:setup-pstack`. Model choices are set centrally.

## Update

```bash
claude plugin marketplace update open-pstack
```

```bash
claude plugin update pstack@open-pstack
```

## What this does not cover

- **Cloud sessions.** They load nothing installed on a machine. That route is being built separately.
- **App skills.** Skills that belong to one app (for example the ATLAS skills) live in that app's repository and arrive when you pull it.
- **The switch.** Whether the router starts on its own is controlled per machine by the file `~/.agents/pstack-front-door.on`. Leave it absent until told otherwise.
