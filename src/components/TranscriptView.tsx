import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

interface Transcript {
  fileName: string;
  content: string;
  wordCount: number;
}

interface TranscriptViewProps {
  transcripts: Transcript[];
}

export const TranscriptView = ({ transcripts }: TranscriptViewProps) => {
  const handleDownload = (transcript: Transcript) => {
    const blob = new Blob([transcript.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${transcript.fileName.replace(/\.[^/.]+$/, "")}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded transcript from ${transcript.fileName}`);
  };

  const handleDownloadAll = () => {
    const allContent = transcripts
      .map((t) => `=== ${t.fileName} ===\n\n${t.content}\n\n`)
      .join("\n");
    
    const blob = new Blob([allContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "all_transcripts.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded all ${transcripts.length} transcripts`);
  };

  if (transcripts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No transcripts found in this SCORM package</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Total: {transcripts.reduce((sum, t) => sum + t.wordCount, 0).toLocaleString()} words
        </p>
        <Button onClick={handleDownloadAll} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download All
        </Button>
      </div>

      {transcripts.map((transcript, index) => (
        <Card key={index} className="p-6 hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg mb-1">{transcript.fileName}</h3>
              <p className="text-sm text-muted-foreground">
                {transcript.wordCount.toLocaleString()} words
              </p>
            </div>
            <Button
              onClick={() => handleDownload(transcript)}
              variant="ghost"
              size="sm"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
          <div className="bg-muted/30 rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {transcript.content.substring(0, 500)}
              {transcript.content.length > 500 && "..."}
            </pre>
          </div>
        </Card>
      ))}
    </div>
  );
};
