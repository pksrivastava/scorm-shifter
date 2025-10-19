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
  const [scormData, setScormData] = useState({
    lesson_status: "not attempted",
    completion_status: "incomplete",
    score: 0,
    session_time: "00:00:00",
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const iframeWindow = iframeRef.current?.contentWindow as Window & {
      API?: any;
      API_1484_11?: any;
    };
    if (!iframeWindow) return;

    // SCORM 1.2 API
    iframeWindow.API = {
      LMSInitialize: () => {
        console.log("SCORM 1.2: LMSInitialize called");
        setScormData((prev) => ({ ...prev, lesson_status: "incomplete" }));
        toast.success("SCORM session started");
        return "true";
      },
      LMSFinish: () => {
        console.log("SCORM 1.2: LMSFinish called");
        toast.success("SCORM session completed");
        return "true";
      },
      LMSGetValue: (element: string) => {
        console.log("SCORM 1.2: LMSGetValue", element);
        if (element === "cmi.core.lesson_status") {
          return scormData.lesson_status;
        } else if (element === "cmi.core.score.raw") {
          return String(scormData.score);
        }
        return "";
      },
      LMSSetValue: (element: string, value: string) => {
        console.log("SCORM 1.2: LMSSetValue", element, "=", value);
        if (element === "cmi.core.lesson_status") {
          setScormData((prev) => ({ ...prev, lesson_status: value }));
          toast.info(`Status: ${value}`);
        } else if (element === "cmi.core.score.raw") {
          const score = parseInt(value) || 0;
          setScormData((prev) => ({ ...prev, score }));
          toast.success(`Score: ${score}`);
        }
        return "true";
      },
      LMSCommit: () => {
        console.log("SCORM 1.2: LMSCommit called");
        return "true";
      },
      LMSGetLastError: () => "0",
      LMSGetErrorString: () => "",
      LMSGetDiagnostic: () => "",
    };

    // SCORM 2004 API
    iframeWindow.API_1484_11 = {
      Initialize: () => {
        console.log("SCORM 2004: Initialize called");
        setScormData((prev) => ({ ...prev, completion_status: "incomplete" }));
        toast.success("SCORM session started");
        return "true";
      },
      Terminate: () => {
        console.log("SCORM 2004: Terminate called");
        toast.success("SCORM session completed");
        return "true";
      },
      GetValue: (element: string) => {
        console.log("SCORM 2004: GetValue", element);
        if (element === "cmi.completion_status") {
          return scormData.completion_status;
        } else if (element === "cmi.score.raw") {
          return String(scormData.score);
        }
        return "";
      },
      SetValue: (element: string, value: string) => {
        console.log("SCORM 2004: SetValue", element, "=", value);
        if (element === "cmi.completion_status") {
          setScormData((prev) => ({ ...prev, completion_status: value }));
          toast.info(`Completion: ${value}`);
        } else if (element === "cmi.score.raw") {
          const score = parseInt(value) || 0;
          setScormData((prev) => ({ ...prev, score }));
          toast.success(`Score: ${score}`);
        }
        return "true";
      },
      Commit: () => {
        console.log("SCORM 2004: Commit called");
        return "true";
      },
      GetLastError: () => "0",
      GetErrorString: () => "",
      GetDiagnostic: () => "",
    };

    console.log("SCORM API initialized for iframe");
  };

  const loadScormPackage = async (zipFile: File) => {
    setIsLoading(true);
    try {
      toast.info("Parsing SCORM package...");
      
      const { manifest, files } = await parseScormPackage(zipFile);
      
      setScormVersion(manifest.version);
      setCourseTitle(manifest.title);
      
      toast.info("Extracting course content...");
      
      const html = await createScormRuntime(files, manifest.launchUrl);
      
      setContentHtml(html);
      
      toast.success(`SCORM ${manifest.version} package loaded`);
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
    setScormData({
      lesson_status: "not attempted",
      completion_status: "incomplete",
      score: 0,
      session_time: "00:00:00",
    });
    
    // Reload iframe content
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      iframe.src = "about:blank";
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.document.open();
          iframe.contentWindow.document.write(contentHtml);
          iframe.contentWindow.document.close();
          setupScormAPI();
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
    // Write HTML to iframe when content is ready
    if (contentHtml && iframeRef.current) {
      const iframe = iframeRef.current;
      iframe.contentWindow?.document.open();
      iframe.contentWindow?.document.write(contentHtml);
      iframe.contentWindow?.document.close();
      
      // Setup API after content is loaded
      setTimeout(() => {
        setupScormAPI();
      }, 500);
    }
  }, [contentHtml]);

  if (!file) {
    return null;
  }

  const displayStatus = scormVersion === "2004" 
    ? scormData.completion_status 
    : scormData.lesson_status;

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
            <span className="font-medium capitalize">{displayStatus}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Score: </span>
            <span className="font-medium">{scormData.score}</span>
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
