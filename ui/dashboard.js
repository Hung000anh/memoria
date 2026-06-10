document.addEventListener('DOMContentLoaded', () => {
  function getTodayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function formatMinutes(mins) {
    if (!mins || mins < 1) return '< 1p';
    if (mins < 60) return `${Math.round(mins)}p`;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return m > 0 ? `${h}h ${m}p` : `${h}h`;
  }

  function loadDashboard() {
    const today = getTodayLocal();

    chrome.storage.local.get({
      timeStats: {},
      notes: [],
      schedules: [],
      customReminders: [],
      weatherCache: null
    }, (data) => {

      // --- Thống kê hôm nay ---
      const todayStats = data.timeStats[today] || {};
      const domains = Object.keys(todayStats);
      let totalMins = 0;
      let topDomain = null;
      let topTime = 0;

      domains.forEach(d => {
        const t = (todayStats[d] || 0) / 60;
        totalMins += t;
        if (t > topTime) { topTime = t; topDomain = d; }
      });

      const screenTimeEl = document.getElementById('dashScreenTime');
      const sitesEl = document.getElementById('dashSitesCount');
      const topSiteEl = document.getElementById('dashTopSite');

      if (screenTimeEl) screenTimeEl.querySelector('.dashboard-card-value').textContent = formatMinutes(totalMins);
      if (sitesEl) sitesEl.querySelector('.dashboard-card-value').textContent = domains.length;
      if (topSiteEl) topSiteEl.querySelector('.dashboard-card-value').textContent = topDomain || '--';

      // --- Ghi chú gần đây ---
      const notesList = document.getElementById('dashNotesList');
      if (notesList) {
        notesList.innerHTML = '';
        const recent = [...(data.notes || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
        if (recent.length === 0) {
          notesList.innerHTML = '<li class="dash-empty">Chưa có ghi chú nào</li>';
        } else {
          recent.forEach(n => {
            const li = document.createElement('li');
            li.textContent = n.title || n.content?.substring(0, 50) || '(Không có tiêu đề)';
            li.title = n.title || '';
            notesList.appendChild(li);
          });
        }
      }

      // --- Sự kiện sắp tới ---
      const schedList = document.getElementById('dashScheduleList');
      if (schedList) {
        schedList.innerHTML = '';
        const now = new Date();
        const upcoming = (data.schedules || [])
          .filter(s => s.date && new Date(s.date + 'T' + (s.time || '00:00')) >= now)
          .sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00')))
          .slice(0, 3);

        if (upcoming.length === 0) {
          schedList.innerHTML = '<li class="dash-empty">Không có sự kiện sắp tới</li>';
        } else {
          upcoming.forEach(s => {
            const li = document.createElement('li');
            const dateStr = s.time ? `${s.date} ${s.time}` : s.date;
            li.textContent = `${s.title} · ${dateStr}`;
            schedList.appendChild(li);
          });
        }
      }

      // --- Hẹn giờ đang hoạt động ---
      const remList = document.getElementById('dashRemindersList');
      if (remList) {
        remList.innerHTML = '';
        const now = Date.now();
        // Hiện reminder lặp lại (isRepeating) HOẶC reminder chưa hết hạn
        const active = (data.customReminders || []).filter(r => r.isRepeating || (r.expiresAt && r.expiresAt > now));
        if (active.length === 0) {
          remList.innerHTML = '<li class="dash-empty">Không có hẹn giờ nào</li>';
        } else {
          active.slice(0, 3).forEach(r => {
            const li = document.createElement('li');
            if (r.isRepeating) {
              li.textContent = `${r.text} · Lặp lại mỗi ${r.minutes} phút`;
            } else {
              const remaining = Math.max(0, Math.round((r.expiresAt - now) / 60000));
              li.textContent = `${r.text} · còn ${remaining} phút`;
            }
            remList.appendChild(li);
          });
        }
      }

      // --- Thời tiết ---
      const tempEl = document.getElementById('dashWeatherTemp');
      const descEl = document.getElementById('dashWeatherDesc');
      const cityEl = document.getElementById('dashWeatherCity');
      if (tempEl && data.weatherCache) {
        const cache = data.weatherCache;
        // cache.data chứa weather data, cache.cityName chứa tên thành phố
        const weatherData = cache.data || cache;
        const current = weatherData.current_weather;
        if (current) {
          tempEl.textContent = Math.round(current.temperature);
          if (descEl) descEl.textContent = getWeatherDesc(current.weathercode);
          if (cityEl) cityEl.textContent = (cache.cityName || '') ? '· ' + (cache.cityName || '') : '';
        }
      }
    });
  }

  function getWeatherDesc(code) {
    if (code === 0) return 'Trời quang';
    if (code <= 2) return 'Ít mây';
    if (code <= 3) return 'Nhiều mây';
    if (code <= 48) return 'Sương mù';
    if (code <= 57) return 'Mưa phùn';
    if (code <= 67) return 'Mưa';
    if (code <= 77) return 'Tuyết';
    if (code <= 82) return 'Mưa rào';
    if (code <= 99) return 'Có sấm sét';
    return '--';
  }

  // Tải dữ liệu khi bật Dashboard
  loadDashboard();

  // Tải lại khi chuyển sang tab Dashboard
  const dashBtn = document.querySelector('[data-target="dashboard"]');
  if (dashBtn) {
    dashBtn.addEventListener('click', () => {
      setTimeout(loadDashboard, 50);
    });
  }

  // Tải lại khi có dữ liệu thay đổi
  window.addEventListener('app_data_changed', loadDashboard);
});
