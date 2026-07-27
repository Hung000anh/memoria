// background/services/translate.js

async function fetchTranslation(text, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`Google API trả về mã lỗi ${res.status}`);
  }
  
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const rawText = await res.text();
    console.warn("Response dịch thuật không phải JSON:", rawText.substring(0, 500));
    throw new Error("Không thể phân tích dữ liệu dịch. Có thể bạn đang bị Google giới hạn tần suất yêu cầu (Rate Limit). Vui lòng thử lại sau.");
  }

  const json = await res.json();
  let translatedText = '';
  if (json && json[0]) {
    json[0].forEach(item => {
      if (item[0]) translatedText += item[0];
    });
  }
  
  // Trả về cả đoạn text đã dịch và ngôn ngữ gốc do Google nhận diện được
  const detectedSourceLang = json[2] || '';
  return { translatedText, detectedSourceLang };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate_text") {
    chrome.storage.local.get({ translateTargetLang: 'vi', translateSecondaryTargetLang: 'en' }, async (data) => {
      try {
        // 1. Dịch lần đầu với ngôn ngữ đích chính
        let result = await fetchTranslation(request.text, data.translateTargetLang);
        
        // 2. Nếu ngôn ngữ gốc phát hiện được giống hệt ngôn ngữ đích (vd: vi == vi)
        if (result.detectedSourceLang === data.translateTargetLang) {
          // Thực hiện dịch lần 2 sang ngôn ngữ đích phụ
          result = await fetchTranslation(request.text, data.translateSecondaryTargetLang);
        }
        
        sendResponse({ success: true, translatedText: result.translatedText });
      } catch (e) {
        console.error("Lỗi dịch thuật:", e);
        sendResponse({ success: false, error: e.message });
      }
    });
    return true; // Giữ kết nối để sendResponse bất đồng bộ
  }
});
