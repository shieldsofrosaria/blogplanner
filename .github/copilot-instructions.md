# Blog Planner Copilot Instructions

This document provides guidance for GitHub Copilot when assisting with the Second Life blog content creation workflow.

## Workflow Overview

The blog creation process follows five main phases:
1. **Plan** - Concept development
2. **Build** - Set/scene construction
3. **Shoot** - Photography/videography
4. **Edit** - Post-processing
5. **Share** - Multi-platform publishing

## Phase 1: Plan

**Goal:** Develop an 80% or higher complete concept before moving to the next phase.

When helping with planning:
- Assist in developing comprehensive post concepts that include:
  - Avatar selection and configuration
  - Scene/setting descriptions
  - Props and decorative elements needed
  - Lighting considerations
  - Mood and atmosphere goals
- Create detailed shot lists or storyboards
- Help avoid vague ideas by asking clarifying questions
- Document planning decisions for reference during later phases
- Allow flexibility for minor adjustments (like decor rearrangement during shooting)

**Output Format:**
```markdown
## Post Concept
- **Theme:** [Description]
- **Avatar(s):** [Details]
- **Scene:** [Setting description]
- **Key Props:** [List]
- **Lighting:** [Approach]
- **Mood:** [Desired atmosphere]
- **Shot List:** [Specific shots needed]
```

## Phase 2: Build

**Goal:** Efficiently create sets and scenes that feel real/filled-in (realistic) or dynamic/bold (cartoony/action).

When helping with building:
- Provide time-saving techniques for scene construction
- Suggest efficient approaches for two primary styles:
  1. **Realistic scenes:** Focus on filled-in, authentic details
  2. **Fun/cartoony/action scenes:** Emphasize dynamic, bold elements
- Help balance quality with efficiency to reduce perfectionism delays
- Offer modular building approaches for reusable components
- Suggest reference materials or examples for inspiration

## Phase 3: Shoot

**Goal:** Capture quality photos/videos efficiently.

When helping with photography/videography:
- Suggest composition techniques and camera angles
- Recommend real-world photography examples for study
- Provide tips for different shot types (portraits, action, landscape, etc.)
- Help establish "good enough" criteria to reduce time spent on perfectionism
- Suggest workflow optimizations for faster shooting sessions
- Reference photography principles (rule of thirds, leading lines, depth of field, etc.)

## Phase 4: Edit

**Editing Workflow:**
1. **Initial Processing:**
   - GShade (in-game shader)
   - Native shooting with Firestorm viewer
2. **Color Correction:** Darktable
3. **Advanced Editing:** Photopea (effects, mistake removal)
4. **File Management:** Save PSD for preservation, export as PNG

When helping with editing:
- Provide efficient Darktable color correction workflows
- Suggest Photopea techniques for common editing tasks
- Help organize editing workflows based on shot types
- Assist with preserving editing history (PSD management)
- Offer batch processing suggestions when applicable

## Phase 5: Share

**Goal:** Post content with appropriate credits across multiple platforms.

### Platform-Specific Requirements

#### Flickr
- **Format:** HTML-friendly
- **Character Limit:** None
- **Template:**
```html
<b>Title:</b> [Post Title]

[Description]

<b>Credits:</b>
[Item] - [Creator]
[Item] - [Creator]

<b>Location:</b> [SLURL if applicable]
```

#### BlueSky
- **Format:** Plain text
- **Character Limit:** 300 characters maximum
- **Required Hashtags:** #SecondLife #SLFurry
- **Template:**
```
[Concise description - keep under 250 chars for credits]

Credits: [Key items only]

#SecondLife #SLFurry
```

#### YouTube (Vlogs)
- **Format:** Plain text with structure
- **Character Limit:** None (but keep concise)
- **Template:**
```
[Engaging opening description]

In this video: [Key points]

🎬 CREDITS:
[Item] - [Creator]

📍 VISIT:
[Location SLURLs]

#SecondLife #SLFurry #VirtualPhotography
```

#### Primfeed/Prim Network
- **Format:** Rich text (possibly HTML)
- **Character Limit:** None
- **Template:**
```
[Description]

CREDITS:
[Item] - [Creator]
[Item] - [Creator]

[Location information]
```

#### Personal Blog (Tumblr)
- **Format:** HTML
- **Character Limit:** None
- **Template:**
```html
<h2>[Post Title]</h2>

<p>[Introduction/Description]</p>

<img src="[image-url]" alt="[description]">

<h3>Credits</h3>
<ul>
<li>[Item] - [Creator]</li>
<li>[Item] - [Creator]</li>
</ul>

<p><strong>Location:</strong> [SLURL]</p>

<p class="tags">#SecondLife #SLFurry #VirtualPhotography</p>
```

### Sharing Assistance

When helping with content sharing:
- Auto-format credits based on target platform
- Enforce character limits (especially BlueSky's 300 characters)
- Include required hashtags automatically
- Adapt HTML/formatting to platform capabilities
- Help prioritize credits when space is limited
- Maintain consistent branding across platforms

## General Guidelines

- Prioritize efficiency without sacrificing quality
- Help break through perfectionism paralysis with concrete decision criteria
- Provide actionable suggestions rather than vague advice
- Remember the user works primarily in Second Life/Firestorm
- Support both realistic and stylized/dynamic approaches
- Respect the creative process while encouraging completion

## Technical Context

- **Primary Platform:** Second Life (using Firestorm viewer)
- **Shader Tool:** GShade
- **Color Correction:** Darktable
- **Advanced Editing:** Photopea
- **File Format:** PSD (preserve), PNG (export)
- **Target Audience:** Second Life furry community
