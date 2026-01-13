<p align="center">
  <img src=".branding/tabarc-icon.svg" width="180" alt="TABARC-Code Icon">
</p>

# Security Policy

This project is intentionally small, boring, and local.
That is not an accident.

## Scope

TABARC Recon Command Center is a **local Chrome side‑panel extension**.

- No backend
- No accounts
- No telemetry
- No remote execution
- No automation of attacks

Everything happens in your browser, on your machine.

If something goes wrong, it goes wrong *locally*.

## Supported Versions

Only the latest tagged version is supported.

At the time of writing:

- **Supported:** v2.2.x
- **Unsupported:** anything older

If you are running an older build and something breaks,
upgrade first before reporting it.

## Threat Model (the honest version)

This tool assumes:

- You are an authorised user
- You understand what advanced search operators do
- You are responsible for what you search for

This project does **not** attempt to:

- hide activity
- bypass safeguards
- evade detection
- exploit vulnerabilities

If you are looking for those things, you are in the wrong repo.

## What *is* considered a security issue

Please report:

- Arbitrary code execution inside the extension
- Unexpected network requests
- Data leaking outside `chrome.storage.local`
- Remote pack import bypassing the allowlist
- Pack schema validation failures that still import
- Anything that allows silent behaviour without user intent

In short:
If the extension does something you didn’t explicitly ask it to do,
that matters.

## What is *not* a security issue

The following are **out of scope**:

- Google indexing sensitive data
- Misconfigured websites appearing in search results
- Search operators returning unexpected results
- Deprecated operators not behaving as expected
- “This query found something scary”

Search engines surface what is already public.
This tool does not change that.

## Reporting a vulnerability

If you believe you have found a genuine security issue:

1. **Do not** open a public issue with exploit details.
2. Prepare a clear, minimal description:
   - what happened
   - what you expected instead
   - exact steps to reproduce
3. Include:
   - extension version
   - Chrome version
   - operating system

Send details privately via the repository contact listed in README.

If the report is real and reproducible, it will be fixed.
If it is vague, speculative, or theatrical, it will be ignored.

## Disclosure philosophy

- Fix first
- Document second
- No drama

This is not a bug bounty project.
There are no rewards beyond a quiet thank you.

## Final note

Security here is mostly about **restraint**.

The safest features are the ones we didn’t add.

If you’re reading this thinking
“they could have made it way more powerful”

Yes.
That was the decision.
