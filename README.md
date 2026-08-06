<div align="center">

# <img src="icons/icon48.png" height="36" align="center" alt="Memoria Icon" /> Memoria
**An all-in-one browser side panel that combines translation, OCR text recognition, quick notes, clipboard history, smart reminders, live weather, and a built-in AI chat assistant.**

![Manifest V3](https://img.shields.io/badge/Manifest-V3-10b981?style=flat-square)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---
[English](README.md) | [Tiếng Việt](README.vi.md) | [中文](README.zh.md)
---

</div>

## Features

- **Memoria AI Chat**: Integrated with Gemini API. Supports automatic key rotation when rate limits are reached and uses your clipboard history as context.
  
  ![AI Chat](images/ai_chat.png)

- **Translation & History**: Quickly translate text within the side panel or directly on any web page. Automatically saves translation history and provides a side-by-side view (Original - Translated).
  
  *Side Panel Translation:*
  
  ![Translation Panel](images/translate.png)
  
  *On-Page Web Translation:*
  
  ![Web Translation](images/translateweb.gif)

- **Screen OCR Translation**: Press `Alt + S` to capture a specific screen area, extract text from images (powered by Tesseract.js Offscreen), and translate it instantly.
  
  ![OCR Translation](images/ocrweb.gif)

- **Clipboard History**: Track and search through copied text, including website sources, and export context to the AI.
  
  ![Clipboard History](images/clipboard.gif)

- **Notes Manager**: Create and edit Markdown-supported notes, secured with a personal passcode.
   ![Notes](images/notes.gif)
- **Timers & Reminders**: Set recurring alarms, play audio notifications, and manage visual task reminders.
  
  *Reminder Setup (Side Panel):*
  
  ![Reminder Setup](images/reminer.png)
  
  *Timer Alert Popup:*
  
  ![Timer Alert](images/timer.gif)

- **Weather Forecast**: Automatically detect location via IP or search for specific cities to view detailed hourly and weekly weather forecasts.
  
  ![Weather Forecast](images/weather.png)

- **Copy Protection Bypass**: Automatically removes text-selection, copy, and right-click restrictions on restricted websites.

---

## Keyboard Shortcuts

| Shortcut | Command / Function | Description |
| :--- | :--- | :--- |
| **`Alt + Q`** | Open Memoria | Quickly open the Memoria Side Panel |
| **`Alt + A`** | Open AI Chat | Open the Side Panel and navigate directly to the Chat tab |
| **`Alt + W`** | Open Translation | Open the Side Panel, switch to the Translation tab, and focus the input field |
| **`Alt + S`** | Trigger OCR | Activate screen-capture mode for OCR and translation |

---

## Installation

1. Clone or download the source code:
   ```bash
   git clone https://github.com/Hung000anh/memoria.git
   ```
2. Open your browser (Chrome / CocCoc / Edge / Brave).
3. Navigate to the extensions management page:
   - Chrome: `chrome://extensions/`
   - CocCoc: `coccoc://extensions/`
   - Edge: `edge://extensions/`
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the downloaded source code folder.
6. Done! Click the Memoria icon on your toolbar to start using it.

---

## Gemini API Key Configuration

1. Register for a free API Key at [Google AI Studio](https://aistudio.google.com/).
2. Right-click the Memoria icon and select **Options** (or open Settings within the extension).
3. Enter your Gemini API Key and click **Add Key**. You can add multiple keys to let the system automatically rotate them if one encounters rate limits.

---

## Project Structure

```
memoria/
├── manifest.json            # Chrome Extension Manifest V3 configuration
├── background.js            # Main Background Service Worker
├── background/
│   └── services/            # Background tasks (Alarms, Translate API)
├── content/
│   └── modules/             # Injected scripts (Clipboard, Translate, OCR, AllowCopy)
├── offscreen/               # Offscreen document for OCR processing (Tesseract.js)
├── ui/
│   ├── sidepanel.html       # Main Side Panel UI
│   ├── settings.html        # Settings / Options page
│   ├── css/                 # UI Stylesheets
│   └── js/
│       ├── core/            # Configuration, i18n, Gemini API wrapper, Utilities
│       └── features/        # Feature controllers (Chat, Notes, Reminders, Translate, Weather)
└── CHANGELOG.md             # Version update history
```

---

## License

This project is licensed under the [MIT License](LICENSE).
