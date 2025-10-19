import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Video as VideoIcon, FileVideo } from "lucide-react";
import { toast } from "sonner";

interface Video {
  fileName: string;
  size: number;
  type: string;
  blob: Blob;
}

interface VideoViewProps {
  videos: Video[];
}

export const VideoView = ({ videos }: VideoViewProps) => {
  const handleDownload = (video: Video) => {
    const url = URL.createObjectURL(video.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = video.fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${video.fileName}`);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (videos.length === 0) {
    return (
      <Card className="p-12 text-center">
        <VideoIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No videos found in this SCORM package</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {videos.map((video, index) => (
        <Card key={index} className="p-6 hover:border-primary/50 transition-colors">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileVideo className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate mb-1">{video.fileName}</h3>
              <p className="text-sm text-muted-foreground">
                {video.type} • {formatSize(video.size)}
              </p>
              <Button
                onClick={() => handleDownload(video)}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
