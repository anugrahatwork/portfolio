---
name: plancli_portfolio_sync
description: Use plancli CLI tool to synchronize local workspace tasks and activity logs with your portfolio website (www.anugrahatwork.com).
---

# Skill: plancli_portfolio_sync

This skill instructs the agent on how to use the local `plancli` CLI tool to automatically catalog task lists, milestones, and development activities into the user's online portfolio at `www.anugrahatwork.com`.

## 🎯 When to Use
Use this skill in any workspace that has a `.plancli.json` or `.planclirc` file when:
1. An implementation plan has been approved and you need to register a session milestone.
2. Coding changes are completed and you need to push the final execution checklist (`task.md`) to the portfolio activities feed.

> [!IMPORTANT]
> If multiple active workspaces are open simultaneously (e.g. both `plancli` and `portfolio`), only execute this skill once per session to prevent duplicate tasks or timeline logs from being registered.

## 🛠️ Execution Checklist

### 1. Initialize Session Task
Once the `implementation_plan.md` has been built and approved, create a task on the server representing this session's goal:
```bash
plancli task add "Brief summary of session goal" --description "More detailed notes"
```
*Action*: Capture the printed **Task ID** from the command output. You will need it to map all logs.

### 2. Ingest Logs at Turn Concluding
At the end of your development turn, sync your local `task.md` checklist:
```bash
plancli log bulk --task=<captured_task_id> --md=task.md
```
*Note*: `plancli` automatically parses the indentation of checkboxes in `task.md` and links them on the database using `parent_id` parameters, preserving your hierarchical task layout in the online activity feed.

## ⚙️ Quick Reference
- Check config/auth: `plancli configure`
- List projects: `plancli project list`
- Link directory: `plancli project link <project_id>`
- List tasks: `plancli task list`
- Update task status: `plancli task status <task_id> <status_value>` (values: `todo`, `in_progress`, `done`)
- Add single log: `plancli log add --task=<task_id> -m "<message>"`
