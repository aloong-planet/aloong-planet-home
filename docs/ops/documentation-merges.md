# Documentation merges

This project permits automatic merging when a PR changes no executable content relative to its merge base, the PR head matches the delivered commit, and all CI runs on that head pass, including the pull request workflow. A request to review the PR before merge requires explicit approval. There are no standing file exceptions requiring advance review.

The scope includes project instruction files, files under docs (including prototypes and their scripts and styles), and comment-only changes to JavaScript, TypeScript and Python. PRs that change executable content require explicit user approval before merging.
