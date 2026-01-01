InstallDir "$PROGRAMFILES\Scrapper"
InstallDirRegKey HKLM "Software\Scrapper" "InstallPath"

RequestExecutionLevel admin

SilentInstall silent
SilentUninstall silent

!macro customInstall
  ; Save install directory for app / updater / Excel
  CreateDirectory "$APPDATA\scrapper"
  FileOpen $0 "$APPDATA\scrapper\install_path.txt" w
  FileWrite $0 "$INSTDIR"
  FileClose $0
!macroend
