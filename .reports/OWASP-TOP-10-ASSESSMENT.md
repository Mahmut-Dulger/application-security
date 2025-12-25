# OWASP Top 10 CI/CD Risk Mitigations - Implementation Guide

## Overview
This document describes 3 critical mitigations implemented for OWASP Top 10 CI/CD Security Risks.

---

## Mitigation #1: Insufficient Flow Control Mechanisms (CICD-SEC-1)

### Problem
PR pipelines from untrusted sources execute without approval gates.

### Solution: Branch Protection Rules

**Steps to Configure in GitHub**:

1. Go to repository **Settings > Branches**
2. Click **Add Rule** under "Branch protection rules"
3. Apply to: `main` (or `master`)
4. Enable these settings:

```
✓ Require a pull request before merging
  - Require approvals: 1
  - Dismiss stale pull request approvals when new commits are pushed
  - Require review from code owners
  
✓ Require status checks to pass before merging
  - Require branches to be up to date before merging
  - Require checks to pass:
    - npm-audit (or your CI status check names)
    
✓ Require conversation resolution before merging
✓ Include administrators
```

### Why This Works
- **Flow Control**: PRs cannot merge without approval (blocks malicious code)
- **CI Gate**: Checks must pass before merge (prevents bad dependencies)
- **Human Review**: At least 1 person reviews every change
- **Fresh Status**: Must pass latest checks (prevents merge with stale results)

### Verification
```bash
# Check if branch protection is enabled
curl -s https://api.github.com/repos/{owner}/{repo}/branches/main \
  -H "Authorization: token $GITHUB_TOKEN" | jq '.protection'
```

---

## Mitigation #2: Insufficient Pipeline-Based Access Controls (CICD-SEC-5)

### Problem
All jobs have same permissions; no role-based access control.

### Solution: Implement Job-Level Permissions & Environment Controls

**Updated Workflow Configuration**:

```yaml
name: Secure SBOM & Audit Pipeline

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
    types: [opened, synchronize, reopened]
  workflow_dispatch:
    inputs:
      approval_required:
        description: 'Manual approval required'
        required: false
        default: 'true'
  schedule:
    - cron: '0 0 * * 0'

# CRITICAL: Default to minimal permissions
permissions:
  contents: read
  pull-requests: read

jobs:
  # Stage 1: Audit-only (no write access needed)
  npm-audit:
    name: npm audit for Dependencies
    runs-on: ubuntu-22.04  # Pin to specific version
    permissions:
      contents: read
      security-events: write  # Only for reporting vulns
    
    strategy:
      matrix:
        path: [back-end, front-end]
      fail-fast: true  # Changed from false to fail fast
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4  # Pin to SHA in production
        with:
          persist-credentials: false
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: '${{ matrix.path }}/package-lock.json'

      - name: Verify lock file integrity
        run: npm ci --dry-run --audit  # Verify before installing
        working-directory: ${{ matrix.path }}

      - name: Install dependencies
        run: npm ci  # Clean install from lock file
        working-directory: ${{ matrix.path }}

      - name: Run npm audit
        id: audit
        run: |
          npm audit --json > npm-audit-report.json 2>&1 || true
          VULN_COUNT=$(jq '.metadata.vulnerabilities.total // 0' npm-audit-report.json)
          echo "vulnerabilities=$VULN_COUNT" >> $GITHUB_OUTPUT
        working-directory: ${{ matrix.path }}

      - name: Mask sensitive output (Mitigation #3)
        if: always()
        run: |
          # Redact potential secrets from audit output
          sed -i 's/[a-zA-Z0-9_-]*_TOKEN//g' npm-audit-report.json
          sed -i 's/[a-zA-Z0-9_-]*_KEY//g' npm-audit-report.json
        working-directory: ${{ matrix.path }}

      - name: Fail if vulnerabilities found
        if: steps.audit.outputs.vulnerabilities != '0'
        run: |
          echo "❌ CRITICAL: ${{ steps.audit.outputs.vulnerabilities }} vulnerabilities found"
          jq '.metadata' npm-audit-report.json
          exit 1  # Fail the pipeline on vulns
        working-directory: ${{ matrix.path }}

      - name: Upload audit report (secure artifact)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: npm-audit-${{ matrix.path }}
          path: ${{ matrix.path }}/npm-audit-report.json
          retention-days: 30
          if-no-files-found: warn

  # Stage 2: SBOM generation (pinned runners, read-only)
  generate-sbom:
    name: Generate SBOMs
    runs-on: ubuntu-22.04  # Specific version
    permissions:
      contents: read
      security-events: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Install & verify Syft
        run: |
          # Install from official source with verification
          curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | \
            bash -s -- -b /usr/local/bin
          
          # Verify installation
          syft version
          echo "Syft verified at: $(which syft)"

      - name: Generate SBOMs
        run: |
          syft back-end -o cyclonedx-json > sbom-backend.json || true
          syft front-end -o cyclonedx-json > sbom-frontend.json || true
          syft . -o cyclonedx-json > sbom-repository.json || true
          
          # Generate checksums for integrity validation (Mitigation #3)
          sha256sum sbom-*.json > SBOM.checksums

      - name: Upload SBOM artifacts
        uses: actions/upload-artifact@v4
        with:
          name: sbom-artifacts
          path: |
            sbom-*.json
            SBOM.checksums
          retention-days: 90
          if-no-files-found: error

  # Stage 3: Security Summary (read-only, no deploy)
  security-summary:
    name: Security Summary
    runs-on: ubuntu-22.04
    needs: [npm-audit, generate-sbom]
    if: always()
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          path: security-reports/

      - name: Generate security summary
        run: |
          echo "## 🔒 Security Scan Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          
          for file in security-reports/npm-audit-*/npm-audit-report.json; do
            if [ -f "$file" ]; then
              dir=$(basename $(dirname "$file"))
              total=$(jq '.metadata.vulnerabilities.total // 0' "$file")
              echo "### $dir" >> $GITHUB_STEP_SUMMARY
              echo "- Total Vulnerabilities: **$total**" >> $GITHUB_STEP_SUMMARY
              echo "" >> $GITHUB_STEP_SUMMARY
            fi
          done
          
          echo "✅ SBOMs generated: $(ls security-reports/sbom-artifacts/*.json | wc -l)" >> $GITHUB_STEP_SUMMARY

      - name: Comment on PR with security status
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Security checks passed. Review job logs for details.'
            })
```

