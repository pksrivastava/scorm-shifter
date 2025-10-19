import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ClipboardList } from "lucide-react";
import { toast } from "sonner";

interface Assessment {
  fileName: string;
  questions: {
    question: string;
    answers?: string[];
    correctAnswer?: string;
  }[];
}

interface AssessmentViewProps {
  assessments: Assessment[];
}

export const AssessmentView = ({ assessments }: AssessmentViewProps) => {
  const handleDownload = (assessment: Assessment) => {
    const content = JSON.stringify(assessment, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${assessment.fileName.replace(/\.[^/.]+$/, "")}_assessment.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded assessment from ${assessment.fileName}`);
  };

  const handleDownloadAll = () => {
    const content = JSON.stringify(assessments, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "all_assessments.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded all ${assessments.length} assessments`);
  };

  if (assessments.length === 0) {
    return (
      <Card className="p-12 text-center">
        <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No assessments found in this SCORM package</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Total: {assessments.reduce((sum, a) => sum + a.questions.length, 0)} questions
        </p>
        <Button onClick={handleDownloadAll} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download All
        </Button>
      </div>

      {assessments.map((assessment, index) => (
        <Card key={index} className="p-6 hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg mb-1">{assessment.fileName}</h3>
              <p className="text-sm text-muted-foreground">
                {assessment.questions.length} question{assessment.questions.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              onClick={() => handleDownload(assessment)}
              variant="ghost"
              size="sm"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-4">
            {assessment.questions.slice(0, 3).map((q, qIndex) => (
              <div key={qIndex} className="bg-muted/30 rounded-lg p-4">
                <p className="font-medium mb-2">Q{qIndex + 1}: {q.question}</p>
                {q.answers && q.answers.length > 0 && (
                  <ul className="text-sm space-y-1 ml-4">
                    {q.answers.map((answer, aIndex) => (
                      <li
                        key={aIndex}
                        className={
                          answer === q.correctAnswer
                            ? "text-primary font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        • {answer}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {assessment.questions.length > 3 && (
              <p className="text-sm text-muted-foreground text-center">
                + {assessment.questions.length - 3} more question
                {assessment.questions.length - 3 !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
