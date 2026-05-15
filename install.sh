#!/usr/bin/env bash
# Install Xiaomi MiMo for Copilot Chat extension for VS Code / Cursor
# Usage: curl -sL https://raw.githubusercontent.com/elmaleek/xiaomi-mimo-opengateway-copilot-extensions/main/install.sh | bash

set -euo pipefail

REPO="elmaleek03/xiaomi-mimo-opengateway-copilot-extensions"
EXTENSION_ID="xiaomimimo-for-copilot"
VERSION="0.1.0"

# Detect which editor CLI is available
detect_editor() {
    if command -v code &>/dev/null; then
        echo "code"
    elif command -v cursor &>/dev/null; then
        echo "cursor"
    elif command -v codium &>/dev/null; then
        echo "codium"
    else
        echo ""
    fi
}

EDITOR_CLI=$(detect_editor)

if [ -z "$EDITOR_CLI" ]; then
    echo "❌ No VS Code-compatible editor found. Install VS Code, Cursor, or VSCodium first."
    exit 1
fi

echo "🔍 Detected editor: $EDITOR_CLI"
echo "📦 Installing Xiaomi MiMo for Copilot Chat v${VERSION}..."

TMPFILE=$(mktemp /tmp/mimo-copilot-XXXXXX.vsix)
trap 'rm -f "$TMPFILE"' EXIT

DOWNLOAD_URL="https://github.com/${REPO}/releases/download/v${VERSION}/${EXTENSION_ID}-${VERSION}.vsix"

echo "⬇️  Downloading from ${DOWNLOAD_URL}..."
if command -v curl &>/dev/null; then
    curl -fSL "$DOWNLOAD_URL" -o "$TMPFILE"
elif command -v wget &>/dev/null; then
    wget -q "$DOWNLOAD_URL" -O "$TMPFILE"
else
    echo "❌ Neither curl nor wget found. Install one and try again."
    exit 1
fi

echo "📥 Installing extension..."
"$EDITOR_CLI" --install-extension "$TMPFILE" --force

echo "✅ Done! Restart your editor to use Xiaomi MiMo in Copilot Chat."
echo "   Pick 'Xiaomi MiMo' from the model picker in Copilot Chat."
