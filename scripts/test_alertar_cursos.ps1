param(
  [Parameter(Mandatory = $true)]
  [string]$CronSecret,

  [string]$Phone,
  [string]$ApiKey,
  [string]$BaseUrl = 'https://fgstncvuuhpgyzmjceyr.supabase.co'
)

$ErrorActionPreference = 'Stop'

$uri = "$BaseUrl/functions/v1/alertar-cursos"
if (-not [string]::IsNullOrWhiteSpace($Phone) -and -not [string]::IsNullOrWhiteSpace($ApiKey)) {
  $encPhone = [System.Uri]::EscapeDataString($Phone)
  $encApiKey = [System.Uri]::EscapeDataString($ApiKey)
  $uri = "$uri?test=1&phone=$encPhone&apikey=$encApiKey"
}

$headers = @{
  Authorization = "Bearer $CronSecret"
}

Write-Host "Invocando: $uri" -ForegroundColor Cyan

try {
  $response = Invoke-RestMethod -Method Get -Uri $uri -Headers $headers
  Write-Host "Respuesta:" -ForegroundColor Green
  $response | ConvertTo-Json -Depth 8
}
catch {
  $statusCode = $null
  $body = $null

  if ($_.Exception.Response) {
    $statusCode = [int]$_.Exception.Response.StatusCode
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        $reader.Close()
      }
    }
    catch {
      $body = $null
    }
  }

  Write-Host "Error al invocar la funcion." -ForegroundColor Red
  if ($statusCode -ne $null) {
    Write-Host "HTTP: $statusCode" -ForegroundColor Yellow
  }
  if ($body) {
    Write-Host "Body: $body" -ForegroundColor Yellow
  }
  else {
    Write-Host "Detalle: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}
