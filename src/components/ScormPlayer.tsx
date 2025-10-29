import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

interface ScormPlayerProps {
  file: File | null;
  onClose: () => void;
}

interface ScormManifest {
  version: string;
  launchUrl: string;
  title: string;
}

interface CMIData {
  [key: string]: string;
}

export const ScormPlayer = ({ file, onClose }: ScormPlayerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scormVersion, setScormVersion] = useState<string>("");
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [iframeSrc, setIframeSrc] = useState<string>("");
  const [cmiData, setCmiData] = useState<CMIData>({});
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const blobUrlsRef = useRef<string[]>([]);
  const apiInitializedRef = useRef(false);

  // Initialize CMI data based on version
  const initializeCMIData = (version: string): CMIData => {
    if (version === "2004") {
      return {
        "cmi.completion_status": "incomplete",
        "cmi.success_status": "unknown",
        "cmi.score.raw": "",
        "cmi.score.min": "0",
        "cmi.score.max": "100",
        "cmi.score.scaled": "",
        "cmi.learner_id": "student_001",
        "cmi.learner_name": "SCORM Student",
        "cmi.location": "",
        "cmi.session_time": "PT0H0M0S",
        "cmi.total_time": "PT0H0M0S",
        "cmi.mode": "normal",
        "cmi.credit": "credit",
        "cmi.entry": "ab-initio",
        "cmi.exit": "",
        "cmi.suspend_data": "",
      };
    } else {
      return {
        "cmi.core.lesson_status": "not attempted",
        "cmi.core.score.raw": "",
        "cmi.core.score.min": "0",
        "cmi.core.score.max": "100",
        "cmi.core.student_id": "student_001",
        "cmi.core.student_name": "SCORM Student",
        "cmi.core.lesson_location": "",
        "cmi.core.session_time": "00:00:00",
        "cmi.core.total_time": "00:00:00",
        "cmi.core.lesson_mode": "normal",
        "cmi.core.credit": "credit",
        "cmi.core.entry": "ab-initio",
        "cmi.core.exit": "",
        "cmi.suspend_data": "",
        "cmi.comments": "",
      };
    }
  };

  // Setup SCORM API on window
  const setupScormAPI = () => {
    if (apiInitializedRef.current) return;
    apiInitializedRef.current = true;

    const win = window as any;
    let initialized = false;
    let lastError = "0";

    console.log("[SCORM] Setting up API adapter...");

    // SCORM 1.2 API
    win.API = {
      LMSInitialize: (param: string) => {
        console.log("[SCORM 1.2] LMSInitialize");
        if (initialized) {
          lastError = "101";
          return "false";
        }
        initialized = true;
        startTimeRef.current = Date.now();
        setCmiData((prev) => ({ ...prev, "cmi.core.lesson_status": "incomplete" }));
        toast.success("Course started (SCORM 1.2)");
        lastError = "0";
        return "true";
      },

      LMSFinish: (param: string) => {
        console.log("[SCORM 1.2] LMSFinish");
        if (!initialized) {
          lastError = "301";
          return "false";
        }
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        const sessionTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        setCmiData((prev) => ({ ...prev, "cmi.core.session_time": sessionTime }));
        initialized = false;
        toast.success("Course completed");
        lastError = "0";
        return "true";
      },

      LMSGetValue: (element: string) => {
        console.log("[SCORM 1.2] LMSGetValue:", element);
        if (!initialized) {
          lastError = "301";
          return "";
        }
        const value = cmiData[element] || "";
        lastError = "0";
        return value;
      },

      LMSSetValue: (element: string, value: string) => {
        console.log("[SCORM 1.2] LMSSetValue:", element, "=", value);
        if (!initialized) {
          lastError = "301";
          return "false";
        }
        setCmiData((prev) => ({ ...prev, [element]: value }));
        
        if (element === "cmi.core.lesson_status") {
          toast.info(`Status: ${value}`);
        } else if (element === "cmi.core.score.raw") {
          toast.success(`Score: ${value}`);
        }
        
        lastError = "0";
        return "true";
      },

      LMSCommit: (param: string) => {
        console.log("[SCORM 1.2] LMSCommit");
        if (!initialized) {
          lastError = "301";
          return "false";
        }
        lastError = "0";
        return "true";
      },

      LMSGetLastError: () => lastError,
      LMSGetErrorString: (errorCode: string) => {
        const errors: Record<string, string> = {
          "0": "No error",
          "101": "General exception",
          "201": "Invalid argument",
          "301": "Not initialized",
          "401": "Not implemented",
        };
        return errors[errorCode] || "";
      },
      LMSGetDiagnostic: (errorCode: string) => `Diagnostic for ${errorCode}`,
    };

    // SCORM 2004 API
    win.API_1484_11 = {
      Initialize: (param: string) => {
        console.log("[SCORM 2004] Initialize");
        if (initialized) {
          lastError = "103";
          return "false";
        }
        initialized = true;
        startTimeRef.current = Date.now();
        setCmiData((prev) => ({ ...prev, "cmi.completion_status": "incomplete" }));
        toast.success("Course started (SCORM 2004)");
        lastError = "0";
        return "true";
      },

      Terminate: (param: string) => {
        console.log("[SCORM 2004] Terminate");
        if (!initialized) {
          lastError = "112";
          return "false";
        }
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        const sessionTime = `PT${hours}H${minutes}M${seconds}S`;
        setCmiData((prev) => ({ ...prev, "cmi.session_time": sessionTime }));
        initialized = false;
        toast.success("Course completed");
        lastError = "0";
        return "true";
      },

      GetValue: (element: string) => {
        console.log("[SCORM 2004] GetValue:", element);
        if (!initialized) {
          lastError = "122";
          return "";
        }
        const value = cmiData[element] || "";
        lastError = "0";
        return value;
      },

      SetValue: (element: string, value: string) => {
        console.log("[SCORM 2004] SetValue:", element, "=", value);
        if (!initialized) {
          lastError = "132";
          return "false";
        }
        setCmiData((prev) => ({ ...prev, [element]: value }));
        
        if (element === "cmi.completion_status") {
          toast.info(`Completion: ${value}`);
        } else if (element === "cmi.success_status") {
          toast.info(`Success: ${value}`);
        } else if (element.includes("score")) {
          toast.success(`Score: ${value}`);
        }
        
        lastError = "0";
        return "true";
      },

      Commit: (param: string) => {
        console.log("[SCORM 2004] Commit");
        if (!initialized) {
          lastError = "142";
          return "false";
        }
        lastError = "0";
        return "true";
      },

      GetLastError: () => lastError,
      GetErrorString: (errorCode: string) => {
        const errors: Record<string, string> = {
          "0": "No error",
          "103": "Already initialized",
          "112": "Termination before init",
          "122": "Retrieve before init",
          "132": "Store before init",
          "142": "Commit before init",
        };
        return errors[errorCode] || "";
      },
      GetDiagnostic: (errorCode: string) => `Diagnostic for ${errorCode}`,
    };

    console.log("[SCORM] API adapter ready");
  };

  const loadScormPackage = async (zipFile: File) => {
    setIsLoading(true);
    
    try {
      console.log("[SCORM] Loading package:", zipFile.name);
      toast.info("Loading SCORM package...");

      // Parse ZIP
      const zip = await JSZip.loadAsync(zipFile);
      console.log("[SCORM] ZIP loaded successfully");
      
      // Find and parse manifest
      const manifestFile = zip.file("imsmanifest.xml");
      if (!manifestFile) {
        throw new Error("Invalid SCORM package: imsmanifest.xml not found");
      }

      const manifestContent = await manifestFile.async("text");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(manifestContent, "text/xml");

      // Detect version
      const schemaversion = xmlDoc.querySelector("schemaversion, metadata schemaversion");
      const version = schemaversion?.textContent?.includes("2004") ? "2004" : "1.2";

      // Get title
      const title = xmlDoc.querySelector("organizations organization > title")?.textContent || "SCORM Course";

      // Find launch URL
      const organizationsEl = xmlDoc.querySelector("organizations");
      const defaultOrg = organizationsEl?.getAttribute("default") || "";
      let organization = xmlDoc.querySelector(`organization[identifier="${defaultOrg}"]`);
      if (!organization) {
        organization = xmlDoc.querySelector("organization");
      }

      const firstItem = organization?.querySelector("item[identifierref]");
      const resourceRef = firstItem?.getAttribute("identifierref");
      
      if (!resourceRef) {
        throw new Error("No launch resource found in manifest");
      }

      const resource = xmlDoc.querySelector(`resource[identifier="${resourceRef}"]`);
      const launchUrl = resource?.getAttribute("href") || "index.html";

      console.log("[SCORM] Manifest parsed:", { version, title, launchUrl });

      // Set course info
      setScormVersion(version);
      setCourseTitle(title);
      setCmiData(initializeCMIData(version));

      // Setup API before loading content
      setupScormAPI();

      // Extract ALL files and create blob URLs with comprehensive path mapping
      const fileUrls = new Map<string, string>();
      const extractPromises: Promise<void>[] = [];

      zip.forEach((relativePath, file) => {
        if (!file.dir) {
          extractPromises.push(
            file.async("blob").then((blob) => {
              // Determine MIME type based on extension
              const ext = relativePath.split('.').pop()?.toLowerCase() || '';
              const mimeTypes: Record<string, string> = {
                'html': 'text/html',
                'htm': 'text/html',
                'css': 'text/css',
                'js': 'application/javascript',
                'json': 'application/json',
                'xml': 'application/xml',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'svg': 'image/svg+xml',
                'mp3': 'audio/mpeg',
                'mp4': 'video/mp4',
                'woff': 'font/woff',
                'woff2': 'font/woff2',
                'ttf': 'font/ttf',
              };
              
              const mimeType = mimeTypes[ext] || blob.type || 'application/octet-stream';
              const typedBlob = new Blob([blob], { type: mimeType });
              const blobUrl = URL.createObjectURL(typedBlob);
              
              blobUrlsRef.current.push(blobUrl);
              
              // Store with multiple path variations for better matching
              const normalized = relativePath.replace(/\\/g, "/");
              fileUrls.set(relativePath, blobUrl);
              fileUrls.set(normalized, blobUrl);
              fileUrls.set("/" + normalized, blobUrl);
              fileUrls.set("./" + normalized, blobUrl);
              
              // Store just the filename
              const filename = relativePath.split(/[/\\]/).pop() || "";
              if (filename) {
                fileUrls.set(filename, blobUrl);
              }
              
              console.log(`[SCORM] Extracted: ${relativePath} -> ${blobUrl.substring(0, 50)}...`);
            })
          );
        }
      });

      await Promise.all(extractPromises);
      console.log(`[SCORM] Extracted ${fileUrls.size} files`);

      // Extract launch file
      const launchFile = zip.file(launchUrl);
      if (!launchFile) {
        throw new Error(`Launch file not found: ${launchUrl}`);
      }

      const launchBlob = await launchFile.async("blob");
      let launchHtml = await launchBlob.text();
      console.log("[SCORM] Launch HTML loaded, length:", launchHtml.length);

      // Get base path for relative resolution
      const basePath = launchUrl.includes("/") 
        ? launchUrl.substring(0, launchUrl.lastIndexOf("/") + 1)
        : "";

      console.log("[SCORM] Base path:", basePath);

      // Inject SCORM API finder script at the beginning
      const apiFinderScript = `
<script>
(function() {
  console.log("[SCORM Content] Starting API search...");
  
  function findAPI(win) {
    var attempts = 0;
    var maxAttempts = 500;
    
    while (win && attempts < maxAttempts) {
      attempts++;
      
      // Check for SCORM 1.2 API
      if (win.API != null) {
        console.log("[SCORM Content] Found SCORM 1.2 API at level " + attempts);
        window.API = win.API;
      }
      
      // Check for SCORM 2004 API
      if (win.API_1484_11 != null) {
        console.log("[SCORM Content] Found SCORM 2004 API at level " + attempts);
        window.API_1484_11 = win.API_1484_11;
      }
      
      // If both found or reached top, stop
      if ((window.API != null || window.API_1484_11 != null) || win === win.parent) {
        break;
      }
      
      win = win.parent;
    }
    
    if (window.API != null) {
      console.log("[SCORM Content] SCORM 1.2 API available");
    }
    if (window.API_1484_11 != null) {
      console.log("[SCORM Content] SCORM 2004 API available");
    }
    if (window.API == null && window.API_1484_11 == null) {
      console.error("[SCORM Content] No SCORM API found after " + attempts + " attempts");
    }
  }
  
  // Try to find API immediately
  findAPI(window.parent);
  
  // Also try after load
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', function() {
      findAPI(window.parent);
    });
  }
})();
</script>
`;

      // Insert API finder script right after <head> or at the beginning
      if (launchHtml.includes("<head>")) {
        launchHtml = launchHtml.replace("<head>", "<head>" + apiFinderScript);
      } else if (launchHtml.includes("<html>")) {
        launchHtml = launchHtml.replace("<html>", "<html>" + apiFinderScript);
      } else {
        launchHtml = apiFinderScript + launchHtml;
      }

      // Replace all resource paths with blob URLs
      let replacementCount = 0;
      launchHtml = launchHtml.replace(
        /(src|href|data|poster|background)=["']([^"']+)["']/gi,
        (match, attr, path) => {
          // Skip absolute URLs, data URIs, and fragments
          if (
            path.startsWith("http://") ||
            path.startsWith("https://") ||
            path.startsWith("data:") ||
            path.startsWith("//") ||
            path.startsWith("#") ||
            path.startsWith("javascript:") ||
            path.startsWith("mailto:")
          ) {
            return match;
          }

          // Try multiple path resolution strategies
          const pathVariations = [
            path,
            path.replace(/^\.\//, ""),
            path.replace(/^\//, ""),
            basePath + path,
            basePath + path.replace(/^\.\//, ""),
            basePath + path.replace(/^\//, ""),
          ];

          for (const variant of pathVariations) {
            const url = fileUrls.get(variant);
            if (url) {
              replacementCount++;
              console.log(`[SCORM] Resolved ${path} -> ${variant}`);
              return `${attr}="${url}"`;
            }
          }

          console.warn(`[SCORM] Could not resolve path: ${path}`);
          return match;
        }
      );

      console.log(`[SCORM] Replaced ${replacementCount} resource paths`);

      // Add base tag to help with relative paths
      const baseTag = `<base href="blob:">`;
      if (launchHtml.includes("<head>") && !launchHtml.includes("<base")) {
        launchHtml = launchHtml.replace("<head>", `<head>${baseTag}`);
      }

      // Create final blob with proper HTML MIME type
      const finalBlob = new Blob([launchHtml], { type: "text/html;charset=utf-8" });
      const finalUrl = URL.createObjectURL(finalBlob);
      blobUrlsRef.current.push(finalUrl);

      console.log("[SCORM] Final iframe URL created:", finalUrl);
      setIframeSrc(finalUrl);
      
      toast.success(`SCORM ${version} package loaded successfully`);
      console.log("[SCORM] Package ready to play");
    } catch (error) {
      console.error("[SCORM] Load error:", error);
      toast.error("Failed to load SCORM package", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (file) {
      loadScormPackage(file);
    }

    return () => {
      // Cleanup blob URLs
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    };
  }, [file]);

  const handleRestart = () => {
    setCmiData(initializeCMIData(scormVersion));
    startTimeRef.current = Date.now();
    apiInitializedRef.current = false;
    
    // Reload iframe
    if (iframeRef.current && iframeSrc) {
      setupScormAPI();
      iframeRef.current.src = iframeSrc;
    }
    
    toast.info("Course restarted");
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (!file) return null;

  const displayStatus = scormVersion === "2004"
    ? cmiData["cmi.completion_status"] || "not started"
    : cmiData["cmi.core.lesson_status"] || "not attempted";

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
            <Button variant="outline" size="sm" onClick={handleRestart} disabled={isLoading}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart
            </Button>
            <Button variant="outline" size="sm" onClick={toggleFullscreen} disabled={isLoading}>
              {isFullscreen ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
              {isFullscreen ? "Exit" : "Fullscreen"}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="flex gap-4 text-sm mb-4 p-3 bg-muted/30 rounded-lg">
          <div>
            <span className="text-muted-foreground">Status: </span>
            <span className="font-medium capitalize">{displayStatus}</span>
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

        <div
          className="relative bg-background rounded-lg overflow-hidden border border-border"
          style={{ height: isFullscreen ? "calc(100vh - 180px)" : "600px" }}
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground font-medium">Loading SCORM package...</p>
                <p className="text-xs text-muted-foreground mt-2">Extracting and preparing content</p>
              </div>
            </div>
          ) : iframeSrc ? (
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              className="w-full h-full border-0"
              title="SCORM Content"
              allow="autoplay; fullscreen"
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
