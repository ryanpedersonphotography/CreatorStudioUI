# Friction notes

Footguns and lessons that must survive between sessions. Add to the top; never delete.

- **2026-09-02** — The Agent tool fails here with "Failed to create iTerm2 split pane": the harness's
  agent-teams spawner (`teammateMode: auto` in `~/.claude/settings.json`) opens iTerm2 splits, and this
  session runs in a Herdr pane. For fresh-context subagents use headless
  `command claude -p "<brief>" --model <tier> --allowedTools "Read,Glob,Grep,..."` writing to a file,
  or a Herdr pane via `herdr agent start`.
- **2026-09-02** — Port 5173 (and fallback 5190) are held by the Lost Lantern reference app in
  `~/Downloads/finalproject/lost-lantern-studio`. This repo's Vite config must pin 5180 strict; it lands with the skeleton.
- **2026-09-02** — react-resizable-panels v4 is a rewrite; v2 snippets and most LLM recall do not run.
  The reference app's `docs/footguns.md` is the list.
