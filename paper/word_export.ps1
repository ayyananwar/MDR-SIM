param([Parameter(Mandatory=$true)][string]$InputFile,[Parameter(Mandatory=$true)][string]$OutputFile)
$ErrorActionPreference = 'Stop'
$paperInput = (Resolve-Path -LiteralPath $InputFile).Path
$paperOutput = [IO.Path]::GetFullPath($OutputFile)
$paperApp = $null
$paperDocument = $null
try {
    $paperApp = New-Object -ComObject Word.Application
    $paperApp.Visible = $false
    $paperApp.DisplayAlerts = 0
    $paperApp.AutomationSecurity = 3
    $paperDocument = $paperApp.Documents.Open($paperInput,$false,$true)
    $paperDocument.Repaginate()
    $paperDocument.ExportAsFixedFormat($paperOutput,17)
    Write-Output "Word exported the manuscript to PDF for layout verification."
} finally {
    if ($null -ne $paperDocument) { $paperDocument.Close(0); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($paperDocument) }
    if ($null -ne $paperApp) { $paperApp.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($paperApp) }
}
