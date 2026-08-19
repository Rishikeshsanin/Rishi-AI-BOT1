# Why Rishi AI BOT1 Is Offline-First

Rishi AI BOT1 was built around one simple question:

> What happens when you still want AI, but the internet is gone?

Cloud AI is powerful, but it depends on connectivity. Rishi AI BOT1 explores a local-first alternative where the model, runtime, and inference all live on the user's own computer.

## The core idea

Once the required files are already stored locally, the main Windows setup can continue working without an active internet connection.

```text
Cloud chatbot
Your device → Internet → Remote AI → Internet → Answer

Rishi AI BOT1
Your device → Local Qwen3 model → Answer
```

## Real-world scenarios

### Travel

Flights, trains, road trips, and remote areas often have unreliable connectivity. A local model remains available even when network access is poor or absent.

### Internet outages

If Wi-Fi or broadband goes down, a cloud chatbot becomes unreachable. A locally stored model can continue generating responses.

### College and experimentation

The project is useful for learning how local inference works without depending on API credits or external AI infrastructure.

### Privacy-sensitive work

In the offline Windows mode, prompts and generated output are processed on the same device. This reduces the need to send prompt content to a hosted inference service.

### Predictable access

There is no per-message API quota in the local inference path. The practical limits are the user's own hardware, model capabilities, storage, and power.

## Why Qwen3 1.7B + GGUF?

The goal is to keep the model small enough to be practical on ordinary hardware while still being capable enough for general chat, explanation, summarization, drafting, coding help, and experimentation.

The `Q4_K_M` GGUF variant reduces model size and memory requirements compared with full-precision weights.

## Why Llamafile?

Llamafile provides a compact way to run a local model and expose a browser interface from the same machine. Rishi AI BOT1 wraps that setup in a Windows launcher so the local experience is close to one click.

## Why CPU mode by default?

The original development machine encountered a CUDA initialization failure. The launcher therefore prioritizes compatibility with:

```text
--gpu disable
```

This is not necessarily the fastest possible configuration, but it makes the default path less dependent on GPU drivers and CUDA compatibility.

## Why the web version still exists

The WebLLM/WebGPU deployment is kept as an engineering experiment.

It demonstrates a different local-first idea: a website can be delivered from the internet while the actual language-model inference happens on the visitor's GPU in the browser.

That approach is interesting, but today it is more hardware-sensitive and less predictable than the Windows/Llamafile path used by this project.

So the project hierarchy is intentional:

```text
1. Offline Windows mode  → main product
2. Browser WebGPU mode   → experimental demo
```

## Design principle

Rishi AI BOT1 is not trying to replace large cloud models.

It is trying to prove something simpler:

> A useful AI assistant can still exist when connectivity does not.
