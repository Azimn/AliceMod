$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Section([string]$Title) {
    Write-Host ''
    Write-Host ('=' * 68)
    Write-Host $Title
    Write-Host ('=' * 68)
}

function Fail([string]$Message) {
    Write-Host ''
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Require-Command([string]$Name, [string]$InstallHint) {
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) {
        Write-Host "Missing: $Name" -ForegroundColor Yellow
        Write-Host "Install it, reopen this folder, then run INSTALL_KIKI_WINDOWS.cmd again."
        Write-Host "Suggested command: $InstallHint"
        return $false
    }
    Write-Host "Found: $Name"
    return $true
}

function Get-MajorVersion([string]$Text) {
    if ($Text -match '(\d+)\.') {
        return [int]$Matches[1]
    }
    return 0
}

function Test-PythonExecutable([string]$Executable) {
    try {
        $output = & $Executable -c "import sys; print(sys.executable); print('.'.join(map(str, sys.version_info[:3])))" 2>$null
        if ($LASTEXITCODE -ne 0 -or $output.Count -lt 2) {
            return $null
        }
        return [PSCustomObject]@{
            Path = $output[0].Trim()
            Version = $output[1].Trim()
        }
    }
    catch {
        return $null
    }
}

function Resolve-Python {
    $pyLauncher = Get-Command 'py' -ErrorAction SilentlyContinue
    if ($pyLauncher) {
        try {
            $output = & py -3.11 -c "import sys; print(sys.executable); print('.'.join(map(str, sys.version_info[:3])))" 2>$null
            if ($LASTEXITCODE -eq 0 -and $output.Count -ge 2) {
                return [PSCustomObject]@{
                    Path = $output[0].Trim()
                    Version = $output[1].Trim()
                }
            }
        }
        catch {
        }
    }

    $pythonCommand = Get-Command 'python' -ErrorAction SilentlyContinue
    if ($pythonCommand -and $pythonCommand.Source -notmatch 'WindowsApps') {
        $resolved = Test-PythonExecutable $pythonCommand.Source
        if ($resolved) {
            return $resolved
        }
    }

    if ($pyLauncher) {
        try {
            $output = & py -3 -c "import sys; print(sys.executable); print('.'.join(map(str, sys.version_info[:3])))" 2>$null
            if ($LASTEXITCODE -eq 0 -and $output.Count -ge 2) {
                return [PSCustomObject]@{
                    Path = $output[0].Trim()
                    Version = $output[1].Trim()
                }
            }
        }
        catch {
        }
    }

    return $null
}

function Invoke-Step([string]$Label, [scriptblock]$Action) {
    Write-Section $Label
    & $Action
    if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
        Fail "$Label failed with exit code $LASTEXITCODE."
    }
}

Write-Section 'Kiki Windows preflight'

if ($env:OS -ne 'Windows_NT') {
    Fail 'This helper is intended for Windows.'
}

$arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
if ($arch -ne 'X64') {
    Fail "This Kiki release candidate currently targets Windows x64. Detected: $arch"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
Write-Host "Repository: $repoRoot"

$allPresent = $true
$allPresent = (Require-Command 'git' 'winget install --id Git.Git -e') -and $allPresent
$allPresent = (Require-Command 'node' 'winget install --id OpenJS.NodeJS.LTS -e') -and $allPresent
$allPresent = (Require-Command 'npm' 'Install Node.js LTS, which includes npm') -and $allPresent
$allPresent = (Require-Command 'go' 'winget install --id GoLang.Go -e') -and $allPresent
$allPresent = (Require-Command 'ollama' 'winget install --id Ollama.Ollama -e') -and $allPresent

$python = Resolve-Python
if (-not $python) {
    Write-Host 'Missing: usable Python' -ForegroundColor Yellow
    Write-Host 'The Windows Store python alias does not count as an installed interpreter.'
    Write-Host 'Install Python 3.11, reopen this folder, then run INSTALL_KIKI_WINDOWS.cmd again.'
    Write-Host 'Suggested command: winget install --id Python.Python.3.11 -e'
    $allPresent = $false
}
else {
    Write-Host "Found: Python $($python.Version) at $($python.Path)"
}

if (-not $allPresent) {
    Fail 'One or more prerequisites are missing.'
}

$nodeVersion = (& node --version).Trim()
$nodeMajor = Get-MajorVersion $nodeVersion
if ($nodeMajor -lt 22) {
    Fail "Node.js 22 or newer is required. Detected $nodeVersion"
}
Write-Host "Node.js: $nodeVersion"

$goVersion = (& go version)
if ($goVersion -notmatch 'go1\.(\d+)') {
    Fail "Could not parse Go version: $goVersion"
}
$goMinor = [int]$Matches[1]
if ($goMinor -lt 23) {
    Fail "Go 1.23 or newer is required. Detected: $goVersion"
}
Write-Host $goVersion

if ($python.Version -notmatch '^3\.11\.') {
    Write-Host "WARNING: Python 3.11 is the validated native-module version. Detected: Python $($python.Version)" -ForegroundColor Yellow
    Write-Host 'The build may still work, but Python 3.11 is preferred.'
}

$env:PYTHON = $python.Path
$env:npm_config_python = $python.Path
Write-Host "Python for npm/node-gyp: $($python.Path)"

Write-Section 'Ollama check'

try {
    $null = & ollama list 2>&1
}
catch {
    Fail 'Ollama is installed but did not respond. Start Ollama, then run this file again.'
}

$ollamaOutput = (& ollama list 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) {
    Fail 'Ollama did not respond successfully. Start the Ollama application/service and try again.'
}

Write-Host $ollamaOutput.TrimEnd()

$modelLines = @($ollamaOutput -split "`r?`n" | Select-Object -Skip 1 | Where-Object { $_.Trim() })
if ($modelLines.Count -eq 0) {
    $ramBytes = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
    $ramGB = [math]::Round($ramBytes / 1GB)
    $recommended = if ($ramGB -ge 16) { 'qwen3:8b' } else { 'qwen3:4b' }

    Write-Host ''
    Write-Host 'No Ollama models are installed.' -ForegroundColor Yellow
    Write-Host "Detected RAM: approximately $ramGB GB"
    Write-Host "Recommended starter model: $recommended"
    $answer = Read-Host "Download $recommended now? [Y/n]"
    if ([string]::IsNullOrWhiteSpace($answer) -or $answer -match '^[Yy]') {
        & ollama pull $recommended
        if ($LASTEXITCODE -ne 0) {
            Fail "Ollama could not download $recommended."
        }
    }
    else {
        Fail 'Kiki needs at least one Ollama model for the default local setup.'
    }
}
else {
    Write-Host 'Ollama has at least one installed model. Kiki onboarding will let you select it.' -ForegroundColor Green
}

Invoke-Step 'Install Node dependencies' {
    & npm ci
}

Invoke-Step 'Prepare verified local embedding assets' {
    & npm run setup:embeddings
}

Invoke-Step 'Validate and package Kiki' {
    & npm run package:local
}

Write-Section 'Locate installer'

$releaseRoot = Join-Path $repoRoot 'release'
if (-not (Test-Path $releaseRoot)) {
    Fail 'Packaging completed but the release folder was not created.'
}

$installer = Get-ChildItem -Path $releaseRoot -Recurse -File -Filter 'Kiki-Windows-*-Setup.exe' |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $installer) {
    Fail 'Packaging completed but no Kiki Windows installer was found.'
}

Write-Host "Installer ready: $($installer.FullName)" -ForegroundColor Green
Write-Host ''
Write-Host 'The installer will open now. Windows may display a SmartScreen warning because this local test build is not code-signed.'
Write-Host 'That warning is expected for a locally built unsigned Electron installer.'
Write-Host ''

Start-Process -FilePath $installer.FullName

Write-Section 'What to do after Kiki launches'
Write-Host '1. Choose Ollama during onboarding.'
Write-Host '2. Select one of the models shown by Ollama.'
Write-Host '3. Keep local Whisper, Piper, and local embeddings selected for the first test.'
Write-Host '4. Test text chat first.'
Write-Host '5. Then test microphone, wake word "kiki", speech, memory, and desktop tools.'
Write-Host ''
Write-Host 'If anything fails, copy the visible error or take a screenshot and bring it back to ChatGPT.'
exit 0
