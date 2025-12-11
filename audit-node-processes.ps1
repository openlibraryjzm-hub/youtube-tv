# Audit Node.js Processes Script
# This script helps identify where Node.js processes are coming from

Write-Host ""
Write-Host "=== Node.js Process Audit ===" -ForegroundColor Cyan
Write-Host "Scanning for Node.js processes..." -ForegroundColor Yellow
Write-Host ""

# Get all Node.js processes
$nodeProcesses = Get-Process | Where-Object { $_.ProcessName -like "*node*" } | Sort-Object ProcessName

if ($nodeProcesses.Count -eq 0) {
    Write-Host "No Node.js processes found!" -ForegroundColor Green
    Write-Host ""
    Write-Host "If you see Node.js in Task Manager but not here, try:" -ForegroundColor Yellow
    Write-Host "1. Refresh Task Manager (F5)" -ForegroundColor White
    Write-Host "2. Check Details tab in Task Manager" -ForegroundColor White
    Write-Host "3. Look for processes named exactly node or node.exe" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Found $($nodeProcesses.Count) Node.js process(es):" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($proc in $nodeProcesses) {
        Write-Host "----------------------------------------" -ForegroundColor Gray
        Write-Host "Process Name: $($proc.ProcessName)" -ForegroundColor Cyan
        Write-Host "Process ID: $($proc.Id)" -ForegroundColor White
        Write-Host "Path: $($proc.Path)" -ForegroundColor White
        
        # Try to get command line arguments (requires WMI)
        try {
            $wmiProc = Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)"
            if ($wmiProc.CommandLine) {
                Write-Host "Command Line: $($wmiProc.CommandLine)" -ForegroundColor Yellow
                
                # Analyze the command line
                if ($wmiProc.CommandLine -like "*tauri*dev*" -or $wmiProc.CommandLine -like "*npm*dev*") {
                    Write-Host "WARNING: This is from Tauri DEV mode!" -ForegroundColor Red
                    Write-Host "  You should run the built .exe, not tauri dev" -ForegroundColor Red
                } elseif ($wmiProc.CommandLine -like "*electron*") {
                    Write-Host "WARNING: This is from Electron app!" -ForegroundColor Red
                    Write-Host "  Make sure you closed the Electron version" -ForegroundColor Red
                } elseif ($wmiProc.CommandLine -like "*vscode*" -or $wmiProc.CommandLine -like "*cursor*") {
                    Write-Host "This is from VS Code/Cursor (editor extension)" -ForegroundColor Blue
                } elseif ($wmiProc.CommandLine -like "*next*" -or $wmiProc.CommandLine -like "*server*") {
                    Write-Host "WARNING: This looks like a Next.js server!" -ForegroundColor Red
                    Write-Host "  Tauri should NOT spawn Next.js servers" -ForegroundColor Red
                } else {
                    Write-Host "Source unclear - check command line above" -ForegroundColor Gray
                }
            } else {
                Write-Host "Command Line: (Unable to retrieve)" -ForegroundColor Gray
            }
        } catch {
            Write-Host "Command Line: (Error retrieving: $($_.Exception.Message))" -ForegroundColor Red
        }
        
        Write-Host "Memory Usage: $([math]::Round($proc.WorkingSet64 / 1MB, 2)) MB" -ForegroundColor White
        Write-Host "Start Time: $($proc.StartTime)" -ForegroundColor White
        Write-Host ""
    }
}

Write-Host ""
Write-Host "=== Your Tauri App Process ===" -ForegroundColor Cyan
$tauriProcesses = Get-Process | Where-Object { 
    $_.ProcessName -like "*app*" -or 
    $_.ProcessName -like "*youtube*" -or
    $_.MainWindowTitle -like "*YouTube TV*"
} | Sort-Object ProcessName

if ($tauriProcesses.Count -eq 0) {
    Write-Host "Tauri app not found. Make sure it is running!" -ForegroundColor Yellow
} else {
    foreach ($proc in $tauriProcesses) {
        Write-Host "Process: $($proc.ProcessName) (ID: $($proc.Id))" -ForegroundColor Green
        Write-Host "Path: $($proc.Path)" -ForegroundColor White
        Write-Host "Window Title: $($proc.MainWindowTitle)" -ForegroundColor White
        
        # Check if it's from the release build
        if ($proc.Path -like "*target\release*" -or $proc.Path -like "*YouTube TV*") {
            Write-Host "This is the RELEASE build (correct!)" -ForegroundColor Green
        } elseif ($proc.Path -like "*target\debug*") {
            Write-Host "This is a DEBUG build" -ForegroundColor Yellow
        } else {
            Write-Host "Build type unclear" -ForegroundColor Gray
        }
        Write-Host ""
    }
}

Write-Host ""
Write-Host "=== Recommendations ===" -ForegroundColor Cyan
Write-Host "1. If Node.js appears, check the Command Line above" -ForegroundColor White
Write-Host "2. Make sure you are running the INSTALLED app, not tauri dev" -ForegroundColor White
Write-Host "3. Close any Electron versions of the app" -ForegroundColor White
Write-Host "4. VS Code/Cursor Node.js processes are normal (editor extensions)" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

