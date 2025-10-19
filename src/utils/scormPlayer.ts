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

export const createScormRuntime = async (files: ScormFiles, launchUrl: string): Promise<string> => {
  // Get the launch file
  const launchFile = files[launchUrl];
  if (!launchFile) {
    throw new Error(`Launch file not found: ${launchUrl}`);
  }

  // We need to create a complete HTML page that includes all dependencies
  // We'll inject the file content and handle relative paths
  
  const basePath = launchUrl.substring(0, launchUrl.lastIndexOf("/") + 1);
  
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let html = reader.result as string;
      
      // Convert relative URLs to blob URLs
      for (const [path, blob] of Object.entries(files)) {
        if (path === launchUrl) continue;
        
        const blobUrl = URL.createObjectURL(blob);
        const relativePath = path.startsWith(basePath) 
          ? path.substring(basePath.length)
          : path;
        
        // Replace various forms of the path
        html = html.replace(
          new RegExp(`(src|href)=["']${relativePath}["']`, "gi"),
          `$1="${blobUrl}"`
        );
        html = html.replace(
          new RegExp(`(src|href)=["']\./${relativePath}["']`, "gi"),
          `$1="${blobUrl}"`
        );
        html = html.replace(
          new RegExp(`(src|href)=["']${path}["']`, "gi"),
          `$1="${blobUrl}"`
        );
      }
      
      resolve(html);
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
