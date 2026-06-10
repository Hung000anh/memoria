document.addEventListener('DOMContentLoaded', () => {
  const { renderMarkdown } = window.utils;

  // DOM Elements
  const calPrevMonth = document.getElementById('calPrevMonth');
  const calNextMonth = document.getElementById('calNextMonth');
  const calMonthYear = document.getElementById('calMonthYear');
  const calendarDays = document.getElementById('calendarDays');
  const selectedDateText = document.getElementById('selectedDateText');
  const scheduleList = document.getElementById('scheduleList');
  const upcomingScheduleList = document.getElementById('upcomingScheduleList');
  const openAddScheduleModalBtn = document.getElementById('openAddScheduleModalBtn');

  // Modal Thêm/Sửa
  const scheduleModal = document.getElementById('scheduleModal');
  const scheduleModalTitle = document.getElementById('scheduleModalTitle');
  const schTitleInput = document.getElementById('schTitleInput');
  const schDateInput = document.getElementById('schDateInput');
  const schTimeInput = document.getElementById('schTimeInput');
  const schRecurrenceSelect = document.getElementById('schRecurrenceSelect');
  const schRecurrenceEndGroup = document.getElementById('schRecurrenceEndGroup');
  const schRecurrenceEndInput = document.getElementById('schRecurrenceEndInput');
  const schContentInput = document.getElementById('schContentInput');
  const saveScheduleBtn = document.getElementById('saveScheduleBtn');
  const cancelScheduleBtn = document.getElementById('cancelScheduleBtn');
  const scheduleErrorMsg = document.getElementById('scheduleErrorMsg');

  // Modal Chi tiết
  const viewScheduleModal = document.getElementById('viewScheduleModal');
  const viewSchTitle = document.getElementById('viewSchTitle');
  const viewSchTime = document.getElementById('viewSchTime');
  const viewSchContent = document.getElementById('viewSchContent');
  const editScheduleBtn = document.getElementById('editScheduleBtn');
  const deleteScheduleBtn = document.getElementById('deleteScheduleBtn');
  const closeViewScheduleBtn = document.getElementById('closeViewScheduleBtn');

  // Modal Xóa
  const deleteScheduleConfirmModal = document.getElementById('deleteScheduleConfirmModal');
  const deleteSchSingleBtn = document.getElementById('deleteSchSingleBtn');
  const deleteSchFutureBtn = document.getElementById('deleteSchFutureBtn');
  const deleteSchAllBtn = document.getElementById('deleteSchAllBtn');
  const cancelDeleteSchBtn = document.getElementById('cancelDeleteSchBtn');

  // State
  let currentDate = new Date();
  let selectedDate = new Date();
  selectedDate.setHours(0, 0, 0, 0);

  let schedulesData = [];
  let editingSchId = null;
  let viewingSchId = null;
  let viewingSchDate = null;

  // Khởi tạo ngày mặc định
  schDateInput.valueAsDate = new Date();

  // --- Utility Lịch ---
  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function formatDateString(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDateString(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return new Date(y, parseInt(m) - 1, d);
  }

  // Thuật toán kiểm tra sự kiện lặp lại
  function doesEventFallOnDate(sch, targetDate) {
    const evDate = parseDateString(sch.date);
    evDate.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() < evDate.getTime()) return false;
    
    if (sch.recurrenceEndDate) {
      const endDate = parseDateString(sch.recurrenceEndDate);
      endDate.setHours(0, 0, 0, 0);
      if (target.getTime() > endDate.getTime()) return false;
    }

    if (sch.recurrence === 'none') {
      return target.getTime() === evDate.getTime();
    } else if (sch.recurrence === 'daily') {
      return true;
    } else if (sch.recurrence === 'weekly') {
      return target.getDay() === evDate.getDay();
    } else if (sch.recurrence === 'monthly') {
      return target.getDate() === evDate.getDate();
    } else if (sch.recurrence === 'yearly') {
      return target.getDate() === evDate.getDate() && target.getMonth() === evDate.getMonth();
    }
    return false;
  }

  function getEventsForDate(date) {
    return schedulesData.filter(sch => doesEventFallOnDate(sch, date));
  }

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    calMonthYear.textContent = `Tháng ${month + 1}, ${year}`;
    calendarDays.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = getDaysInMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedStr = formatDateString(selectedDate);

    // Ngày tháng trước
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const dateObj = new Date(year, month - 1, d);
      calendarDays.appendChild(createDayElement(dateObj, d, 'other-month', selectedStr, today));
    }

    // Ngày tháng này
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      calendarDays.appendChild(createDayElement(dateObj, i, '', selectedStr, today));
    }

    // Ngày tháng sau
    const totalBoxes = firstDay + daysInMonth;
    const nextDays = (7 - (totalBoxes % 7)) % 7;
    for (let i = 1; i <= nextDays; i++) {
      const dateObj = new Date(year, month + 1, i);
      calendarDays.appendChild(createDayElement(dateObj, i, 'other-month', selectedStr, today));
    }
  }

  function createDayElement(dateObj, dayNum, extraClass, selectedStr, today) {
    const div = document.createElement('div');
    div.className = `cal-day ${extraClass}`;
    div.textContent = dayNum;
    
    const dateStr = formatDateString(dateObj);
    
    if (dateStr === formatDateString(today)) div.classList.add('today');
    if (dateStr === selectedStr) div.classList.add('selected');

    const events = getEventsForDate(dateObj);
    if (events.length > 0) div.classList.add('has-event');

    div.addEventListener('click', () => {
      selectedDate = dateObj;
      renderCalendar();
      renderScheduleList();
    });

    return div;
  }

  function renderScheduleList() {
    const events = getEventsForDate(selectedDate);
    scheduleList.innerHTML = '';

    const dateStr = formatDateString(selectedDate);
    const todayStr = formatDateString(new Date());
    
    if (dateStr === todayStr) {
      selectedDateText.textContent = `Sự kiện hôm nay (${dateStr})`;
    } else {
      selectedDateText.textContent = `Sự kiện ngày ${dateStr}`;
    }

    if (events.length === 0) {
      scheduleList.innerHTML = '<li class="list-item"><div class="list-item-content" style="color: var(--text-muted); font-size: 13px;">Không có sự kiện nào.</div></li>';
      return;
    }

    // Sắp xếp theo giờ
    events.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });

    events.forEach(sch => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.style.cursor = 'default';
      
      const timeText = sch.time ? `<span style="font-size: 11px; background: var(--nav-hover-bg); border: 1px solid var(--border-color); color: var(--text-muted); padding: 2px 6px; border-radius: 4px; margin-right: 6px; vertical-align: middle;">${sch.time}</span>` : '';
      const repIcon = sch.recurrence !== 'none' ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#10b981; margin-left:6px;"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>` : '';
      
      li.innerHTML = `
        <div class="list-item-content schedule-clickable-area" style="flex: 1; min-width: 0; cursor: pointer;" title="Nhấn để xem chi tiết">
          <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px; word-break: break-word; display: flex; align-items: center; flex-wrap: wrap;">${timeText}${sch.title} ${repIcon}</div>
          <div style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sch.content || 'Không có mô tả'}</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding-left: 10px; gap: 8px; flex-shrink: 0;">
          <button class="btn-edit btn-edit-sch" title="Sửa"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
          <button class="btn-delete btn-delete-sch" title="Xóa"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
        </div>
      `;

      li.querySelector('.schedule-clickable-area').addEventListener('click', () => openViewModal(sch));
      li.querySelector('.btn-edit-sch').addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(sch);
      });
      li.querySelector('.btn-delete-sch').addEventListener('click', (e) => {
        e.stopPropagation();
        viewingSchId = sch.id;
        viewingSchDate = selectedDate;
        if (sch.recurrence !== 'none') {
          deleteScheduleConfirmModal.classList.add('active');
        } else {
          deleteSchedule('all');
        }
      });

      scheduleList.appendChild(li);
    });
  }

  function renderUpcomingSchedules() {
    if (!upcomingScheduleList) return;
    upcomingScheduleList.innerHTML = '';
    
    let upcomingEvents = [];
    const maxUpcoming = 10;
    
    // Tìm sự kiện trong vòng 90 ngày tới
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    checkDate.setDate(checkDate.getDate() + 1); // Bắt đầu từ ngày mai
    
    for (let i = 0; i < 90; i++) {
      const eventsOnDate = getEventsForDate(checkDate);
      if (eventsOnDate.length > 0) {
        // Sao chép và gắn thêm ngày để hiển thị
        const dateStr = formatDateString(checkDate);
        eventsOnDate.forEach(e => {
          upcomingEvents.push({ ...e, displayDate: dateStr });
        });
      }
      if (upcomingEvents.length >= maxUpcoming) break;
      checkDate.setDate(checkDate.getDate() + 1);
    }
    
    // Cắt bớt nếu vượt quá số lượng
    upcomingEvents = upcomingEvents.slice(0, maxUpcoming);
    
    if (upcomingEvents.length === 0) {
      upcomingScheduleList.innerHTML = '<li class="list-item"><div class="list-item-content" style="color: var(--text-muted); font-size: 13px;">Không có sự kiện sắp tới.</div></li>';
      return;
    }
    
    upcomingEvents.forEach(sch => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.style.cursor = 'default';
      
      const dateText = `<span style="font-size: 11px; background: rgba(16, 185, 129, 0.1); color: var(--primary); padding: 2px 6px; border-radius: 4px; margin-right: 6px;">${sch.displayDate}</span>`;
      const timeText = sch.time ? `<span style="font-size: 11px; background: var(--nav-hover-bg); border: 1px solid var(--border-color); color: var(--text-muted); padding: 2px 6px; border-radius: 4px; margin-right: 6px; vertical-align: middle;">${sch.time}</span>` : '';
      
      li.innerHTML = `
        <div class="list-item-content schedule-clickable-area" style="flex: 1; min-width: 0; cursor: pointer;" title="Nhấn để xem chi tiết">
          <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px; word-break: break-word; display: flex; align-items: center; flex-wrap: wrap;">${dateText}${timeText}<span>${sch.title}</span></div>
          <div style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sch.content || 'Không có mô tả'}</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding-left: 10px; gap: 8px; flex-shrink: 0;">
          <button class="btn-edit btn-edit-sch" title="Sửa"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
          <button class="btn-delete btn-delete-sch" title="Xóa"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
        </div>
      `;

      li.querySelector('.schedule-clickable-area').addEventListener('click', () => openViewModal(sch));
      li.querySelector('.btn-edit-sch').addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(sch);
      });
      li.querySelector('.btn-delete-sch').addEventListener('click', (e) => {
        e.stopPropagation();
        viewingSchId = sch.id;
        viewingSchDate = sch.displayDate ? new Date(sch.displayDate) : selectedDate;
        if (sch.recurrence !== 'none') {
          deleteScheduleConfirmModal.classList.add('active');
        } else {
          deleteSchedule('all');
        }
      });

      upcomingScheduleList.appendChild(li);
    });
  }

  // --- Modals ---
  function openAddModal() {
    editingSchId = null;
    scheduleModalTitle.textContent = 'Thêm sự kiện';
    schTitleInput.value = '';
    schDateInput.valueAsDate = selectedDate;
    schTimeInput.value = '';
    schRecurrenceSelect.value = 'none';
    schRecurrenceEndInput.value = '';
    schContentInput.value = '';
    scheduleErrorMsg.style.display = 'none';
    schRecurrenceEndGroup.style.display = 'none';
    scheduleModal.classList.add('active');
  }

  function openEditModal(sch) {
    editingSchId = sch.id;
    scheduleModalTitle.textContent = 'Sửa sự kiện';
    schTitleInput.value = sch.title;
    schDateInput.value = sch.date;
    schTimeInput.value = sch.time || '';
    schRecurrenceSelect.value = sch.recurrence;
    schRecurrenceEndInput.value = sch.recurrenceEndDate || '';
    scheduleErrorMsg.style.display = 'none';
    schRecurrenceEndGroup.style.display = sch.recurrence === 'none' ? 'none' : 'block';
    
    viewScheduleModal.classList.remove('active');
    scheduleModal.classList.add('active');
  }

  function openViewModal(sch) {
    viewingSchId = sch.id;
    viewingSchDate = sch.displayDate ? new Date(sch.displayDate) : selectedDate;
    viewSchTitle.textContent = sch.title;
    
    let timeInfo = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Ngày gốc: ${sch.date}`;
    if (sch.time) timeInfo += ` - Lúc ${sch.time}`;
    if (sch.recurrence !== 'none') {
      const repMap = { daily: 'Hàng ngày', weekly: 'Hàng tuần', monthly: 'Hàng tháng', yearly: 'Hàng năm' };
      timeInfo += `<br><span style="color:#10b981; margin-top:4px; display:inline-block;">Lặp lại: ${repMap[sch.recurrence]}</span>`;
      if (sch.recurrenceEndDate) timeInfo += ` (Đến ${sch.recurrenceEndDate})`;
    }
    viewSchTime.innerHTML = timeInfo;
    
    viewSchContent.innerHTML = sch.content ? renderMarkdown(sch.content) : '<em>Không có mô tả</em>';
    viewScheduleModal.classList.add('active');
  }

  function closeModals() {
    scheduleModal.classList.remove('active');
    viewScheduleModal.classList.remove('active');
    deleteScheduleConfirmModal.classList.remove('active');
    editingSchId = null;
    viewingSchId = null;
  }

  // --- Logic Dữ liệu ---
  function loadSchedules() {
    chrome.storage.local.get({ schedules: [] }, (data) => {
      // Migrate old data
      let updated = false;
      const migrated = data.schedules.map(s => {
        if (!s.title && s.text) {
          updated = true;
          const today = new Date();
          return {
            id: s.id || Date.now() + Math.random(),
            title: s.text,
            content: "",
            date: formatDateString(today),
            time: s.time || "",
            recurrence: "none",
            recurrenceEndDate: ""
          };
        }
        return s;
      });

      if (updated) {
        chrome.storage.local.set({ schedules: migrated });
      }

      schedulesData = migrated;
      renderCalendar();
      renderScheduleList();
      renderUpcomingSchedules();
    });
  }

  function saveSchedule() {
    const title = schTitleInput.value.trim();
    if (!title) {
      scheduleErrorMsg.textContent = 'Vui lòng nhập tiêu đề sự kiện!';
      scheduleErrorMsg.style.display = 'block';
      return;
    }
    const date = schDateInput.value;
    if (!date) {
      scheduleErrorMsg.textContent = 'Vui lòng chọn ngày!';
      scheduleErrorMsg.style.display = 'block';
      return;
    }

    const sch = {
      id: editingSchId || Date.now(),
      title,
      content: schContentInput.value.trim(),
      date,
      time: schTimeInput.value,
      recurrence: schRecurrenceSelect.value,
      recurrenceEndDate: schRecurrenceSelect.value === 'none' ? '' : schRecurrenceEndInput.value
    };

    chrome.storage.local.get({ schedules: [] }, (data) => {
      let schedules = data.schedules;
      
      // Chuyển sang cấu trúc mới nhất
      schedules = schedules.map(s => (!s.title && s.text) ? { ...s, title: s.text, text: undefined, date: s.date || formatDateString(new Date()), recurrence: s.recurrence || 'none' } : s);

      if (editingSchId) {
        const idx = schedules.findIndex(s => s.id === editingSchId);
        if (idx !== -1) schedules[idx] = sch;
      } else {
        schedules.push(sch);
      }

      // Xóa alarm cũ
      if (editingSchId) chrome.runtime.sendMessage({ action: 'delete_alarm', id: editingSchId });
      
      // Tạo alarm mới
      if (sch.time) {
        chrome.runtime.sendMessage({ action: 'create_alarm', schedule: sch });
      }

      chrome.storage.local.set({ schedules }, () => {
        closeModals();
        loadSchedules();
      });
    });
  }

  function deleteSchedule(deleteType) {
    if (!viewingSchId) return;

    chrome.storage.local.get({ schedules: [] }, (data) => {
      let schedules = data.schedules;
      const idx = schedules.findIndex(s => s.id === viewingSchId);
      if (idx === -1) return;

      const sch = schedules[idx];

      if (deleteType === 'single' && sch.recurrence !== 'none') {
        if (!sch.exceptions) sch.exceptions = [];
        sch.exceptions.push(formatDateString(viewingSchDate || selectedDate));
        schedules[idx] = sch;
      } else if (deleteType === 'future' && sch.recurrence !== 'none') {
        const endD = new Date(viewingSchDate || selectedDate);
        endD.setDate(endD.getDate() - 1);
        sch.recurrenceEndDate = formatDateString(endD);
        schedules[idx] = sch;
      } else {
        // Xóa toàn bộ
        schedules.splice(idx, 1);
        chrome.runtime.sendMessage({ action: 'delete_alarm', id: sch.id });
      }

      chrome.storage.local.set({ schedules }, () => {
        closeModals();
        loadSchedules();
      });
    });
  }

  // --- Bổ sung xử lý Exceptions vào thuật toán ---
  const originalDoesEventFallOnDate = doesEventFallOnDate;
  doesEventFallOnDate = function(sch, targetDate) {
    const targetStr = formatDateString(targetDate);
    if (sch.exceptions && sch.exceptions.includes(targetStr)) return false;
    return originalDoesEventFallOnDate(sch, targetDate);
  };

  // --- Events ---
  calPrevMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  calNextMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  openAddScheduleModalBtn.addEventListener('click', openAddModal);
  cancelScheduleBtn.addEventListener('click', closeModals);
  saveScheduleBtn.addEventListener('click', saveSchedule);

  schRecurrenceSelect.addEventListener('change', (e) => {
    schRecurrenceEndGroup.style.display = e.target.value === 'none' ? 'none' : 'block';
  });

  closeViewScheduleBtn.addEventListener('click', closeModals);
  
  editScheduleBtn.addEventListener('click', () => {
    const sch = schedulesData.find(s => s.id === viewingSchId);
    if (sch) openEditModal(sch);
  });

  deleteScheduleBtn.addEventListener('click', () => {
    const sch = schedulesData.find(s => s.id === viewingSchId);
    if (sch) {
      if (sch.recurrence !== 'none') {
        viewScheduleModal.classList.remove('active');
        deleteScheduleConfirmModal.classList.add('active');
      } else {
        deleteSchedule('all');
      }
    }
  });

  deleteSchSingleBtn.addEventListener('click', () => deleteSchedule('single'));
  deleteSchFutureBtn.addEventListener('click', () => deleteSchedule('future'));
  deleteSchAllBtn.addEventListener('click', () => deleteSchedule('all'));
  cancelDeleteSchBtn.addEventListener('click', closeModals);

  window.addEventListener('app_data_changed', loadSchedules);

  // Initialize
  renderCalendar();
  loadSchedules();
});
