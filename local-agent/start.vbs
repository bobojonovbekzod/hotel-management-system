Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
WshShell.CurrentDirectory = objFSO.GetParentFolderName(WScript.ScriptFullName)

' 0 raqami oynani yashirin (invisible) qilib ochishni bildiradi
WshShell.Run chr(34) & "HotelBase-Agent.exe" & Chr(34), 0
Set WshShell = Nothing
