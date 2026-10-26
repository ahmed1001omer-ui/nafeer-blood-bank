' Nafeer Blood Bank Management System - Native Offline Desktop Launcher
Option Explicit

Dim WshShell, fso, edgePath, chromePath, targetUrl, launchCmd, projectDir, i

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Set working directory to project root
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = projectDir

' Use direct loopback IP 127.0.0.1 (never requires internet or DNS resolution)
targetUrl = "http://127.0.0.1:3000"

' Function to verify if local offline server is responding
Function IsServerRunning()
    On Error Resume Next
    Dim http
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.setTimeouts 400, 400, 400, 800
    http.Open "GET", "http://127.0.0.1:3000/api/health", False
    http.Send
    If Err.Number = 0 Then
        If http.Status = 200 Then
            IsServerRunning = True
            Exit Function
        End If
    End If
    IsServerRunning = False
    On Error GoTo 0
End Function

' 1. If local server is not running, start it in the background silently
If Not IsServerRunning() Then
    WshShell.Run "cmd.exe /c set NEXT_TELEMETRY_DISABLED=1&& node scripts\migrate-post-responses.cjs && node node_modules\next\dist\bin\next start -H 0.0.0.0 -p 3000", 0, False

    ' Wait for server to be ready on port 3000 (up to 20 seconds)
    For i = 1 To 40
        WScript.Sleep 500
        If IsServerRunning() Then Exit For
    Next
End If

' 2. Locate Real Electron Desktop Application (Priority)
Dim electronExe
electronExe = projectDir & "\dist-electron\win-unpacked\Nafeer Blood Bank Management System.exe"
If Not fso.FileExists(electronExe) Then
    electronExe = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\Nafeer Blood Bank Management System\Nafeer Blood Bank Management System.exe")
End If

edgePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe")
If Not fso.FileExists(edgePath) Then
    edgePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")
End If

chromePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles%\Google\Chrome\Application\chrome.exe")
If Not fso.FileExists(chromePath) Then
    chromePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe")
End If

If fso.FileExists(electronExe) Then
    WshShell.Environment("PROCESS")("NAFEER_APP_URL") = targetUrl
    launchCmd = """" & electronExe & """"
ElseIf fso.FileExists(edgePath) Then
    launchCmd = """" & edgePath & """ --app=""" & targetUrl & """ --window-size=1366,820 --window-position=50,30"
ElseIf fso.FileExists(chromePath) Then
    launchCmd = """" & chromePath & """ --app=""" & targetUrl & """ --window-size=1366,820 --window-position=50,30"
Else
    launchCmd = "cmd /c start " & targetUrl
End If

' 3. Open Application Window
WshShell.Run launchCmd, 1, False
