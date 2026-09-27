$workspaceRoot = Split-Path -Parent $PSScriptRoot
$secretDirectory = Join-Path $workspaceRoot '.local-secrets'
$keyFile = Join-Path $secretDirectory 'lessonprep-private.pem'
New-Item -ItemType Directory -Path $secretDirectory -Force | Out-Null
if (Test-Path -LiteralPath $keyFile) {
    Write-Output "Key already exists: $keyFile"
    exit 0
}
$opensslCommand = Get-Command openssl -ErrorAction SilentlyContinue
$opensslPath = if ($opensslCommand) { $opensslCommand.Source } else { 'C:\Program Files\Git\usr\bin\openssl.exe' }
if (-not (Test-Path -LiteralPath $opensslPath)) {
    throw 'OpenSSL is required to create a development key.'
}
& $opensslPath genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out $keyFile 2>$null
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $keyFile)) {
    throw 'OpenSSL could not create the development key.'
}
Write-Output "Created private key: $keyFile"
