# Global Subagent Squadron

Custom DeepSeek-optimized subagents available globally via `~/.config/opencode/opencode.jsonc`.

## Agent Catalog

### explorer
| Field | Value |
|---|---|
| **Model** | `deepseek/deepseek-v4-flash` |
| **Permissions** | Read-only (edit: deny, bash: deny) |
| **Role** | Fast, read-only codebase explorer for structural mapping |

Use when you need to map a codebase's architecture, locate specific functions, trace imports, or summarize file structure. Explorer is fast because it uses Flash — ideal for initial orientation on an unfamiliar repo or finding where a pattern lives across many files.

**Trigger:** "Find where database migrations are defined", "What calls the `connectToServer` function?", "Summarize the directory structure of `src/`"

---

### debugger
| Field | Value |
|---|---|
| **Model** | `deepseek/deepseek-v4-pro` |
| **Permissions** | Edit: allow, Bash: ask |
| **Role** | Deep-thinking logic solver, runtime error auditor, race condition hunter |

Use for complex bugs that require multi-step reasoning — memory leaks, deadlocks, async race conditions, non-deterministic test failures. Debugger uses Pro for depth. Bash is set to "ask" for safety — it proposes diagnostic commands but won't execute them blindly.

**Trigger:** "Debug why this component re-renders infinitely", "Investigate the race condition in the session manager", "Find the memory leak in the telemetry worker"

---

### test-enforcer
| Field | Value |
|---|---|
| **Model** | `deepseek/deepseek-v4-flash` |
| **Permissions** | Edit: allow, Bash: allow |
| **Role** | TDD assistant — writes tests, runs them, ensures they pass |

Use when you've written new logic and need comprehensive unit/integration tests. Test-enforcer will identify edge cases, write the tests, execute the project's test runner, and iterate until they pass. Uses Flash because test generation is pattern-matching, not deep reasoning.

**Trigger:** "Write tests for the `resolveBaseUrl()` function in mlWorker.ts", "Add integration tests for the CSV export pipeline", "Cover the game connector edge cases"

---

### refactor-ninja
| Field | Value |
|---|---|
| **Model** | `deepseek/deepseek-v4-pro` |
| **Permissions** | Edit: allow, Bash: deny |
| **Role** | Structural refactoring — eliminates code smells, deduplicates, improves readability |

Use when code works but is messy — duplicated helpers, bloated functions, magic numbers, inconsistent patterns. Refactor-ninja preserves business logic exactly and only improves structure. No bash access prevents accidental test or build runs.

**Trigger:** "Refactor the `self.onmessage` handler in mlWorker.ts to extract smaller helpers", "Deduplicate the feature extraction code between the two ONNX paths", "Clean up the Electron IPC handlers"

---

### doc-genius
| Field | Value |
|---|---|
| **Model** | `deepseek/deepseek-v4-flash` |
| **Permissions** | Edit: allow, Bash: deny |
| **Role** | Technical writer — generates JSDoc, Python docstrings, READMEs, API docs |

Use when you've written code that needs documentation before commit. Doc-genius adds inline docs (JSDoc, docstrings, inline comments), updates README files, and ensures everything is clear for the next developer. Never modifies application logic.

**Trigger:** "Add JSDoc comments to all exported functions in mlWorker.ts", "Document the CSV export schema in the README", "Generate docstrings for the Python training pipeline"

---

### git-scribe
| Field | Value |
|---|---|
| **Model** | `deepseek/deepseek-v4-flash` |
| **Permissions** | Edit: deny, Bash: allow |
| **Role** | Release manager — inspects `git diff` and drafts Conventional Commit messages |

Use when you're ready to commit and want a well-formatted commit message. Git-scribe checks `git diff` and `git status`, then drafts semantic commit messages following the Conventional Commits specification. It also writes PR summaries.

**Trigger:** "Draft a commit message for these changes", "Write a PR summary for the ONNX WASM fix", "Generate release notes from the last 10 commits"

---

### security-auditor
| Field | Value |
|---|---|
| **Model** | `deepseek/deepseek-v4-pro` |
| **Permissions** | Read-only (edit: deny, bash: deny) |
| **Role** | White-hat auditor — scans for injection vectors, hardcoded secrets, package vulns |

