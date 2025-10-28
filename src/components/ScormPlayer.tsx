import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseScormPackage, createScormRuntime } from "@/utils/scormPlayer";

interface ScormPlayerProps {
  file: File | null;
  onClose: () => void;
}

export const ScormPlayer = ({ file, onClose }: ScormPlayerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [contentHtml, setContentHtml] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scormVersion, setScormVersion] = useState<string>("");
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [cmiData, setCmiData] = useState<Record<string, any>>({
    // SCORM 1.2 data model
    "cmi.core.lesson_status": "not attempted",
    "cmi.core.score.raw": "",
    "cmi.core.score.min": "0",
    "cmi.core.score.max": "100",
    "cmi.core.student_id": "student_001",
    "cmi.core.student_name": "SCORM Student",
    "cmi.core.lesson_location": "",
    "cmi.core.credit": "credit",
    "cmi.core.lesson_mode": "normal",
    "cmi.core.exit": "",
    "cmi.core.entry": "ab-initio",
    "cmi.core.session_time": "00:00:00",
    "cmi.core.total_time": "00:00:00",
    "cmi.comments": "",
    "cmi.comments_from_lms": "",
    
    // SCORM 2004 data model
    "cmi.completion_status": "incomplete",
    "cmi.completion_threshold": "",
    "cmi.learner_id": "student_001",
    "cmi.learner_name": "SCORM Student",
    "cmi.location": "",
    "cmi.max_time_allowed": "",
    "cmi.mode": "normal",
    "cmi.progress_measure": "",
    "cmi.scaled_passing_score": "",
    "cmi.score.scaled": "",
    "cmi.session_time": "PT0H0M0S",
    "cmi.success_status": "unknown",
    "cmi.time_limit_action": "",
    
    // Shared between versions
    "cmi.credit": "credit",
    "cmi.entry": "ab-initio",
    "cmi.exit": "",
    "cmi.launch_data": "",
    "cmi.suspend_data": "",
    "cmi.score.raw": "",
    "cmi.score.min": "0",
    "cmi.score.max": "100",
    "cmi.total_time": "PT0H0M0S",
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (file) {
      loadScormPackage(file);
    }

    return () => {
      // Cleanup
    };
  }, [file]);

  useEffect(() => {
    // Setup SCORM API after iframe loads
    if (contentHtml && iframeRef.current) {
      setupScormAPI();
    }
  }, [contentHtml]);

  const setupScormAPI = () => {
    // Set API on the parent window so iframe content can find it
    const win = window as Window & {
      API?: any;
      API_1484_11?: any;
    };

    let initialized = false;
    let lastError = "0";

    // Helper to set error
    const setError = (code: string) => {
      lastError = code;
    };

    // Helper to get CMI value
    const getCMIValue = (element: string): string => {
      const value = cmiData[element];
      if (value === undefined || value === null) {
        setError("401"); // Not initialized
        return "";
      }
      return String(value);
    };

    // Helper to set CMI value
    const setCMIValue = (element: string, value: string): boolean => {
      setCmiData((prev) => ({ ...prev, [element]: value }));
      return true;
    };

    // SCORM 1.2 API
    win.API = {
      LMSInitialize: (param: string) => {
        console.log("SCORM 1.2: LMSInitialize");
        if (initialized) {
          setError("101"); // Already initialized
          return "false";
        }
        initialized = true;
        startTimeRef.current = Date.now();
        setCMIValue("cmi.core.lesson_status", "incomplete");
        setCMIValue("cmi.core.entry", "resume");
        toast.success("SCORM 1.2 session initialized");
        setError("0");
        return "true";
      },

      LMSFinish: (param: string) => {
        console.log("SCORM 1.2: LMSFinish");
        if (!initialized) {
          setError("301"); // Not initialized
          return "false";
        }
        
        // Calculate session time
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        const sessionTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        setCMIValue("cmi.core.session_time", sessionTime);
        
        initialized = false;
        toast.success("SCORM 1.2 session completed");
        setError("0");
        return "true";
      },

      LMSGetValue: (element: string) => {
        console.log("SCORM 1.2: LMSGetValue", element);
        if (!initialized) {
          setError("301"); // Not initialized
          return "";
        }
        const value = getCMIValue(element);
        setError("0");
        return value;
      },

      LMSSetValue: (element: string, value: string) => {
        console.log("SCORM 1.2: LMSSetValue", element, "=", value);
        if (!initialized) {
          setError("301"); // Not initialized
          return "false";
        }

        if (element === "cmi.core.lesson_status") {
          setCMIValue(element, value);
          toast.info(`Status: ${value}`);
        } else if (element === "cmi.core.score.raw") {
          setCMIValue(element, value);
          toast.success(`Score: ${value}`);
        } else {
          setCMIValue(element, value);
        }

        setError("0");
        return "true";
      },

      LMSCommit: (param: string) => {
        console.log("SCORM 1.2: LMSCommit");
        if (!initialized) {
          setError("301");
          return "false";
        }
        setError("0");
        return "true";
      },

      LMSGetLastError: () => lastError,
      
      LMSGetErrorString: (errorCode: string) => {
        const errors: Record<string, string> = {
          "0": "No error",
          "101": "General exception",
          "201": "Invalid argument error",
          "202": "Element cannot have children",
          "203": "Element not an array - cannot have count",
          "301": "Not initialized",
          "401": "Not implemented error",
          "402": "Invalid set value, element is a keyword",
          "403": "Element is read only",
          "404": "Element is write only",
          "405": "Incorrect data type",
        };
        return errors[errorCode] || "";
      },
      
      LMSGetDiagnostic: (errorCode: string) => {
        return `Diagnostic for error ${errorCode}`;
      },
    };

    // SCORM 2004 API
    win.API_1484_11 = {
      Initialize: (param: string) => {
        console.log("SCORM 2004: Initialize");
        if (initialized) {
          setError("103"); // Already initialized
          return "false";
        }
        initialized = true;
        startTimeRef.current = Date.now();
        setCMIValue("cmi.completion_status", "incomplete");
        setCMIValue("cmi.entry", "resume");
        toast.success("SCORM 2004 session initialized");
        setError("0");
        return "true";
      },

      Terminate: (param: string) => {
        console.log("SCORM 2004: Terminate");
        if (!initialized) {
          setError("112"); // Termination before initialization
          return "false";
        }

        // Calculate session time in ISO 8601 format
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        const sessionTime = `PT${hours}H${minutes}M${seconds}S`;
        setCMIValue("cmi.session_time", sessionTime);

        initialized = false;
        toast.success("SCORM 2004 session terminated");
        setError("0");
        return "true";
      },

      GetValue: (element: string) => {
        console.log("SCORM 2004: GetValue", element);
        if (!initialized) {
          setError("122"); // Retrieve data before initialization
          return "";
        }
        const value = getCMIValue(element);
        setError("0");
        return value;
      },

      SetValue: (element: string, value: string) => {
        console.log("SCORM 2004: SetValue", element, "=", value);
        if (!initialized) {
          setError("132"); // Store data before initialization
          return "false";
        }

        if (element === "cmi.completion_status") {
          setCMIValue(element, value);
          toast.info(`Completion: ${value}`);
        } else if (element === "cmi.success_status") {
          setCMIValue(element, value);
          toast.info(`Success: ${value}`);
        } else if (element === "cmi.score.raw" || element === "cmi.score.scaled") {
          setCMIValue(element, value);
          toast.success(`Score: ${value}`);
        } else {
          setCMIValue(element, value);
        }

        setError("0");
        return "true";
      },

      Commit: (param: string) => {
        console.log("SCORM 2004: Commit");
        if (!initialized) {
          setError("142"); // Commit before initialization
          return "false";
        }
        setError("0");
        return "true";
      },

      GetLastError: () => lastError,
      
      GetErrorString: (errorCode: string) => {
        const errors: Record<string, string> = {
          "0": "No error",
          "101": "General exception",
          "102": "General initialization failure",
          "103": "Already initialized",
          "104": "Content instance terminated",
          "111": "General termination failure",
          "112": "Termination before initialization",
          "113": "Termination after termination",
          "122": "Retrieve data before initialization",
          "123": "Retrieve data after termination",
          "132": "Store data before initialization",
          "133": "Store data after termination",
          "142": "Commit before initialization",
          "143": "Commit after termination",
          "201": "General argument error",
          "301": "General get failure",
          "351": "General set failure",
          "391": "General commit failure",
          "401": "Undefined data model element",
          "402": "Unimplemented data model element",
          "403": "Data model element value not initialized",
          "404": "Data model element is read only",
          "405": "Data model element is write only",
          "406": "Data model element type mismatch",
          "407": "Data model element value out of range",
          "408": "Data model dependency not established",
        };
        return errors[errorCode] || "";
      },
      
      GetDiagnostic: (errorCode: string) => {
        return `Diagnostic information for error ${errorCode}`;
      },
    };

    console.log("SCORM API initialized on parent window");
  };

  const loadScormPackage = async (zipFile: File) => {
    setIsLoading(true);
    try {
      toast.info("Parsing SCORM package...");
      
      const { manifest, files } = await parseScormPackage(zipFile);
      
      setScormVersion(manifest.version);
      setCourseTitle(manifest.title);
      
      toast.info("Extracting course content...");
      
      const { html } = await createScormRuntime(files, manifest.launchUrl);
      
      setContentHtml(html);
      
      toast.success(`SCORM ${manifest.version} package loaded successfully`);
    } catch (error) {
      console.error("Error loading SCORM package:", error);
      toast.error("Failed to load SCORM package", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    // Reset all CMI data
    setCmiData({
      "cmi.core.lesson_status": "not attempted",
      "cmi.core.score.raw": "",
      "cmi.core.score.min": "0",
      "cmi.core.score.max": "100",
      "cmi.core.student_id": "student_001",
      "cmi.core.student_name": "SCORM Student",
      "cmi.core.lesson_location": "",
      "cmi.core.credit": "credit",
      "cmi.core.lesson_mode": "normal",
      "cmi.core.exit": "",
      "cmi.core.entry": "ab-initio",
      "cmi.core.session_time": "00:00:00",
      "cmi.core.total_time": "00:00:00",
      "cmi.comments": "",
      "cmi.comments_from_lms": "",
      "cmi.completion_status": "incomplete",
      "cmi.completion_threshold": "",
      "cmi.learner_id": "student_001",
      "cmi.learner_name": "SCORM Student",
      "cmi.location": "",
      "cmi.max_time_allowed": "",
      "cmi.mode": "normal",
      "cmi.progress_measure": "",
      "cmi.scaled_passing_score": "",
      "cmi.score.scaled": "",
      "cmi.session_time": "PT0H0M0S",
      "cmi.success_status": "unknown",
      "cmi.time_limit_action": "",
      "cmi.credit": "credit",
      "cmi.entry": "ab-initio",
      "cmi.exit": "",
      "cmi.launch_data": "",
      "cmi.suspend_data": "",
      "cmi.score.raw": "",
      "cmi.score.min": "0",
      "cmi.score.max": "100",
      "cmi.total_time": "PT0H0M0S",
    });

    startTimeRef.current = Date.now();

    // Reload iframe content
    if (iframeRef.current && contentHtml) {
      const iframe = iframeRef.current;
      iframe.src = "about:blank";
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.document.open();
          iframe.contentWindow.document.write(contentHtml);
          iframe.contentWindow.document.close();
        }
      }, 100);
    }

    toast.info("SCORM content restarted");
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    // Setup API first, then write HTML to iframe when content is ready
    if (contentHtml && iframeRef.current) {
      // Setup API on parent window FIRST
      setupScormAPI();
      
      const iframe = iframeRef.current;
      iframe.contentWindow?.document.open();
      iframe.contentWindow?.document.write(contentHtml);
      iframe.contentWindow?.document.close();
    }
  }, [contentHtml]);

  if (!file) {
    return null;
  }

  const displayStatus = scormVersion === "2004" 
    ? cmiData["cmi.completion_status"] 
    : cmiData["cmi.core.lesson_status"];
  
  const displayScore = scormVersion === "2004"
    ? cmiData["cmi.score.raw"] || "0"
    : cmiData["cmi.core.score.raw"] || "0";

  return (
    <div className="space-y-4" ref={containerRef}>
      <Card className="p-4 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">{courseTitle || "SCORM Player"}</h3>
            <p className="text-sm text-muted-foreground">
              {file.name} • SCORM {scormVersion || "..."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestart}
              disabled={isLoading}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              disabled={isLoading}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 mr-2" />
              ) : (
                <Maximize2 className="w-4 h-4 mr-2" />
              )}
              {isFullscreen ? "Exit" : "Fullscreen"}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* SCORM Status Display */}
        <div className="flex gap-4 text-sm mb-4 p-3 bg-muted/30 rounded-lg">
          <div>
            <span className="text-muted-foreground">Status: </span>
            <span className="font-medium capitalize">{displayStatus || "not started"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Score: </span>
            <span className="font-medium">{displayScore}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Version: </span>
            <span className="font-medium">SCORM {scormVersion}</span>
          </div>
        </div>

        {/* SCORM Content Frame */}
        <div
          className="relative bg-background rounded-lg overflow-hidden border border-border"
          style={{ height: isFullscreen ? "calc(100vh - 180px)" : "600px" }}
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground font-medium">
                  Loading SCORM package...
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Parsing manifest and extracting content
                </p>
              </div>
            </div>
          ) : contentHtml ? (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title="SCORM Content"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground">Failed to load SCORM content</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
