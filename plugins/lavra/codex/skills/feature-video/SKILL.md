---
name: feature-video
description: Record feature video walkthrough and embed in PR. For visual demos, QA test flows, and reviewer documentation.
---

# Feature Video Skill

## Objective

Record a video walkthrough demonstrating a feature, upload it, and add it to the PR description.

## Prerequisites

- Local development server running (e.g., `bin/dev`, `rails server`)
- agent-browser CLI installed and available
- Git repository with a PR to document
- ffmpeg installed (for video conversion)
- rclone configured (optional, for cloud upload)

## Installation Check

```bash
command -v agent-browser >/dev/null 2>&1 && echo "Installed" || echo "NOT INSTALLED"
```

If not installed:
```bash
npm install -g agent-browser && agent-browser install
```

## Argument Parsing

Parse input arguments:
- First argument: PR number or "current" (defaults to current branch's PR)
- Second argument: Base URL (defaults to `http://localhost:3000`)

Get PR number for current branch if needed:
```bash
gh pr view --json number -q '.number'
```

## Execution Flow

### 1. Gather Feature Context

Get PR details:
```bash
gh pr view [number] --json title,body,files,headRefName -q '.'
```

Get changed files:
```bash
gh pr view [number] --json files -q '.files[].path'
```

Map files to testable routes:
- `app/views/users/*` -> `/users`, `/users/:id`, `/users/new`
- `app/controllers/settings_controller.rb` -> `/settings`
- `app/javascript/controllers/*_controller.js` -> Pages using that Stimulus controller
- `app/components/*_component.rb` -> Pages rendering that component

### 2. Plan the Video Flow

Before recording, create a shot list:

1. **Opening shot**: Homepage or starting point (2-3 seconds)
2. **Navigation**: How user gets to the feature
3. **Feature demonstration**: Core functionality (main focus)
4. **Edge cases**: Error states, validation, etc. (if applicable)
5. **Success state**: Completed action/result

Present proposed flow to user:

```markdown
**Proposed Video Flow**

Based on PR #[number]: [title]

1. Start at: /[starting-route]
2. Navigate to: /[feature-route]
3. Demonstrate:
   - [Action 1]
   - [Action 2]
   - [Action 3]
4. Show result: [success state]

Estimated duration: ~[X] seconds

Does this look right?
1. Yes, start recording
2. Modify the flow
3. Add specific interactions
```

Ask user to confirm or adjust.

### 3. Setup Video Recording

Create working directories:
```bash
mkdir -p tmp/videos tmp/screenshots
```

**Recording approach:** Use browser screenshots as frames, combine into video with ffmpeg.

### 4. Record the Walkthrough

Execute the planned flow, capturing each step:

**Step 1: Navigate to starting point**
```bash
agent-browser open "[base-url]/[start-route]"
agent-browser wait 2000
agent-browser screenshot tmp/screenshots/01-start.png
```

**Step 2: Perform navigation/interactions**
```bash
agent-browser snapshot -i  # Get element refs
agent-browser click @e1    # Click navigation element
agent-browser wait 1000
agent-browser screenshot tmp/screenshots/02-navigate.png
```

**Step 3: Demonstrate feature**
```bash
agent-browser snapshot -i
agent-browser click @e2
agent-browser wait 1000
agent-browser screenshot tmp/screenshots/03-feature.png
```

**Step 4: Capture result**
```bash
agent-browser wait 2000
agent-browser screenshot tmp/screenshots/04-result.png
```

### 5. Create Video/GIF from Screenshots

**Create MP4 video (recommended):**
```bash
ffmpeg -y -framerate 0.5 -pattern_type glob -i 'tmp/screenshots/*.png' \
  -c:v libx264 -pix_fmt yuv420p -vf "scale=1280:-2" \
  tmp/videos/feature-demo.mp4
```

Notes:
- `-framerate 0.5` = 2 seconds per frame (slow playback for clarity)
- `-framerate 1` = 1 second per frame
- `-2` in scale ensures height is divisible by 2 (required for H.264)

**Create preview GIF (small file for GitHub embed):**
```bash
ffmpeg -y -framerate 0.5 -pattern_type glob -i 'tmp/screenshots/*.png' \
  -vf "scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse" \
  -loop 0 tmp/videos/feature-demo-preview.gif
```

Notes:
- 640px width and 128 colors to keep file small (~100-200KB)

### 6. Upload the Video

**Check rclone configuration:**
```bash
rclone listremotes
```

**Upload to cloud storage:**
```bash
# Upload video and preview GIF
rclone copy tmp/videos/ r2:your-bucket/pr-videos/pr-[number]/ --s3-no-check-bucket --progress

# Upload screenshots for reference
rclone copy tmp/screenshots/ r2:your-bucket/pr-videos/pr-[number]/screenshots/ --s3-no-check-bucket --progress

# List uploaded files
rclone ls r2:your-bucket/pr-videos/pr-[number]/
```

### 7. Update PR Description

Get current PR body:
```bash
gh pr view [number] --json body -q '.body'
```

Add video section to PR description. GitHub cannot embed external MP4s directly, so use a clickable GIF that links to the video:

```markdown
## Demo

[![Feature Demo]([preview-gif-url])]([video-mp4-url])

*Click to view full video*
```

Update the PR:
```bash
gh pr edit [number] --body "[updated body with video section]"
```

**Or add as a comment:**
```bash
gh pr comment [number] --body "## Feature Demo

![Demo]([video-url])

_Automated walkthrough of the changes in this PR_"
```

### 8. Cleanup

Optional: Clean up screenshots (videos are retained):
```bash
rm -rf tmp/screenshots

echo "Video retained at: tmp/videos/feature-demo.mp4"
```

## Success Criteria

- [ ] Video/GIF captures the complete user flow for the feature
- [ ] PR description updated with embedded video section
- [ ] Video uploaded to cloud storage (or local path noted)
- [ ] All shots from the planned flow are captured

## Guardrails

- Keep it short: 10-30 seconds is ideal for PR demos
- Focus on the change: Don't include unrelated UI
- Show before/after: If fixing a bug, show the broken state first
- Annotate if needed: Add text overlays for complex features

## Handoff Options

1. Review the video to ensure it accurately demonstrates the feature
2. Share with reviewers for context
3. Run `/lavra-review` for a full code review of the changes
