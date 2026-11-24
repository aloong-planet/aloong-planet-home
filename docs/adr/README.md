# ADR index

ADR conventions for this repository:

- **What is written here**: a decision that is hard to reverse, baffling without context, and the product of a real
  trade-off, all three, when it is one of this project's architectural decisions, the trade-off behind a product
  behaviour or a way of computing a figure, or this project's choice on a process question (the choice and its reason,
  not the rules of the practice chosen). A rule for whoever changes the code goes in the invariants of `AGENTS.md`, a
  product behaviour or a computation in its spec, an incident in a postmortem, and how code implements a decision in
  that code's comments.
- **Five sections, all mandatory**: Context (the problem and the constraints on it, at most 3 sentences); Options (the
  chosen one first, then each rejected or deferred one with its reason, at most 2 sentences each, and an option whose
  comparison was never recorded marked "not recorded"); Decision (the rule in force); Consequences (the positive,
  negative and neutral ones still true, at most 2 sentences each); Sources (pointers to the evidence, and the key
  figures with their premises).
- **Never in an entry**: how a rule came about; how it was verified or landed; one-off costs already paid; how code
  implements it, or interface detail; how a measurement was taken; line numbers or lists of positions; a restatement
  of another ADR, a spec or a skill (point to it instead); options about how to record the decision.
- **Length**: at most 5,000 characters, the title and the status line excluded. An entry over it first moves out what
  is never in an entry, and one still over is split by decision.
- **Status**: Proposed (the direction is set, the evidence is not yet in) or Accepted (with the date the decision in
  force was confirmed by the owner).
- **Edited in place**: an entry states only the decision in force, and a decision that changes edits its entry rather
  than opening a new one. A change to what an entry chose, rejected or accepts as a consequence is confirmed by the
  owner before it is written: the abandoned approach becomes a rejected option with its reason, and the date moves to
  that confirmation. A rewrite that changes no decision (compressing, merging entries, correcting a stale fact) is
  listed in the pull request that makes it. A new decision edits every entry whose Decision it makes untrue or
  incomplete, and opens a new entry only where there is none.
- **Retired numbers**: an entry merged into another, or withdrawn, gives up its number in the same change: its file
  is deleted, every reference in the repository moves to the entry it joined (or is removed, for a withdrawn one), and
  the number is listed under Retired numbers below. Numbers are never reused.

| # | Decision | Status |
|---|---|---|
| [0001](0001-app-websites-in-this-repository.md) | The app websites live in this repository as workspace packages, each keeping its own domain | Accepted |
