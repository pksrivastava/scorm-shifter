import { useState } from "react";
import { Upload, FileCode, Video, ClipboardCheck, Download, PlayCircle, Maximize2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UploadZone } from "@/components/UploadZone";
import { TranscriptView } from "@/components/TranscriptView";
import { VideoView } from "@/components/VideoView";
import { AssessmentView } from "@/components/AssessmentView";
import { ScriptsDownload } from "@/components/ScriptsDownload";
import { ScormPlayer } from "@/components/ScormPlayer";
import { analyzeSCORMPackage, type SCORMAnalysis } from "@/utils/scormAnalyzer";

const Index = () => {
  const [analysis, setAnalysis] = useState<SCORMAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<"analyze" | "play">("analyze");
  const [playFile, setPlayFile] = useState<File | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      if (mode === "play") {
        setPlayFile(file);
        toast.success("SCORM package ready to play");
      } else {
        const result = await analyzeSCORMPackage(file);
        setAnalysis(result);
        toast.success(`Successfully analyzed SCORM package`, {
          description: `Found ${result.transcripts.length} transcripts, ${result.videos.length} videos, ${result.assessments.length} assessments`,
        });
      }
    } catch (error) {
      toast.error("Failed to process SCORM package", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModeSwitch = (newMode: "analyze" | "play") => {
    setMode(newMode);
    setAnalysis(null);
    setPlayFile(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                SCORM Analysis Toolkit
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "play" 
                  ? "Play and interact with SCORM content" 
                  : "Extract transcripts, videos, and assessments from SCORM packages"}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex border border-border rounded-lg p-1">
                <Button
                  variant={mode === "analyze" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleModeSwitch("analyze")}
                >
                  <FileCode className="w-4 h-4 mr-2" />
                  Analyze
                </Button>
                <Button
                  variant={mode === "play" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleModeSwitch("play")}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Play
                </Button>
              </div>
              {mode === "analyze" && (
                <Button variant="outline" size="sm" asChild>
                  <a href="https://docs.lovable.dev/features/cloud" target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Local Scripts
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {mode === "play" ? (
          <div className="max-w-6xl mx-auto">
            {!playFile ? (
              <>
                <UploadZone onFileUpload={handleFileUpload} isProcessing={isProcessing} />
                
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-colors">
                    <PlayCircle className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-2">Interactive SCORM Player</h3>
                    <p className="text-sm text-muted-foreground">
                      Play SCORM 1.2 and 2004 content with full API support
                    </p>
                  </Card>
                  
                  <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-colors">
                    <Maximize2 className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-2">Fullscreen Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      Experience SCORM content in immersive fullscreen view
                    </p>
                  </Card>
                </div>
              </>
            ) : (
              <ScormPlayer file={playFile} onClose={() => setPlayFile(null)} />
            )}
          </div>
        ) : !analysis ? (
          <div className="max-w-2xl mx-auto">
            <UploadZone onFileUpload={handleFileUpload} isProcessing={isProcessing} />
            
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-colors">
                <FileCode className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Transcript Extraction</h3>
                <p className="text-sm text-muted-foreground">
                  Parse all text content from HTML, XML, and manifest files
                </p>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-colors">
                <Video className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Video Discovery</h3>
                <p className="text-sm text-muted-foreground">
                  Locate and extract all video files within the package
                </p>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/50 transition-colors">
                <ClipboardCheck className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Assessment Parsing</h3>
                <p className="text-sm text-muted-foreground">
                  Extract quizzes, questions, and answer data
                </p>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Analysis Results</h2>
                <p className="text-sm text-muted-foreground">Package: {analysis.packageName}</p>
              </div>
              <div className="flex gap-2">
                <ScriptsDownload />
                <Button variant="outline" onClick={() => setAnalysis(null)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Analyze New Package
                </Button>
              </div>
            </div>

            <Tabs defaultValue="transcripts" className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
                <TabsTrigger value="transcripts" className="gap-2">
                  <FileCode className="w-4 h-4" />
                  Transcripts ({analysis.transcripts.length})
                </TabsTrigger>
                <TabsTrigger value="videos" className="gap-2">
                  <Video className="w-4 h-4" />
                  Videos ({analysis.videos.length})
                </TabsTrigger>
                <TabsTrigger value="assessments" className="gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  Assessments ({analysis.assessments.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="transcripts" className="mt-6">
                <TranscriptView transcripts={analysis.transcripts} />
              </TabsContent>
              
              <TabsContent value="videos" className="mt-6">
                <VideoView videos={analysis.videos} />
              </TabsContent>
              
              <TabsContent value="assessments" className="mt-6">
                <AssessmentView assessments={analysis.assessments} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
