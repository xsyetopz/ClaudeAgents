---
name: security-checklist
description: Security audit checklist covering input validation, authentication, data handling, dependencies, API security, and secret management. Use when the user mentions "security", "audit", "vulnerability", "hardening", "security review", "OWASP", "pen test", "attack surface", or asks to check code for security issues.
---

# Security Checklist

## Input Validation

- [ ] Validate all user input before use (type, length, format, range)
- [ ] Reject on validation failure — do not sanitize and continue
- [ ] Validate file paths against traversal (`../` sequences)
- [ ] Validate URLs against SSRF (Server-Side Request Forgery)
- [ ] Validate content types and file uploads (check magic bytes, not just extension)

## Authentication & Authorization

- [ ] Require authentication before sensitive operations
- [ ] Check authorization per resource, not just per endpoint
- [ ] Tokens/sessions expire and can be revoked
- [ ] Hash passwords with bcrypt/argon2 (never MD5/SHA1 alone)
- [ ] Login endpoints have brute-force protection (rate limit + lockout)
- [ ] Multi-factor authentication available for privileged accounts

## Data Handling

- [ ] Secrets never logged (mask in error messages too)
- [ ] PII minimized — only collect required data
- [ ] Sensitive data encrypted at rest
- [ ] Enforce TLS for all external communication
- [ ] SQL queries parameterized (no string concatenation)
- [ ] Deserialization of untrusted data uses allowlists

## Dependencies

- [ ] No known CVEs in direct dependencies
- [ ] Dependency versions locked (lockfile committed)
- [ ] No deprecated packages in critical paths
- [ ] Audit transitive dependencies for supply chain risk

## API Security

- [ ] Rate limiting on public endpoints
- [ ] CORS configured to allow only known origins
- [ ] Content-Security-Policy header set
- [ ] Sensitive endpoints not exposed without authentication
- [ ] Response headers: no server version, no stack traces in production

## Secret Management

- [ ] No API keys or passwords in source code
- [ ] Secrets injected via environment variables or vault
- [ ] `.env` files in `.gitignore`
- [ ] Secret rotation process documented
- [ ] CI/CD secrets scoped to minimum required access
