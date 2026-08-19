# Changelog

All notable changes to **Rishi AI BOT1** will be documented here.

## [1.2.0] - 2026-08-19

### Changed

- Repositioned the project around its strongest use case: **offline AI when internet access is unavailable**
- Rewrote the README so the Windows/Llamafile mode is clearly the primary experience
- Reframed the WebLLM/WebGPU deployment as an experimental secondary demo
- Added real-world offline scenarios such as travel, weak-signal areas, Wi-Fi outages, labs, and private local use
- Reworked the repository banner around the message: **Your AI when the internet disappears**

### Added

- `docs/OFFLINE-FIRST.md` explaining the project philosophy, use cases, and design choices
- Stronger offline-first badges and project messaging
- Clear comparison between recommended Windows mode and experimental browser mode

## [1.1.0] - 2026-08-19

### Added

- Production browser version powered by WebLLM + WebGPU
- Qwen3 1.7B `q4f16` browser model profile
- Branded responsive chat interface
- Web Worker model execution
- Streaming responses and stop-generation control
- Qwen3 thinking-mode toggle
- Browser-local chat history
- Model loading progress and WebGPU capability checks
- Vite production build
- Live Vercel deployment at `https://rishi-ai-bot1.vercel.app`
- Updated dual-mode architecture and deployment documentation

## [1.0.0] - 2026-08-19

### Added

- Initial public GitHub release
- Qwen3 1.7B `Q4_K_M` GGUF configuration
- Llamafile local server launcher
- CPU-only compatibility mode with `--gpu disable`
- Local browser interface on `127.0.0.1:8081`
- Preflight checks for missing model/runtime files
- Portfolio-ready project documentation
- Troubleshooting notes for CUDA and port conflicts
- Git exclusions for large model and runtime files
- MIT license for original repository scripts and documentation
