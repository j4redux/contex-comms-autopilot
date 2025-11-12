# Security Notice

## ⚠️ CRITICAL: API Keys Have Been Exposed

**Date:** 2025-11-12

### What Happened

Environment files containing real API keys were accidentally committed to git history between commits `7ef77825` and `87474231`. The following secrets were exposed:

- **Anthropic API Key** (sk-ant-api03-...)
- **Daytona API Key** (dtn_...)
- **Inngest Event Key**
- **Inngest Signing Key**

### Immediate Actions Required

#### 1. Rotate All API Keys (HIGH PRIORITY)

You **MUST** rotate the following keys immediately:

**Anthropic API Key:**
- Visit: https://console.anthropic.com/settings/keys
- Revoke: `[REDACTED-ANTHROPIC-KEY]`
- Generate new key and update `server/.env`

**Daytona API Key:**
- Visit: https://app.daytona.io/settings/api-keys
- Revoke: `[REDACTED-DAYTONA-KEY]`
- Generate new key and update `server/.env`

**Inngest Keys:**
- Visit: https://app.inngest.com/settings
- Revoke exposed event and signing keys
- Generate new keys and update both `server/.env` and `frontend/.env`

#### 2. Clean Git History

The secrets exist in git history and need to be removed. Choose one of these methods:

**Option A: Using git-filter-repo (Recommended)**

```bash
# Install git-filter-repo
brew install git-filter-repo  # macOS
# or pip install git-filter-repo

# Backup your repo first
cd ..
cp -r project-contex project-contex-backup

# Remove sensitive files from history
cd project-contex
git filter-repo --path server/.env --invert-paths
git filter-repo --path frontend/.env.local --invert-paths --force

# Force push to remote (WARNING: This rewrites history)
git push origin --force --all
```

**Option B: Using BFG Repo-Cleaner**

```bash
# Install BFG
brew install bfg  # macOS

# Create a file with sensitive patterns
cat > secrets.txt << EOF
[REDACTED-ANTHROPIC-KEY]
[REDACTED-DAYTONA-KEY]
[REDACTED-INNGEST-EVENT-KEY]
[REDACTED-INNGEST-SIGNING-KEY]
EOF

# Clean the repo
bfg --replace-text secrets.txt .
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push to remote
git push origin --force --all
```

**Option C: Nuclear Option - New Repository**

If this is a new project with minimal history:

```bash
# Remove .git directory
rm -rf .git

# Initialize new repository
git init
git add .
git commit -m "Initial commit with cleaned secrets"

# Create new remote repository and push
git remote add origin <new-repo-url>
git push -u origin main
```

#### 3. Verify Cleanup

After cleaning history, verify no secrets remain:

```bash
# Search for any remaining secrets
git log --all --full-history --source --pretty=format: -S "sk-ant-api03" -- "**/*"
git log --all --full-history --source --pretty=format: -S "dtn_" -- "**/*"
```

### Actions Already Taken

✅ **Removed from tracking:**
- `server/.env` - Removed from git index
- `frontend/.env.local` - Removed from git index

✅ **Created safe templates:**
- `server/.env.example` - Template with placeholder values
- `frontend/.env.example` - Template with placeholder values

✅ **Verified .gitignore:**
- `.env` files are properly ignored
- `.env.local` files are properly ignored
- `.env*.local` files are properly ignored

### Setup Instructions for Team Members

After keys are rotated and history is cleaned:

1. **Clone/pull the repository:**
   ```bash
   git clone <repo-url>
   cd project-contex
   ```

2. **Setup backend environment:**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Setup frontend environment:**
   ```bash
   cd ../frontend
   cp .env.example .env.local
   # Edit .env.local and add your API keys
   ```

4. **Never commit .env files:**
   - `.env` files are in `.gitignore`
   - Only commit `.env.example` files
   - Keep sensitive keys local only

### Prevention Measures

To prevent future exposure:

1. **Pre-commit hooks** - Add pre-commit hooks to scan for secrets:
   ```bash
   npm install -D @secretlint/secretlint-rule-preset-recommend
   ```

2. **Use secrets management:**
   - Development: Use `.env` files (local only)
   - Production: Use AWS Secrets Manager, HashiCorp Vault, or similar

3. **Code review checklist:**
   - Always check diffs before committing
   - Never commit files ending in `.env` (except `.env.example`)
   - Use `git diff --cached` before `git commit`

4. **GitHub secret scanning:**
   - Enable GitHub's secret scanning alerts
   - Review and remediate any detected secrets immediately

### References

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [git-filter-repo documentation](https://github.com/newren/git-filter-repo)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [OWASP: Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)

---

**Last Updated:** 2025-11-12  
**Action Required:** Rotate all exposed API keys immediately
