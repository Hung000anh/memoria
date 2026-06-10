document.addEventListener('DOMContentLoaded', () => {
  const cityInput = document.getElementById('weatherCityInput');
  const searchBtn = document.getElementById('weatherSearchBtn');
  const loadingDiv = document.getElementById('weatherLoading');
  const contentDiv = document.getElementById('weatherContent');
  const errorDiv = document.getElementById('weatherError');

  const cityNameEl = document.getElementById('weatherCityName');
  const descEl = document.getElementById('weatherDesc');
  const tempEl = document.getElementById('weatherTemp');
  const humidityEl = document.getElementById('weatherHumidity');
  const windEl = document.getElementById('weatherWind');
  const forecastDiv = document.getElementById('weatherForecast');

  const WMO_CODES = {
    0: 'Trời quang đãng',
    1: 'Trời quang', 2: 'Ít mây', 3: 'Nhiều mây',
    45: 'Có sương mù', 48: 'Sương mù dày đặc',
    51: 'Mưa phùn nhẹ', 53: 'Mưa phùn vừa', 55: 'Mưa phùn đặc',
    61: 'Mưa nhỏ', 63: 'Mưa vừa', 65: 'Mưa to',
    71: 'Tuyết rơi nhẹ', 73: 'Tuyết rơi vừa', 75: 'Tuyết rơi dày',
    95: 'Có sấm sét', 96: 'Sấm sét và mưa đá', 99: 'Bão lớn'
  };

  const ICONS_SVG = {
    sun: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>',
    cloudSun: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M20 12h2"/><path d="M22 12A6 6 0 0 0 12 6a5.94 5.94 0 0 0-4.5 2.1"/><path d="M18 15a3 3 0 0 0-3-3 4 4 0 0 0-7.88-1A5 5 0 0 0 7 21h10a4 4 0 0 0 1-7z"/></svg>',
    cloud: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
    rain: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>',
    snow: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/></svg>',
    storm: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>',
    fog: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h18"/><path d="M3 17h18"/><path d="M3 21h18"/><path d="M4 9h16"/><path d="M7 5h10"/></svg>'
  };

  const WMO_ICONS = {
    0: ICONS_SVG.sun,
    1: ICONS_SVG.sun, 2: ICONS_SVG.cloudSun, 3: ICONS_SVG.cloud,
    45: ICONS_SVG.fog, 48: ICONS_SVG.fog,
    51: ICONS_SVG.rain, 53: ICONS_SVG.rain, 55: ICONS_SVG.rain,
    61: ICONS_SVG.rain, 63: ICONS_SVG.rain, 65: ICONS_SVG.rain,
    71: ICONS_SVG.snow, 73: ICONS_SVG.snow, 75: ICONS_SVG.snow,
    95: ICONS_SVG.storm, 96: ICONS_SVG.storm, 99: ICONS_SVG.storm
  };

  function renderWeather(data, cityName) {
      const current = data.current_weather;
      const humidity = data.hourly.relativehumidity_2m[0] || '--';
      
      cityNameEl.textContent = cityName;
      tempEl.textContent = Math.round(current.temperature);
      descEl.textContent = WMO_CODES[current.weathercode] || 'Không xác định';
      windEl.textContent = current.windspeed;
      humidityEl.textContent = humidity;
      
      // Update Main Icon
      const mainIconSvg = WMO_ICONS[current.weathercode] || ICONS_SVG.cloud;
      const mainIconContainer = document.getElementById('weatherIconContainer');
      if (mainIconContainer) {
         mainIconContainer.innerHTML = mainIconSvg.replace('width="24" height="24"', 'width="32" height="32"');
      }
      
      // Render Forecast (Next days)
      if (forecastDiv && data.daily) {
        forecastDiv.innerHTML = '';
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        for (let i = 1; i < data.daily.time.length; i++) {
          if (data.daily.time[i]) {
            const date = new Date(data.daily.time[i]);
            const dayName = i === 1 ? 'Ngày mai' : days[date.getDay()];
            const minT = Math.round(data.daily.temperature_2m_min[i]);
            const maxT = Math.round(data.daily.temperature_2m_max[i]);
            const icon = WMO_ICONS[data.daily.weathercode[i]] || ICONS_SVG.cloud;
            
            forecastDiv.innerHTML += `
              <div class="forecast-item">
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-icon">${icon}</div>
                <div class="forecast-temps">
                  <span class="max">${maxT}°</span>
                  <span class="min">${minT}°</span>
                </div>
              </div>
            `;
          }
        }
      }

      loadingDiv.style.display = 'none';
      contentDiv.style.display = 'block';
  }

  async function fetchWeatherByCoords(lat, lon, cityName, force = false) {
    try {
      loadingDiv.style.display = 'block';
      contentDiv.style.display = 'none';
      errorDiv.style.display = 'none';

      if (!force) {
        const cacheResult = await new Promise(r => chrome.storage.local.get(['weatherCache'], r));
        if (cacheResult.weatherCache && cacheResult.weatherCache.lat === lat && cacheResult.weatherCache.lon === lon) {
           const age = Date.now() - cacheResult.weatherCache.timestamp;
           if (age < 3600000) { // 1 hour cache
              renderWeather(cacheResult.weatherCache.data, cityName);
              return;
           }
        }
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Lỗi tải dữ liệu thời tiết.");
      const data = await res.json();
      
      // Save cache
      chrome.storage.local.set({ 
        weatherLocation: { lat, lon, name: cityName },
        weatherCache: { lat, lon, timestamp: Date.now(), data: data, cityName: cityName }
      });
      
      renderWeather(data, cityName);
    } catch (e) {
      loadingDiv.style.display = 'none';
      errorDiv.textContent = e.message;
      errorDiv.style.display = 'block';
    }
  }

  async function searchCity(query) {
    try {
      loadingDiv.style.display = 'block';
      contentDiv.style.display = 'none';
      errorDiv.style.display = 'none';

      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=vi`);
      const data = await res.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error("Không tìm thấy thành phố này.");
      }
      
      const city = data.results[0];
      await fetchWeatherByCoords(city.latitude, city.longitude, city.name);
    } catch (e) {
      loadingDiv.style.display = 'none';
      errorDiv.textContent = e.message;
      errorDiv.style.display = 'block';
    }
  }

  async function autoLocateByIP() {
    try {
      loadingDiv.style.display = 'block';
      const res = await fetch('http://ip-api.com/json/');
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.status === 'success') {
        await fetchWeatherByCoords(data.lat, data.lon, data.city);
      } else {
        throw new Error();
      }
    } catch (e) {
      // Fallback
      await fetchWeatherByCoords(21.0285, 105.8542, "Hanoi");
    }
  }

  function initWeather() {
    chrome.storage.local.get(['weatherLocation'], (data) => {
      if (data.weatherLocation) {
        fetchWeatherByCoords(data.weatherLocation.lat, data.weatherLocation.lon, data.weatherLocation.name);
      } else {
        autoLocateByIP();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const q = cityInput.value.trim();
      if (q) searchCity(q);
    });
  }
  
  if (cityInput) {
    cityInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const q = cityInput.value.trim();
        if (q) searchCity(q);
      }
    });
  }

  initWeather();
});
