document.addEventListener('DOMContentLoaded', () => {
  const navMenu = document.querySelector('.nav-menu');
  if (!navMenu) return;

  const defaultTabs = [
    { id: "chat", name: "AI Chat" },
    { id: "translate-side-view", name: "Dịch thuật" },
    { id: "clipboard-view", name: "Clipboard" },
    { id: "notes-view", name: "Ghi chú" },
    { id: "reminders-view", name: "Hẹn giờ" },
    { id: "weather-view", name: "Thời tiết" }
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

    // Tab switching event delegation
    navMenu.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-item[data-target]');
      if (!btn) return;

      const target = btn.getAttribute('data-target');
      navMenu.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(target);
      if (pane) pane.classList.add('active');
    });

    // Kiểm tra cờ autoOpenTab từ background khi tải trang
    chrome.storage.local.get(['autoOpenTab'], (res) => {
      if (res.autoOpenTab) {
        openTab(res.autoOpenTab);
      }
    });
  }

  function openTab(targetTab) {
    chrome.storage.local.remove('autoOpenTab'); // Xóa cờ sau khi dùng

    const targetBtn = navMenu.querySelector(`.nav-item[data-target="${targetTab}"]`);
    if (targetBtn && targetBtn.style.display !== 'none') {
      navMenu.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));

      targetBtn.classList.add('active');
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add('active');

      // Auto-focus ô nhập dịch thuật
      if (targetTab === 'translate-side-view') {
        const tslInput = document.getElementById('tslInput');
        if (tslInput) {
          setTimeout(() => {
            tslInput.focus();
            tslInput.select();
          }, 150);
        }
      }
    }
  }

  // Tải lần đầu
  chrome.storage.local.get({ navigatorSettings: null }, (data) => {
    applyNavigatorSettings(data.navigatorSettings);
  });

  // Lắng nghe cấu hình thay đổi thời gian thực
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.navigatorSettings) {
        applyNavigatorSettings(changes.navigatorSettings.newValue);
      }
      if (changes.autoOpenTab && changes.autoOpenTab.newValue) {
        openTab(changes.autoOpenTab.newValue);
      }
    }
  });
});
