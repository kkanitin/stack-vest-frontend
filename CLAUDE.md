# CLAUDE.md

See [AGENTS.md](./AGENTS.md) — it is the single source of truth for this repository.

## AI Skills
This repository uses agent-agnostic skills to centralize domain-specific guidance:
- **StackVest UI Skill**: Guidelines for design, typography, and themes. Located at [skills/stackvest-ui/SKILL.md](./skills/stackvest-ui/SKILL.md).

## Mandatory Git Policy for Agents
AI Agents (including Junie) are strictly restricted to read-only Git operations. **NEVER** `git commit` or `git push`. Use `git status`, `git fetch`, `git diff`, and `git pull` only.