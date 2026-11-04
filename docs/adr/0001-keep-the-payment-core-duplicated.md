# ADR 0001: Keep the payment core duplicated, and write the divergence down

Date: 2026-11-04
Status: Accepted (provisional — see "Reopen this when")

## Context

The modules that take money — address derivation, the TronGrid and Esplora polls, the price
feed, the order store, the watcher — exist in three repositories: a private upstream this code
was copied from, this one (public, MIT) and a private storefront downstream of this one. Four of
those modules are byte-identical across copies; four have diverged on purpose. See
[docs/PAYMENT-CORE.md](../PAYMENT-CORE.md).

The obvious move is to extract a package and have all three depend on it. An architecture
review proposed exactly that.

## Decision

Do not extract a package. Record the divergence instead, in
[docs/PAYMENT-CORE.md](../PAYMENT-CORE.md), module by module, with the rule for where a change
has to land.

## Why

Extraction is not a code problem, it is a distribution problem, and the questions it opens are
not answerable from inside this repository:

- **Which registry.** npm public, GitHub Packages, or a git submodule. Each has a different
  cost at install time and in CI.
- **Which licence and visibility.** One consumer is public MIT and two are private. A package
  shared by all three has to pick, and the pick constrains what may ever be put in it.
- **Whose build changes.** The install step in `Dockerfile` and the GitHub Actions workflow
  would both have to learn to authenticate against that registry. Those are live deployment
  paths for a real-money service.
- **Three repos move at once.** Extraction is not a change to one repository; it is a
  simultaneous change to three, two of which are released on their own schedule.

Against that: three copies of about 350 lines, changed rarely, that a single document can keep
honest. The duplication is cheap today and the extraction is expensive today.

## Consequences

- A fix to a byte-identical module has to be applied three times by hand.
  `docs/PAYMENT-CORE.md` names which modules those are so the second and third applications are
  not forgotten.
- Divergence is allowed, but only when it is written down in the same commit that creates it.
- Future architecture reviews should not re-propose extraction without an answer to the four
  questions above.

## Reopen this when

- The byte-identical set stops being byte-identical by accident, twice.
- A fourth consumer appears.
- A registry is already in use by these repos for something else, which removes the first and
  third objection at a stroke.
