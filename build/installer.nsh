!macro customInstall
  ; Resolve real user AppData path
  CreateDirectory "$PROFILE\AppData\Roaming\scrapper"
  FileOpen $0 "$PROFILE\AppData\Roaming\scrapper\install_path.txt" w
  FileWrite $0 "$INSTDIR"
  FileClose $0
!macroend
