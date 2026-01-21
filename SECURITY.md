# Security Policy

## Supported Versions

We provide security updates for:

| Version | Supported |
| ------- | --------- |
| `main` / `master` | ✅ |
| Latest release tag (vX.Y.Z) | ✅ |
| Older releases | ❌ |

We also recommend using a currently supported **Node.js LTS** version in production.

---

## Reporting a Vulnerability

Please report security issues **privately**. Do **not** open a public GitHub Issue for vulnerabilities.

**Preferred channels:**
1. **GitHub Security Advisories (Private):**  
   Repository → **Security** → **Advisories** → **Report a vulnerability**
2. Email: `security@YOUR_DOMAIN` (replace)

**What to include:**
- Summary of the vulnerability and potential impact
- Steps to reproduce (minimal PoC if possible)
- Affected versions / commit hash
- Environment (Node version, OS, deployment platform, config)
- Any logs/screenshots that help (redact secrets)

**Response times:**
- Acknowledgement: within **72 hours**
- Status updates: at least every **7 days** until resolved

---

## Disclosure Policy

We follow coordinated disclosure:
- We confirm the issue and assess severity
- We work on a fix and prepare a release
- We coordinate a public disclosure timeline when possible

Target timelines (may vary):
- Critical: **7–14 days**
- High/Medium: **30 days**
- Low: best effort

---

## Scope

In scope:
- Authentication/authorization issues
- Sensitive data exposure
- XSS/CSRF/SSRF and injection issues
- Misconfiguration impacting security (cookies, headers, CORS, redirects)
- Dependency vulnerabilities with real impact on this app

Out of scope:
- Issues requiring an already-compromised device/account
- Social engineering / phishing
- Denial-of-service requiring large-scale traffic (unless trivial)
- Reports without a clear security impact

---

## Security Updates & Dependencies

This project uses package manager lockfiles (e.g. `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`).

Recommended checks for maintainers:
- Install deps and run audits:
  - pnpm:
    ```bash
    pnpm install
    pnpm audit
    ```
  - npm:
    ```bash
    npm ci
    npm audit
    ```
- Keep framework/runtime up to date:
  - Update **Next.js**, **React**, and **Node.js LTS**
- Review automated dependency PRs (Dependabot/Renovate) before merging

Recommended checks for users:
- Update dependencies regularly
- Rebuild and redeploy after applying security updates

---

## Secure Development Guidelines

- **Do not commit secrets** (API keys, tokens, `.env*` files).
- Prefer server-side secrets only (never expose secrets via `NEXT_PUBLIC_*`).
- Use secure cookies for sessions:
  - `HttpOnly`, `Secure`, `SameSite` as appropriate
- Validate and sanitize untrusted input on both client and server.
- Use least-privilege for service credentials (DB, S3, etc.).
- Configure production security headers (CSP, HSTS, X-Frame-Options, etc.) where applicable.

---

## Acknowledgements

We appreciate responsible disclosure. We can credit reporters in advisories/release notes upon request.
