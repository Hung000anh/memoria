document.addEventListener('DOMContentLoaded', () => {
  const navMenu = document.querySelector('.nav-menu');
  if (!navMenu) return;

  const defaultTabs = [
    { id: "dashboard", name: "Tổng quan" },
    { id: "chat", name: "AI Chat" },
    { id: "clipboard-view", name: "Clipboard" },
    { id: "tasks-view", name: "Công việc" },
    { id: "notes-view", name: "Ghi chú" },
    { id: "schedule-view", name: "Sự kiện" },
    { id: "stats-view", name: "Thống kê" },
    { id: "reminders-view", name: "Hẹn giờ" },
    { id: "weather-view", name: "Thời tiết" },
    { id: "translate-side-view", name: "Dịch thuật" }
  ];

  function applyNavigatorSettings(settings) {
    if (!settings) {
      settings = defaultTabs.map(t => ({ id: t.id, name: t.name, visible: true }));
    }

    // Map các button hiện có theo data-target
    const buttonsMap = {};
    const buttons = Array.from(navMenu.querySelectorAll('.nav-item[data-target]'));
    buttons.forEach(btn => {
      const id = btn.getAttribute('data-target');
      buttonsMap[id] = btn;
    });

    // Tạo mảng sắp xếp lại các nút theo cài đặt
    const orderedButtons = [];
    settings.forEach(item => {
      const btn = buttonsMap[item.id];
      if (btn) {
        if (item.visible) {
          btn.style.display = '';
        } else {
          btn.style.display = 'none';
          // Nếu tab ẩn đang active, gỡ active đi
          btn.classList.remove('active');
          const pane = document.getElementById(item.id);
          if (pane) pane.classList.remove('active');
        }
        orderedButtons.push(btn);
      }
    });

    // Bổ sung các nút chưa được cấu hình
    buttons.forEach(btn => {
      if (!orderedButtons.includes(btn)) {
        orderedButtons.push(btn);
      }
    });

    // Xóa các nút hiện tại và thêm lại theo thứ tự mới
    buttons.forEach(btn => btn.remove());
    orderedButtons.forEach(btn => navMenu.appendChild(btn));

    // Đảm bảo có ít nhất một tab hiển thị làm active nếu tab active hiện tại bị ẩn
    const activeBtn = navMenu.querySelector('.nav-item.active');
    if (!activeBtn || activeBtn.style.display === 'none') {
      const firstVisibleBtn = orderedButtons.find(btn => btn.style.display !== 'none');
      if (firstVisibleBtn) {
        if (activeBtn) activeBtn.classList.remove('active');
        firstVisibleBtn.classList.add('active');
        const target = firstVisibleBtn.getAttribute('data-target');
        
        const panes = document.querySelectorAll('.pane');
        panes.forEach(p => p.classList.remove('active'));
        
        const activePane = document.getElementById(target);
        if (activePane) activePane.classList.add('active');
      }
    }
  }

  // Tải lần đầu
  chrome.storage.local.get({ navigatorSettings: null }, (data) => {
    applyNavigatorSettings(data.navigatorSettings);
  });

  // Lắng nghe cấu hình thay đổi thời gian thực
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.navigatorSettings) {
      applyNavigatorSettings(changes.navigatorSettings.newValue);
    }
  });
});
