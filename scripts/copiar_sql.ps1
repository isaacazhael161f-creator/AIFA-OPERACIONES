# copiar_sql.ps1
# Copia archivos SQL de sql_fresh/ al clipboard directamente desde disco.
# Evita el problema de cache de VS Code (que muestra versiones antiguas).
#
# Uso:
#   . .\scripts\copiar_sql.ps1     <- cargar funciones
#   Copiar 0                       <- diagnóstico
#   Copiar 1                       <- lote 01_data.sql
#   Copiar 2                       <- lote 02_data.sql
#   ... etc hasta Copiar 10
#   Copiar v                       <- validacion_final.sql

$Dir = Join-Path $PSScriptRoot "..\sql_fresh"

function Copiar {
  param([string]$Num)

  $file = switch ($Num) {
    '0' { Join-Path $Dir "00_diagnostico.sql" }
    'v' { Join-Path $Dir "validacion_final.sql" }
    default {
      $pad = $Num.PadLeft(2, '0')
      Join-Path $Dir "${pad}_data.sql"
    }
  }

  if (Test-Path $file) {
    Get-Content $file -Raw -Encoding UTF8 | Set-Clipboard
    $size = [math]::Round((Get-Item $file).Length / 1KB, 1)
    Write-Host "✓ Copiado al clipboard: $(Split-Path $file -Leaf)  ($size KB)" -ForegroundColor Green
    Write-Host "  Ahora pega en Supabase SQL Editor y ejecuta Run." -ForegroundColor Cyan
  } else {
    Write-Host "✗ No encontrado: $file" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Helper cargado. Comandos disponibles:" -ForegroundColor Yellow
Write-Host "  Copiar 0   -> 00_diagnostico.sql"
Write-Host "  Copiar 1   -> 01_data.sql  (colaboradores 1-50)"
Write-Host "  Copiar 2   -> 02_data.sql  (colaboradores 51-100)"
Write-Host "  Copiar 3   -> 03_data.sql  (colaboradores 101-150)"
Write-Host "  Copiar 4   -> 04_data.sql  (colaboradores 151-200)"
Write-Host "  Copiar 5   -> 05_data.sql  (colaboradores 201-250)"
Write-Host "  Copiar 6   -> 06_data.sql  (colaboradores 251-300)"
Write-Host "  Copiar 7   -> 07_data.sql  (colaboradores 301-350)"
Write-Host "  Copiar 8   -> 08_data.sql  (colaboradores 351-400)"
Write-Host "  Copiar 9   -> 09_data.sql  (colaboradores 401-450)"
Write-Host "  Copiar 10  -> 10_data.sql  (colaboradores 451-459)"
Write-Host "  Copiar v   -> validacion_final.sql"
Write-Host ""
