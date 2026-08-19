# Security Policy

## Scope

Rishi AI BOT1 has two modes:

- **Browser mode:** the site is hosted publicly, while model inference is intended to run in the visitor's browser through WebLLM/WebGPU.
- **Windows mode:** Llamafile is configured to bind to `127.0.0.1`, so the local server is intended for access from the same machine only.

## Important safety notes

- Do not expose the local Llamafile server to the public internet without authentication and appropriate network controls.
- Do not commit API keys, tokens, credentials, private model files, or personal chat exports.
- Treat third-party model/runtime downloads as external software and verify their source and license.

## Reporting a vulnerability

Please open a GitHub issue with enough information to reproduce the problem, but do **not** include secrets, tokens, or sensitive personal data. For a vulnerability that would be unsafe to disclose publicly, contact the repository owner privately through their GitHub profile.
