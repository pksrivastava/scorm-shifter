import JSZip from "jszip";

export interface Transcript {
  fileName: string;
  content: string;
  wordCount: number;
}

export interface Video {
  fileName: string;
  size: number;
  type: string;
  blob: Blob;
}

export interface Assessment {
  fileName: string;
  questions: {
    question: string;
    answers?: string[];
    correctAnswer?: string;
  }[];
}

export interface SCORMAnalysis {
  packageName: string;
  transcripts: Transcript[];
  videos: Video[];
  assessments: Assessment[];
}

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".avi", ".mov", ".wmv", ".flv", ".m4v"];
const HTML_EXTENSIONS = [".html", ".htm", ".xhtml"];
const XML_EXTENSIONS = [".xml"];

export const analyzeSCORMPackage = async (file: File): Promise<SCORMAnalysis> => {
  const zip = await JSZip.loadAsync(file);
  
  const transcripts: Transcript[] = [];
  const videos: Video[] = [];
  const assessments: Assessment[] = [];

  // Process all files in the ZIP
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;

    const fileName = path.split("/").pop() || path;
    const lowerPath = path.toLowerCase();

    // Extract videos
    if (VIDEO_EXTENSIONS.some((ext) => lowerPath.endsWith(ext))) {
      const blob = await zipEntry.async("blob");
      videos.push({
        fileName,
        size: blob.size,
        type: lowerPath.split(".").pop() || "unknown",
        blob,
      });
    }

    // Extract transcripts from HTML/XML files
    if (
      HTML_EXTENSIONS.some((ext) => lowerPath.endsWith(ext)) ||
      XML_EXTENSIONS.some((ext) => lowerPath.endsWith(ext))
    ) {
      const content = await zipEntry.async("text");
      const textContent = extractTextFromHTML(content);
      
      if (textContent.trim().length > 0) {
        transcripts.push({
          fileName,
          content: textContent,
          wordCount: textContent.split(/\s+/).length,
        });
      }

      // Try to extract assessments
      const assessmentData = extractAssessments(content, fileName);
      if (assessmentData.questions.length > 0) {
        assessments.push(assessmentData);
      }
    }
  }

  return {
    packageName: file.name,
    transcripts,
    videos,
    assessments,
  };
};

const extractTextFromHTML = (html: string): string => {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();
  
  return text;
};

const extractAssessments = (content: string, fileName: string): Assessment => {
  const questions: Assessment["questions"] = [];
  
  // Try to detect question patterns in HTML/XML
  // Pattern 1: Look for quiz/question elements
  const questionRegex = /<(?:question|item)[^>]*>(.*?)<\/(?:question|item)>/gis;
  const questionMatches = content.matchAll(questionRegex);
  
  for (const match of questionMatches) {
    const questionContent = match[1];
    const questionText = extractTextFromHTML(questionContent);
    
    // Extract answers
    const answerRegex = /<(?:answer|choice|option)[^>]*>(.*?)<\/(?:answer|choice|option)>/gis;
    const answers: string[] = [];
    const answerMatches = questionContent.matchAll(answerRegex);
    
    for (const answerMatch of answerMatches) {
      const answerText = extractTextFromHTML(answerMatch[1]);
      if (answerText.trim()) {
        answers.push(answerText.trim());
      }
    }
    
    // Try to find correct answer
    const correctRegex = /correct[^>]*>([^<]+)/i;
    const correctMatch = questionContent.match(correctRegex);
    const correctAnswer = correctMatch ? extractTextFromHTML(correctMatch[1]).trim() : undefined;
    
    if (questionText.trim()) {
      questions.push({
        question: questionText.trim(),
        answers: answers.length > 0 ? answers : undefined,
        correctAnswer,
      });
    }
  }
  
  return {
    fileName,
    questions,
  };
};
