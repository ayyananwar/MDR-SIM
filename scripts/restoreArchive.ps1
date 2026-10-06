param([Parameter(Mandatory=$true)][string]$RelativePath)
$ErrorActionPreference = 'Stop'
$restoreRoot = Split-Path -Parent $PSScriptRoot
$restoreInventory = Get-Content -LiteralPath (Join-Path $restoreRoot 'CLEANUP_INVENTORY.json') -Raw | ConvertFrom-Json
$restoreRecord = $restoreInventory.records | Where-Object { $_.path -eq $RelativePath.Replace('\','/') }
if (@($restoreRecord).Count -ne 1) { throw 'Choose one exact relative file path from CLEANUP_INVENTORY.json' }
$restoreSource = [IO.Path]::GetFullPath((Join-Path $restoreInventory.backup $restoreRecord.path))
$restoreTarget = [IO.Path]::GetFullPath((Join-Path $restoreRoot $restoreRecord.path))
if (-not $restoreSource.StartsWith($restoreInventory.backup + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Source outside backup' }
if (-not $restoreTarget.StartsWith($restoreRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Destination outside project' }
if (Test-Path -LiteralPath $restoreTarget) { throw 'Destination already exists; preserve it separately before restoring' }
if ((Get-FileHash -LiteralPath $restoreSource -Algorithm SHA256).Hash.ToLower() -ne $restoreRecord.sha256) { throw 'Backup checksum mismatch' }
New-Item -ItemType Directory -Path (Split-Path -Parent $restoreTarget) -Force | Out-Null
Copy-Item -LiteralPath $restoreSource -Destination $restoreTarget
if ((Get-FileHash -LiteralPath $restoreTarget -Algorithm SHA256).Hash.ToLower() -ne $restoreRecord.sha256) { throw 'Restored file checksum mismatch' }
Write-Output ('Restored verified file: ' + $restoreRecord.path)
