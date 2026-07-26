---
name: do-work
description: Execute vertical-slice issues from a plan. Use when asked to "do work", "execute the plan", "work through the slices", "implement the issues", or "do a slice". Use before any implementation when the conversation references a plan, issues, or slices.
---

# Do Work

Execute vertical-slice issues from a plan, one at a time. If no plan exists, first convert the PRD into sliced issues (prd-to-plan), then execute them.

## Workflow

```
Check for plan
    │
    ├── Has slices/issues? ──→ Execute slices in order
    │
    └── No plan/empty? ──→ PRD-to-Plan
            │
            └── PRD exists? ──→ Break into slices → Execute
            └── No PRD? ──→ Ask user what to build
```

### Step 1: Check for an existing plan

Look for these plan artifacts, in order:

1. `doc/issues/` — numbered issue files (`00-*.md`, `01-*.md`, etc.)
2. `doc/PLAN.md` — a single plan document with task list
3. Issues in the issue tracker (GitHub Issues, Linear, etc.)

If a plan with slices exists, collect all slices, note their dependencies (Blocked by), and proceed to Step 3.

### Step 2: PRD-to-Plan (when no plan exists)

If no plan with slices exists:

1. **Check for a PRD** — look for `doc/PRD.md` or ask the user for their requirements
2. If the user has a PRD but no plan, invoke `to-issues` to break the PRD into vertical-slice issues in `doc/issues/`
3. If neither PRD nor plan exists, ask the user what they want to build:
   - "What are we building? I need either a PRD or a plan with slices to work from."
   - If they have a vague idea, invoke `idea-refine` first, then `spec-driven-development`, then loop back to Step 2

### Step 3: Slice execution loop

For each slice, in dependency order (blockers first):

1. **Read the slice** — Read `doc/issues/{N}-{title}.md` to understand what to build
2. **Explore current codebase state** — Read relevant files to understand what exists
3. **Implement** — Build the slice following `incremental-implementation` and `test-driven-development`
4. **Verify** — Confirm acceptance criteria from the slice are met
5. **Mark done** — Update the slice file by prepending `[x]` to each completed acceptance criterion, or cross off in the plan
6. **Proceed to next slice** — Only after the current slice is verified

#### Slice ordering rules

- Execute slices in numeric/alphabetic order within each dependency tier
- If slice A is blocked by slice B, do B first
- If a slice depends on others are not in the plan, check if those are already done in the codebase
- Never skip ahead to a non-blocked slice if the current slice is stuck — ask the user for guidance

#### When a slice is too large

If a slice feels too large to implement in one pass:

- Break it into sub-steps within the slice
- Follow `incremental-implementation` — implement test-verify-commit in thin cycles
- Do NOT split the slice into new issue files unless the slice genuinely covers two distinct features

### Step 4: Completion

After all slices are executed:

- Run lint/typecheck/build commands if the project has any
- Present a summary of what was built to the user
- Ask: "All slices complete. Want to ship this?"

## Slice file format

Slices live in `doc/issues/{NN}-{kebab-case-title}.md` with this structure:

```markdown
## What to build

{Description of this slice}

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- `{NN}-{other-slice}.md` or "None - can start immediately"
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just implement this quickly without checking the plan" | You'll miss dependencies or build the wrong thing. Read the slice first. |
| "There's no plan but I know what to do" | Write it down first. 5 minutes of slicing saves 30 minutes of rework. |
| "This slice depends on nothing, I can start anywhere" | Slices may still have logical ordering. Do them in numeric order unless dependencies say otherwise. |
| "I'll do all slices in parallel" | Agents can't coordinate. Do one at a time, verify each. |

## Red Flags

- Starting implementation without reading the current slice
- Skipping acceptance criteria verification
- Working on a slice whose blockers aren't done
- Modifying slice files' What to build section (update only acceptance criteria status)
- Implementing slices out of dependency order
