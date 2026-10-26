$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "Nafeer Blood Bank.lnk"

if (Test-Path $ShortcutPath) {
    Remove-Item $ShortcutPath -Force -ErrorAction SilentlyContinue
}

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)

$ProjectDir = (Get-Location).Path
$VbsPath = Join-Path -Path $ProjectDir -ChildPath "Launch-Nafeer-Desktop.vbs"
$IconPath = Join-Path -Path $ProjectDir -ChildPath "public\nafeer-v2.ico"

$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$VbsPath`""
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.IconLocation = "$IconPath, 0"
$Shortcut.Description = "Nafeer Blood Bank Desktop Application"
$Shortcut.Save()

Write-Output "SUCCESS: Created desktop shortcut with new icon at: $ShortcutPath"
