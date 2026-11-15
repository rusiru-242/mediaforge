#define Root AddBackslash(SourcePath) + "..\"
#define Release Root + "build\windows\x64\runner\Release\"
#if !FileExists(Release + "mediaforge_desktop.exe") || !FileExists(Release + "tools\ffmpeg.exe") || !FileExists(Release + "tools\ffprobe.exe")
  #error Build and verify the standalone Windows Release folder first.
#endif

[Setup]
AppId={{8BE30DAE-3227-4595-8D03-D5359B66DE26}
AppName=MediaForge
AppVersion=1.0.0
AppPublisher=MediaForge
DefaultDirName={localappdata}\Programs\MediaForge
DefaultGroupName=MediaForge
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.22000
OutputDir={#Root}dist
OutputBaseFilename=MediaForge-1.0.0-windows-x64-setup
SetupIconFile={#Root}windows\runner\resources\app_icon.ico
UninstallDisplayIcon={app}\mediaforge_desktop.exe
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
LicenseFile={#Release}tools\SOURCE-NOTICE.txt

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "{#Release}*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\MediaForge"; Filename: "{app}\mediaforge_desktop.exe"; WorkingDir: "{app}"
Name: "{group}\Uninstall MediaForge"; Filename: "{uninstallexe}"
Name: "{autodesktop}\MediaForge"; Filename: "{app}\mediaforge_desktop.exe"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\mediaforge_desktop.exe"; Description: "Launch MediaForge"; Flags: nowait postinstall skipifsilent
