# Vulnerability List - First Run (December 22, 2025)

## Backend: 6 Vulnerabilities (1 Moderate, 5 High, 0 Critical)

### 1. `js-yaml` - Prototype Pollution (Moderate)
- **Severity**: Moderate (CVSS 5.3)
- **Type**: Transitive dependency
- **Path**: `@apidevtools/json-schema-ref-parser` → `js-yaml`
- **CWE**: CWE-1321 (Improperly Controlled Modification of Object Prototype Attributes)
- **Affected Versions**: `<3.14.2` OR `>=4.0.0 <4.1.1`
- **CVE**: GHSA-mh29-5h37-fv8m
- **Description**: The merge operation in js-yaml does not properly prevent modification of object prototypes, allowing prototype pollution attacks
- **Impact**: Low - Requires specific YAML parsing of untrusted input; schema validator is internal-facing
- **Fix Available**: ✅ Yes (upgrade to `>=3.14.2` or `>=4.1.1`)
- **Mitigation**: Override in `package.json` or `package-lock.json` to force safe version

---

### 2. `jws` - HMAC Signature Verification Bypass (HIGH)
- **Severity**: High (CVSS 7.5)
- **Type**: Transitive dependency
- **Path**: Unknown parent → `jws` (likely JWT/auth library)
- **CWE**: CWE-347 (Improper Verification of Cryptographic Signature)
- **Affected Versions**: `<3.2.3`
- **CVE**: GHSA-869p-cjfg-cm3x
- **Description**: Node-jws improperly verifies HMAC signatures, allowing attackers to forge valid signatures
- **Impact**: CRITICAL - If used in JWT validation, authentication bypass is possible
- **Fix Available**: ✅ Yes (upgrade to `>=3.2.3`)
- **Mitigation**: Update any JWT/auth library that depends on jws; may require major version bumps

---

### 3. `nodemon` - Development Dependency Chain (HIGH)
- **Severity**: High
- **Type**: Direct dependency (development-only)
- **Path**: `nodemon@2.0.19-2.0.22` → `simple-update-notifier@1.0.7-1.1.0` → `semver@7.0.0-7.5.1`
- **CWE**: CWE-1333 (Inefficient Regular Expression Complexity)
- **Affected Versions**: `nodemon 2.0.19-2.0.22`
- **Description**: Dependency chain includes `semver` with ReDoS vulnerability in version checking
- **Impact**: Low - Development-only tool; could cause development environment DoS
- **Fix Available**: ✅ Yes (upgrade `nodemon` to `>=3.0.0`)
- **Mitigation**: Direct package.json update in `back-end/package.json`

---

### 4. `semver` - ReDoS (Regular Expression Denial of Service) (HIGH)
- **Severity**: High (CVSS 7.5)
- **Type**: Transitive (via `simple-update-notifier`)
- **Path**: `nodemon` → `simple-update-notifier` → `semver@7.0.0-7.5.1`
- **CWE**: CWE-1333 (Inefficient Regular Expression Complexity)
- **Affected Versions**: `7.0.0-7.5.1`
- **CVE**: GHSA-c2qf-rxjj-qqgw
- **Description**: Regular expression in semver version parsing is inefficient and vulnerable to exponential backtracking (ReDoS)
- **Impact**: Denial of service if processing malformed version strings
- **Fix Available**: ✅ Yes (upgrade to `>=7.5.2`)
- **Mitigation**: Update `simple-update-notifier` or force `semver` override

---

### 5. `simple-update-notifier` - Transitive Vulnerability (HIGH)
- **Severity**: High
- **Type**: Transitive (via `nodemon`)
- **Path**: `nodemon@2.0.19-2.0.22` → `simple-update-notifier@1.0.7-1.1.0`
- **Issue**: Contains `semver` ReDoS vulnerability
- **CWE**: N/A (severity from child dependency)
- **Affected Versions**: `1.0.7-1.1.0`
- **Impact**: Transitive; resolved by updating nodemon
- **Fix Available**: ✅ Yes (update `simple-update-notifier` or `nodemon`)
- **Mitigation**: Update `nodemon` to `>=3.0.0`

