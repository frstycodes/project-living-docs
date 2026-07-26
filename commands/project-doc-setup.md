---
description: Set up a living document for this repo — interview for sources and goal, build the first doc, publish it, and optionally schedule an hourly refresh.
---

Invoke the `project-doc-setup` skill for the current repository. Walk the setup
arc: locate the repo, verify `.ignored/` is git-ignored, interview for sources
(offering "decide for me" where derivable) and the goal, write the config, hand
off to `project-doc` `init` to build and publish the first Artifact, then offer to
schedule the hourly refresh as a Claude Code cloud routine.
