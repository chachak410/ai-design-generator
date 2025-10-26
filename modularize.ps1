# modularize.ps1
$indexPath = "index.html"
$cssPath = "css/styles.css"
$jsPath = "js/main.js"

# Create directories if they don't exist
New-Item -ItemType Directory -Force -Path "css" | Out-Null
New-Item -ItemType Directory -Force -Path "js" | Out-Null

# Read index.html
$content = Get-Content -Path $indexPath -Raw

# Extract <style> content
if ($content -match '<style>(.*?)</style>' -and $matches[1]) {
    $styleContent = $matches[1].Trim()
    Set-Content -Path $cssPath -Value $styleContent
    $content = $content -replace '<style>.*?</style>', '<link rel="stylesheet" href="css/styles.css">'
}

# Extract <script> content
if ($content -match '<script>(.*?)</script>' -and $matches[1]) {
    $scriptContent = $matches[1].Trim()
    Set-Content -Path $jsPath -Value $scriptContent
    $content = $content -replace '<script>.*?</script>', '<script src="js/main.js"></script>'
}

# Save updated index.html
Set-Content -Path $indexPath -Value $content