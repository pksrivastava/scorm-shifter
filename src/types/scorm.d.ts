// SCORM API Type Definitions

interface ScormAPI {
  LMSInitialize: () => string;
  LMSFinish: () => string;
  LMSGetValue: (element: string) => string;
  LMSSetValue: (element: string, value: string) => string;
  LMSCommit: () => string;
  LMSGetLastError: () => string;
  LMSGetErrorString: () => string;
  LMSGetDiagnostic: () => string;
}

interface Scorm2004API {
  Initialize: () => string;
  Terminate: () => string;
  GetValue: (element: string) => string;
  SetValue: (element: string, value: string) => string;
  Commit: () => string;
  GetLastError: () => string;
  GetErrorString: () => string;
  GetDiagnostic: () => string;
}

declare global {
  interface Window {
    API?: ScormAPI;
    API_1484_11?: Scorm2004API;
  }
}

export {};