---

### 6. `validator` - URL Validation Bypass + HTML Filtering Issues (HIGH)
- **Severity**: High (CVSS 7.5 for main issue)
- **Type**: Direct dependency (production)
- **Path**: Directly in `back-end/package.json`
- **CWE**: CWE-79 (Improper Neutralization of Input During Web Page Generation), CWE-792 (Incomplete Filtering of Special Elements)
- **Affected Versions**: `<=13.15.20` (URL bypass), `<=13.15.22` (HTML filtering)
- **CVE**: 
  - GHSA-9965-vmph-33xx (URL validation bypass)
  - GHSA-vghf-hv5q-vc2g (HTML filtering incomplete)
- **Description**: 
  1. `isURL()` function can be bypassed with certain malformed URLs
  2. HTML sanitization is incomplete, allowing certain special elements through
- **Impact**: CRITICAL - User input validation bypass; potential XSS/injection attacks
- **Fix Available**: ✅ Yes (upgrade to `>=13.15.22`)
- **Mitigation**: Immediate update in `back-end/package.json` to `validator@^13.15.22`

---

## Frontend: 11+ Vulnerabilities (5 Moderate, 5+ High, 1 Critical)

### CRITICAL

### 1. `form-data` - Unsafe Random Boundary Generation (CRITICAL)
- **Severity**: Critical (CWE-330)
- **Type**: Transitive dependency
- **Path**: API client → `form-data@4.0.0-4.0.3`
- **CWE**: CWE-330 (Use of Insufficiently Random Values)
- **Affected Versions**: `4.0.0-4.0.3`
- **CVE**: GHSA-fjxv-7rqg-78g4
- **Description**: MIME boundary generation uses `Math.random()` instead of `crypto.randomBytes()`, making boundaries predictable
- **Impact**: Form submission boundary predictability could lead to request injection
- **Fix Available**: ✅ Yes (upgrade to `>=4.0.4`)
- **Mitigation**: Ensure `form-data>=4.0.4` is locked in `front-end/package-lock.json`

---

### HIGH SEVERITY

### 2. `braces` - Uncontrolled Resource Consumption (HIGH)
- **Severity**: High (CVSS 7.5)
- **Type**: Transitive (via `sane` → `micromatch`)
- **Path**: Jest/testing ecosystem → `sane` → `micromatch` → `braces@<3.0.3`
- **CWE**: CWE-400 (Uncontrolled Resource Consumption), CWE-1050 (Initialization with Hard-Coded Network Resource Configuration Data)
- **Affected Versions**: `<3.0.3`
- **CVE**: GHSA-grv7-fg5c-xmjg
- **Description**: Glob pattern processing with nested braces can cause exponential resource consumption
- **Impact**: Development environment DoS when processing complex test globs
- **Fix Available**: ⚠️ Partial (requires Jest ecosystem upgrade)
- **Mitigation**: Plan Jest/Babel upgrade; low production impact

---

### 3. `glob` - Command Injection in CLI (HIGH)
- **Severity**: High (CVSS 7.5)
- **Type**: Transitive (via Jest/testing tools)
- **Path**: Jest ecosystem → `glob@10.2.0-10.5.0`
- **CWE**: CWE-78 (Improper Neutralization of Special Elements used in an OS Command)
- **Affected Versions**: `10.2.0-10.5.0`
- **CVE**: GHSA-5j98-mcp5-4vw2
- **Description**: glob CLI command (`-c/--cmd`) can execute arbitrary shell commands via unsanitized input
- **Impact**: Command injection if running glob CLI with untrusted patterns (dev-only risk)
- **Fix Available**: ✅ Yes (upgrade to `>=10.5.0`)
- **Mitigation**: Update Jest and related tools

