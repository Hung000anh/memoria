// background/services/proactiveAI.js

async function handleProactiveAI() {
  const currentHour = new Date().getHours();

  chrome.storage.local.get({
    aiSettings: { enabled: true, period: 60, sleepStart: 23, sleepEnd: 6 },
    geminiKeys: [],
    weatherCache: null,
    schedules: [],
    customReminders: [],
    chatHistoryData: [],
    clipboardHistory: [],
    timeStats: {},
    notes: []
  }, async (data) => {
    const s = data.aiSettings;
    if (!s.enabled) return;
    
    // Kiểm tra giờ ngủ đông
    let isSleeping = false;
    if (s.sleepStart > s.sleepEnd) {
      // ví dụ: ngủ từ 23h đến 6h
      if (currentHour >= s.sleepStart || currentHour < s.sleepEnd) isSleeping = true;
    } else if (s.sleepStart < s.sleepEnd) {
      // ví dụ: ngủ từ 1h đến 5h
      if (currentHour >= s.sleepStart && currentHour < s.sleepEnd) isSleeping = true;
    } else {
      // bằng nhau -> ngủ 1 tiếng
      if (currentHour === s.sleepStart) isSleeping = true;
    }
    
    if (isSleeping) return;

    if (!data.geminiKeys || data.geminiKeys.length === 0) return; // Không có key

    // Lọc sự kiện/lời nhắc sắp tới
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    
    const upcomingSchedules = data.schedules.filter(s => s.date === todayStr);
    
    let weatherInfo = "Không có dữ liệu";
    if (data.weatherCache && data.weatherCache.data && data.weatherCache.data.current_weather) {
      weatherInfo = `Nhiệt độ ${data.weatherCache.data.current_weather.temperature}°C, mã thời tiết ${data.weatherCache.data.current_weather.weathercode} tại ${data.weatherCache.cityName}`;
    }

    const clipText = data.clipboardHistory.slice(0, 3).map(c => c.text).join(' | ');
    const notesText = data.notes.map(n => n.title).join(', ');
    
    let statsText = 'Chưa có';
    const todayStats = data.timeStats[todayStr];
    if (todayStats) {
       let topDomains = Object.entries(todayStats).sort((a, b) => b[1] - a[1]).slice(0, 3);
       statsText = topDomains.map(([dom, secs]) => {
          let m = Math.floor(secs / 60);
          return m > 0 ? `${dom} (${m} phút)` : '';
       }).filter(x => x).join(', ');
    }

    const recentHistory = data.chatHistoryData.slice(-4).map(m => `${m.role === 'ai' || m.role === 'model' ? 'Bạn(AI)' : 'Người dùng'}: ${m.text || '...'}`).join('\n');

    const randomTopics = [
      "một câu nói truyền cảm hứng ngẫu nhiên",
      "một mẹo vặt cuộc sống thú vị",
      "một sự thật bất ngờ về vũ trụ hoặc động vật",
      "một câu hỏi vui để giải trí",
      "một lời nhắc nhở uống nước hoặc đứng lên vận động",
      "một lời khen ngợi hoặc động viên chân thành",
      "một ý tưởng hay để thư giãn sau giờ làm"
    ];
    const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];

    const systemInstruction = `Bạn là trợ lý ảo Memoria. Hãy chủ động gửi 1 tin nhắn thân thiện (DƯỚI 50 TỪ) cho người dùng.
Đây là ngữ cảnh của người dùng:
- Thời gian: ${now.toLocaleString()}
- Thời tiết: ${weatherInfo}
- Sự kiện hôm nay: ${upcomingSchedules.length} sự kiện (${upcomingSchedules.map(s => s.title).join(', ')})
- Web dùng nhiều hôm nay: ${statsText}
- Vừa copy gần đây: ${clipText || 'Không'}
- Các ghi chú: ${notesText || 'Không'}
- Lịch sử trò chuyện gần nhất: 
${recentHistory}

QUAN TRỌNG TỐI THƯỢNG: 
1. Đọc kỹ "Lịch sử trò chuyện gần nhất" ở trên. Bạn TUYỆT ĐỐI KHÔNG ĐƯỢC lặp lại bất kỳ nội dung, chủ đề, lời khuyên hay từ khóa nào (như Kanban, Breach, Youtube, Thời tiết...) mà bạn vừa nói ở các tin nhắn trước. Nếu lặp lại, người dùng sẽ rất khó chịu.
2. Nếu ngữ cảnh (clipboard, web, thời tiết) không có gì mới mẻ hoặc bạn đã nói về chúng rồi, HÃY BỎ QUA NGỮ CẢNH VÀ NÓI VỀ: ${randomTopic}.
3. Trả lời tự nhiên như một người bạn, KHÔNG chứa chữ "Memoria:". Ngắn gọn dưới 50 từ.`;

    const gemini = new GeminiService();
    try {
      const response = await gemini.chat([{role: 'user', parts: [{text: "Hãy chủ động nhắn 1 tin cho tôi dựa vào ngữ cảnh hiện tại."}]}], systemInstruction);
      if (response && response.text && response.text.trim().length > 0) {
        const msg = response.text.trim();
        
        // Lưu vào lịch sử chat
        const history = data.chatHistoryData || [];
        history.push({ role: 'ai', text: msg, timestamp: Date.now() });
        chrome.storage.local.set({ chatHistoryData: history }, () => {
           // Báo hiệu badge
           chrome.action.setBadgeText({ text: '1' });
           chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Màu xanh của app
           
           // Nảy notification
           chrome.notifications.create({
              type: 'basic',
              iconUrl: "icons/icon128.png", 
              title: 'Memoria AI',
              message: msg,
              priority: 1
           });
           
           // Báo cho UI (nếu đang mở panel chat) cập nhật
           chrome.runtime.sendMessage({ action: "new_ai_proactive_msg" }).catch(() => {});
        });
      }
    } catch (err) {
      console.error("Proactive AI Error:", err);
    }
  });
}

// Bật alarm cho AI nếu chưa có
chrome.alarms.get("proactive_ai", (al) => {
  if (!al) {
    chrome.storage.local.get({ aiSettings: { enabled: true, period: 60 } }, (data) => {
       if (data.aiSettings.enabled) {
          chrome.alarms.create("proactive_ai", { periodInMinutes: data.aiSettings.period });
       }
    });
  }
});

// Lắng nghe lệnh test thủ công
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "force_proactive_ai") {
    handleProactiveAI();
    sendResponse({status: "started"});
  }
});

// Lắng nghe alarm proactive_ai
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'proactive_ai') {
    handleProactiveAI();
  }
});
