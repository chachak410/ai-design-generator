# modularize.ps1
$indexPath = "index.html"
$cssPath = "css/styles.css"
$jsPath = "js/main.js"

# Create directories if they don't exist
New-Item -ItemType Directory -Force -Path "css" | Out-Null
New-Item -ItemType Directory -Force -Path "js" | Out-Null

# Read index.html
$content = Get-Content -Path $indexPath -Raw

# Extract <style> content (multi-line)
if ($content -match '<style>([\s\S]*?)</style>') {
    $styleContent = $matches[1].Trim()
    Set-Content -Path $cssPath -Value $styleContent
    $content = $content -replace '<style>[\s\S]*?</style>', '<link rel="stylesheet" href="css/styles.css">'
}

# Extract inline <script> content (without src attribute, multi-line)
if ($content -match '<script\b(?!.*src).*?>([\s\S]*?)</script>') {
    $scriptContent = $matches[1].Trim()
    Set-Content -Path $jsPath -Value $scriptContent
    $content = $content -replace '<script\b(?!.*src).*?>[\s\S]*?</script>', '<script src="js/main.js"></script>'
}

# Save updated index.html
Set-Content -Path $indexPath -Value $content