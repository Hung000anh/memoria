# Changelog

All notable changes to the **Memoria** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-08-14

### Changed
- **OCR Engine**: Replaced Tesseract.js with the offline PaddleOCR PP-OCRv6-tiny browser pipeline, bundling local ONNX Runtime WASM and detection/recognition models.
- **MV3 CSP**: Runs the OpenCV/PaddleOCR runtime inside a sandboxed offscreen iframe so the extension page keeps its strict CSP.
- **Full-page Translation**: Added separate HTML and image/OCR processing branches with independent feature flags and a shared undo action.
- **Translation Preprocessing**: Added optional LanguageTool spelling correction before Google Translate, with graceful fallback when the public API is unavailable.
- **Internationalization**: Localized the new context-menu labels and automatic webpage-analysis prompts for Vietnamese, English, and Chinese.

### Added
- **Webpage Summary and Analysis**: Added separate context-menu actions that open the Chat side panel, read the current URL, and request either a summary or a detailed analysis.
- **OCR Line Joining**: Joins OCR line-break hyphenation such as `TRIUMP` + `-HANT` into `TRIUMPHANT` before translation.

## [1.4.0] - 2026-08-12

### Added
- **Background Google Search Tool**: Added an internal `search_google` tool that lets the chatbot generate search keywords, collect up to five Google results in inactive tabs, and extract bounded page text without using Gemini Search grounding or its separate billing quota.
- **Direct Web Page Reading**: Added a `read_web_page` tool for analyzing user-provided URLs directly, avoiding an unnecessary Google search round trip.

### Changed
- **Web Content Retrieval**: Added background-tab orchestration with page-load timeouts, per-page error isolation, automatic temporary-tab cleanup, and a 12,000-character limit per page.
- **AI Web Analysis**: Added safeguards instructing the chatbot to treat retrieved web content as untrusted data rather than executable instructions.

### Fixed
- **Tool Response Continuation**: Fixed the chat flow so function responses use the expected Gemini conversation format and the assistant continues through follow-up tool calls before presenting the final analysis.
- **False Completion Messages**: Removed the misleading success fallback when Gemini has not yet returned an analysis after a tool execution.

## [1.3.0] - 2026-08-11

### Added
- **AI Chat Clear History**: Added a compact floating action button to clear chat history with user confirmation.
- **Multimodal AI Chat Attachments**: Added image input support for the Memoria AI chatbot, including clipboard paste, local file selection, image preview, attachment removal, and image-only prompts.
- **Persistent Image Context**: Preserved attached images in chat history and restored them when reopening the side panel.

### Changed
- **Gemini Request Handling**: Extended chat message serialization to forward image attachments using Gemini `inlineData` parts while preserving existing text and function-calling behavior.
- **Attachment Validation**: Added client-side image type validation and a 4 MB attachment limit to keep requests and local chat storage within safe bounds.

### Fixed
- **AI Chat Code & Text Wrapping**: Fixed text overflowing and code block wrapping issues in the side panel AI chat view.

## [1.2.0] - 2026-08-11

### Added
- **Interactive Markdown Checkboxes**: Added a localized checkbox insertion tool for notes and persistent task checkbox interaction in note previews and detail views.

### Fixed
- **AI Note Follow-ups**: Follow-up requests such as removing a title now edit the referenced note instead of creating a duplicate.

## [1.1.0] - 2026-08-07

### Added
- **Google Calendar Integration & Task Dashboard**: Implemented Google OAuth via Supabase and a dashboard UI to synchronize, track, and manage Google Calendar events and tasks.
- **Batch File Converter**: Added a batch file converter tool supporting `.txt`, `.docx`, `.pdf`, and `.epub` formats.
- **Proactive AI Messaging**: Implemented a proactive AI messaging service that can initiate conversations and suggest actions based on context.
- **Screen OCR Translation**: Press `Alt+S` to capture an area of the screen for instant text recognition and translation using Tesseract.js.
- **Translation History & Side-by-Side View**: Automatically saves translation history and introduces a side-by-side view for easy comparison between original text and translations.
- **Smart Target Language**: Automatically switches to a secondary language if the input text matches the primary translation language.
- **Customizable Navigator**: Added settings to toggle specific features on or off in the sidebar navigator.
- **Allow Copy Exclusions**: Added the ability to specify a list of domains to exclude from the copy protection bypass feature.
- **User Feedback Menu**: Added a new UI menu for submitting user feedback and bug reports.
- **Audio Notifications**: Added sound alerts for due timers and reminders.
- **Enhanced Keyboard Shortcuts**: Added quick access shortcuts: `Alt+Q` (Open Sidepanel), `Alt+A` (AI Chat), `Alt+W` (Translation), and `Alt+S` (OCR).

### Changed
- **Clipboard History**: Enhanced the clipboard history UI with filtering, search, and advanced management capabilities.
- **Shortcut System**: Overhauled the shortcut system for better reliability alongside a massive codebase cleanup.
- **Documentation**: Restructured the project README, added a detailed changelog, updated project branding, and added Vietnamese and Chinese README translations.

### Fixed
- **Authentication Fallback**: Improved login reliability and fallback handling (specifically for Coc Coc browser) when primary account token retrieval fails.
- **UI Improvements**: Fixed dark mode styling issues, capped maximum height for popups to prevent overflow with long text, and refined hover effects on icon buttons.
- **Internationalization (i18n)**: Fixed hardcoded strings in the Translation popup, Reminder notifications, and Notes modal titles to properly respect dynamic language settings.
- **Link Handling**: Fixed link opening issues in notes and markdown rendering by adding `target="_blank"` for external links.

## [1.0.0] - 2026-08-01
- Initial release of the Memoria Chrome Extension.
- Features included: Gemini AI Chatbot, Notes Manager, Clipboard History, Reminder Timer, Weather updates, and Copy Protection bypass.