Use before merging sensitive code — especially authentication flows, database queries, API endpoints, or file I/O. Security-auditor outputs a vulnerability report with severity ratings and mitigation steps. Fully read-only for safety.

**Trigger:** "Audit the Electron IPC handlers for privilege escalation", "Scan the database queries for SQL injection", "Check for hardcoded secrets in the codebase"

---

### db-architect
| Field | Value |
|---|---|
| **Model** | `deepseek/deepseek-v4-pro` |
| **Permissions** | Edit: allow, Bash: deny |
| **Role** | Database expert — schema design, query optimization, migration scripts |

Use for anything database-related: designing new tables, optimizing slow queries, writing safe migration scripts, or reviewing ORM patterns. Uses Pro for the reasoning depth needed in schema design.

**Trigger:** "Design a migration to add a tire wear history table", "Optimize the slow telemetry aggregation query", "Review the SQLite schema for normalization issues"

---

### ui-stylist
| Field | Value |
|---|---|
| **Model** | `deepseek/deepseek-v4-flash` |
| **Permissions** | Edit: allow, Bash: deny |
| **Role** | Frontend styling — CSS, Tailwind, responsive layouts, component polish |

Use for visual tweaks, layout fixes, responsive breakpoints, color adjustments, or animation polish. Flash is fast and cheap for the pattern-work involved in CSS. No bash access keeps it focused on presentation.

**Trigger:** "Fix the dashboard charts overflowing on mobile", "Add a dark mode variant to the sidebar", "Polish the loading spinner transitions"

---

### dependency-medic
| Field | Value |
|---|---|
| **Model** | `deepseek/deepseek-v4-flash` |
| **Permissions** | Edit: allow, Bash: allow |
| **Role** | DevOps technician — resolves dependency conflicts, build failures, lockfile issues |

Use when `npm install` fails, lockfiles are corrupted, package versions conflict, or build pipelines break. Dependency-medic audits, clears caches, and resolves version mismatches. Has terminal access to run diagnostics.

**Trigger:** "Fix the `better-sqlite3` native module compilation error", "Resolve the duplicate package versions in the lockfile", "Debug why the Vite build fails after the electron-builder update"

---

## Model Selection Strategy

| Task Complexity | Agent | Model |
|---|---|---|
| Pattern matching, search, formatting | Explorer, Git-Scribe, Test-Enforcer, Doc-Genius, UI-Stylist, Dependency-Medic | `deepseek/deepseek-v4-flash` |
| Deep reasoning, logic, analysis | Debugger, Refactor-Ninja, Security-Auditor, DB-Architect | `deepseek/deepseek-v4-pro` |

Use Flash agents liberally — they're fast and cheap. Reserve Pro agents for tasks where incorrect output or shallow reasoning is costly.

## Permission Safety Tiers

| Tier | Agents | Description |
|---|---|---|
| **Read-only** | Explorer, Security-Auditor, Git-Scribe | Cannot modify files or run commands. Safe for untrusted contexts. |
| **Edit-only** | Refactor-Ninja, Doc-Genius, DB-Architect, UI-Stylist | Can edit files but cannot run terminal commands. |
| **Full access** | Test-Enforcer, Dependency-Medic | Can edit and execute terminal commands. Use for build/test workflows. |
| **Restricted** | Debugger | Can edit files, terminal commands require confirmation (`ask`). |

## Invocation

Agents are subagents invoked in three ways:

### 1. Slash Commands (`/agent-name`)
Type the agent name as a slash command in your prompt. The autocomplete menu shows all available commands:
```
/explorer find where resolveBaseUrl is defined
/debugger the ONNX session creation keeps failing
/security-auditor scan the IPC handlers
```

### 2. Automatic Delegation
The main agent auto-routes tasks to the correct subagent based on context:
```
"Find where database migrations are defined"
```
→ auto-routes to `explorer`.

### 3. Named Mention
Reference the agent by name in the prompt:
```
"Use the security-auditor to scan the Electron IPC handlers"
```

All agents are loaded from `~/.config/opencode/opencode.jsonc` and available in every project.
