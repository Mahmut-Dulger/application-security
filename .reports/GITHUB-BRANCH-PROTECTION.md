# GitHub Branch Protection Configuration

## Enable Branch Protection for `main` Branch

This document provides step-by-step instructions to configure branch protection rules as per **CICD-SEC-1 (Insufficient Flow Control Mechanisms)** mitigation.

---

## Manual Configuration (UI)

### Step 1: Navigate to Branch Settings
1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. Click **Branches** (left sidebar)
4. Under "Branch protection rules", click **Add rule**

### Step 2: Fill in Branch Pattern
- **Branch name pattern**: `main`
- Click **Create**

### Step 3: Configure Protection Settings

#### ✅ Require a pull request before merging
- [x] Require pull request reviews before merging
  - Required number of reviewers: **1**
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from code owners
  - [ ] Require approval of the most recent reviewable push (optional)

#### ✅ Require status checks to pass before merging
- [x] Require branches to be up to date before merging
- [x] Require status checks to pass before merging
  - Search for status checks: **npm-audit**
  - Select both if available:
    - `npm-audit (back-end)`
    - `npm-audit (front-end)`

#### ✅ Require conversation resolution before merging
- [x] Require conversation resolution before merging

#### ✅ Restrict who can push to matching branches
- [x] Include administrators (recommended)
- [ ] Restrict who can push to matching branches (optional - allow only admins)

#### ✅ Additional Security Options
- [x] Require code owner review when code owners are designated
- [x] Require status checks to pass before merging
- [ ] Allow force pushes (leave unchecked - DANGEROUS)
- [ ] Allow deletions (leave unchecked)

### Step 4: Save

Click **Create** or **Save changes** button at the bottom.

---

## Verification with GitHub CLI

Verify branch protection is enabled:

```bash
# List branch protection rules
gh api repos/{owner}/{repo}/branches/main/protection \
  --jq '.required_status_checks, .required_pull_request_reviews'

# Example output:
# {
#   "strict": true,
#   "contexts": ["npm-audit"],
#   "required_approving_review_count": 1,
#   "dismiss_stale_reviews": true,
#   "require_code_owner_reviews": true
# }
```

Verify protection is working:

```bash
# Try to merge without approval (should fail)
gh pr merge <PR_NUMBER> --admin  # Use --admin to bypass for testing
# Error: "Pull Request is not mergeable"
```

---

## API Configuration (Programmatic)

### Using GitHub REST API

```bash
#!/bin/bash
OWNER="your-org"
REPO="your-repo"
BRANCH="main"
TOKEN="your-github-token"

curl -X PUT \
  https://api.github.com/repos/$OWNER/$REPO/branches/$BRANCH/protection \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": ["npm-audit"]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": true,
      "required_approving_review_count": 1
    },
    "restrictions": null,
    "required_linear_history": false,
    "allow_force_pushes": false,
    "allow_deletions": false
  }'
```

### Using GitHub CLI

```bash
gh api repos/{owner}/{repo}/branches/main/protection \
  --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["npm-audit"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null
}
EOF
```

---

## Testing Branch Protection

### Test 1: PR Without Approval Should Block Merge

```bash
# Create feature branch
git checkout -b test-feature
echo "test" > test.txt
git add test.txt
git commit -m "Test feature"
git push origin test-feature

# Create PR via GitHub UI or CLI
gh pr create --title "Test PR" --body "Testing branch protection"

# Attempt to merge without approval
gh pr merge <PR_NUMBER>
# Expected: Error - "Pull Request is not mergeable"
# ✅ PASS: Cannot merge without approval
```

### Test 2: PR Cannot Merge Until Status Checks Pass

```bash
# Create PR that will fail npm audit
cd back-end
echo "npm-vulnerable-package" >> package.json
git add package.json
git commit -m "Add vulnerable package"
git push origin test-feature

# In GitHub UI:
# Status check "npm-audit" will show as failing
# Merge button will be disabled
# ✅ PASS: Cannot merge until checks pass
```

### Test 3: Stale Reviews Are Dismissed

```bash
# After approval, push new commits
echo "new content" >> test.txt
git add test.txt
git commit -m "New changes"
git push origin test-feature

# In GitHub UI:
# Previous approval is marked as "stale"
# New approval required on latest commit
# ✅ PASS: Stale reviews dismissed
```

---

## Troubleshooting

### Issue: "Required status checks are not found on this repository"

**Cause**: Status checks defined in branch protection don't exist in workflow yet.

**Solution**:
1. Ensure workflow (`sbom.yml`) exists and is enabled
2. Trigger a run: `git push` or manual workflow dispatch
3. Wait for job to complete and report status
4. Re-configure branch protection with correct job names

```bash
# List available status checks
gh api repos/{owner}/{repo}/commits/{branch}/check-runs \
  --jq '.[].name'
```

### Issue: Admin cannot merge because of branch protection

**Solution**: This is expected! To bypass (dangerous):

```bash
# Only if absolutely necessary:
gh pr merge <PR_NUMBER> --admin
```

Better approach: Get approval from code owner or remove `enforce_admins: true`.

### Issue: Branch protection disappeared after deleting workflow

**Cause**: If using status checks and workflow is deleted, checks disappear.

**Solution**:
1. Re-create workflow file
2. Trigger at least one run
3. Update branch protection rule

---

## Best Practices

### ✅ DO:
- Keep `enforce_admins: true` (includes admins in protection)
- Require at least 1 approval (2+ for critical repos)
- Use `dismiss_stale_reviews: true` (forces fresh review)
- Require status checks (prevents bad code merge)
- Require conversation resolution (tracks issues)

### ❌ DON'T:
- Allow force pushes (`allow_force_pushes: false`)
- Allow deletions (`allow_deletions: false`)
- Disable branch protection for convenience
- Use `enforce_admins: false` (creates bypass)
- Merge without approval (even as admin)

---

## Maintenance

### Weekly
- [ ] Check for PR reviews pending
- [ ] Verify status checks are passing

### Monthly
- [ ] Review branch protection settings
- [ ] Update status check names if workflow changed
- [ ] Audit who has admin/merge permissions

### Quarterly
- [ ] Review protection effectiveness
- [ ] Check if approval threshold needs adjustment
- [ ] Audit push restrictions (if configured)

---

## References
- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub REST API - Branch Protection](https://docs.github.com/en/rest/branches/branch-protection?apiVersion=2022-11-28)
- [GitHub CLI - Protecting Branches](https://cli.github.com/manual/gh_repo_edit)
