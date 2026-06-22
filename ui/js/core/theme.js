document.addEventListener('DOMContentLoaded', () => {
  // --- Logic Theme ---
  const toggleThemeBtn = document.getElementById('toggleThemeBtn');
  const themeIcon = document.getElementById('themeIcon');

  const moonIcon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
  const sunIcon = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';

  function applyTheme(isDark) {
    if (isDark) {
      document.body.setAttribute('data-theme', 'dark');
      if (themeIcon) themeIcon.innerHTML = sunIcon;
    } else {
      document.body.removeAttribute('data-theme');
      if (themeIcon) themeIcon.innerHTML = moonIcon;
    }
  }

  chrome.storage.local.get({ isDarkMode: false }, (data) => {
    applyTheme(data.isDarkMode);
    setTimeout(() => {
      document.body.classList.remove('preload');
    }, 100);
  });

  if (toggleThemeBtn) {
    toggleThemeBtn.addEventListener('click', () => {
      const isDark = document.body.hasAttribute('data-theme');
      const newTheme = !isDark;
      applyTheme(newTheme);
      chrome.storage.local.set({ isDarkMode: newTheme });
    });
  }

  // --- UI Interactions ---
  const navBtns = document.querySelectorAll('.nav-item[data-target]');
  const panes = document.querySelectorAll('.pane');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active classes
      navBtns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      // Add active to target
      btn.classList.add('active');
      const target = btn.getAttribute('data-target');
      document.getElementById(target).classList.add('active');

      // Scroll to bottom if chat
      if (target === 'chat') {
        const ch = document.getElementById('chatHistory');
        if (ch) {
           setTimeout(() => { ch.scrollTop = ch.scrollHeight; }, 50);
        }
      }
    });
  });

  // Nút mở cài đặt
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // --- Thống kê ---
  const screenTimeValue = document.getElementById('screenTimeValue');

  function loadStats() {
    chrome.storage.local.get({ totalScreenTime: 0 }, (data) => {
      if (screenTimeValue) screenTimeValue.textContent = data.totalScreenTime + ' phút';
    });
  }
  
  loadStats();
});
