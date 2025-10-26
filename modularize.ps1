# modularize.ps1
# Automates moving CSS and JS from index.html to css/styles.css and js/main.js
# Works in the current directory to avoid path encoding issues
if (-not (Test-Path "index.html")) {
    Write-Output "ERROR: index.html not found in the current directory"
    exit 1
}
if (-not (Test-Path "css")) { New-Item -ItemType Directory -Name "css" | Out-Null }
if (-not (Test-Path "js")) { New-Item -ItemType Directory -Name "js" | Out-Null }
$html = Get-Content -Path "index.html" -Raw -Encoding UTF8
Copy-Item -Path "index.html" -Destination "index.html.bak" -Force
Write-Output "Backed up index.html to index.html.bak"
$cssPattern = '(?s)<style\b[^>]*>(.*?)</style>'
$cssMatch = [regex]::Match($html, $cssPattern)
if ($cssMatch.Success) {
    $css = $cssMatch.Groups[1].Value.Trim()
    if (-not [string]::IsNullOrWhiteSpace($css)) {
        $css | Set-Content -Path "css/styles.css" -Encoding UTF8 -Force
        $cssReplacement = '<link rel="stylesheet" href="css/styles.css">'
        $html = [regex]::Replace($html, $cssPattern, $cssReplacement, 1)
        Write-Output "Moved CSS to css/styles.css"
    } else {
        Write-Output "Found <style> block but it was empty. No css/styles.css written."
    }
} else {
    Write-Output "No <style>...</style> block found in index.html."
}
$jsPattern = '(?s)<script\b(?![^>]*\bsrc=)(.*?)</script>'
$jsMatch = [regex]::Match($html, $jsPattern)
if ($jsMatch.Success) {
    $js = $jsMatch.Groups[1].Value.Trim()
    if (-not [string]::IsNullOrWhiteSpace($js)) {
        $js | Set-Content -Path "js/main.js" -Encoding UTF8 -Force
        $jsReplacement = '<script src="js/main.js"></script>'
        $html = [regex]::Replace($html, $jsPattern, $jsReplacement, 1)
        Write-Output "Moved JavaScript to js/main.js"
    } else {
        Write-Output "Found internal <script> block but it was empty. No js/main.js written."
    }
} else {
    Write-Output "No internal <script>...</script> block (without src) found in index.html."
}
$html | Set-Content -Path "index.html" -Encoding UTF8 -Force
Write-Output "Updated index.html with links to css/styles.css and js/main.js"
if (Test-Path "js/main.js") {
    $jsContent = Get-Content -Path "js/main.js" -Raw
    $jsContent = $jsContent -replace "const STABILITY_API_KEY = ['`"].*?['`"];", "// Removed STABILITY_API_KEY for security"
    $jsContent = $jsContent -replace "const HUGGINGFACE_API_KEY = ['`"].*?['`"];", "// Removed HUGGINGFACE_API_KEY for security"
    $jsContent | Set-Content -Path "js/main.js" -Encoding UTF8 -Force
    Write-Output "Removed API keys from js/main.js for security"
} else {
    Write-Output "No js/main.js found, skipping API key removal"
}
Write-Output "`nProject files after script:"
Get-ChildItem -Force | Select-Object Name,PSIsContainer | Format-Table -AutoSize
if (Test-Path "css/styles.css") {
    Write-Output "css/styles.css exists. First 10 lines:"
    Get-Content "css/styles.css" -TotalCount 10
} else {
    Write-Output "css/styles.css not created."
}
if (Test-Path "js/main.js") {
    Write-Output "js/main.js exists. First 30 lines:"
    Get-Content "js/main.js" -TotalCount 30
} else {
    Write-Output "js/main.js not created."
}
Write-Output "`nDone! Run 'live-server' to test, then commit to GitHub."
