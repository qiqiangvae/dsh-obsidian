---
name: obsidian-bases
description: Create and edit Obsidian Bases (.base) with views, filters, formulas, and summaries. Use when the user asks for a tabular view, a project dashboard, or a filtered list of pages by property.
---

# obsidian-bases

Obsidian Bases are `.base` YAML files in the vault root (or anywhere).

## Minimal example

```yaml
title: Projects
filter:
  and:
    - type == "project"
views:
  - type: table
    name: Active
    filter:
      and:
        - status == "active"
    order:
      - file.name
      - due
      - status
  - type: cards
    name: By status
    groupBy: status
```

## Common formula patterns

```yaml
formulas:
  days_to_due: (date(prop("due")) - today()) / 86400000
  is_overdue: (date(prop("due")) < today()) && (prop("status") != "done")
```

## Common gotchas

- Property names with spaces must be quoted: `prop("Project Status")`.
- `today()` is midnight UTC; for day-level comparisons use
  `date(prop("due")) < today()` rather than raw string compare.
- `groupBy` on a missing property silently groups everything into `null`.

## When to use

- A "Project dashboard" → `groupBy: status, orderBy: due`
- A "Reading list" → `filter: type == "resource" && status == "to-read"`
- A "By author" view → `groupBy: author`
