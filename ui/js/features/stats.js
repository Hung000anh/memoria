document.addEventListener('DOMContentLoaded', () => {
  const statsView = document.getElementById('stats-view');
  if (!statsView) return;

  const totalTimeEl = document.getElementById('statsTotalTime');
  const totalSitesEl = document.getElementById('statsTotalSites');
  const domainListEl = document.getElementById('statsDomainList');
  const categoryListEl = document.getElementById('statsCategoryList');
  const filterBtns = document.querySelectorAll('.stats-btn');

  let currentFilter = 'today'; // today, week, month
  let rawStats = {};

  function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  }

  function getDatesRange(filter) {
    const dates = [];
    const now = new Date();
    
    if (filter === 'today') {
      dates.push(now);
    } else if (filter === 'week') {
      const day = now.getDay(); // 0 is Sunday
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(diff));
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        if (d <= new Date()) dates.push(d);
      }
    } else if (filter === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      while (d <= now) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
    }

    return dates.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }

  function renderStats() {
    const targetDates = getDatesRange(currentFilter);
    const domainTotals = {};
    const categoryTotals = {};
    let totalTime = 0;

    targetDates.forEach(dateStr => {
      const dailyData = rawStats[dateStr] || {};
      for (const [domain, seconds] of Object.entries(dailyData)) {
        if (!domainTotals[domain]) domainTotals[domain] = 0;
        domainTotals[domain] += seconds;
        totalTime += seconds;

        const cat = getDomainCategory(domain);
        if (!categoryTotals[cat]) categoryTotals[cat] = 0;
        categoryTotals[cat] += seconds;
      }
    });

    const domainsArr = Object.entries(domainTotals).sort((a, b) => b[1] - a[1]);
    const categoriesArr = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    totalTimeEl.textContent = formatTime(totalTime);
    totalSitesEl.textContent = domainsArr.length;

    // Render Categories
    categoryListEl.innerHTML = '';
    if (categoriesArr.length === 0) {
      categoryListEl.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Chưa có dữ liệu.</div>';
    } else {
      const maxCatTime = categoriesArr[0][1];
      categoriesArr.forEach(([cat, time]) => {
        const pct = Math.max((time / maxCatTime) * 100, 5);
        const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS["Khác"];
        categoryListEl.innerHTML += `
          <div class="stat-row">
            <div class="stat-info">
              <span class="stat-name">${cat}</span>
              <span class="stat-time">${formatTime(time)}</span>
            </div>
            <div class="stat-bar-bg">
              <div class="stat-bar-fill" style="width: ${pct}%; background: ${color}"></div>
            </div>
          </div>
        `;
      });
    }

    // Render Domains
    domainListEl.innerHTML = '';
    if (domainsArr.length === 0) {
      domainListEl.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Chưa có dữ liệu.</div>';
    } else {
      const maxDomTime = domainsArr[0][1];
      domainsArr.slice(0, 15).forEach(([domain, time]) => {
        const pct = Math.max((time / maxDomTime) * 100, 2);
        const cat = getDomainCategory(domain);
        const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS["Khác"];
        domainListEl.innerHTML += `
          <div class="stat-row">
            <div class="stat-info">
              <span class="stat-name">${domain}</span>
              <span class="stat-time">${formatTime(time)}</span>
            </div>
            <div class="stat-bar-bg">
              <div class="stat-bar-fill" style="width: ${pct}%; background: ${color}cc"></div>
            </div>
          </div>
        `;
      });
    }
  }

  function loadData() {
    chrome.storage.local.get({ timeStats: {} }, (data) => {
      rawStats = data.timeStats;
      renderStats();
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderStats();
    });
  });

  // Listen for navigation changes to update stats automatically
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.target.classList.contains('active') && mutation.target.dataset.target === 'stats-view') {
        loadData();
      }
    });
  });

  const navBtns = document.querySelectorAll('.nav-item');
  navBtns.forEach(btn => {
    observer.observe(btn, { attributes: true, attributeFilter: ['class'] });
  });

  // Init
  loadData();
  setInterval(loadData, 60000); // Tự động làm mới mỗi 1 phút
});
