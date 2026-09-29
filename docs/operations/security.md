# Provider credentials and security notes

## Provider-key flow

1. Over HTTPS, the browser posts the provider and plaintext API key once to `POST /lessonprep/v1.0/Ai/credentials`.
2. The API encrypts the key into a compact JWE token (`alg: dir`, `enc: A256GCM`) using `Crypto:TokenSecret` (a 32-byte secret). The payload binds the provider so a DeepSeek token cannot be reused as OpenAI.
3. Only the token string is kept in browser local storage and sent back on model-list (`X-Provider-Token` header) or generation (`credentialToken`) requests.
4. ASP.NET decrypts the token in memory, passes the key to the provider request, and does not store credentials on the server or in application logs.
5. The token header includes a `kid` fingerprint of the secret. Rotating `Crypto:TokenSecret` changes that ID; old tokens are rejected and users must enter keys again.

Encryption/decryption lives exclusively in `backend/LessonPrep.Api/Infrastructure/Security/CredentialTokenService.cs`. The frontend adapter `frontend/src/app/features/settings/api.ts` requests a token; `frontend/src/app/shared/storage/storage.ts` stores it. There is no frontend encryption secret or encryption utility. Plaintext key input stays in memory until cleared; saving a key issues a token without contacting the provider, and model discovery checks whether the provider accepts it. Tokens include an issued-at timestamp but currently have no expiration enforcement or individual revocation mechanism.

The backend keeps no per-user credential store. Keep the same token secret across restarts and replicas (env var or secret manager). Never commit a production secret or expose it to the frontend. Local `appsettings.Development.json` is gitignored; production must use `Crypto__TokenSecret`.

The token protects the key at rest in local storage from casual inspection, but the browser must send it to the API to use it. It cannot protect against malicious JavaScript on the same origin, browser extensions, or a compromised server. Serve the frontend/API only over HTTPS outside local development. Do not log request bodies for the credentials endpoint or the `X-Provider-Token` header.

## Current public-exposure risks

- No authentication or authorization exists. Anyone who can call generation with their own credential can trigger provider requests. Saved preparations are kept only in the teacher's browser; the API has no preparation read endpoint.
- There are no per-user quotas or ownership rules.
- Fixed-window IP rate limits do exist (120 reads, 30 credential/model requests, and 10 generation requests per minute by default). Forwarded headers restore client IPs before rate limiting, but only from trusted ingress. Keep `ReverseProxy:TrustAll` disabled for directly exposed Kestrel; the Render Blueprint enables it only for managed ingress and uses `CF-Connecting-IP`. These rate limits are per process, so replicas do not share counters. See [Hosting](../deployment/hosting.md) for the trust boundary and platform setup.
- OCR executes native code inside the API process. Keep native packages updated and provision memory/CPU for scanned documents; models are embedded and require no runtime downloads.
- Browser local storage contains source material and validated lessons. Anyone with access to that browser profile can read them, and clearing browser data removes them.
- Logs include operational request information. Continue to avoid logging credentials, complete source material, or provider prompts containing uploaded material.

Add authentication/authorization, rate and size quotas, and a clear browser data policy before multi-user or public deployment. This is a product hardening requirement because the current API is intentionally account-free, not a substitute for network isolation.
