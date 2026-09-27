# LessonPrep documentation

Start here if you are new to the repository. The root [README](../README.md) is the short local setup guide; these pages explain how the pieces fit together and what to host.

## Guides

- [Architecture and request flow](architecture/overview.md) — components, responsibilities, and how a lesson request travels through the system.
- [Document extraction and OCR](architecture/documents-and-ocr.md) — PDF/TXT/CSV handling and where PaddleOCR runs.
- [AI providers and streaming](architecture/providers-and-streaming.md) — model discovery, shared schema, validation, and SSE.
- [Local development](development/local-setup.md) — tools, commands, configuration, and useful checks.
- [Hosting and deployment](deployment/hosting.md) — which services to deploy, how they connect, and release steps.
- [Configuration reference](operations/configuration.md) — environment variables and application limits.
- [Browser storage and snapshots](operations/browser-storage.md) — what remains in the browser and how regeneration works.
- [Provider keys and application security](operations/security.md) — encryption, key rotation, and current MVP exposure.

## Which backend do I host?

Host the ASP.NET Core API as the main application backend. Also run the Python OCR service as a separate internal service because the API calls it to read scanned PDF pages. Build and host the React frontend as static files, preferably behind the same HTTPS origin as the API. No database is used or hosted.

The existing `PaddleOCR/paddleocr/` source checkout is not imported or launched by this app. The Python OCR service uses the published `paddleocr` package pinned in `ocr-service/requirements.txt`; its package installation downloads/uses PaddleOCR model weights. You do not need to deploy the checkout folder.

See [Hosting and deployment](deployment/hosting.md) before exposing this MVP to the internet. The current app has no user authentication or authorization.
