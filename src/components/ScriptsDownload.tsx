import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileCode } from "lucide-react";
import { toast } from "sonner";
import { 
  getTranscriptExtractorScript, 
  getVideoExtractorScript, 
  getAssessmentExtractorScript 
} from "@/utils/localScripts";

export const ScriptsDownload = () => {
  const downloadScript = (script: string, filename: string) => {
    const blob = new Blob([script], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <FileCode className="w-4 h-4 mr-2" />
          Download Scripts
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() =>
            downloadScript(
              getTranscriptExtractorScript(),
              "extract-transcripts.js"
            )
          }
        >
          <Download className="w-4 h-4 mr-2" />
          Transcript Extractor
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            downloadScript(getVideoExtractorScript(), "extract-videos.js")
          }
        >
          <Download className="w-4 h-4 mr-2" />
          Video Extractor
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            downloadScript(
              getAssessmentExtractorScript(),
              "extract-assessments.js"
            )
          }
        >
          <Download className="w-4 h-4 mr-2" />
          Assessment Extractor
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
