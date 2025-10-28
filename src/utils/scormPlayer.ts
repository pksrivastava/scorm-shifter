import JSZip from "jszip";

export interface ScormManifest {
  version: string;
  launchUrl: string;
  title: string;
  identifier: string;
}

export interface ScormFiles {
  [path: string]: Blob;
}

export const parseScormPackage = async (
  file: File
): Promise<{ manifest: ScormManifest; files: ScormFiles }> => {
  const zip = await JSZip.loadAsync(file);
  const files: ScormFiles = {};

  // Extract all files
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (!zipEntry.dir) {
      const blob = await zipEntry.async("blob");
      files[path] = blob;
    }
  }

  // Parse imsmanifest.xml
  const manifestFile = zip.file("imsmanifest.xml");
  if (!manifestFile) {
    throw new Error("Invalid SCORM package: imsmanifest.xml not found");
  }

  const manifestContent = await manifestFile.async("text");
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(manifestContent, "text/xml");

  // Detect SCORM version
  const schemaversion = xmlDoc.querySelector(
    "schemaversion, metadata schemaversion"
  );
  const version = schemaversion?.textContent?.includes("2004")
    ? "2004"
    : "1.2";

  // Get course title
  const title =
    xmlDoc.querySelector("organizations organization > title")?.textContent ||
    "SCORM Course";

  // Find the default organization
  const organizationsEl = xmlDoc.querySelector("organizations");
  const defaultOrg =
    organizationsEl?.getAttribute("default") || "";
  
  let organization = xmlDoc.querySelector(`organization[identifier="${defaultOrg}"]`);
  if (!organization) {
    organization = xmlDoc.querySelector("organization");
  }

  // Get the first item's resource reference
  const firstItem = organization?.querySelector("item[identifierref]");
  const resourceRef = firstItem?.getAttribute("identifierref");

  if (!resourceRef) {
    throw new Error("No launch resource found in manifest");
  }

  // Find the resource and get the launch file
  const resource = xmlDoc.querySelector(
    `resource[identifier="${resourceRef}"]`
  );
  const launchUrl = resource?.getAttribute("href") || "index.html";

  const identifier =
    organization?.getAttribute("identifier") || "default-org";

  return {
    manifest: {
      version,
      launchUrl,
      title,
      identifier,
    },
    files,
  };
};

// Create a virtual file system for the SCORM package
export const createVirtualFileSystem = (files: ScormFiles): Map<string, string> => {
  const fileMap = new Map<string, string>();
  
  for (const [path, blob] of Object.entries(files)) {
    const blobUrl = URL.createObjectURL(blob);
    fileMap.set(path, blobUrl);
    
    // Also store normalized paths
    const normalizedPath = path.replace(/\\/g, '/');
    fileMap.set(normalizedPath, blobUrl);
  }
  
  return fileMap;
};

// Resolve a relative path to a blob URL
export const resolvePath = (
  basePath: string,
  relativePath: string,
  fileMap: Map<string, string>
): string | null => {
  // Remove leading ./
  let cleanPath = relativePath.replace(/^\.\//, '');
  
  // Combine base path with relative path
  const fullPath = basePath + cleanPath;
  
  // Try multiple path variations
  const pathVariations = [
    fullPath,
    relativePath,
    cleanPath,
    fullPath.replace(/\\/g, '/'),
    relativePath.replace(/\\/g, '/'),
  ];
  
  for (const path of pathVariations) {
    if (fileMap.has(path)) {
      return fileMap.get(path)!;
    }
  }
  
  return null;
};

export const createScormRuntime = async (
  files: ScormFiles,
  launchUrl: string
): Promise<{ html: string; fileMap: Map<string, string> }> => {
  const launchFile = files[launchUrl];
  if (!launchFile) {
    throw new Error(`Launch file not found: ${launchUrl}`);
  }

  const basePath = launchUrl.substring(0, launchUrl.lastIndexOf("/") + 1);
  const fileMap = createVirtualFileSystem(files);

  return new Promise<{ html: string; fileMap: Map<string, string> }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let html = reader.result as string;

      // Replace all src and href attributes with blob URLs
      html = html.replace(
        /(src|href)=["']([^"']+)["']/gi,
        (match, attr, path) => {
          // Skip absolute URLs and data URLs
          if (
            path.startsWith('http://') ||
            path.startsWith('https://') ||
            path.startsWith('data:') ||
            path.startsWith('//') ||
            path.startsWith('#')
          ) {
            return match;
          }

          const resolvedUrl = resolvePath(basePath, path, fileMap);
          return resolvedUrl ? `${attr}="${resolvedUrl}"` : match;
        }
      );

      // Inject API finder script at the beginning of the document
      const apiFinderScript = `
        <script>
          console.log('[SCORM Player] Starting API search...');
          
          // SCORM API Finder - looks for API in parent/opener windows
          function findAPI(win) {
            var findAPITries = 0;
            
            // Check current window first
            if (win.API != null) {
              console.log('[SCORM Player] Found SCORM 1.2 API in current window');
              return win;
            }
            if (win.API_1484_11 != null) {
              console.log('[SCORM Player] Found SCORM 2004 API in current window');
              return win;
            }
            
            // Search parent windows
            while ((win.API == null && win.API_1484_11 == null) && (win.parent != null) && (win.parent != win)) {
              findAPITries++;
              console.log('[SCORM Player] Searching parent window, attempt:', findAPITries);
              
              if (findAPITries > 500) {
                console.error('[SCORM Player] API search exceeded maximum attempts');
                return null;
              }
              
              win = win.parent;
              
              if (win.API != null) {
                console.log('[SCORM Player] Found SCORM 1.2 API in parent window');
                return win;
              }
              if (win.API_1484_11 != null) {
                console.log('[SCORM Player] Found SCORM 2004 API in parent window');
                return win;
              }
            }
            
            console.warn('[SCORM Player] No API found after searching all parent windows');
            return null;
          }
          
          // Make API available
          try {
            var apiWindow = findAPI(window);
            if (apiWindow) {
              if (apiWindow.API) {
                window.API = apiWindow.API;
                console.log('[SCORM Player] SCORM 1.2 API successfully bound to window');
              }
              if (apiWindow.API_1484_11) {
                window.API_1484_11 = apiWindow.API_1484_11;
                console.log('[SCORM Player] SCORM 2004 API successfully bound to window');
              }
            } else {
              console.error('[SCORM Player] Failed to find SCORM API');
            }
          } catch (e) {
            console.error('[SCORM Player] Error during API setup:', e);
          }
          
          // Verify API is accessible
          setTimeout(function() {
            if (window.API) {
              console.log('[SCORM Player] SCORM 1.2 API verified and ready');
            }
            if (window.API_1484_11) {
              console.log('[SCORM Player] SCORM 2004 API verified and ready');
            }
            if (!window.API && !window.API_1484_11) {
              console.error('[SCORM Player] ERROR: No SCORM API available!');
            }
          }, 100);
        </script>
      `;

      // Insert the script after <head> tag or at the beginning of <body>
      if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>' + apiFinderScript);
      } else if (html.includes('<body>')) {
        html = html.replace('<body>', '<body>' + apiFinderScript);
      } else {
        html = apiFinderScript + html;
      }

      resolve({ html, fileMap });
    };
    reader.onerror = reject;
    reader.readAsText(launchFile);
  });
};

export const getFileAsDataUrl = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
