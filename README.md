# blogplanner

A simple, vanilla JavaScript blog planning tool for organizing content, managing credits, and exporting to multiple platforms.

## Features

- **3-Step Wizard**: Content → Credits → Export
- **Post Management**: Create, edit, and organize blog posts with event tracking
- **Credits System**: Track sponsors, credits, and event metadata
- **Multi-Platform Export**: 
  - Flickr XML
  - Blog Metadata
  - YouTube Info
  - Bluesky Post Format
  - Primfeed Format
- **Local Storage Persistence**: Auto-saves drafts with 600ms debounce
- **Responsive Design**: Works on desktop, tablet, and mobile
- **No Dependencies**: Pure vanilla JavaScript, HTML, and CSS

## Usage

1. Open `index.html` in a web browser
2. Enter blog post content in Step 1
3. Add credits and sponsors in Step 2
4. Select export format in Step 3
5. Copy exported data to clipboard

## Technical Details

- **Storage**: Browser localStorage with quota management
- **Auto-Save**: Draft posts saved automatically every 600ms
- **Export Formats**: XML, JSON, plain text
- **Responsive Layout**: CSS Grid/Flexbox design

## Version History

- **cleanup-v1**: Removed unused avatar and inspiration gallery features
- **Initial Release**: Core blog planning functionality
