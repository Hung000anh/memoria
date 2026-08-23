// ui/js/core/i18n.js - Lightweight i18n system for Memoria

const langFlags = {
  vi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="20" height="14" style="border-radius:2px; display:block;"><rect width="900" height="600" fill="#da251d"/><polygon points="450,150 488,267 613,267 512,339 550,457 450,384 350,457 388,339 287,267 412,267" fill="#ffff00"/></svg>`,
  en: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="20" height="14" style="border-radius:2px; display:block;"><clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath><clipPath id="g"><path d="M30,15 h30 v15 z M30,15 h-30 v-15 z M30,15 h-30 v15 z M30,15 h30 v-15 z"/></clipPath><g clip-path="url(#s)"><path d="M0,0 v30 h60 v-30 z" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#g)" stroke="#C8102E" stroke-width="4"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></g></svg>`,
  zh: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="20" height="14" style="border-radius:2px; display:block;"><rect width="900" height="600" fill="#de2910"/><path d="M150,100 L165,152 L218,152 L172,185 L189,236 L150,203 L111,236 L128,185 L82,152 L135,152 Z" fill="#ffde00"/><path d="M300,50 L303,66 L319,66 L306,76 L311,91 L300,81 L289,91 L294,76 L281,66 L297,66 Z" fill="#ffde00"/><path d="M360,100 L363,116 L379,116 L366,126 L371,141 L360,131 L349,141 L354,126 L341,116 L357,116 Z" fill="#ffde00"/><path d="M360,160 L363,176 L379,176 L366,186 L371,201 L360,191 L349,201 L354,186 L341,176 L357,176 Z" fill="#ffde00"/><path d="M300,210 L303,226 L319,226 L306,236 L311,251 L300,241 L289,251 L294,236 L281,226 L297,226 Z" fill="#ffde00"/></svg>`
};

const langNames = {
  vi: 'Tiếng Việt',
  en: 'English',
  zh: '中文'
};

const translations = {
  vi: {
    // Nav
    nav_chat: "AI Chat",
    nav_translate: "Dịch thuật",
    nav_clipboard: "Clipboard",
    nav_notes: "Ghi chú",
    nav_reminders: "Hẹn giờ",
    nav_weather: "Thời tiết",
    nav_theme: "Giao diện",
    nav_settings: "Cài đặt",

    // Common
    btn_cancel: "Hủy",
    btn_delete: "Xóa",
    btn_confirm: "Xác nhận",
    stg_save_success: "Đã lưu thành công!",

    // Languages Options
    lang_vi: "Tiếng Việt",
    lang_en: "Tiếng Anh",
    lang_zh: "Tiếng Trung (Giản thể)",
    lang_ja: "Tiếng Nhật",
    lang_ko: "Tiếng Hàn",
    lang_fr: "Tiếng Pháp",
    lang_de: "Tiếng Đức",

    // Chat
    chat_title: "Memoria AI",
    chat_welcome: "Chào bạn! Mình là AI của Memoria, mình có thể trợ giúp và giải đáp câu hỏi cho bạn.",
    chat_page_summarize_prompt: "Hãy đọc trang web này bằng công cụ đọc trang và tóm tắt ngắn gọn các ý chính:",
    chat_page_analyze_prompt: "Hãy đọc trang web này bằng công cụ đọc trang và phân tích chi tiết nội dung, luận điểm, dữ kiện và kết luận:",
    chat_input_placeholder: "Nhập câu hỏi... (Nhấn Enter để gửi)",
    chat_send: "Gửi (Enter)",
    chat_thinking: "Đang suy nghĩ...",
    chat_executing: "Đang thực thi:",
    chat_processing_done: "Đã thực hiện xong yêu cầu của bạn!",
    chat_error: "Lỗi",
    chat_clear_btn: "Xóa lịch sử",
    chat_clear_btn_title: "Xóa tất cả lịch sử chat",
    chat_confirm_clear: "Bạn có chắc chắn muốn xóa toàn bộ lịch sử chat không?",

    // Translate
    tsl_title: "Dịch thuật",
    tsl_source_label: "Văn bản gốc",
    tsl_input_placeholder: "Nhập văn bản cần dịch... (Nhấn Ctrl + Enter để dịch)",
    tsl_btn: "Dịch",
    tsl_result_label: "Bản dịch",
    tsl_copy: "Sao chép",
    tsl_history_title: "Lịch sử dịch",
    tsl_history_detail: "Chi tiết bản dịch",
    tsl_history_empty: "Chưa có lịch sử dịch",
    tsl_history_confirm_clear: "Xóa toàn bộ lịch sử dịch thuật?",

    // Clipboard
    clip_title: "Lịch sử Clipboard",
    clip_search_placeholder: "Tìm nội dung...",
    clip_all_sources: "Tất cả nguồn",
    clip_clear_all: "Xóa tất cả",

    // Notes
    notes_title: "Ghi chú",
    notes_add_btn: "+ Thêm",
    notes_add_modal_title: "Thêm ghi chú",
    notes_edit_modal_title: "Sửa ghi chú",
    notes_field_title: "Tiêu đề",
    notes_title_placeholder: "Tiêu đề (Tùy chọn)...",
    notes_field_content: "Nội dung",
    notes_content_placeholder: "Nội dung ghi chú (Hỗ trợ Markdown)...",
    notes_insert_checkbox: "Thêm ô chọn",
    notes_save_btn: "Lưu ghi chú",
    notes_lock_title: "Tạo mật mã để Khóa",
    notes_unlock_title: "Nhập mật mã để Mở khóa",
    notes_view_title: "Nhập mật mã để Xem",
    notes_pass_placeholder: "Nhập mật mã...",
    notes_locked_msg: "Nội dung đã bị khóa, vui lòng mở khóa để xem...",
    notes_pass_empty_err: "Mật mã không được để trống!",
    notes_pass_decrypt_err: "Lỗi giải mã dữ liệu!",
    notes_pass_wrong_err: "Mật mã không đúng!",
    notes_content_empty_err: "Vui lòng nhập nội dung ghi chú!",

    // Reminders
    timer_title: "Hẹn giờ",
    timer_input_placeholder: "Nhập tên hẹn giờ (VD: Uống nước)...",
    timer_minutes_placeholder: "Phút",
    timer_repeat: "Lặp lại tự động",
    timer_set_btn: "Đặt hẹn giờ",
    timer_list_title: "Danh sách hẹn giờ",
    reminder_overlay_title: "✨ Memoria nhắc nhở",
    reminder_overlay_btn: "Đã hiểu",

    // Weather
    weather_title: "Thời tiết",
    weather_search_placeholder: "Tìm thành phố (VD: Hanoi)...",
    weather_search_btn: "Tìm",
    weather_loading: "Đang lấy thông tin thời tiết...",
    weather_humidity: "Độ ẩm",
    weather_wind: "Sức gió",
    weather_tomorrow: "Ngày mai",
    weather_unknown: "Không xác định",
    weather_days: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    weather_codes: {
      0: 'Trời quang đãng', 1: 'Trời quang', 2: 'Ít mây', 3: 'Nhiều mây',
      45: 'Có sương mù', 48: 'Sương mù dày đặc',
      51: 'Mưa phùn nhẹ', 53: 'Mưa phùn vừa', 55: 'Mưa phùn đặc',
      61: 'Mưa nhỏ', 63: 'Mưa vừa', 65: 'Mưa to',
      71: 'Tuyết rơi nhẹ', 73: 'Tuyết rơi vừa', 75: 'Tuyết rơi dày',
      95: 'Có sấm sét', 96: 'Sấm sét và mưa đá', 99: 'Bão lớn'
    },

    // Settings
    stg_title: "Cài đặt Memoria",
    stg_subtitle: "Quản lý Gemini API Keys và Cấu hình tiện ích.",
    stg_shortcuts_title: "⚡ Phím tắt nhanh",
    stg_shortcuts_help: "Mở nhanh bảng điều khiển Memoria từ bất kỳ đâu bằng phím tắt.",
    stg_shortcuts_group_default: "Phím tắt mặc định (Hoạt động ngay)",
    stg_shortcuts_open_sidepanel: "Mở Memoria Sidepanel",
    stg_shortcuts_sidepanel_desc: "Phím tắt mặc định hệ thống",
    stg_shortcuts_open_chat: "Mở Tab AI Chat",
    stg_shortcuts_chat_desc: "Mở bảng điều khiển và tự động chuyển sang Chat",
    stg_shortcuts_open_translate: "Mở Tab Dịch thuật",
    stg_shortcuts_translate_desc: "Mở bảng điều khiển, nhảy tới Dịch và nhảy vào ô nhập",
    stg_shortcuts_ocr: "Quét ảnh Dịch thuật (OCR)",
    stg_shortcuts_ocr_desc: "Nhấn Alt + S rồi kéo chuột chọn vùng hình ảnh trên màn hình",
    stg_shortcuts_group_suggest: "Phím tắt mở rộng (Cần thiết lập thủ công)",
    stg_shortcuts_open_notes: "Mở Tab Ghi chú",
    stg_shortcuts_open_timer: "Mở Tab Hẹn giờ",
    stg_shortcuts_open_weather: "Mở Tab Thời tiết",
    stg_shortcuts_open_settings: "Mở Cài đặt",
    stg_shortcuts_suggest_e: "Gợi ý: Alt + E",
    stg_shortcuts_suggest_r: "Gợi ý: Alt + R",
    stg_shortcuts_suggest_d: "Gợi ý: Alt + D",
    stg_shortcuts_suggest_v: "Gợi ý: Alt + V",
    stg_shortcuts_tip_prefix: "💡 Mẹo:",
    stg_shortcuts_manual_tip: "Trình duyệt chỉ cho phép tiện ích tự gán 4 phím tắt mặc định ở trên. Bạn có thể tự gán các phím gợi ý bằng cách nhấn vào nút bên dưới, tìm đúng tên lệnh và gán phím!",
    stg_shortcuts_change_btn: "Thay đổi phím tắt trong Chrome",

    stg_keys_add_title: "Thêm API Key mới",
    stg_keys_placeholder: "Nhập Gemini API Key (AIzaSy...)",
    stg_keys_add_btn: "Thêm Key",
    stg_keys_fetch_btn: "Lấy Key tự động",
    stg_keys_help: "Nhập nhiều key để hệ thống tự động xoay vòng nếu có key bị lỗi hoặc hết hạn ngạch.",
    stg_keys_list_title: "Danh sách Key đã lưu",
    stg_keys_no_key: "Chưa có key nào. Vui lòng thêm ít nhất 1 key.",
    stg_keys_status_active: "Hoạt động (ACTIVE)",
    stg_keys_status_dead: "Bị khóa/Lỗi (DEAD)",
    stg_keys_exists: "Key này đã tồn tại trong danh sách!",
    stg_keys_confirm_delete: "Bạn có chắc muốn xóa Key này không?",

    stg_tsl_title: "Cài đặt Dịch thuật",
    stg_tsl_help: "Chọn ngôn ngữ đích mà bạn muốn dịch sang khi bôi đen văn bản hoặc quét ảnh OCR.",
    stg_tsl_target_label: "Ngôn ngữ đích:",
    stg_tsl_sec_target_label: "Ngôn ngữ đích phụ (nếu gốc trùng đích):",
    stg_tsl_save_btn: "Lưu Cài đặt Dịch",

    stg_privacy_title: "Cài đặt Quyền riêng tư & Clipboard",
    stg_privacy_help: "Cấu hình các tính năng liên quan đến thu thập và gửi dữ liệu.",
    stg_privacy_clip_label: "Tự động theo dõi & lưu lịch sử Clipboard",
    stg_privacy_ai_clip_label: "Gửi lịch sử Clipboard gần nhất làm ngữ cảnh cho AI Chat",
    stg_privacy_save_btn: "Lưu Cài đặt Quyền riêng tư",

    stg_copy_title: "Cài đặt Bẻ khóa Sao chép (Allow Copy)",
    stg_copy_help: "Cấu hình tự động bẻ khóa hành vi chặn bôi đen, copy và chuột phải của website.",
    stg_copy_enable_label: "Bật Bẻ khóa bôi đen & sao chép",
    stg_copy_exclude_label: "Danh sách trang web loại trừ (không bẻ khóa bôi đen, mỗi dòng một domain):",
    stg_copy_exclude_placeholder: "Ví dụ:\ndocs.google.com\nfigma.com",
    stg_copy_save_btn: "Lưu Cài đặt Sao chép",

    stg_nav_title: "Cài đặt Menu Điều hướng (Sidebar)",
    stg_nav_help: "Bật/tắt các Tab trên thanh điều hướng để cá nhân hóa giao diện.",
    stg_nav_save_btn: "Lưu Cài đặt Menu",

    // OCR 
    ocr_recognizing: 'Đang nhận dạng chữ...',
    ocr_translating: 'Đang dịch...',
    ocr_from: 'OCR từ',
    ocr_source: 'Nguồn',
    ocr_original: 'Bản gốc (OCR)',
    ocr_translation: 'Bản dịch',
    ocr_title: 'OCR Dịch thuật',
    ocr_save: 'Lưu Ghi chú',
    ocr_saving: 'Đang lưu...',
    ocr_saved: '✓ Đã lưu!',
    ocr_error: '⚠ Lỗi OCR',
    ocr_error_failed: 'OCR thất bại. Xem Console để biết thêm.',
    ocr_error_no_text: 'Không tìm thấy văn bản trong vùng chọn. Thử chọn vùng khác.',
    ocr_error_translate: 'Lỗi dịch thuật. Kiểm tra kết nối mạng.',
    ocr_error_unknown: 'Lỗi không xác định.',
    ocr_hint: '✦ Kéo chuột để chọn vùng cần dịch &nbsp;·&nbsp; ESC để hủy'
  },
  en: {
    // Nav
    nav_chat: "AI Chat",
    nav_translate: "Translate",
    nav_clipboard: "Clipboard",
    nav_notes: "Notes",
    nav_reminders: "Timer",
    nav_weather: "Weather",
    nav_theme: "Theme",
    nav_settings: "Settings",

    // Common
    btn_cancel: "Cancel",
    btn_delete: "Delete",
    btn_confirm: "Confirm",
    stg_save_success: "Saved successfully!",

    // Languages Options
    lang_vi: "Vietnamese",
    lang_en: "English",
    lang_zh: "Chinese (Simplified)",
    lang_ja: "Japanese",
    lang_ko: "Korean",
    lang_fr: "French",
    lang_de: "German",

    // Chat
    chat_title: "Memoria AI",
    chat_welcome: "Hello! I am Memoria AI, here to assist and answer your questions.",
    chat_page_summarize_prompt: "Read this webpage with the page-reading tool and briefly summarize its key points:",
    chat_page_analyze_prompt: "Read this webpage with the page-reading tool and provide a detailed analysis of its content, arguments, facts, and conclusions:",
    chat_input_placeholder: "Ask a question... (Press Enter to send)",
    chat_send: "Send (Enter)",
    chat_thinking: "Thinking...",
    chat_executing: "Executing:",
    chat_processing_done: "Your request has been completed!",
    chat_error: "Error",
    chat_clear_btn: "Clear History",
    chat_clear_btn_title: "Clear all chat history",
    chat_confirm_clear: "Are you sure you want to clear all chat history?",

    // Translate
    tsl_title: "Translation",
    tsl_source_label: "Source Text",
    tsl_input_placeholder: "Type text to translate... (Press Ctrl + Enter to translate)",
    tsl_btn: "Translate",
    tsl_result_label: "Translation",
    tsl_copy: "Copy",
    tsl_history_title: "Translation History",
    tsl_history_detail: "Translation Detail",
    tsl_history_empty: "No translation history",
    tsl_history_confirm_clear: "Clear all translation history?",

    // Clipboard
    clip_title: "Clipboard History",
    clip_search_placeholder: "Search content...",
    clip_all_sources: "All Sources",
    clip_clear_all: "Clear All",

    // Notes
    notes_title: "Notes",
    notes_add_btn: "+ Add",
    notes_add_modal_title: "Add Note",
    notes_edit_modal_title: "Edit Note",
    notes_field_title: "Title",
    notes_title_placeholder: "Title (Optional)...",
    notes_field_content: "Content",
    notes_content_placeholder: "Note content (Markdown supported)...",
    notes_insert_checkbox: "Insert checkbox",
    notes_save_btn: "Save Note",
    notes_lock_title: "Create passcode to Lock",
    notes_unlock_title: "Enter passcode to Unlock",
    notes_view_title: "Enter passcode to View",
    notes_pass_placeholder: "Enter passcode...",
    notes_locked_msg: "Content is locked, please unlock to view...",
    notes_pass_empty_err: "Passcode cannot be empty!",
    notes_pass_decrypt_err: "Data decryption error!",
    notes_pass_wrong_err: "Incorrect passcode!",
    notes_content_empty_err: "Please enter note content!",

    // Reminders
    timer_title: "Timer",
    timer_input_placeholder: "Enter timer name (e.g. Drink water)...",
    timer_minutes_placeholder: "Min",
    timer_repeat: "Repeat automatically",
    timer_set_btn: "Set Timer",
    timer_list_title: "Timer List",
    reminder_overlay_title: "✨ Memoria Reminder",
    reminder_overlay_btn: "Got it",

    // Weather
    weather_title: "Weather",
    weather_search_placeholder: "Search city (e.g. Hanoi)...",
    weather_search_btn: "Search",
    weather_loading: "Fetching weather info...",
    weather_humidity: "Humidity",
    weather_wind: "Wind Speed",
    weather_tomorrow: "Tomorrow",
    weather_unknown: "Unknown",
    weather_days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weather_codes: {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Depositing rime fog',
      51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
      61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
      71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
      95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Heavy thunderstorm'
    },

    // Settings
    stg_title: "Memoria Settings",
    stg_subtitle: "Manage Gemini API Keys and Extension Configuration.",
    stg_shortcuts_title: "⚡ Quick Shortcuts",
    stg_shortcuts_help: "Quickly open Memoria panel from anywhere with shortcuts.",
    stg_shortcuts_group_default: "Default Shortcuts (Active)",
    stg_shortcuts_open_sidepanel: "Open Memoria Sidepanel",
    stg_shortcuts_sidepanel_desc: "Default system shortcut",
    stg_shortcuts_open_chat: "Open AI Chat Tab",
    stg_shortcuts_chat_desc: "Opens side panel and automatically switches to Chat",
    stg_shortcuts_open_translate: "Open Translate Tab",
    stg_shortcuts_translate_desc: "Opens side panel, jumps to Translate and focuses the text area",
    stg_shortcuts_ocr: "OCR Scan & Translate",
    stg_shortcuts_ocr_desc: "Press Alt + S and drag to select screen area",
    stg_shortcuts_group_suggest: "Extended Shortcuts (Manual setup required)",
    stg_shortcuts_open_notes: "Open Notes Tab",
    stg_shortcuts_open_timer: "Open Timer Tab",
    stg_shortcuts_open_weather: "Open Weather Tab",
    stg_shortcuts_open_settings: "Open Settings",
    stg_shortcuts_suggest_e: "Suggested: Alt + E",
    stg_shortcuts_suggest_r: "Suggested: Alt + R",
    stg_shortcuts_suggest_d: "Suggested: Alt + D",
    stg_shortcuts_suggest_v: "Suggested: Alt + V",
    stg_shortcuts_tip_prefix: "💡 Tip:",
    stg_shortcuts_manual_tip: "The browser only allows extensions to define 4 default shortcuts. You can assign the suggested shortcuts manually by clicking the button below, finding the command, and setting your key!",
    stg_shortcuts_change_btn: "Change Shortcuts in Chrome",

    stg_keys_add_title: "Add New API Key",
    stg_keys_placeholder: "Enter Gemini API Key (AIzaSy...)",
    stg_keys_add_btn: "Add Key",
    stg_keys_fetch_btn: "Auto get Key",
    stg_keys_help: "Add multiple keys so system auto-rotates if a key errors or runs out of quota.",
    stg_keys_list_title: "Saved Keys List",
    stg_keys_no_key: "No keys saved. Please add at least 1 key.",
    stg_keys_status_active: "Active (ACTIVE)",
    stg_keys_status_dead: "Blocked/Error (DEAD)",
    stg_keys_exists: "This key already exists in the list!",
    stg_keys_confirm_delete: "Are you sure you want to delete this Key?",

    stg_tsl_title: "Translation Settings",
    stg_tsl_help: "Select the target language to translate into when selecting text or performing OCR scan.",
    stg_tsl_target_label: "Target Language:",
    stg_tsl_sec_target_label: "Secondary Target Language (if source matches target):",
    stg_tsl_save_btn: "Save Translation Settings",

    stg_privacy_title: "Privacy & Clipboard Settings",
    stg_privacy_help: "Configure data collection and context sharing options.",
    stg_privacy_clip_label: "Auto-track & save Clipboard history",
    stg_privacy_ai_clip_label: "Include recent Clipboard as context for AI Chat",
    stg_privacy_save_btn: "Save Privacy Settings",

    stg_copy_title: "Allow Copy Settings",
    stg_copy_help: "Configure automatic unlocking of site selection, copy, and right-click restrictions.",
    stg_copy_enable_label: "Enable Unlocking Text Selection & Copy",
    stg_copy_exclude_label: "Excluded websites list (do not unlock copy, one domain per line):",
    stg_copy_exclude_placeholder: "Example:\ndocs.google.com\nfigma.com",
    stg_copy_save_btn: "Save Copy Settings",

    stg_nav_title: "Navigation Menu Settings (Sidebar)",
    stg_nav_help: "Toggle Tabs on the sidebar to personalize your interface.",
    stg_nav_save_btn: "Save Menu Settings",

    // OCR
    ocr_recognizing: 'Recognizing text...',
    ocr_translating: 'Translating...',
    ocr_from: 'OCR from',
    ocr_source: 'Source',
    ocr_original: 'Original (OCR)',
    ocr_translation: 'Translation',
    ocr_title: 'OCR Translation',
    ocr_save: 'Save Note',
    ocr_saving: 'Saving...',
    ocr_saved: '✓ Saved!',
    ocr_error: '⚠ OCR Error',
    ocr_error_failed: 'OCR failed. Check Console for details.',
    ocr_error_no_text: 'No text found in selection. Try another area.',
    ocr_error_translate: 'Translation error. Check network connection.',
    ocr_error_unknown: 'Unknown error.',
    ocr_hint: '✦ Drag mouse to select area for OCR &nbsp;·&nbsp; ESC to cancel'
  },
  zh: {
    // Nav
    nav_chat: "AI 聊天",
    nav_translate: "翻译",
    nav_clipboard: "剪贴板",
    nav_notes: "笔记",
    nav_reminders: "定时器",
    nav_weather: "天气",
    nav_theme: "主题",
    nav_settings: "设置",

    // Common
    btn_cancel: "取消",
    btn_delete: "删除",
    btn_confirm: "确认",
    stg_save_success: "保存成功！",

    // Languages Options
    lang_vi: "越南语",
    lang_en: "英语",
    lang_zh: "中文 (简体)",
    lang_ja: "日语",
    lang_ko: "韩语",
    lang_fr: "法语",
    lang_de: "德语",

    // Chat
    chat_title: "Memoria AI",
    chat_welcome: "你好！我是 Memoria AI，很高兴为你提供帮助。",
    chat_page_summarize_prompt: "请使用网页读取工具阅读此网页，并简要总结其要点：",
    chat_page_analyze_prompt: "请使用网页读取工具阅读此网页，并详细分析其内容、论点、事实和结论：",
    chat_input_placeholder: "输入问题... (按 Enter 发送)",
    chat_send: "发送 (Enter)",
    chat_thinking: "思考中...",
    chat_executing: "执行中:",
    chat_processing_done: "已完成您的请求！",
    chat_error: "错误",
    chat_clear_btn: "清空历史",
    chat_clear_btn_title: "清空所有聊天记录",
    chat_confirm_clear: "确定要清空所有聊天记录吗？",

    // Translate
    tsl_title: "翻译",
    tsl_source_label: "原文",
    tsl_input_placeholder: "输入要翻译的文本... (按 Ctrl + Enter 翻译)",
    tsl_btn: "翻译",
    tsl_result_label: "译文",
    tsl_copy: "复制",
    tsl_history_title: "翻译历史",
    tsl_history_detail: "翻译详情",
    tsl_history_empty: "暂无翻译历史",
    tsl_history_confirm_clear: "确认清空全部翻译历史吗？",

    // Clipboard
    clip_title: "剪贴板历史",
    clip_search_placeholder: "搜索内容...",
    clip_all_sources: "所有来源",
    clip_clear_all: "清空全部",

    // Notes
    notes_title: "笔记",
    notes_add_btn: "+ 添加",
    notes_add_modal_title: "添加笔记",
    notes_edit_modal_title: "编辑笔记",
    notes_field_title: "标题",
    notes_title_placeholder: "标题 (可选)...",
    notes_field_content: "内容",
    notes_content_placeholder: "笔记内容 (支持 Markdown)...",
    notes_insert_checkbox: "插入复选框",
    notes_save_btn: "保存笔记",
    notes_lock_title: "创建密码以锁定",
    notes_unlock_title: "输入密码以解锁",
    notes_view_title: "输入密码以查看",
    notes_pass_placeholder: "输入密码...",
    notes_locked_msg: "内容已锁定，请解锁以查看...",
    notes_pass_empty_err: "密码不能为空！",
    notes_pass_decrypt_err: "数据解密错误！",
    notes_pass_wrong_err: "密码错误！",
    notes_content_empty_err: "请输入笔记内容！",

    // Reminders
    timer_title: "定时器",
    timer_input_placeholder: "输入定时器名称 (例如: 喝水)...",
    timer_minutes_placeholder: "分钟",
    timer_repeat: "自动重复",
    timer_set_btn: "设置定时器",
    timer_list_title: "定时器列表",
    reminder_overlay_title: "✨ Memoria 提醒",
    reminder_overlay_btn: "知道了",

    // Weather
    weather_title: "天气",
    weather_search_placeholder: "搜索城市 (例如: Hanoi)...",
    weather_search_btn: "搜索",
    weather_loading: "正在获取天气信息...",
    weather_humidity: "湿度",
    weather_wind: "风速",
    weather_tomorrow: "明天",
    weather_unknown: "未知",
    weather_days: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    weather_codes: {
      0: '晴朗', 1: '大部晴朗', 2: '多云', 3: '阴天',
      45: '雾', 48: '浓雾',
      51: '毛毛雨', 53: '中等毛毛雨', 55: '密集毛毛雨',
      61: '小雨', 63: '中雨', 65: '大雨',
      71: '小雪', 73: '中雪', 75: '大雪',
      95: '雷暴', 96: '雷暴伴冰雹', 99: '强雷暴'
    },

    // Settings
    stg_title: "Memoria 设置",
    stg_subtitle: "管理 Gemini API Key 和扩展配置。",
    stg_shortcuts_title: "⚡ 快捷键",
    stg_shortcuts_help: "使用快捷键随时随地快速打开 Memoria 面板。",
    stg_shortcuts_group_default: "默认快捷键 (立即生效)",
    stg_shortcuts_open_sidepanel: "打开 Memoria 侧边栏",
    stg_shortcuts_sidepanel_desc: "系统默认快捷键",
    stg_shortcuts_open_chat: "打开 AI 聊天",
    stg_shortcuts_chat_desc: "打开侧边栏并自动切换到聊天",
    stg_shortcuts_open_translate: "打开翻译 Tab",
    stg_shortcuts_translate_desc: "打开侧边栏，跳转到翻译并聚焦输入框",
    stg_shortcuts_ocr: "OCR 截图翻译",
    stg_shortcuts_ocr_desc: "按 Alt + S 框选屏幕区域",
    stg_shortcuts_group_suggest: "扩展快捷键 (需要手动设置)",
    stg_shortcuts_open_notes: "打开笔记 Tab",
    stg_shortcuts_open_timer: "打开定时器 Tab",
    stg_shortcuts_open_weather: "打开天气 Tab",
    stg_shortcuts_open_settings: "打开设置",
    stg_shortcuts_suggest_e: "建议: Alt + E",
    stg_shortcuts_suggest_r: "建议: Alt + R",
    stg_shortcuts_suggest_d: "建议: Alt + D",
    stg_shortcuts_suggest_v: "建议: Alt + V",
    stg_shortcuts_tip_prefix: "💡 提示:",
    stg_shortcuts_manual_tip: "浏览器仅允许扩展程序定义 4 个默认快捷键。您可以点击下方的按钮，找到相应的命令并手动设置建议的快捷键！",
    stg_shortcuts_change_btn: "在 Chrome 中更改快捷键",

    stg_keys_add_title: "添加新 API Key",
    stg_keys_placeholder: "输入 Gemini API Key (AIzaSy...)",
    stg_keys_add_btn: "添加 Key",
    stg_keys_fetch_btn: "自動取得 Key",
    stg_keys_help: "添加多个 Key，当某个 Key 出错或配额用尽时系统会自动轮换。",
    stg_keys_list_title: "已保存的 Key 列表",
    stg_keys_no_key: "暂无保存的 Key。请至少添加 1 个 Key。",
    stg_keys_status_active: "正常 (ACTIVE)",
    stg_keys_status_dead: "锁定/错误 (DEAD)",
    stg_keys_exists: "该 Key 已存在于列表中！",
    stg_keys_confirm_delete: "确定要删除此 Key 吗？",

    stg_tsl_title: "翻译设置",
    stg_tsl_help: "选择划词翻译或 OCR 截图翻译时的目标语言。",
    stg_tsl_target_label: "目标语言：",
    stg_tsl_sec_target_label: "备用目标语言 (原语言与目标语言相同时)：",
    stg_tsl_save_btn: "保存翻译设置",

    stg_copy_title: "解除复制限制设置 (Allow Copy)",
    stg_copy_help: "配置自动解除网站禁止选中、复制和右键限制。",
    stg_copy_enable_label: "启用解除文本选中与复制",
    stg_copy_exclude_label: "排除的网站列表 (不解除限制，每行一个域名)：",
    stg_copy_exclude_placeholder: "例如：\ndocs.google.com\nfigma.com",
    stg_copy_save_btn: "保存复制设置",

    stg_nav_title: "导航菜单设置 (Sidebar)",
    stg_nav_help: "调整扩展侧边栏 Tab 的显示顺序 (上/下) 或显示/隐藏。",
    stg_nav_save_btn: "保存菜单设置",

    // OCR
    ocr_recognizing: '正在识别文字...',
    ocr_translating: '正在翻译...',
    ocr_from: 'OCR 来源',
    ocr_source: '来源',
    ocr_original: '原文 (OCR)',
    ocr_translation: '译文',
    ocr_title: 'OCR 翻译',
    ocr_save: '保存笔记',
    ocr_saving: '保存中...',
    ocr_saved: '✓ 已保存!',
    ocr_error: '⚠ OCR 错误',
    ocr_error_failed: 'OCR 失败。请查看控制台以获取详细信息。',
    ocr_error_no_text: '在选择区域中未找到文本。请尝试其他区域。',
    ocr_error_translate: '翻译错误。检查网络连接。',
    ocr_error_unknown: '未知错误。',
    ocr_hint: '✦ 拖动鼠标选择要翻译的区域 &nbsp;·&nbsp; ESC 取消'
  }
};

class I18nService {
  constructor() {
    this.currentLang = 'vi';
  }

  init() {
    // Đẩy toàn bộ từ điển vào storage để các Content Script có thể đọc được ngay
    chrome.storage.local.set({ appTranslations: translations });

    chrome.storage.local.get({ appLanguage: 'vi' }, (data) => {
      this.currentLang = data.appLanguage || 'vi';
      this.updateSwitcherUI(this.currentLang);
      this.applyLanguage(this.currentLang);

      this.bindSwitcherEvents();
    });

    // Listen for realtime language changes from storage
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.appLanguage) {
        this.currentLang = changes.appLanguage.newValue || 'vi';
        this.updateSwitcherUI(this.currentLang);
        this.applyLanguage(this.currentLang);
      }
    });
  }

  updateSwitcherUI(lang) {
    const flagEl = document.getElementById('currentLangFlag');
    const textEl = document.getElementById('currentLangText');
    if (flagEl) flagEl.innerHTML = langFlags[lang] || langFlags.vi;
    if (textEl) textEl.textContent = langNames[lang] || 'Tiếng Việt';

    document.querySelectorAll('.lang-option').forEach(btn => {
      const optLang = btn.getAttribute('data-lang');
      const optFlagContainer = btn.querySelector('.lang-flag');
      if (optFlagContainer && langFlags[optLang]) {
        optFlagContainer.innerHTML = langFlags[optLang];
      }
      if (optLang === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  bindSwitcherEvents() {
    const switcherBtn = document.getElementById('langSwitcherBtn');
    const dropdown = document.getElementById('langDropdown');

    if (switcherBtn && dropdown) {
      switcherBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });

      document.addEventListener('click', (e) => {
        if (!switcherBtn.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.remove('show');
        }
      });

      document.querySelectorAll('.lang-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const selectedLang = btn.getAttribute('data-lang');
          dropdown.classList.remove('show');
          this.setLanguage(selectedLang);
        });
      });
    }
  }

  setLanguage(lang) {
    if (!translations[lang]) return;
    this.currentLang = lang;

    chrome.storage.local.set({
      appLanguage: lang
    }, () => {
      this.updateSwitcherUI(lang);
      this.applyLanguage(lang);
    });
  }

  applyLanguage(lang) {
    const dict = translations[lang] || translations.vi;

    // Translate text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // Translate title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (dict[key]) {
        el.setAttribute('title', dict[key]);
      }
    });

    // Translate placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.setAttribute('placeholder', dict[key]);
      }
    });
  }

  t(key) {
    const dict = translations[this.currentLang] || translations.vi;
    return dict[key] || key;
  }
}

window.i18n = new I18nService();

document.addEventListener('DOMContentLoaded', () => {
  window.i18n.init();
});
