// background/services/proactive-chat.js

const PROACTIVE_CHAT_ALARM = 'memoria_proactive_chat';
const DEFAULT_CHATBOT_SETTINGS = {
  botName: 'Memoria AI',
  selfPronoun: 'mình',
  userAddress: 'bạn',
  customPrompt: '',
  proactiveMessagesEnabled: false,
  proactiveIntervalMinutes: 30,
  proactiveSound: 'default'
};
const SUPPORTED_INTERVALS = [15, 30, 60, 120, 240];
const PROACTIVE_HISTORY_LIMIT = 8;
const PROACTIVE_DUPLICATE_THRESHOLD = 0.55;
const PROACTIVE_STOP_WORDS = new Set(['ban', 'minh', 'la', 'va', 'voi', 'cho', 'cua', 'mot', 'nhung', 'nay', 'do', 'thi', 'neu', 'hay', 'duoc', 'the', 'roi', 'nhe', 'a', 'oi']);
let proactiveChatInFlight = false;

function normalizeProactiveChatSettings(value) {
  const settings = value && typeof value === 'object' ? value : {};
  const interval = Number(settings.proactiveIntervalMinutes);
  return {
    ...DEFAULT_CHATBOT_SETTINGS,
    ...settings,
    proactiveMessagesEnabled: settings.proactiveMessagesEnabled === true,
    proactiveIntervalMinutes: SUPPORTED_INTERVALS.includes(interval) ? interval : DEFAULT_CHATBOT_SETTINGS.proactiveIntervalMinutes,
    proactiveSound: ['off', 'default', 'chime', 'ping', 'reminder'].includes(settings.proactiveSound)
      ? settings.proactiveSound
      : DEFAULT_CHATBOT_SETTINGS.proactiveSound
  };
}

function updateProactiveChatBadge(count) {
  const unread = Math.max(0, Number(count) || 0);
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
  chrome.action.setBadgeText({ text: unread ? (unread > 99 ? '99+' : String(unread)) : '' });
}

async function configureProactiveChatAlarm() {
  const { chatbotSettings } = await chrome.storage.local.get({ chatbotSettings: DEFAULT_CHATBOT_SETTINGS });
  const settings = normalizeProactiveChatSettings(chatbotSettings);
  await chrome.alarms.clear(PROACTIVE_CHAT_ALARM);
  if (settings.proactiveMessagesEnabled) {
    chrome.alarms.create(PROACTIVE_CHAT_ALARM, { periodInMinutes: settings.proactiveIntervalMinutes });
  }
}

function getProactiveContext(data) {
  const notes = (data.notes || [])
    .slice(0, 3)
    .map(note => `${note.title || 'Ghi chú'}: ${note.text || note.content || ''}`.slice(0, 300))
    .join('\n');
  const today = new Date().toISOString().slice(0, 10);
  const schedules = (data.schedules || [])
    .filter(schedule => schedule.date >= today)
    .sort((left, right) => `${left.date} ${left.time || ''}`.localeCompare(`${right.date} ${right.time || ''}`))
    .slice(0, 3)
    .map(schedule => `${schedule.date} ${schedule.time || ''} — ${schedule.title || schedule.content || 'Sự kiện'}`)
    .join('\n');
  return {
    notes: notes || 'Không có ghi chú gần đây.',
    schedules: schedules || 'Không có sự kiện sắp tới.'
  };
}

function getMessageText(message) {
  if (message?.text) return String(message.text);
  const textPart = message?.parts?.find(part => part?.text);
  return textPart?.text ? String(textPart.text) : '';
}

function getRecentProactiveMessages(history) {
  return (history || [])
    .filter(message => message?.proactive === true)
    .slice(-PROACTIVE_HISTORY_LIMIT)
    .map(getMessageText)
    .filter(Boolean);
}

function messageTokenSet(text) {
  return new Set(
    String(text || '')
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2 && !PROACTIVE_STOP_WORDS.has(token))
  );
}