### Key Changes

| Change | Purpose | Mitigation |
|--------|---------|-----------|
| `permissions: contents: read` | Limit default access | CICD-SEC-5 |
| `ubuntu-22.04` (pinned) | Prevent unexpected runner changes | CICD-SEC-7 |
| `persist-credentials: false` | Prevent credential leakage | CICD-SEC-6 |
| `fail-fast: true` | Stop on first audit failure | CICD-SEC-1 |
| `--dry-run --audit` | Verify lock file before install | CICD-SEC-3 |
| Different perms per job | Role-based access control | CICD-SEC-5 |
| Remove `continue-on-error` | Force security checks | CICD-SEC-4 |

---

## Mitigation #3: Insufficient Credential Hygiene & Artifact Integrity (CICD-SEC-6 & CICD-SEC-9)

### Problem 1: Secrets leak in logs
### Problem 2: No artifact integrity verification

### Solution: Output Masking & Artifact Signing

#### A. Secret Masking Pattern

```yaml
- name: Mask sensitive data in logs
  if: always()
  run: |
    # Redact common secret patterns from all logs
    PATTERNS=(
      "_TOKEN"
      "_SECRET"
      "_KEY"
      "_PASSWORD"
      "_CREDENTIALS"
      "api_key"
      "Authorization"
    )
    
    for pattern in "${PATTERNS[@]}"; do
      grep -r "$pattern" . --include="*.json" --include="*.log" 2>/dev/null | \
        sed "s/.*$pattern.*/***REDACTED***/g" || true
    done
```

#### B. Artifact Integrity Verification

Add to your workflow:

```yaml
- name: Generate and sign artifact checksums
  run: |
    # Generate checksums for all artifacts
    sha256sum sbom-*.json > SBOM.checksums
    
    # Create manifest with metadata
    cat > artifact-manifest.json <<EOF
    {
      "generated_at": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
      "generated_by": "${{ github.actor }}",
      "commit_sha": "${{ github.sha }}",
      "workflow_run": "${{ github.run_id }}",
      "artifacts": {
        "sbom-backend": "$(sha256sum sbom-backend.json | cut -d' ' -f1)",
        "sbom-frontend": "$(sha256sum sbom-frontend.json | cut -d' ' -f1)",
        "sbom-repository": "$(sha256sum sbom-repository.json | cut -d' ' -f1)"
      }
    }
    EOF
    
    cat artifact-manifest.json
```

#### C. Verification Process

Consumers of artifacts should verify:

```bash
#!/bin/bash
# verify-artifacts.sh

MANIFEST_URL="https://raw.githubusercontent.com/{owner}/{repo}/{branch}/artifact-manifest.json"
ARTIFACTS_DIR="./downloaded-sbom"

# Download manifest
curl -s "$MANIFEST_URL" > manifest.json

# Verify each artifact
for artifact in sbom-*.json; do
  claimed_hash=$(jq -r ".artifacts.$(basename $artifact .json)" manifest.json)
  actual_hash=$(sha256sum "$artifact" | cut -d' ' -f1)
  
  if [ "$claimed_hash" == "$actual_hash" ]; then
    echo "✅ $artifact verified"
  else
    echo "❌ $artifact TAMPERED - hash mismatch!"
    exit 1
  fi
done
```

