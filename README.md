# All-in-One Raycast Extension

A Raycast extension to streamline my daily workflows.

## Features

### 1. Text to Calendar

Extracts schedule information from text and generates a Google Calendar event URL.

**Features:**

- Automatically extracts event details from the selected text
- Uses the OpenAI API for advanced natural language processing
- Supports Japanese and English
- Automatically generates a Google Calendar template URL
- Identifies user's own events from text containing multiple people's schedules

**How to use:**

1. Configure your user name in the extension preferences (required)
2. Select text that contains schedule information
3. Run the command
4. Google Calendar opens with the generated URL
5. Review the event and save

### 2. Ask AI

Ask a single question and get a concise, intelligent answer from AI.

**Features:**

- Simple single-turn Q&A interface
- Multilingual support
- Copy answers to the clipboard
- Customizable AI model settings

**How to use:**

1. Run the command
2. Enter your question
3. Review the AI's answer
4. Copy the answer if needed

### 3. Summarize Selected Text in Japanese

Summarize the selected text in Japanese and display it in bullet-point format.

**Features:**

- Specializes in summarizing in Japanese
- Outputs 3-10 bullet points (each item starts with "- ")
- Preserves important numbers, names, dates, and URLs
- Does not add any new information or opinions
- Allows you to copy the summary to the clipboard
- Uses the OpenAI API (model and endpoint can be customized)

**How to use:**

1. Select the text you want to summarize
2. Run the command (Summarize Selected Text in Japanese)
3. The generated summary will be displayed in bullet-point format
4. You can copy the summary to the clipboard from the action panel

### 4. Translate Text (JA⇄EN)

Translate selected text between Japanese and English with a single command.

**Features:**

- Automatically detects if the input is Japanese or English using AI
- Translates Japanese → English or English → Japanese accordingly
- Copies the translation to the clipboard
- Replace the selection with the translation
- Uses the OpenAI API (model and endpoint can be customized)

**How to use:**

1. Select the text you want to translate and run the command
2. The translation will be shown in Raycast
3. Use the action panel to copy the result or replace the selected text

### 5. Quick Save to Obsidian

Create a new Obsidian note from the active browser tab (or clipboard URL).

**Features:**

- Grabs URL and title from Safari, Google Chrome, Arc, Brave, or Edge
- Falls back to clipboard URL when no active tab is available
- Adds YAML front matter with created date and tags
- **Auto-tag by domain** (e.g., github, zenn, twitter, youtube) plus your default tags
- Configurable vault, target folder, and filename format
- Filename placeholders: `{{yyyy-MM-dd}}`, `{{yyyyMMdd-HHmmss}}`, `{{domain}}`, `{{slug}}`

**How to use:**

1. Set your Obsidian vault name in the command preferences (required)
2. Optionally set:
   - Target folder inside the vault (default: `Bookmarks`)
   - Default tags (comma-separated, default: `bookmark`)
   - Auto tag by domain (on by default)
   - Filename format (default: `{{slug}}`)
3. Open a page in a supported browser or copy a URL to the clipboard
4. Run the command (Quick Save to Obsidian)
5. Obsidian opens a new note prefilled with the URL and template sections

Note: Use a folder path that exists in your vault.