function messageSimilarity(left, right) {
  const leftTokens = messageTokenSet(left);
  const rightTokens = messageTokenSet(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  const intersection = [...leftTokens].filter(token => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
}

function isDuplicateProactiveMessage(message, recentMessages) {
  return recentMessages.some(previous => messageSimilarity(message, previous) >= PROACTIVE_DUPLICATE_THRESHOLD);
}

function normalizeNotificationSound(value) {
  const sound = value && typeof value === 'object' ? value : {};
  const mode = ['off', 'preset', 'custom'].includes(sound.mode) ? sound.mode : 'preset';
  const preset = ['default', 'chime', 'ping'].includes(sound.preset) ? sound.preset : 'default';
  return {
    mode,
    preset,
    customSound: sound.customSound?.dataUrl ? { dataUrl: sound.customSound.dataUrl } : null
  };
}

async function playProactiveNotificationSound(proactiveSound, reminderSoundSettings) {
  if (proactiveSound === 'off' || typeof ensureOffscreenDocument !== 'function') return;
  const sound = proactiveSound === 'reminder'
    ? normalizeNotificationSound(reminderSoundSettings)
    : { mode: 'preset', preset: proactiveSound, customSound: null };
  if (sound.mode === 'off' || (sound.mode === 'custom' && !sound.customSound)) return;

  await ensureOffscreenDocument();
  const result = await chrome.runtime.sendMessage({
    target: 'offscreen-ocr',
    action: 'play_sound',
    sound
  });
  if (result?.success === false) throw new Error(result.error || 'Không thể phát âm thanh');
}

async function sendProactiveChatMessage() {
  if (proactiveChatInFlight || typeof GeminiService !== 'function') return;
  proactiveChatInFlight = true;
  try {
    const data = await chrome.storage.local.get({
      chatbotSettings: DEFAULT_CHATBOT_SETTINGS,
      chatHistoryData: [],
      proactiveUnreadCount: 0,
      notes: [],
      schedules: [],
      reminderSoundSettings: { mode: 'preset', preset: 'default', customSound: null },
      appLanguage: 'vi'
    });
    const settings = normalizeProactiveChatSettings(data.chatbotSettings);
    if (!settings.proactiveMessagesEnabled) return;

    const language = { vi: 'Tiếng Việt', en: 'English', zh: '中文' }[data.appLanguage] || 'Tiếng Việt';
    const context = getProactiveContext(data);
    const recentProactiveMessages = getRecentProactiveMessages(data.chatHistoryData);
    const systemInstruction = `
Bạn là "${settings.botName}". Hãy gửi đúng một tin nhắn chủ động ngắn gọn, thân thiện cho ${settings.userAddress} bằng ${language}.
Tự xưng là ${settings.selfPronoun}. Chỉ gửi tin khi có chủ đề mới, cụ thể và hữu ích từ ghi chú, lịch trình hoặc cuộc trò chuyện gần đây.
Không gửi lời chào xã giao, lời chúc theo giờ, hoặc diễn đạt lại một tin đã gửi. Nếu không có nội dung mới đáng gửi, trả lời chính xác [SKIP].
Không gọi công cụ, không tạo hoặc chỉnh sửa dữ liệu, và giới hạn trong hai câu.
${settings.customPrompt ? `Lưu ý thêm của người dùng: ${settings.customPrompt}` : ''}`;
    const previousMessages = recentProactiveMessages.length
      ? recentProactiveMessages.map(message => `- ${message}`).join('\n')
      : 'Chưa có.';
    const request = `Thời gian hiện tại: ${new Date().toLocaleString()}\n\nGHI CHÚ GẦN ĐÂY:\n${context.notes}\n\nSỰ KIỆN SẮP TỚI:\n${context.schedules}\n\nTIN CHỦ ĐỘNG ĐÃ GỬI (không lặp lại hoặc viết lại):\n${previousMessages}\n\nChỉ gửi tin nếu bạn có nội dung mới hữu ích; nếu không, trả lời [SKIP].`;
    const recentMessages = (data.chatHistoryData || []).slice(-12);
    const service = new GeminiService();
    const response = await service.chat([...recentMessages, { role: 'user', parts: [{ text: request }] }], systemInstruction);
    const text = response.text?.trim();
    if (!text || text === '[SKIP]' || isDuplicateProactiveMessage(text, recentProactiveMessages)) return;

    const message = { ...response.rawContent, timestamp: Date.now(), proactive: true };
    const unreadCount = Math.min(100, (Number(data.proactiveUnreadCount) || 0) + 1);
    await chrome.storage.local.set({
      chatHistoryData: [...(data.chatHistoryData || []), message],
      chatLastUpdated: message.timestamp,
      proactiveUnreadCount: unreadCount
    });
    updateProactiveChatBadge(unreadCount);
    playProactiveNotificationSound(settings.proactiveSound, data.reminderSoundSettings).catch(error => {
      console.warn('[Memoria] Không thể phát âm thanh tin nhắn chủ động:', error.message || error);
    });
    chrome.runtime.sendMessage({ action: 'new_ai_proactive_msg' }).catch(() => {});
  } catch (error) {
    console.warn('[Memoria] Không thể gửi tin nhắn chủ động:', error.message || error);
  } finally {
    proactiveChatInFlight = false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  configureProactiveChatAlarm();
  chrome.storage.local.get({ proactiveUnreadCount: 0 }, data => updateProactiveChatBadge(data.proactiveUnreadCount));
});
chrome.runtime.onStartup.addListener(() => {
  configureProactiveChatAlarm();
  chrome.storage.local.get({ proactiveUnreadCount: 0 }, data => updateProactiveChatBadge(data.proactiveUnreadCount));
});
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (changes.chatbotSettings) configureProactiveChatAlarm();
  if (changes.proactiveUnreadCount) updateProactiveChatBadge(changes.proactiveUnreadCount.newValue);
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === PROACTIVE_CHAT_ALARM) sendProactiveChatMessage();
});

configureProactiveChatAlarm();
chrome.storage.local.get({ proactiveUnreadCount: 0 }, data => updateProactiveChatBadge(data.proactiveUnreadCount));