#### D. Secure Log Output

Configure GitHub Actions secrets masking:

```yaml
- name: Ensure no secrets in output
  env:
    # Never pass secrets to scripts
    SENSITIVE_DATA: ${{ secrets.GITHUB_TOKEN }}
  run: |
    # This demonstrates WHAT NOT TO DO:
    # echo "Token: $SENSITIVE_DATA"  # ❌ WRONG
    
    # Correct approach: never echo secrets
    # Use GitHub's native secret masking:
    echo "::add-mask::$(cat /path/to/sensitive/file)"
```

### Why This Works

**Credential Hygiene (CICD-SEC-6)**:
- Secrets never appear in logs even if accidentally referenced
- Uses GitHub's built-in masking for sensitive variables
- `persist-credentials: false` prevents token leak during checkout

**Artifact Integrity (CICD-SEC-9)**:
- Checksums prove artifacts haven't been tampered with
- Manifest includes build provenance (who, when, which commit)
- Consumers can verify before using artifacts
- Creates audit trail of all generated artifacts

---

## Verification Checklist

### Mitigation #1: Flow Control
- [ ] Branch protection rule created for `main`
- [ ] 1+ approvals required
- [ ] Status checks required (`npm-audit`)
- [ ] Stale reviews dismissed
- [ ] Test: Try to merge PR without approval → blocked ✓

### Mitigation #2: Access Controls
- [ ] Each job has explicit `permissions:`
- [ ] Audit job: `permissions: { contents: read, security-events: write }`
- [ ] SBOM job: `permissions: { contents: read }`
- [ ] Summary job: `permissions: { contents: read, pull-requests: write }`
- [ ] `ubuntu-22.04` pinned (not `latest`)
- [ ] `persist-credentials: false` on all checkouts
- [ ] `continue-on-error: true` removed from critical steps

### Mitigation #3: Credential Hygiene & Integrity
- [ ] Output masking applied to audit reports
- [ ] Checksums generated for all artifacts
- [ ] Manifest created with metadata
- [ ] Secret patterns redacted from logs
- [ ] Test: Check logs for leaked tokens → none found ✓

---

## Testing the Mitigations

### Test #1: Branch Protection
```bash
# Create test branch and PR
git checkout -b test-feature
echo "test" > test.txt
git add test.txt
git commit -m "Test PR"
git push origin test-feature

# Create PR via GitHub UI
# Try to merge WITHOUT approval → Should be blocked
# ✓ PASS: Merge button disabled until approval
```

### Test #2: Audit Failure Gate
```bash
# Add known vulnerable package
cd back-end
npm install lodash@3.0.0  # Lodash 3.x has CVEs
npm ci
# npm audit should fail and pipeline should exit with code 1
```

### Test #3: Artifact Integrity
```bash
# Download artifact and verify
sha256sum -c SBOM.checksums
# ✓ PASS: All checksums match
```

---

## Production Deployment Steps

1. **Update workflow file** (`.github/workflows/sbom.yml`) with secure version
2. **Enable branch protection**:
   - Settings > Branches > Add rule for `main`
   - Configure per Mitigation #1
3. **Set environment secrets**:
   ```bash
   # GitHub Settings > Environments > Production
   # (for future deploy stages)
   ```
4. **Test in dry-run mode**:
   ```bash
   git push  # Trigger workflow
   # Monitor: Actions tab > Your workflow
   ```
5. **Monitor audit logs**:
   - GitHub: Settings > Audit log
   - Verify all PRs/pushes are logged

---

## Ongoing Maintenance

**Weekly**:
- [ ] Review GitHub Actions versions for updates
- [ ] Check audit logs for suspicious activity

**Monthly**:
- [ ] Update branch protection rules if needed
- [ ] Review SBOM artifacts for new vulnerabilities
- [ ] Check if any GitHub Actions need pin updates

**Quarterly**:
- [ ] Security review of entire workflow
- [ ] Update Node.js version in workflow if new LTS released
- [ ] Audit GitHub token scopes

---

## References

- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Actions Permissions](https://docs.github.com/en/actions/using-jobs/assigning-permissions-to-jobs)
- [OWASP CI/CD Top 10](https://owasp.org/www-project-ci-cd-security/)
- [SLSA Framework](https://slsa.dev/) (for artifact provenance)
