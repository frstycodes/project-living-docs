---
description: Refresh this repo's living document — surgically patch #doc-data from new source activity and republish. Runs init if no config exists.
---

Invoke the `project-doc` skill in its `refresh` branch for the current repository:
fetch and slice `#doc-data`, query each source after its cursor, patch only what
changed, render, validate with `check.mjs`, and republish to the same Artifact URL.
If there is no config yet, tell the user to run `/project-doc-setup` first.
