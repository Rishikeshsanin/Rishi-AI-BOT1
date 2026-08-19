# Contributing to Rishi AI BOT1

Thanks for taking an interest in the project.

## Development setup

```bash
git clone https://github.com/Rishikeshsanin/Rishi-AI-BOT1.git
cd Rishi-AI-BOT1
npm install
npm run dev
```

## Before opening a pull request

- Keep the browser experience private/local-first.
- Do not commit model weights, GGUF files, Llamafile binaries, generated `dist/`, or `node_modules/`.
- Run `npm run build` and make sure it completes successfully.
- Keep UI changes responsive on desktop and mobile.
- Explain any model/runtime trade-offs in the pull request description.

## Useful contribution areas

- Faster browser model loading
- Better WebGPU compatibility and diagnostics
- Model/profile selection
- PWA/offline shell support
- Performance metrics such as tokens/sec
- Accessibility and keyboard navigation
- Tests and CI improvements

## Reporting bugs

Please include your browser, operating system, GPU if known, steps to reproduce, and the exact error shown by the UI or browser console.
