@echo off
:: filepath: c:\Users\user\OneDrive\桌面\ai-design-generator-fresh\restore-files.bat

cd /d "c:\Users\user\OneDrive\桌面\ai-design-generator-fresh"

echo Restoring all JavaScript files...
echo.

:: Create a temporary PowerShell script without special characters
powershell -Command "$ErrorActionPreference='Stop'; Get-ChildItem -Recurse -Filter *.js -Path js | ForEach-Object { $content = Get-Content $_.FullName -Raw; $content = $content -replace '(?m)^import\s+.*?\n', ''; $content = $content -replace '(?m)^export\s+.*?\n', ''; $content = $content -replace '(?m)^export\s*\{[^}]*\}\s*;\s*\n', ''; Set-Content $_.FullName -Value $content -NoNewline -Encoding UTF8; Write-Host \"Fixed: $($_.Name)\" -ForegroundColor Green }"

echo.
echo ===================================
echo ALL FILES FIXED!
echo Please refresh your browser now.
echo ===================================
pause
