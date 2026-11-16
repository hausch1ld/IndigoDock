using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;

[ComImport,Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}
[ComImport,Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IDeviceEnumerator {
 [PreserveSig] int EnumAudioEndpoints(int flow,int mask,out IntPtr devices);
 [PreserveSig] int GetDefaultAudioEndpoint(int flow,int role,out IDevice device);
}
[ComImport,Guid("D666063F-1587-4E43-81F1-B948E807363F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IDevice {
 [PreserveSig] int Activate(ref Guid iid,int ctx,IntPtr activation,[MarshalAs(UnmanagedType.IUnknown)]out object obj);
}
[ComImport,Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IManager {
 [PreserveSig] int GetAudioSessionControl(IntPtr guid,uint flags,out IntPtr control);
 [PreserveSig] int GetSimpleAudioVolume(IntPtr guid,uint flags,out IntPtr volume);
 [PreserveSig] int GetSessionEnumerator(out IEnumeration sessions);
}
[ComImport,Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IEnumeration {
 [PreserveSig] int GetCount(out int count);
 [PreserveSig] int GetSession(int index,[MarshalAs(UnmanagedType.IUnknown)]out object control);
}
[ComImport,Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IControl {
 [PreserveSig] int GetState(out int state);
 [PreserveSig] int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)]out string name);
 [PreserveSig] int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)]string name,ref Guid context);
 [PreserveSig] int GetIconPath([MarshalAs(UnmanagedType.LPWStr)]out string path);
 [PreserveSig] int SetIconPath([MarshalAs(UnmanagedType.LPWStr)]string path,ref Guid context);
 [PreserveSig] int GetGroupingParam(out Guid group);
 [PreserveSig] int SetGroupingParam(ref Guid group,ref Guid context);
 [PreserveSig] int RegisterAudioSessionNotification(IntPtr notification);
 [PreserveSig] int UnregisterAudioSessionNotification(IntPtr notification);
 [PreserveSig] int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)]out string id);
 [PreserveSig] int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)]out string id);
 [PreserveSig] int GetProcessId(out uint pid);
}
[ComImport,Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IVolume {
 [PreserveSig] int SetMasterVolume(float level,ref Guid context);
 [PreserveSig] int GetMasterVolume(out float level);
 [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)]bool mute,ref Guid context);
 [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)]out bool mute);
}
class AudioMixer {
 [STAThread] static void Main(string[] args) {
  Console.OutputEncoding = new System.Text.UTF8Encoding(false);
  var result=new List<object>();
  object enumerator=null,manager=null;IDevice device=null;IEnumeration sessions=null;
  try {
   enumerator=new MMDeviceEnumerator();Marshal.ThrowExceptionForHR(((IDeviceEnumerator)enumerator).GetDefaultAudioEndpoint(0,1,out device));
   Guid iid=typeof(IManager).GUID;Marshal.ThrowExceptionForHR(device.Activate(ref iid,23,IntPtr.Zero,out manager));
   Marshal.ThrowExceptionForHR(((IManager)manager).GetSessionEnumerator(out sessions));
   int count;Marshal.ThrowExceptionForHR(sessions.GetCount(out count));
   for(int i=0;i<count;i++) { object raw=null;
    try {
     Marshal.ThrowExceptionForHR(sessions.GetSession(i,out raw));IControl control=(IControl)raw;uint pid;control.GetProcessId(out pid);int state;control.GetState(out state);if(state==2)continue;
     IVolume volume=(IVolume)control;float level;bool muted;volume.GetMasterVolume(out level);volume.GetMute(out muted);
     if(args.Length==2 && pid==uint.Parse(args[0])) {float requested=float.Parse(args[1],System.Globalization.CultureInfo.InvariantCulture);if(requested<0||requested>1)throw new ArgumentException();Guid context=Guid.Empty;Marshal.ThrowExceptionForHR(volume.SetMasterVolume(requested,ref context));level=requested;}
     string name="Systemklänge";if(pid>0){try{name=Process.GetProcessById((int)pid).ProcessName;}catch{name="App "+pid;}}
     result.Add(new {pid=pid,name=name,volume=level,muted=muted});
    } finally {if(raw!=null)Marshal.ReleaseComObject(raw);}
   }
   Console.WriteLine(new JavaScriptSerializer().Serialize(new {sessions=result}));
  } catch(Exception e){Console.WriteLine(new JavaScriptSerializer().Serialize(new {error="Windows-Audiomixer nicht verfügbar ("+e.GetType().Name+")"}));Environment.ExitCode=1;}
  finally {if(sessions!=null)Marshal.ReleaseComObject(sessions);if(manager!=null)Marshal.ReleaseComObject(manager);if(device!=null)Marshal.ReleaseComObject(device);if(enumerator!=null)Marshal.ReleaseComObject(enumerator);}
 }
}


