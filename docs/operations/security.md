# Provider credentials and security notes

## Provider-key flow

1. Over HTTPS, the browser posts the provider and plaintext API key once to `POST /lessonprep/v1.0/Ai/credentials`.
2. The API encrypts the key into a compact JWE token (`alg: dir`, `enc: A256GCM`) using `Crypto:TokenSecret` (a 32-byte secret). The payload binds the provider so a DeepSeek token cannot be reused as OpenAI.
3. Only the token string is kept in browser local storage and sent back on model-list (`X-Provider-Token` header) or generation (`credentialToken`) requests.
4. ASP.NET decrypts the token in memory, passes the key to the provider request, and does not store credentials on the server or in application logs.
5. The token header includes a `kid` fingerprint of the secret. Rotating `Crypto:TokenSecret` changes that ID; old tokens are rejected and users must enter keys again.

The backend keeps no per-user credential store. Keep the same token secret across restarts and replicas (env var or secret manager). Never commit a production secret or expose it to the frontend. Local `appsettings.Development.json` is gitignored; production must use `Crypto__TokenSecret`.

The token protects the key at rest in local storage from casual inspection, but the browser must send it to the API to use it. It cannot protect against malicious JavaScript on the same origin, browser extensions, or a compromised server. Serve the frontend/API only over HTTPS outside local development. Do not log request bodies for the credentials endpoint or the `X-Provider-Token` header.

## Current public-exposure risks

- No authentication or authorization exists. Anyone who can call generation with their own credential can trigger provider requests. Saved preparations are kept only in the teacher's browser; the API has no preparation read endpoint.
- There are no per-user quotas, abuse throttles, or ownership rules.
- OCR has no authentication and is intended to be reachable only on the private application network. Do not publish port 8001 to the internet.
- Browser local storage contains source material and validated lessons. Anyone with access to that browser profile can read them, and clearing browser data removes them.
- Logs include operational request information. Continue to avoid logging credentials, complete source material, or provider prompts containing uploaded material.

Add authentication/authorization, rate and size quotas, and a clear browser data policy before multi-user or public deployment. This is a product hardening requirement because the current API is intentionally account-free, not a substitute for network isolation.
