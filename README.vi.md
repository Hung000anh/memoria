# Memoria

> **Memoria** - Một trợ lý ảo cá nhân tích hợp tính năng Trò chuyện AI (Gemini), Dịch thuật, Dịch qua màn hình OCR, Quản lý Ghi chú, Lịch sử Clipboard, Nhắc nhở, và Cập nhật thời tiết. Tất cả được tích hợp mượt mà vào bảng điều khiển bên (side panel) của trình duyệt.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-10b981?style=flat-square)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

[English](README.md) | [Tiếng Việt](README.vi.md) | [中文](README.zh.md)

---

## Tính năng

- **Memoria AI Chat**: Tích hợp với Gemini API. Hỗ trợ tự động xoay vòng khóa (key) khi đạt giới hạn sử dụng (rate limit) và sử dụng lịch sử clipboard của bạn làm ngữ cảnh trò chuyện.
  
  ![AI Chat](images/ai_chat.png)

- **Dịch thuật & Lịch sử**: Dịch văn bản nhanh chóng ngay trong side panel hoặc trực tiếp trên bất kỳ trang web nào. Tự động lưu lịch sử dịch và cung cấp chế độ xem song song (Bản gốc - Bản dịch).
  
  *Dịch trong Side Panel:*
  
  ![Translation Panel](images/translate.png)
  
  *Dịch nhanh trên Trang web:*
  
  ![Web Translation](images/translateweb.gif)

- **Dịch thuật qua màn hình (OCR)**: Nhấn `Alt + S` để chụp một khu vực cụ thể trên màn hình, trích xuất văn bản từ hình ảnh (sử dụng Tesseract.js) và dịch ngay lập tức.
  
  ![OCR Translation](images/ocrweb.gif)

- **Lịch sử Clipboard**: Theo dõi và tìm kiếm các văn bản đã sao chép, bao gồm cả nguồn trang web, và xuất ngữ cảnh trực tiếp vào AI Chat.
  
  ![Clipboard History](images/clipboard.gif)

- **Quản lý Ghi chú**: Tạo và chỉnh sửa ghi chú (có hỗ trợ Markdown), được bảo mật bằng mật mã cá nhân.
   ![Notes](images/notes.gif)

- **Hẹn giờ & Nhắc nhở**: Đặt báo thức lặp lại, phát âm thanh thông báo và quản lý nhắc nhở công việc trực quan.
  
  *Cài đặt Hẹn giờ (Side Panel):*
  
  ![Reminder Setup](images/reminer.png)
  
  *Popup Thông báo Hẹn giờ:*
  
  ![Timer Alert](images/timer.gif)

- **Dự báo Thời tiết**: Tự động phát hiện vị trí qua IP hoặc tìm kiếm các thành phố cụ thể để xem dự báo thời tiết chi tiết theo giờ và theo tuần.
  
  ![Weather Forecast](images/weather.png)

- **Vượt rào Bảo vệ Sao chép**: Tự động gỡ bỏ các hạn chế chọn văn bản, sao chép và chặn nhấp chuột phải trên các trang web bị khóa.

---

## Phím tắt bàn phím

| Phím tắt | Lệnh / Chức năng | Mô tả |
| :--- | :--- | :--- |
| **`Alt + Q`** | Mở Memoria | Mở nhanh Memoria Side Panel |
| **`Alt + A`** | Mở AI Chat | Mở Side Panel và điều hướng trực tiếp đến thẻ Trò chuyện (Chat) |
| **`Alt + W`** | Mở Dịch thuật | Mở Side Panel, chuyển sang thẻ Dịch thuật và tự động tập trung vào ô nhập liệu |
| **`Alt + S`** | Kích hoạt OCR | Bật chế độ chụp màn hình để nhận dạng văn bản (OCR) và dịch |

---

## Cài đặt

1. Clone (sao chép) hoặc tải xuống mã nguồn:
   ```bash
   git clone https://github.com/Hung000anh/memoria.git
   ```
2. Mở trình duyệt của bạn (Chrome / Cốc Cốc / Edge / Brave).
3. Truy cập trang quản lý tiện ích mở rộng:
   - Chrome: `chrome://extensions/`
   - Cốc Cốc: `coccoc://extensions/`
   - Edge: `edge://extensions/`
4. Bật chế độ **Developer mode** (Chế độ dành cho nhà phát triển).
5. Nhấn **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục mã nguồn vừa tải về.
6. Xong! Nhấn vào biểu tượng Memoria trên thanh công cụ để bắt đầu sử dụng.

---

## Cấu hình Gemini API Key

1. Đăng ký nhận API Key miễn phí tại [Google AI Studio](https://aistudio.google.com/).
2. Nhấp chuột phải vào biểu tượng Memoria và chọn **Tùy chọn** (hoặc mở Cài đặt bên trong tiện ích).
3. Nhập Gemini API Key của bạn và nhấn **Thêm Key**. Bạn có thể thêm nhiều key để hệ thống tự động xoay vòng nếu một key bị quá giới hạn.

---

## Cấu trúc dự án

```
memoria/
├── manifest.json            # Cấu hình tiện ích Chrome (Manifest V3)
├── background.js            # Background Service Worker chính
├── background/
│   └── services/            # Các tác vụ chạy nền (Báo thức, Gọi API Dịch thuật)
├── content/
│   └── modules/             # Các script được tiêm vào trang (Clipboard, Translate, OCR, AllowCopy)
├── offscreen/               # Tài liệu offscreen để xử lý OCR (Tesseract.js)
├── ui/
│   ├── sidepanel.html       # Giao diện chính của Side Panel
│   ├── settings.html        # Trang Cài đặt / Tùy chọn
│   ├── css/                 # Các file giao diện (Stylesheets)
│   └── js/
│       ├── core/            # Cấu hình, i18n, tích hợp Gemini API, Tiện ích (Utilities)
│       └── features/        # Xử lý tính năng (Chat, Notes, Reminders, Translate, Weather)
└── CHANGELOG.md             # Lịch sử cập nhật phiên bản
```

---

## Giấy phép

Dự án này được cấp phép theo [MIT License](LICENSE).
