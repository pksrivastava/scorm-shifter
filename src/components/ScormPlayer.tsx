import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

interface ScormPlayerProps {
  file: File | null;
  onClose: () => void;
}

export const ScormPlayer = ({ file, onClose }: ScormPlayerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [contentUrl, setContentUrl] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scormData, setScormData] = useState({
    lesson_status: "not attempted",
    score: 0,
    session_time: "00:00:00",
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file) {
      loadScormPackage(file);
    }

    // Setup SCORM API
    setupScormAPI();

    return () => {
      if (contentUrl) {
        URL.revokeObjectURL(contentUrl);
      }
    };
  }, [file]);

  const setupScormAPI = () => {
    // SCORM 1.2 API
    (window as any).API = {
      LMSInitialize: () => {
        console.log("SCORM: LMSInitialize called");
        return "true";
      },
      LMSFinish: () => {
        console.log("SCORM: LMSFinish called");
        toast.success("SCORM session completed");
        return "true";
      },
      LMSGetValue: (element: string) => {
        console.log("SCORM: LMSGetValue", element);
        if (element === "cmi.core.lesson_status") {
          return scormData.lesson_status;
        }
        return "";
      },
      LMSSetValue: (element: string, value: string) => {
        console.log("SCORM: LMSSetValue", element, value);
        if (element === "cmi.core.lesson_status") {
          setScormData((prev) => ({ ...prev, lesson_status: value }));
          toast.info(`Lesson status: ${value}`);
        } else if (element === "cmi.core.score.raw") {
          setScormData((prev) => ({ ...prev, score: parseInt(value) || 0 }));
          toast.success(`Score: ${value}`);
        }
        return "true";
      },
      LMSCommit: () => {
        console.log("SCORM: LMSCommit called");
        return "true";
      },
      LMSGetLastError: () => "0",
      LMSGetErrorString: () => "",
      LMSGetDiagnostic: () => "",
    };

    // SCORM 2004 API
    (window as any).API_1484_11 = {
      Initialize: () => {
        console.log("SCORM 2004: Initialize called");
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
          return scormData.lesson_status;
        }
        return "";
      },
      SetValue: (element: string, value: string) => {
        console.log("SCORM 2004: SetValue", element, value);
        if (element === "cmi.completion_status") {
          setScormData((prev) => ({ ...prev, lesson_status: value }));
          toast.info(`Completion status: ${value}`);
        } else if (element === "cmi.score.raw") {
          setScormData((prev) => ({ ...prev, score: parseInt(value) || 0 }));
          toast.success(`Score: ${value}`);
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
  };

  const loadScormPackage = async (zipFile: File) => {
    setIsLoading(true);
    try {
      const zip = await JSZip.loadAsync(zipFile);
      
      // Find imsmanifest.xml
      const manifestFile = zip.file("imsmanifest.xml");
      if (!manifestFile) {
        toast.error("Invalid SCORM package: imsmanifest.xml not found");
        setIsLoading(false);
        return;
      }

      const manifestContent = await manifestFile.async("text");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(manifestContent, "text/xml");
      
      // Find the launch file
      const resource = xmlDoc.querySelector("resource[href]");
      const launchFile = resource?.getAttribute("href") || "index.html";
      
      console.log("Launch file:", launchFile);

      // Create a blob URL for the entire package
      // We need to extract all files and create object URLs
      const fileMap: { [key: string]: string } = {};
      
      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir) {
          const blob = await zipEntry.async("blob");
          fileMap[path] = URL.createObjectURL(blob);
        }
      }

      // Find the launch file blob
      const launchBlob = await zip.file(launchFile)?.async("blob");
      if (launchBlob) {
        const url = URL.createObjectURL(launchBlob);
        setContentUrl(url);
        toast.success("SCORM package loaded successfully");
      } else {
        toast.error(`Launch file not found: ${launchFile}`);
      }
    } catch (error) {
      console.error("Error loading SCORM package:", error);
      toast.error("Failed to load SCORM package");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setScormData({
      lesson_status: "not attempted",
      score: 0,
      session_time: "00:00:00",
    });
    if (iframeRef.current) {
      iframeRef.current.src = contentUrl;
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

  if (!file) {
    return null;
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">SCORM Player</h3>
            <p className="text-sm text-muted-foreground">{file.name}</p>
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
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close Player
            </Button>
          </div>
        </div>

        {/* SCORM Status Display */}
        <div className="flex gap-4 text-sm mb-4 p-3 bg-muted/30 rounded-lg">
          <div>
            <span className="text-muted-foreground">Status: </span>
            <span className="font-medium">{scormData.lesson_status}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Score: </span>
            <span className="font-medium">{scormData.score}</span>
          </div>
        </div>

        {/* SCORM Content Frame */}
        <div className="relative bg-white rounded-lg overflow-hidden" style={{ height: isFullscreen ? "100vh" : "600px" }}>
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading SCORM package...</p>
              </div>
            </div>
          ) : contentUrl ? (
            <iframe
              ref={iframeRef}
              src={contentUrl}
              className="w-full h-full border-0"
              title="SCORM Content"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
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
