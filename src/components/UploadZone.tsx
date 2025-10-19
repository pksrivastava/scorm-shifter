import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileUpload: (file: File) => void;
  isProcessing: boolean;
}

export const UploadZone = ({ onFileUpload, isProcessing }: UploadZoneProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0]);
      }
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/zip": [".zip"],
      "application/x-zip-compressed": [".zip"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300",
        "hover:border-primary/50 hover:bg-card/80",
        isDragActive && "border-primary bg-primary/5 scale-[1.02]",
        isProcessing && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center space-y-4">
        {isProcessing ? (
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <div>
              <p className="text-lg font-semibold">Analyzing SCORM Package...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Extracting transcripts, videos, and assessments
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 bg-primary/10 rounded-full">
              <Upload className="w-12 h-12 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold mb-2">
                {isDragActive ? "Drop your SCORM package here" : "Upload SCORM Package"}
              </p>
              <p className="text-sm text-muted-foreground">
                Drag and drop or click to browse for a ZIP file
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supports SCORM 1.2 and SCORM 2004 packages
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
