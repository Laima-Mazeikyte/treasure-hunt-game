#!/bin/bash

# Manual version increment script
# Usage: ./increment-version.sh [major|minor|patch]

VERSION_FILE="version.json"
TYPE=${1:-patch}

if [ ! -f "$VERSION_FILE" ]; then
    echo "Error: version.json not found"
    exit 1
fi

# Read current version
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' "$VERSION_FILE" | cut -d'"' -f4)
CURRENT_BUILD=$(grep -o '"build": [0-9]*' "$VERSION_FILE" | grep -o '[0-9]*')

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Increment based on type
case $TYPE in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch|*)
        PATCH=$((PATCH + 1))
        ;;
esac

# Increment build
NEW_BUILD=$((CURRENT_BUILD + 1))

# Create new version
NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

# Update file
cat > "$VERSION_FILE" << EOF
{
  "version": "$NEW_VERSION",
  "build": $NEW_BUILD
}
EOF

echo "Version updated: $CURRENT_VERSION → $NEW_VERSION (build $NEW_BUILD)"
