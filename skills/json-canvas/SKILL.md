---
name: json-canvas
description: Create and edit JSON Canvas (.canvas) files: nodes (text, file, link, group), edges, and layout. Use to produce visual mind-maps, knowledge graphs, or workflow diagrams from vault content.
---

# json-canvas

JSON Canvas is an open spec (https://jsoncanvas.org). Obsidian Canvas reads
these files. Other readers: Kinopio, Jiyuu.

## Schema (1.0)

```json
{
  "nodes": [
    {
      "id": "uuid-or-string",
      "type": "text",
      "x": 0, "y": 0, "width": 250, "height": 100,
      "label": "Optional",
      "text": "# Heading\nMarkdown body"
    },
    {
      "id": "uuid-or-string",
      "type": "file",
      "x": 300, "y": 0, "width": 250, "height": 100,
      "file": "Notes/My Note.md"
    },
    {
      "id": "uuid-or-string",
      "type": "link",
      "x": 600, "y": 0, "width": 250, "height": 100,
      "url": "https://example.com"
    },
    {
      "id": "uuid-or-string",
      "type": "group",
      "x": 0, "y": 150, "width": 500, "height": 200,
      "label": "Cluster",
      "color": "1"
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "fromNode": "uuid-1",
      "fromSide": "right",
      "toNode":   "uuid-2",
      "toSide":   "left",
      "label": "links to"
    }
  ]
}
```

## Tips

- Generate `id`s as stable strings; downstream tools dedupe on them.
- Coordinates: pixel units; Obsidian's default zoom fits 100×100.
- For "graph from vault wikilinks", walk pages, build nodes per title,
  and add an edge for each `[[link]]` occurrence.
