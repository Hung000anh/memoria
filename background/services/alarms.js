// background/services/alarms.js

const DEFAULT_ICON = "icons/icon128.png";

// Lắng nghe tạo/xóa Alarm từ UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Xử lý tạo/xóa Alarm cho Lịch trình
  if (request.action === "create_alarm") {
    const sch = request.schedule;
    if (sch.time && sch.date) {
      const [hours, minutes] = sch.time.split(':');
      const [y, m, d] = sch.date.split('-');
      let alarmTime = new Date(y, parseInt(m) - 1, d, parseInt(hours), parseInt(minutes), 0, 0);
      
      let alarmConfig = { when: alarmTime.getTime() };
      if (sch.recurrence === 'daily') alarmConfig.periodInMinutes = 24 * 60;
      if (sch.recurrence === 'weekly') alarmConfig.periodInMinutes = 7 * 24 * 60;
      
      // Nếu sự kiện trong quá khứ và không lặp lại thì bỏ qua
      if (alarmConfig.when <= Date.now() && sch.recurrence === 'none') return;
      
      // Nếu là sự kiện lặp lại nhưng ngày gốc trong quá khứ, đẩy target lên tương lai
      if (alarmConfig.when <= Date.now() && alarmConfig.periodInMinutes) {
        while (alarmConfig.when <= Date.now()) {
          alarmConfig.when += alarmConfig.periodInMinutes * 60000;
        }
      }
      
      chrome.alarms.create(`schedule_${sch.id}`, alarmConfig);
      chrome.storage.local.get({ alarmsData: {} }, (data) => {
        data.alarmsData[`schedule_${sch.id}`] = sch.title || sch.text || 'Sự kiện';
        chrome.storage.local.set({ alarmsData: data.alarmsData });
      });
    }
  }

  if (request.action === "delete_alarm") {
    chrome.alarms.clear(`schedule_${request.id}`);
  }

  // --- Nhắc nhở (Reminders) ---
  if (request.action === "create_custom_reminder") {
    const rem = request.reminder;
    const alarmConfig = { delayInMinutes: rem.minutes };
    if (rem.isRepeating) {
      alarmConfig.periodInMinutes = rem.minutes;
    }
    
    chrome.alarms.create(`custom_rem_${rem.id}`, alarmConfig);
    chrome.storage.local.get({ alarmsData: {} }, (data) => {
      data.alarmsData[`custom_rem_${rem.id}`] = {
        text: rem.text,
        isRepeating: rem.isRepeating
      };
      chrome.storage.local.set({ alarmsData: data.alarmsData });
    });
  }

  if (request.action === "delete_custom_reminder") {
    chrome.alarms.clear(`custom_rem_${request.id}`);
  }
});

// Lắng nghe sự kiện alarm cho Alarms chung và Hẹn giờ
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('schedule_')) {
    chrome.storage.local.get({ alarmsData: {} }, (data) => {
      const text = data.alarmsData[alarm.name] || 'Đến giờ cho sự kiện của bạn!';
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: DEFAULT_ICON, 
        title: 'Lịch trình Memoria ✨',
        message: text,
        priority: 2
      });

      chrome.alarms.get(alarm.name, (al) => {
        if (!al || !al.periodInMinutes) {
          delete data.alarmsData[alarm.name];
          chrome.storage.local.set({ alarmsData: data.alarmsData });
        }
      });
    });
  }

  if (alarm.name.startsWith('custom_rem_')) {
    chrome.storage.local.get({ alarmsData: {} }, (data) => {
      const remData = data.alarmsData[alarm.name];
      const text = typeof remData === 'string' ? remData : (remData ? remData.text : 'Hết giờ!');
      const isRepeating = typeof remData === 'object' && remData ? remData.isRepeating : false;
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let successCount = 0;
        let processedCount = 0;

        if (!tabs || tabs.length === 0) {
          showNotification(text);
        } else {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: "show_overlay", text: text }, (response) => {
              processedCount++;
              if (chrome.runtime.lastError) {
                // Thất bại do trang hệ thống hoặc chưa load xong
                console.log("Không thể gửi overlay tới tab:", tab.id, chrome.runtime.lastError.message);
              } else if (response && response.status === "ok") {
                successCount++;
              }
              
              if (processedCount === tabs.length && successCount === 0) {
                showNotification(text);
              }
            });
          });
        }
      });

      if (!isRepeating) {
        delete data.alarmsData[alarm.name];
        chrome.storage.local.set({ alarmsData: data.alarmsData });
      }
    });
  }
  
  function showNotification(text) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: DEFAULT_ICON,
      title: 'Nhắc nhở Memoria ✨',
      message: text,
      priority: 2
    });
  }
});