---

### 4. Additional HIGH vulns in deps
- `globby` (via glob)
- `micromatch` (via glob/braces)
- And others in the testing chain

---

### MODERATE SEVERITY

### 5. `@jest/transform` - Vulnerable Transitive (MODERATE)
- **Affected Versions**: `<=26.6.2`
- **Issue**: Via `jest-haste-map` vulnerability
- **Mitigation**: Upgrade Jest to latest stable

### 6. `babel-jest` - Old Version Issues (MODERATE)
- **Affected Versions**: `24.2.0-26.6.3`
- **Issue**: Via `@jest/transform`
- **Mitigation**: Upgrade to latest Jest (breaking changes expected)

### 7. `esbuild` - CORS Bypass in Dev Server (MODERATE)
- **Severity**: Moderate (CVSS 5.3)
- **Type**: Direct dependency (development)
- **CWE**: CWE-346 (Origin Validation Error)
- **Affected Versions**: `<=0.24.2`
- **CVE**: GHSA-67mh-4wv8-2f99
- **Description**: Development server allows any website to send requests and read responses
- **Impact**: Low - Dev environment only; could leak sensitive data to malicious websites during development
- **Fix Available**: ✅ Yes (upgrade to `>=0.25.0`)
- **Mitigation**: Update `esbuild` in `front-end/package.json`

### 8. `esbuild-jest` - Transitive Issues (MODERATE)
- **Issue**: Dependency on old `babel-jest`
- **Mitigation**: Consider alternative Jest setup or upgrade

### 9. `anymatch` - Via micromatch (MODERATE)
- **Issue**: Glob pattern matching issues
- **Mitigation**: Jest ecosystem upgrade

---

## Summary Table

| Package | Backend | Frontend | Direct | Severity | CVE ID | Fixable |
|---------|---------|----------|--------|----------|--------|---------|
| `js-yaml` | ✅ | | ❌ | Moderate | GHSA-mh29-5h37-fv8m | ✅ |
| `jws` | ✅ | | ❌ | HIGH | GHSA-869p-cjfg-cm3x | ✅ |
| `nodemon` | ✅ (direct) | | ✅ | HIGH | N/A | ✅ |
| `semver` | ✅ | | ❌ | HIGH | GHSA-c2qf-rxjj-qqgw | ✅ |
| `simple-update-notifier` | ✅ | | ❌ | HIGH | N/A | ✅ |
| `validator` | ✅ (direct) | | ✅ | HIGH | GHSA-9965-vmph-33xx | ✅ |
| `form-data` | | ✅ | ❌ | CRITICAL | GHSA-fjxv-7rqg-78g4 | ✅ |
| `braces` | | ✅ | ❌ | HIGH | GHSA-grv7-fg5c-xmjg | ⚠️ |
| `glob` | | ✅ | ❌ | HIGH | GHSA-5j98-mcp5-4vw2 | ✅ |
| `@jest/transform` | | ✅ | ❌ | Moderate | N/A | ✅ |
| `esbuild` | | ✅ (direct) | ✅ | Moderate | GHSA-67mh-4wv8-2f99 | ✅ |
| (+ 8 more) | | ✅ | | Moderate | | ⚠️ |

---

## Quick Fix Guide

### Immediate (Today)
```bash
# Backend
cd back-end
npm update validator --save  # 13.15.20 → 13.15.22
npm update nodemon --save-dev  # 2.0.x → 3.0+

# Frontend
cd ../front-end
npm update esbuild --save-dev  # 0.24.2 → 0.27+
npm audit fix  # Attempt automatic fixes
```

### Verify
```bash
npm audit --audit-level=high  # Should report 0 unfixed HIGH in production
```

### For Production Deployments
- Ensure validator `>=13.15.22` is locked
- Ensure jws `>=3.2.3` is verified (check transitive)
- Ensure form-data `>=4.0.4` (frontend)
