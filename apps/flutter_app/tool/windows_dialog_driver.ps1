param(
  [Parameter(Mandatory=$true)][int]$TargetProcessId,
  [Parameter(Mandatory=$true)][string]$FileName
)
# Test helper: addresses only a common file dialog owned by this MediaForge PID.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class MediaForgeDialogTest {
  private delegate bool Visitor(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] private static extern bool EnumChildWindows(IntPtr h, Visitor v, IntPtr p);
  [DllImport("user32.dll")] private static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, string l);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  public static bool FillFilename(IntPtr dialog, string name) {
    IntPtr edit = IntPtr.Zero;
    EnumChildWindows(dialog, (h,p) => {
      var cls = new StringBuilder(128); GetClassName(h,cls,128);
      int id = GetDlgCtrlID(h);
      if (cls.ToString() == "Edit" && (id == 1001 || id == 1152)) edit = h;
      return true;
    }, IntPtr.Zero);
    if (edit == IntPtr.Zero) return false;
    SendMessage(edit, 0x000C, IntPtr.Zero, name);
    return true;
  }
}
'@
$target = Get-Process -Id $TargetProcessId
if ($target.ProcessName -ne 'mediaforge_desktop') { throw 'Unexpected test process.' }
$condition = New-Object System.Windows.Automation.AndCondition(
  (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty,$TargetProcessId)),
  (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty,'#32770'))
)
$deadline = [DateTime]::UtcNow.AddSeconds(30)
$dialog = $null
while ($null -eq $dialog -and [DateTime]::UtcNow -lt $deadline) {
  $dialog = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst([System.Windows.Automation.TreeScope]::Children,$condition)
  if ($null -eq $dialog) { Start-Sleep -Milliseconds 100 }
}
if ($null -eq $dialog) { throw 'MediaForge native file dialog did not appear.' }
try {
  $handle = [IntPtr]$dialog.Current.NativeWindowHandle
  $filled = $false
  $controlDeadline = [DateTime]::UtcNow.AddSeconds(20)
  while (!$filled -and [DateTime]::UtcNow -lt $controlDeadline) {
    $filled = [MediaForgeDialogTest]::FillFilename($handle,$FileName)
    if (!$filled) {
      $editCondition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Edit)
      $edits = $dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants,$editCondition)
      foreach ($edit in $edits) {
        if ($edit.Current.Name -match 'File name') {
          $valuePattern = $null
          if ($edit.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern,[ref]$valuePattern)) { $valuePattern.SetValue($FileName); $filled=$true; break }
        }
      }
    }
    if (!$filled) { Start-Sleep -Milliseconds 100 }
  }
  if (!$filled) { throw 'The native filename control was not accessible to this automation session.' }
  [void][MediaForgeDialogTest]::PostMessage($handle,0x0111,[IntPtr]1,[IntPtr]::Zero)
  Write-Output 'Native file dialog completed.'
} catch {
  [void][MediaForgeDialogTest]::PostMessage([IntPtr]$dialog.Current.NativeWindowHandle,0x0111,[IntPtr]2,[IntPtr]::Zero)
  throw
}
