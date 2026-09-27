# Provider credentials and security notes

## Provider-key flow

1. The browser requests the API's public RSA key at `GET /api/ai/public-key`.
2. Web Crypto creates a random AES-GCM data key, encrypts the provider API key, and wraps the AES key with RSA-OAEP/SHA-256.
3. Only the envelope (`keyId`, wrapped key, nonce, ciphertext) is kept in browser local storage and sent in model-list or generation requests.
4. ASP.NET uses the mounted RSA private key to unwrap/decrypt the credential in memory. It passes the value to the provider request and does not store it on the server or in application logs.
5. The public key ID is derived from the public key. Replacing the private key changes that ID, and envelopes encrypted for the previous key are rejected; the user must enter keys again.

The backend must keep the same private key across restarts and replicas. Mount it from a secret manager or protected file, limit read access to the API process, and back it up securely. Losing or rotating it invalidates every browser's saved encrypted provider key. Never commit the private key or configure it as a public frontend variable.

Encryption in browser storage protects the key at rest from casual inspection, but the browser must send it to the API to use it. It cannot protect against malicious JavaScript served by the same origin, browser extensions, or a compromised server. Serve the frontend/API only over HTTPS outside local development.

## Current public-exposure risks

- No authentication or authorization exists. Anyone who can call generation with their own credential can trigger provider requests. Saved preparations are kept only in the teacher's browser; the API has no preparation read endpoint.
- There are no per-user quotas, abuse throttles, or ownership rules.
- OCR has no authentication and is intended to be reachable only on the private application network. Do not publish port 8001 to the internet.
- Browser local storage contains source material and validated lessons. Anyone with access to that browser profile can read them, and clearing browser data removes them.
- Logs include operational request information. Continue to avoid logging credentials, complete source material, or provider prompts containing uploaded material.

Add authentication/authorization, rate and size quotas, and a clear browser data policy before multi-user or public deployment. This is a product hardening requirement because the current API is intentionally account-free, not a substitute for network isolation.
