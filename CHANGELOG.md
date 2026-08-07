# Changelog

All notable changes to the **Memoria** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-08-07

### Added
- **Translation History & Side-by-Side View**: Automatically saves translation history and introduces a side-by-side view for easy comparison between original text and translations.
- **Screen OCR Translation**: Press `Alt+S` to capture an area of the screen for instant text recognition and translation.
- **Enhanced Keyboard Shortcuts**: Added quick access shortcuts: `Alt+Q` (Open Sidepanel), `Alt+A` (AI Chat), `Alt+W` (Translation), and `Alt+S` (OCR).
- **Authentication Fallback**: Improved login reliability across different browsers when primary account token retrieval fails.
- **Smart Target Language**: Automatically switches to a secondary language if the input text matches the primary translation language.
- **Audio Notifications**: Added sound alerts for due timers and reminders.

### Fixed
- **UI Improvements**: Removed default browser styling from icon buttons and refined hover effects for a more consistent experience.
- **Internationalization (i18n)**: Fixed hardcoded Vietnamese strings in the Translation popup, Reminder notifications, and Notes modal titles/validation errors to properly respect language settings.

### Changed
- **Documentation**: Updated the main documentation and added a detailed changelog.

## [1.0.0] - 2026-08-01
- Initial release of the Memoria Chrome Extension.
- Features included: Gemini AI Chatbot, Notes Manager, Clipboard History, Reminder Timer, Weather updates, and Copy Protection bypass.
