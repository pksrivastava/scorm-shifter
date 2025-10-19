export const getTranscriptExtractorScript = () => `#!/usr/bin/env node

/**
 * SCORM Transcript Extractor - Local Script
 * 
 * Usage: node extract-transcripts.js <scorm-package.zip> [output-dir]
 * 
 * This script extracts all text transcripts from a SCORM package.
 * It processes HTML and XML files to extract readable text content.
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const HTML_EXTENSIONS = ['.html', '.htm', '.xhtml'];
const XML_EXTENSIONS = ['.xml'];

async function extractTranscripts(zipPath, outputDir = './transcripts') {
  console.log('Reading SCORM package...');
  const zipData = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(zipData);
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const transcripts = [];
  
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    
    const lowerPath = path.toLowerCase();
    const isHTML = HTML_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
    const isXML = XML_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
    
    if (isHTML || isXML) {
      console.log(\`Processing: \${path}\`);
      const content = await zipEntry.async('text');
      const textContent = extractTextFromHTML(content);
      
      if (textContent.trim().length > 0) {
        const fileName = path.split('/').pop().replace(/\\.[^/.]+$/, '') + '_transcript.txt';
        const outputPath = path.join(outputDir, fileName);
        
        fs.writeFileSync(outputPath, textContent);
        transcripts.push({
          source: path,
          output: outputPath,
          wordCount: textContent.split(/\\s+/).length
        });
      }
    }
  }
  
  console.log(\`\\nExtracted \${transcripts.length} transcripts to \${outputDir}\`);
  transcripts.forEach(t => {
    console.log(\`  - \${t.output} (\${t.wordCount} words)\`);
  });
  
  // Create summary JSON
  const summaryPath = path.join(outputDir, 'transcripts-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(transcripts, null, 2));
  console.log(\`\\nSummary saved to \${summaryPath}\`);
}

function extractTextFromHTML(html) {
  let text = html.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '');
  text = text.replace(/<style\\b[^<]*(?:(?!<\\/style>)<[^<]*)*<\\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
  text = text.replace(/\\s+/g, ' ').trim();
  return text;
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node extract-transcripts.js <scorm-package.zip> [output-dir]');
  process.exit(1);
}

const zipPath = args[0];
const outputDir = args[1] || './transcripts';

if (!fs.existsSync(zipPath)) {
  console.error(\`Error: File not found: \${zipPath}\`);
  process.exit(1);
}

extractTranscripts(zipPath, outputDir).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
`;

export const getVideoExtractorScript = () => `#!/usr/bin/env node

/**
 * SCORM Video Extractor - Local Script
 * 
 * Usage: node extract-videos.js <scorm-package.zip> [output-dir]
 * 
 * This script extracts all video files from a SCORM package.
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.avi', '.mov', '.wmv', '.flv', '.m4v'];

async function extractVideos(zipPath, outputDir = './videos') {
  console.log('Reading SCORM package...');
  const zipData = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(zipData);
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const videos = [];
  
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    
    const lowerPath = path.toLowerCase();
    const isVideo = VIDEO_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
    
    if (isVideo) {
      console.log(\`Extracting: \${path}\`);
      const blob = await zipEntry.async('nodebuffer');
      const fileName = path.split('/').pop();
      const outputPath = path.join(outputDir, fileName);
      
      fs.writeFileSync(outputPath, blob);
      videos.push({
        source: path,
        output: outputPath,
        size: blob.length,
        type: path.split('.').pop()
      });
    }
  }
  
  console.log(\`\\nExtracted \${videos.length} videos to \${outputDir}\`);
  videos.forEach(v => {
    const sizeMB = (v.size / (1024 * 1024)).toFixed(2);
    console.log(\`  - \${v.output} (\${sizeMB} MB, \${v.type})\`);
  });
  
  // Create summary JSON
  const summaryPath = path.join(outputDir, 'videos-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(videos, null, 2));
  console.log(\`\\nSummary saved to \${summaryPath}\`);
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node extract-videos.js <scorm-package.zip> [output-dir]');
  process.exit(1);
}

const zipPath = args[0];
const outputDir = args[1] || './videos';

if (!fs.existsSync(zipPath)) {
  console.error(\`Error: File not found: \${zipPath}\`);
  process.exit(1);
}

extractVideos(zipPath, outputDir).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
`;

export const getAssessmentExtractorScript = () => `#!/usr/bin/env node

/**
 * SCORM Assessment Extractor - Local Script
 * 
 * Usage: node extract-assessments.js <scorm-package.zip> [output-file]
 * 
 * This script extracts all quiz/assessment data from a SCORM package.
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const HTML_EXTENSIONS = ['.html', '.htm', '.xhtml'];
const XML_EXTENSIONS = ['.xml'];

async function extractAssessments(zipPath, outputFile = './assessments.json') {
  console.log('Reading SCORM package...');
  const zipData = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(zipData);
  
  const assessments = [];
  
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    
    const lowerPath = path.toLowerCase();
    const isHTML = HTML_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
    const isXML = XML_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
    
    if (isHTML || isXML) {
      console.log(\`Scanning: \${path}\`);
      const content = await zipEntry.async('text');
      const assessmentData = extractAssessmentData(content, path);
      
      if (assessmentData.questions.length > 0) {
        assessments.push(assessmentData);
      }
    }
  }
  
  console.log(\`\\nFound \${assessments.length} assessments with \${
    assessments.reduce((sum, a) => sum + a.questions.length, 0)
  } total questions\`);
  
  // Save to JSON
  fs.writeFileSync(outputFile, JSON.stringify(assessments, null, 2));
  console.log(\`\\nAssessments saved to \${outputFile}\`);
}

function extractTextFromHTML(html) {
  let text = html.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '');
  text = text.replace(/<style\\b[^<]*(?:(?!<\\/style>)<[^<]*)*<\\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
  text = text.replace(/\\s+/g, ' ').trim();
  return text;
}

function extractAssessmentData(content, fileName) {
  const questions = [];
  
  const questionRegex = /<(?:question|item)[^>]*>(.*?)<\\/(?:question|item)>/gis;
  const questionMatches = content.matchAll(questionRegex);
  
  for (const match of questionMatches) {
    const questionContent = match[1];
    const questionText = extractTextFromHTML(questionContent);
    
    const answerRegex = /<(?:answer|choice|option)[^>]*>(.*?)<\\/(?:answer|choice|option)>/gis;
    const answers = [];
    const answerMatches = questionContent.matchAll(answerRegex);
    
    for (const answerMatch of answerMatches) {
      const answerText = extractTextFromHTML(answerMatch[1]);
      if (answerText.trim()) {
        answers.push(answerText.trim());
      }
    }
    
    const correctRegex = /correct[^>]*>([^<]+)/i;
    const correctMatch = questionContent.match(correctRegex);
    const correctAnswer = correctMatch ? extractTextFromHTML(correctMatch[1]).trim() : undefined;
    
    if (questionText.trim()) {
      questions.push({
        question: questionText.trim(),
        answers: answers.length > 0 ? answers : undefined,
        correctAnswer
      });
    }
  }
  
  return {
    fileName,
    questions
  };
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node extract-assessments.js <scorm-package.zip> [output-file]');
  process.exit(1);
}

const zipPath = args[0];
const outputFile = args[1] || './assessments.json';

if (!fs.existsSync(zipPath)) {
  console.error(\`Error: File not found: \${zipPath}\`);
  process.exit(1);
}

extractAssessments(zipPath, outputFile).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
`;
