param(
  [string]$Container = "property-management-postgres",
  [string]$Database = "property_management",
  [string]$User = "postgres",
  [string]$OutputDirectory = ".\backups"
)

$resolvedOutput = Resolve-Path -Path $OutputDirectory -ErrorAction SilentlyContinue
if (-not $resolvedOutput) {
  New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
  $resolvedOutput = Resolve-Path -Path $OutputDirectory
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $resolvedOutput "property-management-$timestamp.sql"

docker exec $Container pg_dump -U $User $Database | Out-File -FilePath $outputFile -Encoding utf8
Write-Output "Backup written to $outputFile"
