# Install Xiaomi MiMo for Copilot Chat extension for VS Code / Cursor
# Usage: irm https://raw.githubusercontent.com/elmaleek/xiaomi-mimo-opengateway-copilot-extensions/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$Repo = "elmaleek03/xiaomi-mimo-opengateway-copilot-extensions"
$ExtensionId = "xiaomimimo-for-copilot"
$Version = "0.1.0"

function Find-Editor {
    foreach ($cli in @("code", "cursor", "codium")) {
        $cmd = Get-Command $cli -ErrorAction SilentlyContinue
        if ($cmd) { return $cli }
    }
    return $null
}

$editor = Find-Editor

if (-not $editor) {
    Write-Host "❌ No VS Code-compatible editor found. Install VS Code, Cursor, or VSCodium first."
    exit 1
}

Write-Host "🔍 Detected editor: $editor"
Write-Host "📦 Installing Xiaomi MiMo for Copilot Chat v${Version}..."

$tmpFile = Join-Path $env:TEMP "mimo-copilot-${Version}.vsix"

$downloadUrl = "https://github.com/${Repo}/releases/download/v${Version}/${ExtensionId}-${Version}.vsix"

Write-Host "⬇️  Downloading from ${downloadUrl}..."
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tmpFile -UseBasicParsing
} catch {
    Write-Host "❌ Download failed: $_"
    exit 1
}

Write-Host "📥 Installing extension..."
& $editor --install-extension $tmpFile --force

Remove-Item $tmpFile -ErrorAction SilentlyContinue

Write-Host "✅ Done! Restart your editor to use Xiaomi MiMo in Copilot Chat."
Write-Host "   Pick 'Xiaomi MiMo' from the model picker in Copilot Chat."
