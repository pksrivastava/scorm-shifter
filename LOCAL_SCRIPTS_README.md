# SCORM Analysis Toolkit - Local Scripts Guide

This document explains how to use the standalone JavaScript scripts for extracting data from SCORM packages without any web interface or AI tools.

## Prerequisites

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **JSZip package** - Install with: `npm install jszip`

## Installation

1. Download the scripts from the web interface or use the ones provided
2. Create a new directory for your analysis work
3. Install the required dependency:

```bash
npm install jszip
```

## Scripts Overview

### 1. Transcript Extractor (`extract-transcripts.js`)

Extracts all text content from HTML and XML files within a SCORM package.

**Usage:**
```bash
node extract-transcripts.js <scorm-package.zip> [output-dir]
```

**Example:**
```bash
node extract-transcripts.js my-course.zip ./transcripts
```

**Output:**
- Individual transcript files for each HTML/XML file
- `transcripts-summary.json` with metadata about each transcript
- Word counts for each extracted transcript

**What it extracts:**
- All visible text from HTML pages
- Content from XML files
- Removes scripts, styles, and HTML tags
- Decodes HTML entities

---

### 2. Video Extractor (`extract-videos.js`)

Finds and extracts all video files from a SCORM package.

**Usage:**
```bash
node extract-videos.js <scorm-package.zip> [output-dir]
```

**Example:**
```bash
node extract-videos.js my-course.zip ./videos
```

**Output:**
- All video files with original filenames
- `videos-summary.json` with file sizes and formats
- Supports: MP4, WebM, AVI, MOV, WMV, FLV, M4V

**Information provided:**
- File name and location within package
- File size in MB
- Video format/type

---

### 3. Assessment Extractor (`extract-assessments.js`)

Parses and extracts quiz/assessment data from SCORM packages.

**Usage:**
```bash
node extract-assessments.js <scorm-package.zip> [output-file]
```

**Example:**
```bash
node extract-assessments.js my-course.zip ./assessments.json
```

**Output:**
- Single JSON file with all assessments
- Structured data including:
  - Question text
  - Answer choices
  - Correct answers (when available)
  - Source file information

**JSON Structure:**
```json
[
  {
    "fileName": "quiz01.html",
    "questions": [
      {
        "question": "What is SCORM?",
        "answers": ["Answer A", "Answer B", "Answer C"],
        "correctAnswer": "Answer A"
      }
    ]
  }
]
```

---

## Complete Workflow Example

Here's how to extract all data from a SCORM package:

```bash
# 1. Create a working directory
mkdir scorm-analysis
cd scorm-analysis

# 2. Install dependency
npm install jszip

# 3. Download/copy the scripts to this directory

# 4. Run all extractors
node extract-transcripts.js course.zip ./output/transcripts
node extract-videos.js course.zip ./output/videos
node extract-assessments.js course.zip ./output/assessments.json
```

## Batch Processing Multiple SCORM Packages

Create a simple batch script:

**Linux/Mac (`process-all.sh`):**
```bash
#!/bin/bash

for file in *.zip; do
  echo "Processing $file..."
  mkdir -p "output/${file%.zip}"
  node extract-transcripts.js "$file" "output/${file%.zip}/transcripts"
  node extract-videos.js "$file" "output/${file%.zip}/videos"
  node extract-assessments.js "$file" "output/${file%.zip}/assessments.json"
done

echo "All packages processed!"
```

**Windows (`process-all.bat`):**
```batch
@echo off

for %%f in (*.zip) do (
  echo Processing %%f...
  mkdir "output\%%~nf" 2>nul
  node extract-transcripts.js "%%f" "output\%%~nf\transcripts"
  node extract-videos.js "%%f" "output\%%~nf\videos"
  node extract-assessments.js "%%f" "output\%%~nf\assessments.json"
)

echo All packages processed!
```

## Troubleshooting

### "Cannot find module 'jszip'"
**Solution:** Install JSZip: `npm install jszip`

### "File not found" error
**Solution:** Check the path to your SCORM package is correct and the file exists

### No transcripts/assessments found
**Solution:** The SCORM package may use a different structure. Check the HTML/XML files manually to understand the format.

### Large file processing is slow
**Solution:** This is normal for packages with many files or large videos. The scripts are processing sequentially.

## Technical Details

### How Transcript Extraction Works
1. Scans ZIP for HTML/XML files
2. Removes `<script>` and `<style>` tags
3. Strips all HTML tags
4. Decodes HTML entities (&nbsp;, &amp;, etc.)
5. Normalizes whitespace
6. Saves as plain text files

### How Assessment Extraction Works
1. Looks for common quiz patterns in HTML/XML
2. Searches for elements like `<question>`, `<item>`
3. Extracts `<answer>`, `<choice>`, `<option>` elements
4. Attempts to identify correct answers
5. Outputs structured JSON data

### Supported SCORM Versions
- **SCORM 1.2** - Full support
- **SCORM 2004** - Full support
- **AICC** - Partial support (depends on structure)

## Advanced Usage

### Filter by specific file types
Modify the scripts to add more file extensions:

```javascript
const HTML_EXTENSIONS = ['.html', '.htm', '.xhtml', '.php'];
const XML_EXTENSIONS = ['.xml', '.imsmanifest'];
```

### Extract only specific content
Comment out unwanted extraction logic in the scripts.

### Custom output formatting
Modify the `fs.writeFileSync()` calls to change output format (CSV, XML, etc.).

## Need Help?

- Check the SCORM specification: [ADL SCORM Documentation](https://adlnet.gov/projects/scorm/)
- Verify your ZIP file structure
- Test with a known-working SCORM package first

## License

These scripts are provided as-is for educational and analysis purposes. Ensure you have proper rights to analyze the SCORM content you're processing.
