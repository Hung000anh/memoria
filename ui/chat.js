document.addEventListener('DOMContentLoaded', () => {
  // --- Logic Chatbot ---
  const chatInput = document.getElementById('chatInput');
  const sendChatBtn = document.getElementById('sendChatBtn');
  const chatHistory = document.getElementById('chatHistory');

  function scrollChatToBottom() {
    if (!chatHistory) return;
    if (chatHistory.lastElementChild) {
      chatHistory.lastElementChild.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  if (chatInput) {
    chatInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight + 2) + 'px';
    });
    chatInput.addEventListener('focus', () => {
      setTimeout(scrollChatToBottom, 100);
    });
  }

  let chatHistoryData = [];

  function ensureChatTitle() {
    if (!chatHistory) return;
    // Đảm bảo tiêu đề luôn ở đầu vùng chat
    const existing = chatHistory.querySelector('.chat-title-header');
    if (!existing) {
      const h2 = document.createElement('h2');
      h2.className = 'chat-title-header';
      h2.textContent = 'Memoria AI';
      h2.style.marginBottom = '12px';
      h2.style.marginTop = '0';
      chatHistory.insertBefore(h2, chatHistory.firstChild);
    }
  }

  // Load chat state
  chrome.storage.local.get({ chatHistoryData: [], chatHistoryHTML: '', chatLastUpdated: 0 }, (data) => {
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    // Nếu dữ liệu quá 3 ngày tuổi
    if (data.chatLastUpdated && (now - data.chatLastUpdated > THREE_DAYS_MS)) {
      chatHistoryData = [];
      if (chatHistory) {
         chatHistory.innerHTML = '<div class="msg ai-msg">Chào bạn! Mình là AI của Memoria, mình có thể phân tích dữ liệu bên cạnh để giúp bạn.</div>';
      }
      chrome.storage.local.set({ chatHistoryData: [], chatHistoryHTML: '', chatLastUpdated: now });
    } else {
      chatHistoryData = data.chatHistoryData;
      if (chatHistory) {
         chatHistory.innerHTML = '';
         chatHistoryData.forEach(msg => {
           // Bỏ qua nếu là function call hoặc function response
           if (msg.role === 'function') return;
           if (msg.parts && msg.parts[0] && msg.parts[0].functionCall) return;

           const roleStr = msg.role === 'user' ? 'user-msg' : 'ai-msg';
           const div = document.createElement('div');
           div.className = `msg ${roleStr}`;
           const msgText = msg.text || (msg.parts && msg.parts[0] ? msg.parts[0].text : '');
           
           // Nếu không có text gì cả (ví dụ tin rác), bỏ qua luôn
           if (!msgText || msgText.trim() === '') return;

           const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
           const timeHtml = timeStr ? `<div style="font-size: 10px; opacity: 0.6; margin-top: 4px; text-align: right;">${timeStr}</div>` : '';

           if (window.utils && window.utils.renderMarkdown) {
             div.innerHTML = window.utils.renderMarkdown(msgText) + timeHtml;
           } else {
             div.innerHTML = msgText.replace(/\n/g, '<br>') + timeHtml;
           }
           chatHistory.appendChild(div);
         });
         if (typeof scrollChatToBottom === 'function') scrollChatToBottom();
         else chatHistory.scrollTop = chatHistory.scrollHeight;
      }
    }
    ensureChatTitle();
    
    // Clear badge khi khởi động
    chrome.action.setBadgeText({ text: '' });
  });

  // Lắng nghe tin nhắn chủ động từ AI
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "new_ai_proactive_msg") {
      chrome.storage.local.get({ chatHistoryData: [] }, (data) => {
        chatHistoryData = data.chatHistoryData;
        const lastMsg = chatHistoryData[chatHistoryData.length - 1];
        if (lastMsg && (lastMsg.role === 'ai' || lastMsg.role === 'model') && chatHistory) {
          const div = document.createElement('div');
          div.className = 'msg ai-msg';
          const msgText = lastMsg.text || (lastMsg.parts && lastMsg.parts[0] ? lastMsg.parts[0].text : '');
          
          const timeStr = lastMsg.timestamp ? new Date(lastMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
          const timeHtml = timeStr ? `<div style="font-size: 10px; opacity: 0.6; margin-top: 4px; text-align: right;">${timeStr}</div>` : '';

          if (window.utils && window.utils.renderMarkdown) {
            div.innerHTML = window.utils.renderMarkdown(msgText) + timeHtml;
          } else {
            div.innerHTML = msgText.replace(/\n/g, '<br>') + timeHtml;
          }
          chatHistory.appendChild(div);
          scrollChatToBottom();
          saveChatState();
          
          // Nếu đang xem tab chat thì clear badge
          const chatView = document.getElementById('chat-view');
          if (chatView && chatView.classList.contains('active')) {
             chrome.action.setBadgeText({ text: '' });
          }
        }
      });
    }
  });

  function saveChatState() {
    if (!chatHistory) return;
    chrome.storage.local.set({
      chatHistoryData: chatHistoryData,
      chatHistoryHTML: chatHistory.innerHTML,
      chatLastUpdated: Date.now()
    });
  }

  function addMessageToUI(text, isUser, timestamp) {
    if (!chatHistory) return;
    const div = document.createElement('div');
    div.className = `msg ${isUser ? 'user-msg' : 'ai-msg'}`;
    
    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
    const timeHtml = timeStr ? `<div style="font-size: 10px; opacity: 0.6; margin-top: 4px; text-align: right;">${timeStr}</div>` : '';

    if (window.utils && window.utils.renderMarkdown) {
      div.innerHTML = window.utils.renderMarkdown(text) + timeHtml;
    } else {
      div.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') + timeHtml;
    }
    chatHistory.appendChild(div);
    scrollChatToBottom();
    saveChatState();
  }

  const toolsDef = [{
    functionDeclarations: [
      {
        name: "create_note",
        description: "Tạo một ghi chú mới.",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "Tiêu đề ghi chú" },
            content: { type: "STRING", description: "Nội dung ghi chú" },
            color: { type: "STRING", description: "Mã màu hex (VD: #fecaca cho đỏ, #bbf7d0 cho xanh)" }
          },
          required: ["content"]
        }
      },
      {
        name: "delete_note",
        description: "Xóa một ghi chú dựa trên ID.",
        parameters: {
          type: "OBJECT",
          properties: {
            id: { type: "NUMBER", description: "ID của ghi chú cần xóa" }
          },
          required: ["id"]
        }
      },
      {
        name: "edit_note",
        description: "Sửa nội dung hoặc tiêu đề của một ghi chú dựa trên ID.",
        parameters: {
          type: "OBJECT",
          properties: {
            id: { type: "NUMBER", description: "ID của ghi chú cần sửa" },
            title: { type: "STRING", description: "Tiêu đề mới" },
            content: { type: "STRING", description: "Nội dung mới" }
          },
          required: ["id", "content"]
        }
      },
      {
        name: "create_schedule",
        description: "Tạo một sự kiện/lịch trình mới.",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "Tên sự kiện" },
            content: { type: "STRING", description: "Mô tả sự kiện" },
            date: { type: "STRING", description: "Ngày (YYYY-MM-DD)" },
            time: { type: "STRING", description: "Giờ (HH:MM)" },
            recurrence: { type: "STRING", description: "Lặp lại: none, daily, weekly, monthly, yearly" }
          },
          required: ["title", "date", "recurrence"]
        }
      },
      {
        name: "create_reminder",
        description: "Đặt hẹn giờ/nhắc nhở đếm ngược.",
        parameters: {
          type: "OBJECT",
          properties: {
            text: { type: "STRING", description: "Nội dung nhắc nhở" },
            minutes: { type: "INTEGER", description: "Số phút đếm ngược" },
            isRepeating: { type: "BOOLEAN", description: "Có tự động lặp lại không" }
          },
          required: ["text", "minutes", "isRepeating"]
        }
      },
      {
        name: "get_weather",
        description: "Lấy thông tin thời tiết hiện tại và dự báo 7 ngày tới của một thành phố.",
        parameters: {
          type: "OBJECT",
          properties: {
            city: { type: "STRING", description: "Tên thành phố (VD: Hanoi, Da Nang, Ho Chi Minh)" }
          },
          required: ["city"]
        }
      }
    ]
  }];

  async function executeToolCall(call) {
    return new Promise((resolve) => {
      chrome.storage.local.get({ notes: [], schedules: [], customReminders: [] }, (data) => {
        try {
          if (call.name === "create_note") {
            const newNote = {
              id: Date.now(),
              title: call.args.title || '',
              content: call.args.content || '',
              color: call.args.color || '#fecaca',
              date: new Date().toISOString()
            };
            data.notes.push(newNote);
            chrome.storage.local.set({ notes: data.notes }, () => {
              window.dispatchEvent(new Event('app_data_changed'));
              resolve({ result: "Success" });
            });
          } else if (call.name === "delete_note") {
            const targetId = Number(call.args.id);
            const initialLength = data.notes.length;
            data.notes = data.notes.filter(n => Number(n.id) !== targetId);
            if (data.notes.length < initialLength) {
              chrome.storage.local.set({ notes: data.notes }, () => {
                window.dispatchEvent(new Event('app_data_changed'));
                resolve({ result: "Success" });
              });
            } else {
              resolve({ error: "Không tìm thấy ghi chú với ID cung cấp." });
            }
          } else if (call.name === "edit_note") {
            const targetId = Number(call.args.id);
            const note = data.notes.find(n => Number(n.id) === targetId);
            if (note) {
              if (call.args.title !== undefined) note.title = call.args.title;
              if (call.args.content !== undefined) note.content = call.args.content;
              chrome.storage.local.set({ notes: data.notes }, () => {
                window.dispatchEvent(new Event('app_data_changed'));
                resolve({ result: "Success" });
              });
            } else {
              resolve({ error: "Không tìm thấy ghi chú với ID cung cấp." });
            }
          } else if (call.name === "create_schedule") {
            const sch = {
              id: Date.now(),
              title: call.args.title || 'Sự kiện',
              content: call.args.content || '',
              date: call.args.date,
              time: call.args.time || '',
              recurrence: call.args.recurrence || 'none',
              recurrenceEndDate: ''
            };
            data.schedules.push(sch);
            if (sch.time) chrome.runtime.sendMessage({ action: 'create_alarm', schedule: sch });
            chrome.storage.local.set({ schedules: data.schedules }, () => {
              window.dispatchEvent(new Event('app_data_changed'));
              resolve({ result: "Success" });
            });
          } else if (call.name === "create_reminder") {
            const rem = {
              id: Date.now(),
              text: call.args.text || 'Nhắc nhở',
              minutes: parseInt(call.args.minutes),
              isRepeating: !!call.args.isRepeating,
              expiresAt: Date.now() + parseInt(call.args.minutes) * 60 * 1000
            };
            data.customReminders.push(rem);
            chrome.runtime.sendMessage({ action: 'create_custom_reminder', reminder: rem });
            chrome.storage.local.set({ customReminders: data.customReminders }, () => {
              window.dispatchEvent(new Event('app_data_changed'));
              resolve({ result: "Success" });
            });
          } else if (call.name === "get_weather") {
            const city = call.args.city;
            fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=vi`)
              .then(res => res.json())
              .then(apiData => {
                if (!apiData.results || apiData.results.length === 0) return resolve({ error: "Không tìm thấy thành phố" });
                const loc = apiData.results[0];
                return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
              })
              .then(res => res && res.json ? res.json() : res)
              .then(weatherData => {
                 if(weatherData.error) return resolve({ error: weatherData.error });
                 resolve({ 
                   result: "Success", 
                   current_weather: weatherData.current_weather, 
                   daily_forecast: weatherData.daily, 
                   city: city 
                 });
              })
              .catch(e => resolve({ error: e.toString() }));
          } else {
            resolve({ error: "Unknown tool call" });
          }
        } catch(e) {
          resolve({ error: e.toString() });
        }
      });
    });
  }

  async function processChatRequest(userText, ts) {
    // Typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'msg ai-msg';
    typingDiv.textContent = 'Đang suy nghĩ...';
    chatHistory.appendChild(typingDiv);
    scrollChatToBottom();
    saveChatState();

    // Lấy context
    chrome.storage.local.get({ notes: [], schedules: [], clipboardHistory: [], weatherCache: null, timeStats: {} }, async (data) => {
      const clipText = data.clipboardHistory.slice(0, 10).map(c => c.text).join(' | ');
      const notesText = data.notes.map(n => `[ID:${n.id}] [${n.title}] ${n.content}`).join('; ');
      const schText = data.schedules.map(s => `[ID:${s.id}] [${s.date} ${s.time || ''}] ${s.title}: ${s.content || ''} (${s.recurrence})`).join('; ');
      
      // Get today's stats
      let statsText = 'Chưa có';
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const todayStats = data.timeStats[todayStr];
      if (todayStats) {
         let topDomains = Object.entries(todayStats).sort((a, b) => b[1] - a[1]).slice(0, 8);
         statsText = topDomains.map(([dom, secs]) => {
            let m = Math.floor(secs / 60);
            return m > 0 ? `${dom} (${m} phút)` : `${dom} (<1 phút)`;
         }).join(', ');
      }
      
      let localWeather = 'Không có';
      if (data.weatherCache && data.weatherCache.data) {
         const cw = data.weatherCache.data.current_weather;
         localWeather = `${cw.temperature}°C, Sức gió: ${cw.windspeed}km/h (tại ${data.weatherCache.cityName})`;
         const daily = data.weatherCache.data.daily;
         if (daily) {
             const daysForecast = [];
             for(let i=1; i<=3; i++) {
                if(daily.time[i]) {
                    daysForecast.push(`${daily.time[i]}: ${Math.round(daily.temperature_2m_min[i])}-${Math.round(daily.temperature_2m_max[i])}°C`);
                }
             }
             localWeather += `\\n  - Dự báo 3 ngày tới: ${daysForecast.join(', ')}`;
         }
      }

      const systemInstruction = `
Bạn là "Memoria AI". Bạn có thể phân tích văn bản và thực hiện lệnh của người dùng (tạo ghi chú, sự kiện, hẹn giờ, xem thời tiết) thông qua các công cụ.
Thời gian hiện tại: ${new Date().toLocaleString()}

DỮ LIỆU HIỆN TẠI CỦA NGƯỜI DÙNG:
- Ghi chú: ${notesText || 'Không có'}
- Sự kiện/Lịch trình: ${schText || 'Không có'}
- Thời tiết hiện tại của người dùng: ${localWeather}
- Thời gian duyệt web hôm nay: ${statsText || 'Chưa có'}
- 10 mục Clipboard gần nhất: ${clipText || 'Không có'}

MỤC TIÊU CỦA BẠN:
- Hãy gọi tool nếu người dùng yêu cầu thao tác (thêm, sửa, xóa) dữ liệu hoặc tra cứu thời tiết thành phố khác.
- Nếu người dùng hỏi về thông tin đã có, hãy trả lời dựa trên dữ liệu hiện tại ở trên.
- Trả lời ngắn gọn, thân thiện bằng tiếng Việt.
      `;

      try {
        if (!window.gemini) throw new Error("Tính năng AI chưa được cấu hình.");

        // Thêm tin nhắn user vào mảng
        chatHistoryData.push({ role: "user", parts: [{ text: userText }], timestamp: ts });

        let aiResponse = await window.gemini.chat(chatHistoryData, systemInstruction, toolsDef);
        
        // Lưu raw content của AI vào lịch sử
        aiResponse.rawContent.timestamp = Date.now();
        chatHistoryData.push(aiResponse.rawContent);

        // Nếu AI trả về Function Call
        if (aiResponse.functionCall) {
          chatHistory.removeChild(typingDiv);
          
          const fnTypingDiv = document.createElement('div');
          fnTypingDiv.className = 'msg ai-msg';
          fnTypingDiv.innerHTML = `<span style="color:#10b981;">Đang thực thi: ${aiResponse.functionCall.name}...</span>`;
          chatHistory.appendChild(fnTypingDiv);
          chatHistory.scrollTop = chatHistory.scrollHeight;

          const fnResult = await executeToolCall(aiResponse.functionCall);
          
          // Nạp functionResponse vào lịch sử
          chatHistoryData.push({
            role: "function",
            timestamp: Date.now(),
            parts: [{
              functionResponse: {
                name: aiResponse.functionCall.name,
                response: fnResult
              }
            }]
          });

          // Gọi AI lần 2 để AI nhận kết quả và nói chuyện
          const aiResponse2 = await window.gemini.chat(chatHistoryData, systemInstruction, toolsDef);
          aiResponse2.rawContent.timestamp = Date.now();
          chatHistoryData.push(aiResponse2.rawContent);
          
          chatHistory.removeChild(fnTypingDiv);
          if (aiResponse2.text) {
             addMessageToUI(aiResponse2.text, false, aiResponse2.rawContent.timestamp);
          } else {
             addMessageToUI("Đã thực hiện xong yêu cầu của bạn!", false, aiResponse2.rawContent.timestamp);
          }
        } else if (aiResponse.text) {
          chatHistory.removeChild(typingDiv);
          addMessageToUI(aiResponse.text, false, aiResponse.rawContent.timestamp);
        } else {
          throw new Error("Phản hồi rỗng.");
        }
      } catch (error) {
        if (chatHistory.contains(typingDiv)) chatHistory.removeChild(typingDiv);
        addMessageToUI(`❌ Lỗi: ${error.message}`, false);
        // Xóa tin nhắn lỗi khỏi lịch sử để không kẹt
        chatHistoryData.pop(); 
        saveChatState();
      }
    });
  }

  async function handleChat() {
    if (!chatInput || !chatHistory) return;
    const text = chatInput.value.trim();
    if (!text) return;

    const ts = Date.now();
    addMessageToUI(text, true, ts);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    processChatRequest(text, ts);
  }

  if (sendChatBtn) sendChatBtn.addEventListener('click', handleChat);
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleChat();
      }
    });
  }

  // --- Auto Scroll to Bottom on Show ---
  const chatPane = document.getElementById('chat');

  // Cuộn ngay khi khởi tạo nếu lỡ lưu tab chat trước đó
  scrollChatToBottom();

  if (chatPane && chatHistory) {
    const paneObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('active')) {
          scrollChatToBottom();
          setTimeout(scrollChatToBottom, 50);
          setTimeout(scrollChatToBottom, 200);
        }
      });
    });
    paneObserver.observe(chatPane, { attributes: true, attributeFilter: ['class'] });
  }

  // Cuộn khi có tin nhắn mới thêm vào
  if (chatHistory) {
    const contentObserver = new MutationObserver(() => {
      if (chatPane && chatPane.classList.contains('active')) {
        scrollChatToBottom();
      }
    });
    contentObserver.observe(chatHistory, { childList: true });
  }
});
