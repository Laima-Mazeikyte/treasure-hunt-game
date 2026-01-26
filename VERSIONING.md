# Automatic Versioning System

This project uses an automatic versioning system that increments the version number with every commit.

## How It Works

1. **Version Storage**: The version is stored in `version.json`
2. **Auto-Increment**: A git pre-commit hook automatically increments the build number before each commit
3. **Display**: The version is dynamically loaded and displayed on the landing page

## Version Format

The version follows semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Incremented manually for major changes (breaking changes)
- **MINOR**: Incremented manually for new features (backwards compatible)
- **PATCH**: Auto-incremented with each commit (bug fixes, small changes)

Additionally, a **build number** is tracked for reference.

## Automatic Increments

The git pre-commit hook (`.git/hooks/pre-commit`) automatically:
- Increments the patch version (build number)
- Updates `version.json`
- Stages the updated file in the commit

This happens automatically every time you commit.

## Manual Version Changes

To manually increment the major or minor version, use the provided script:

```bash
# Increment major version (1.0.0 → 2.0.0)
./increment-version.sh major

# Increment minor version (1.0.0 → 1.1.0)
./increment-version.sh minor

# Increment patch version (1.0.0 → 1.0.1)
./increment-version.sh patch
```

After manually incrementing, commit the change:

```bash
git add version.json
git commit -m "Bump version for major release"
```

## Files

- `version.json` - Stores the current version
- `.git/hooks/pre-commit` - Git hook for auto-increment
- `increment-version.sh` - Manual version increment script
- The version is displayed in `index.html` via JavaScript

## Current Version

Check `version.json` to see the current version, or view it on the landing page.
