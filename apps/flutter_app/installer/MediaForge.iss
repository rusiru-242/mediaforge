#define Root AddBackslash(SourcePath) + "..\"
#define Release Root + "build\windows\x64\runner\Release\"
#define RepositoryRoot Root + "..\..\"
#if !FileExists(Release + "mediaforge_desktop.exe") || !FileExists(Release + "tools\ffmpeg.exe") || !FileExists(Release + "tools\ffprobe.exe")
  #error Build and verify the standalone Windows Release folder first.
#endif

[Setup]
AppId={{8BE30DAE-3227-4595-8D03-D5359B66DE26}
AppName=MediaForge
AppVersion=1.0.0
AppVerName=MediaForge v1.0
VersionInfoVersion=1.0.0.0
VersionInfoDescription=MediaForge Windows Installer
AppPublisher=MediaForge
DefaultDirName={localappdata}\Programs\MediaForge
DefaultGroupName=MediaForge
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.22000
OutputDir={#RepositoryRoot}releases
OutputBaseFilename=MediaForge-Setup-v1.0
SetupIconFile={#Root}windows\runner\resources\app_icon.ico
UninstallDisplayIcon={app}\mediaforge_desktop.exe
Compression=lzma2/normal
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
SetupLogging=yes
UninstallDisplayName=MediaForge v1.0
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
