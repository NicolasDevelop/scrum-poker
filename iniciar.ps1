Set-Location $PSScriptRoot

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
  $python = Get-Command py -ErrorAction SilentlyContinue
}

if (-not $python) {
  Write-Host "No encontre Python instalado. Instala Python 3 desde https://www.python.org/downloads/ y vuelve a ejecutar este archivo."
  exit 1
}

& $python.Source app.py
