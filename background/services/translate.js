// background/services/translate.js

const ENABLE_SPELLING_CORRECTION = true;
const LANGUAGETOOL_ENDPOINT = 'https://api.languagetool.org/v2/check';

async function correctSpelling(text) {
  if (!ENABLE_SPELLING_CORRECTION || !text || text.trim().length < 3) return text;

  try {
    const res = await fetch(LANGUAGETOOL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text, language: 'auto' })
    });
    if (!res.ok) return text;

    const result = await res.json();
    const corrections = (Array.isArray(result.matches) ? result.matches : [])
      .filter(match => match?.issueType === 'misspelling' && match.replacements?.[0]?.value)
      .sort((left, right) => right.offset - left.offset);

    let corrected = text;
    corrections.forEach(match => {
      corrected = corrected.slice(0, match.offset) +
        match.replacements[0].value +
        corrected.slice(match.offset + match.length);
    });
    return corrected;
  } catch (error) {
    console.warn('[LanguageTool] Không thể sửa chính tả, dùng nguyên văn:', error.message || error);
    return text;
  }
}

async function fetchTranslation(text, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Google API trả về mã lỗi ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await res.text();
    console.warn('Response dịch thuật không phải JSON:', rawText.substring(0, 500));
    throw new Error('Không thể phân tích dữ liệu dịch. Có thể bạn đang bị Google giới hạn tần suất yêu cầu. Vui lòng thử lại sau.');
  }

  const json = await res.json();
  let translatedText = '';
  if (json && json[0]) {
    json[0].forEach(item => {
      if (item[0]) translatedText += item[0];
    });
  }

  return {
    translatedText,
    detectedSourceLang: json[2] || ''
  };
}

function getTranslationSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get({
      translateTargetLang: 'vi',
      translateSecondaryTargetLang: 'en'
    }, resolve);
  });
}

async function translateWithSettings(text, settings) {
  const correctedText = await correctSpelling(text);
  let result = await fetchTranslation(correctedText, settings.translateTargetLang);
  if (result.detectedSourceLang === settings.translateTargetLang) {
    result = await fetchTranslation(correctedText, settings.translateSecondaryTargetLang);
  }
  return result;
}

async function translateTextBatch(texts) {
  const settings = await getTranslationSettings();
  const translations = new Array(texts.length);
  let cursor = 0;

  // Keep a bounded burst: six workers are faster for long pages while still
  // avoiding an unbounded request burst.
  const worker = async () => {
    while (cursor < texts.length) {
      const index = cursor++;
      try {
        const result = await translateWithSettings(texts[index], settings);
        translations[index] = { success: true, translatedText: result.translatedText };
      } catch (error) {
        translations[index] = { success: false, error: error.message || String(error) };
      }
    }
  };

  await Promise.all(Array.from({ length: 6 }, () => worker()));
  return { translations, targetLang: settings.translateTargetLang };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate_text') {
    getTranslationSettings().then(async (settings) => {
      try {
        const result = await translateWithSettings(request.text, settings);
        sendResponse({ success: true, translatedText: result.translatedText });
      } catch (error) {
        console.error('Lỗi dịch thuật:', error);
        sendResponse({ success: false, error: error.message || String(error) });
      }
    });
    return true;
  }

  if (request.action === 'translate_text_batch') {
    const texts = Array.isArray(request.texts)
      ? request.texts.filter(text => typeof text === 'string' && text.trim()).slice(0, 500)
      : [];
    translateTextBatch(texts)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message || String(error) }));
    return true;
  }
});
