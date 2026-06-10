class GeminiService {
  constructor() {
    this.keys = [];
    this.currentKeyIndex = 0;
  }

  async loadKeys() {
    return new Promise(resolve => {
      chrome.storage.local.get({ geminiKeys: [] }, (data) => {
        let keysModified = false;
        this.keys = data.geminiKeys.map(k => {
          // Nếu key chưa bị mã hóa (bắt đầu bằng AIzaSy), tiến hành mã hóa
          if (k.key && k.key.startsWith('AIza')) {
            const utils = (typeof window !== 'undefined' ? window : self).utils;
            k.key = utils.xorHexEncrypt(k.key, 'memoria_secret_salt_2024');
            keysModified = true;
          }
          return k;
        });
        this.currentKeyIndex = this.keys.findIndex(k => k.status === 'ACTIVE');
        
        if (keysModified) {
          chrome.storage.local.set({ geminiKeys: this.keys }, resolve);
        } else {
          resolve();
        }
      });
    });
  }

  async saveKeys() {
    return new Promise(resolve => {
      chrome.storage.local.set({ geminiKeys: this.keys }, resolve);
    });
  }

  async chat(messages, systemInstruction = null, tools = null) {
    await this.loadKeys();
    
    if (this.keys.length === 0) {
      throw new Error("Vui lòng thêm Gemini API Key trong Cài đặt (Icon bánh răng).");
    }
    
    if (this.currentKeyIndex === -1) {
      throw new Error("Tất cả API Key đều bị khóa hoặc hỏng. Vui lòng thêm Key mới trong Cài đặt.");
    }

    let retryCount = 0;
    while (retryCount < this.keys.length) {
      const activeKeyObj = this.keys[this.currentKeyIndex];
      // Giải mã key trước khi dùng
      let apiKey = activeKeyObj.key;
      if (!apiKey.startsWith('AIza')) {
        const utils = (typeof window !== 'undefined' ? window : self).utils;
        apiKey = utils.xorHexDecrypt(apiKey, 'memoria_secret_salt_2024') || apiKey;
      }

      try {
        const response = await this.callApi(apiKey, messages, systemInstruction, tools);
        return response; // Trả về { text, functionCall, rawContent }
      } catch (error) {
        console.error("Gemini API Error:", error);
        const errMsg = error.message.toLowerCase();
        
        if (errMsg.includes("suspend") || errMsg.includes("suspension") || errMsg.includes("403") || errMsg.includes("quota") || errMsg.includes("429")) {
          activeKeyObj.status = 'DEAD';
          await this.saveKeys();
          
          this.currentKeyIndex = this.keys.findIndex(k => k.status === 'ACTIVE');
          if (this.currentKeyIndex === -1) {
            throw new Error("Tất cả API Key đã cạn kiệt hoặc bị khóa!");
          }
        } else {
          throw error;
        }
      }
      retryCount++;
    }
    throw new Error("Không thể kết nối sau nhiều lần thử.");
  }

  async callApi(apiKey, messages, systemInstruction, tools) {
    // Sử dụng gemini-3.1-flash-lite theo yêu cầu
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
    
    const body = { contents: messages };
    
    if (systemInstruction) {
      body.systemInstruction = {
        role: "system",
        parts: [{ text: systemInstruction }]
      };
    }

    if (tools) {
      body.tools = tools;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error?.message || `HTTP error ${res.status}`);
    }

    if (data.candidates && data.candidates[0].content.parts) {
      const parts = data.candidates[0].content.parts;
      const functionCallPart = parts.find(p => p.functionCall);
      const textPart = parts.find(p => p.text);
      
      return {
        text: textPart ? textPart.text : '',
        functionCall: functionCallPart ? functionCallPart.functionCall : null,
        rawContent: data.candidates[0].content
      };
    }
    throw new Error("Không nhận được phản hồi hợp lệ từ Gemini.");
  }
}

// Global instance
const _geminiGlobal = (typeof window !== 'undefined' ? window : self);
_geminiGlobal.gemini = new GeminiService();
_geminiGlobal.GeminiService = GeminiService;
