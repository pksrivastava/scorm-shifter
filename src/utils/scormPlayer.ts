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
          // SCORM API Finder - looks for API in parent/opener windows
          function findAPI(win) {
            var findAPITries = 0;
            while ((win.API == null || win.API_1484_11 == null) && (win.parent != null) && (win.parent != win)) {
              findAPITries++;
              if (findAPITries > 7) {
                return null;
              }
              win = win.parent;
            }
            return win;
          }
          
          // Make API available
          var apiWindow = findAPI(window);
          if (apiWindow) {
            window.API = apiWindow.API;
            window.API_1484_11 = apiWindow.API_1484_11;
          }
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
