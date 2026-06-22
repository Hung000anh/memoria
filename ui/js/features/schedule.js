document.addEventListener('DOMContentLoaded', () => {
  const { renderMarkdown } = window.utils;
  const authService = window.authService;

  // DOM Elements
  const calPrevMonth = document.getElementById('calPrevMonth');
  const calNextMonth = document.getElementById('calNextMonth');
  const calMonthYear = document.getElementById('calMonthYear');
  const calendarDays = document.getElementById('calendarDays');
  const selectedDateText = document.getElementById('selectedDateText');
  const scheduleList = document.getElementById('scheduleList');
  const scheduleTaskList = document.getElementById('scheduleTaskList');
  const upcomingScheduleList = document.getElementById('upcomingScheduleList');
  const openAddScheduleModalBtn = document.getElementById('openAddScheduleModalBtn');

  // Modal Thêm/Sửa
  const scheduleModal = document.getElementById('scheduleModal');
  const schTypeEventBtn = document.getElementById('schTypeEventBtn');
  const schTypeTaskBtn = document.getElementById('schTypeTaskBtn');
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

  // Modal Xóa (Không cần thiết lắm vì Google tự xử lý xóa Instance của Recurring event, nhưng giữ để tương thích giao diện)
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
  let upcomingEventsData = [];
  let editingSchId = null;
  let viewingSchId = null;
  let viewingSchDate = null;
  let selectedType = 'event';

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

  // Google Calendar API trả về danh sách các instances đã mở rộng (singleEvents=true)
  // nên thuật toán kiểm tra sự kiện rơi vào ngày đơn giản chỉ là so khớp chuỗi ngày
  function doesEventFallOnDate(sch, targetDate) {
    return sch.date === formatDateString(targetDate);
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
    const allItems = getEventsForDate(selectedDate);
    
    // Tách Sự kiện và Công việc dựa trên ID lịch của TasksManager
    const taskCalId = window.tasksManager && window.tasksManager.calendarId;
    const events = allItems.filter(sch => sch.calendarId !== taskCalId);
    const tasks = allItems.filter(sch => sch.calendarId === taskCalId);

    scheduleList.innerHTML = '';
    if (scheduleTaskList) {
      scheduleTaskList.innerHTML = '';
    }

    const dateStr = formatDateString(selectedDate);
    const todayStr = formatDateString(new Date());
    
    if (dateStr === todayStr) {
      selectedDateText.textContent = `Sự kiện hôm nay (${dateStr})`;
    } else {
      selectedDateText.textContent = `Sự kiện ngày ${dateStr}`;
    }

    // 1. Render danh sách Sự kiện (Events)
    if (events.length === 0) {
      scheduleList.innerHTML = '<li class="list-item"><div class="list-item-content" style="color: var(--text-muted); font-size: 13px;">Không có sự kiện nào.</div></li>';
    } else {
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
          
          if (sch.rawEvent && sch.rawEvent.recurrence) {
            deleteScheduleConfirmModal.classList.add('active');
          } else {
            deleteSchedule('all');
          }
        });

        scheduleList.appendChild(li);
      });
    }

    // 2. Render danh sách Công việc (Tasks)
    if (scheduleTaskList) {
      if (tasks.length === 0) {
        scheduleTaskList.innerHTML = '<li class="list-item"><div class="list-item-content" style="color: var(--text-muted); font-size: 13px;">Không có công việc nào.</div></li>';
      } else {
        tasks.sort((a, b) => {
          if (!a.time && !b.time) return 0;
          if (!a.time) return 1;
          if (!b.time) return -1;
          return a.time.localeCompare(b.time);
        });

        tasks.forEach(sch => {
          const li = document.createElement('li');
          li.className = 'list-item';
          li.style.cursor = 'default';
          li.style.display = 'flex';
          li.style.alignItems = 'flex-start';
          
          const isCompleted = sch.title.startsWith("✓ ") || (sch.rawEvent && sch.rawEvent.extendedProperties && sch.rawEvent.extendedProperties.private && sch.rawEvent.extendedProperties.private.status === "completed");
          const cleanTitle = sch.title.startsWith("✓ ") ? sch.title.substring(2) : sch.title;
          
          const titleStyle = isCompleted ? 'text-decoration: line-through; color: var(--text-muted); opacity: 0.6;' : '';
          const timeText = sch.time ? `<span style="font-size: 11px; background: var(--nav-hover-bg); border: 1px solid var(--border-color); color: var(--text-muted); padding: 2px 6px; border-radius: 4px; margin-right: 6px; vertical-align: middle; ${titleStyle}">${sch.time}</span>` : '';
          const repIcon = sch.recurrence !== 'none' ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#10b981; margin-left:6px;"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>` : '';

          li.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${isCompleted ? "checked" : ""} style="margin-right: 10px; margin-top: 4px; cursor: pointer; flex-shrink: 0; width: 16px; height: 16px;">
            <div class="list-item-content schedule-clickable-area" style="flex: 1; min-width: 0; cursor: pointer;" title="Nhấn để xem chi tiết">
              <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px; word-break: break-word; display: flex; align-items: center; flex-wrap: wrap; ${titleStyle}">${timeText}${cleanTitle} ${repIcon}</div>
              <div style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ${titleStyle}">${sch.content || 'Không có mô tả'}</div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding-left: 10px; gap: 8px; flex-shrink: 0;">
              <button class="btn-edit btn-edit-sch" title="Sửa"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
              <button class="btn-delete btn-delete-sch" title="Xóa"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
            </div>
          `;

          const checkbox = li.querySelector('.task-checkbox');
          checkbox.addEventListener('change', async (e) => {
            e.stopPropagation();
            if (window.tasksManager) {
              await window.tasksManager.toggleTaskStatus(sch.id, e.target.checked);
            }
          });

          li.querySelector('.schedule-clickable-area').addEventListener('click', () => openViewModal(sch));
          li.querySelector('.btn-edit-sch').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(sch);
          });
          li.querySelector('.btn-delete-sch').addEventListener('click', (e) => {
            e.stopPropagation();
            viewingSchId = sch.id;
            viewingSchDate = selectedDate;
            
            if (sch.rawEvent && sch.rawEvent.recurrence) {
              deleteScheduleConfirmModal.classList.add('active');
            } else {
              deleteSchedule('all');
            }
          });

          scheduleTaskList.appendChild(li);
        });
      }
    }
  }

  function renderUpcomingSchedules() {
    if (!upcomingScheduleList) return;
    upcomingScheduleList.innerHTML = '';
    
    // Lấy danh sách các sự kiện tương lai trong upcomingEventsData
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcomingEvents = upcomingEventsData.filter(sch => {
      const evDate = parseDateString(sch.date);
      const isCompleted = sch.title.startsWith("✓ ") || sch.rawEvent?.colorId === "8" || sch.rawEvent?.colorId === "2" || sch.rawEvent?.colorId === "10" || (sch.rawEvent?.extendedProperties?.private?.status === "completed");
      return evDate.getTime() >= now.getTime() && !isCompleted;
    }).sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    }).slice(0, 10); // Lấy tối đa 10 sự kiện sắp tới

    if (upcomingEvents.length === 0) {
      upcomingScheduleList.innerHTML = '<li class="list-item"><div class="list-item-content" style="color: var(--text-muted); font-size: 13px;">Không có sự kiện sắp tới.</div></li>';
      return;
    }
    
    upcomingEvents.forEach(sch => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.style.cursor = 'default';
      
      const dateText = `<span style="font-size: 11px; background: rgba(16, 185, 129, 0.1); color: var(--primary); padding: 2px 6px; border-radius: 4px; margin-right: 6px;">${sch.date}</span>`;
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
        viewingSchDate = parseDateString(sch.date);
        if (sch.rawEvent && sch.rawEvent.recurrence) {
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

    // Reset segmented control for Add mode
    selectedType = 'event';
    if (schTypeEventBtn) {
      schTypeEventBtn.classList.add('active');
      schTypeEventBtn.disabled = false;
    }
    if (schTypeTaskBtn) {
      schTypeTaskBtn.classList.remove('active');
      schTypeTaskBtn.disabled = false;
    }
    saveScheduleBtn.textContent = 'Lưu sự kiện';

    scheduleModal.classList.add('active');
  }

  function openEditModal(sch) {
    editingSchId = sch.id;
    schTitleInput.value = sch.title.startsWith("✓ ") ? sch.title.substring(2) : sch.title;
    schDateInput.value = sch.date;
    schTimeInput.value = sch.time || '';
    
    // Map Google Recurrence Rule back to selector values if possible
    let recValue = 'none';
    let recEndDate = '';
    if (sch.rawEvent && sch.rawEvent.recurrence && sch.rawEvent.recurrence.length > 0) {
      const rrule = sch.rawEvent.recurrence[0];
      if (rrule.includes('FREQ=DAILY')) recValue = 'daily';
      else if (rrule.includes('FREQ=WEEKLY')) recValue = 'weekly';
      else if (rrule.includes('FREQ=MONTHLY')) recValue = 'monthly';
      else if (rrule.includes('FREQ=YEARLY')) recValue = 'yearly';
      
      const untilMatch = rrule.match(/UNTIL=([0-9T]+)/);
      if (untilMatch) {
        const u = untilMatch[1];
        recEndDate = `${u.substring(0,4)}-${u.substring(4,6)}-${u.substring(6,8)}`;
      }
    }
    
    schRecurrenceSelect.value = recValue;
    schRecurrenceEndInput.value = recEndDate;
    schContentInput.value = sch.content;
    scheduleErrorMsg.style.display = 'none';
    schRecurrenceEndGroup.style.display = recValue === 'none' ? 'none' : 'block';

    // Set segmented control & title based on type, then disable it
    const taskCalId = window.tasksManager && window.tasksManager.calendarId;
    if (sch.calendarId === taskCalId) {
      selectedType = 'task';
      scheduleModalTitle.textContent = 'Sửa công việc';
      if (schTypeTaskBtn) schTypeTaskBtn.classList.add('active');
      if (schTypeEventBtn) schTypeEventBtn.classList.remove('active');
      saveScheduleBtn.textContent = 'Lưu công việc';
    } else {
      selectedType = 'event';
      scheduleModalTitle.textContent = 'Sửa sự kiện';
      if (schTypeEventBtn) schTypeEventBtn.classList.add('active');
      if (schTypeTaskBtn) schTypeTaskBtn.classList.remove('active');
      saveScheduleBtn.textContent = 'Lưu sự kiện';
    }
    if (schTypeEventBtn) schTypeEventBtn.disabled = true;
    if (schTypeTaskBtn) schTypeTaskBtn.disabled = true;
    
    viewScheduleModal.classList.remove('active');
    scheduleModal.classList.add('active');
  }

  function openViewModal(sch) {
    viewingSchId = sch.id;
    viewingSchDate = parseDateString(sch.date);

    const taskCalId = window.tasksManager && window.tasksManager.calendarId;
    const isTask = sch.calendarId === taskCalId;
    const isCompleted = isTask && (sch.title.startsWith("✓ ") || (sch.rawEvent && (sch.rawEvent.colorId === "8" || sch.rawEvent.colorId === "2" || sch.rawEvent.colorId === "10")) || (sch.rawEvent?.extendedProperties?.private?.status === "completed"));
    const cleanTitle = (isTask && sch.title.startsWith("✓ ")) ? sch.title.substring(2) : sch.title;

    viewSchTitle.textContent = cleanTitle;
    
    if (isCompleted) {
      viewSchTitle.style.textDecoration = 'line-through';
      viewSchTitle.style.opacity = '0.6';
    } else {
      viewSchTitle.style.textDecoration = 'none';
      viewSchTitle.style.opacity = '1';
    }
    
    let timeInfo = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Ngày: ${sch.date}`;
    if (sch.time) timeInfo += ` - Lúc ${sch.time}`;
    if (sch.recurrence !== 'none') {
      const repMap = { daily: 'Hàng ngày', weekly: 'Hàng tuần', monthly: 'Hàng tháng', yearly: 'Hàng năm' };
      timeInfo += `<br><span style="color:#10b981; margin-top:4px; display:inline-block;">Lặp lại: ${repMap[sch.recurrence]}</span>`;
      if (sch.rawEvent && sch.rawEvent.recurrence[0].includes('UNTIL=')) {
        const untilMatch = sch.rawEvent.recurrence[0].match(/UNTIL=([0-9T]+)/);
        if (untilMatch) {
          const u = untilMatch[1];
          timeInfo += ` (Đến ${u.substring(0,4)}-${u.substring(4,6)}-${u.substring(6,8)})`;
        }
      }
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

  // --- Integration Google Calendar API ---
  async function loadSchedules() {
    try {
      // Lấy khoảng thời gian của lịch hiển thị (tháng hiện tại +/- 7 ngày để an toàn)
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const timeMinDate = new Date(year, month, 1 - 7);
      const timeMaxDate = new Date(year, month + 1, 7);
      
      const timeMin = timeMinDate.toISOString();
      const timeMax = timeMaxDate.toISOString();

      // 1. Lấy danh sách toàn bộ các lịch của user
      let calendarIds = ['primary'];
      try {
        const listUrl = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
        const listRes = await authService.fetchWithAuth(listUrl);
        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData.items && listData.items.length > 0) {
            calendarIds = listData.items
              .filter(cal => cal.selected || cal.primary || cal.summary === "Công việc")
              .map(cal => cal.id);
          }
        }
      } catch (err) {
        console.warn("Không thể tải danh sách lịch, sử dụng lịch chính mặc định:", err);
      }

      if (calendarIds.length === 0) {
        calendarIds = ['primary'];
      }
      calendarIds = [...new Set(calendarIds)]; // Loại bỏ trùng lặp

      // 2. Fetch song song các sự kiện từ các lịch được chọn cho tháng lịch hiển thị
      const eventPromises = calendarIds.map(async (calendarId) => {
        try {
          const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`;
          const res = await authService.fetchWithAuth(url);
          if (!res.ok) {
            console.warn(`Lỗi API lịch ${calendarId}: ${res.status}`);
            return [];
          }
          const data = await res.json();
          const items = data.items || [];
          return items
            .filter(ev => ev.status !== 'cancelled')
            .map(ev => ({
              ...ev,
              _calendarId: calendarId
            }));
        } catch (e) {
          console.error(`Lỗi tải sự kiện từ lịch ${calendarId}:`, e);
          return [];
        }
      });

      // 3. Fetch song song các sự kiện tương lai thực tế (từ thời điểm hiện tại trở đi) cho danh sách "Sự kiện sắp tới"
      const nowISO = new Date().toISOString();
      const upcomingPromises = calendarIds.map(async (calendarId) => {
        try {
          const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${nowISO}&maxResults=50&singleEvents=true`;
          const res = await authService.fetchWithAuth(url);
          if (!res.ok) {
            console.warn(`Lỗi API lịch sắp tới ${calendarId}: ${res.status}`);
            return [];
          }
          const data = await res.json();
          const items = data.items || [];
          return items
            .filter(ev => ev.status !== 'cancelled')
            .map(ev => ({
              ...ev,
              _calendarId: calendarId
            }));
        } catch (e) {
          console.error(`Lỗi tải sự kiện sắp tới từ lịch ${calendarId}:`, e);
          return [];
        }
      });

      const [monthlyResults, upcomingResults] = await Promise.all([
        Promise.all(eventPromises),
        Promise.all(upcomingPromises)
      ]);

      const allEvents = monthlyResults.flat();
      const allUpcomingEvents = upcomingResults.flat();

      // Chuyển đổi dữ liệu Google Calendar sang định dạng hiển thị của Lịch (Monthly)
      schedulesData = allEvents.map(ev => {
        const dateStr = ev.start.dateTime ? ev.start.dateTime.split('T')[0] : ev.start.date;
        const timeStr = ev.start.dateTime ? ev.start.dateTime.split('T')[1].substring(0, 5) : '';
        
        let rec = 'none';
        if (ev.recurrence) rec = 'weekly'; // Chỉ làm cờ báo icon lặp lại
        if (ev.recurringEventId) rec = 'weekly';

        return {
          id: ev.id,
          calendarId: ev._calendarId || 'primary',
          title: ev.summary || "(Không có tiêu đề)",
          content: ev.description || "",
          date: dateStr,
          time: timeStr,
          recurrence: rec,
          rawEvent: ev // Lưu raw để sửa/xóa
        };
      });

      // Chuyển đổi dữ liệu Google Calendar sang định dạng hiển thị Sự kiện sắp tới (All-time)
      upcomingEventsData = allUpcomingEvents.map(ev => {
        const dateStr = ev.start.dateTime ? ev.start.dateTime.split('T')[0] : ev.start.date;
        const timeStr = ev.start.dateTime ? ev.start.dateTime.split('T')[1].substring(0, 5) : '';
        
        let rec = 'none';
        if (ev.recurrence) rec = 'weekly';
        if (ev.recurringEventId) rec = 'weekly';

        return {
          id: ev.id,
          calendarId: ev._calendarId || 'primary',
          title: ev.summary || "(Không có tiêu đề)",
          content: ev.description || "",
          date: dateStr,
          time: timeStr,
          recurrence: rec,
          rawEvent: ev
        };
      });

      renderCalendar();
      renderScheduleList();
      renderUpcomingSchedules();
    } catch (e) {
      console.error(e);
      scheduleList.innerHTML = `<li class="list-item"><div class="list-item-content" style="color: #ef4444; font-size: 13px;">Lỗi: ${e.message}</div></li>`;
    }
  }

  // Hàm tạo giờ kết thúc (tự động cộng 1 giờ)
  function getEndTime(dateStr, timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const d = new Date(dateStr);
    d.setHours(parseInt(hours) + 1, parseInt(minutes));
    return d.toISOString();
  }

  // Hàm tạo ngày kết thúc độc quyền cho sự kiện cả ngày
  function getNextDay(dateStr) {
    const d = parseDateString(dateStr);
    d.setDate(d.getDate() + 1);
    return formatDateString(d);
  }

  async function saveSchedule() {
    const title = schTitleInput.value.trim();
    if (!title) {
      scheduleErrorMsg.textContent = selectedType === 'task' ? 'Vui lòng nhập tiêu đề công việc!' : 'Vui lòng nhập tiêu đề sự kiện!';
      scheduleErrorMsg.style.display = 'block';
      return;
    }
    const date = schDateInput.value;
    if (!date) {
      scheduleErrorMsg.textContent = 'Vui lòng chọn ngày!';
      scheduleErrorMsg.style.display = 'block';
      return;
    }

    const time = schTimeInput.value;
    const recurrence = schRecurrenceSelect.value;
    const recurrenceEndDate = schRecurrenceEndInput.value;

    // Thiết lập múi giờ địa phương
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Body của API Event Google Calendar
    const eventBody = {
      summary: title,
      description: schContentInput.value.trim(),
      start: time ? {
        dateTime: `${date}T${time}:00`,
        timeZone
      } : {
        date: date
      },
      end: time ? {
        dateTime: getEndTime(date, time),
        timeZone
      } : {
        date: getNextDay(date)
      }
    };

    // Quy tắc lặp của Google Calendar (RRULE)
    if (recurrence !== 'none') {
      let rrule = `FREQ=${recurrence.toUpperCase()}`;
      if (recurrenceEndDate) {
        // UNTIL trong RRULE cần có định dạng YYYYMMDD
        const untilStr = recurrenceEndDate.replace(/-/g, '');
        rrule += `;UNTIL=${untilStr}T235959Z`;
      }
      eventBody.recurrence = [`RRULE:${rrule}`];
    }

    // Task-specific logic
    if (selectedType === 'task') {
      let isCompleted = false;
      if (editingSchId) {
        const sch = schedulesData.find(s => s.id === editingSchId);
        if (sch) {
          isCompleted = sch.title.startsWith("✓ ") || 
                        (sch.rawEvent && (sch.rawEvent.colorId === "8" || sch.rawEvent.colorId === "2" || sch.rawEvent.colorId === "10")) || 
                        (sch.rawEvent && sch.rawEvent.extendedProperties && sch.rawEvent.extendedProperties.private && sch.rawEvent.extendedProperties.private.status === "completed");
        }
      }
      
      let isTaskOverdue = false;
      if (!isCompleted) {
        const todayObj = new Date();
        const todayStr = formatDateString(todayObj);
        if (date < todayStr) {
          isTaskOverdue = true;
        } else if (date === todayStr && time) {
          const nowTimeStr = todayObj.toTimeString().substring(0, 5);
          if (time < nowTimeStr) {
            isTaskOverdue = true;
          }
        }
      }
      
      eventBody.summary = isCompleted ? (title.startsWith("✓ ") ? title : "✓ " + title) : title;
      eventBody.colorId = isCompleted ? "2" : (isTaskOverdue ? "11" : "5");
      eventBody.extendedProperties = {
        private: {
          status: isCompleted ? "completed" : "needsAction",
          recurrence: recurrence
        }
      };
    }

    saveScheduleBtn.disabled = true;
    saveScheduleBtn.textContent = 'Đang lưu...';

    try {
      let calendarId = 'primary';
      if (selectedType === 'task') {
        calendarId = window.tasksManager && window.tasksManager.calendarId;
        if (!calendarId) {
          throw new Error("Không tìm thấy lịch Công việc. Vui lòng thử lại sau.");
        }
      }

      let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
      let method = 'POST';

      if (editingSchId) {
        const sch = schedulesData.find(s => s.id === editingSchId);
        const calId = sch ? (sch.calendarId || 'primary') : 'primary';
        url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${editingSchId}`;
        method = 'PUT';
      }

      const res = await authService.fetchWithAuth(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventBody)
      });

      if (!res.ok) throw new Error("Không thể cập nhật sự kiện.");

      // Sync checklist
      if (window.tasksManager && (selectedType === 'task' || (editingSchId && schedulesData.find(s => s.id === editingSchId)?.calendarId === window.tasksManager.calendarId))) {
        window.tasksManager.loadTasks();
      }

      closeModals();
      loadSchedules();
    } catch (e) {
      console.error(e);
      scheduleErrorMsg.textContent = 'Lỗi lưu sự kiện: ' + e.message;
      scheduleErrorMsg.style.display = 'block';
    } finally {
      saveScheduleBtn.disabled = false;
      saveScheduleBtn.textContent = selectedType === 'task' ? 'Lưu công việc' : 'Lưu sự kiện';
    }
  }

  async function deleteSchedule(deleteType) {
    if (!viewingSchId) return;

    const backupSchedules = [...schedulesData];
    const sch = schedulesData.find(s => s.id === viewingSchId);
    const calendarId = sch ? (sch.calendarId || 'primary') : 'primary';

    // Optimistic UI Update - Cập nhật UI ngay lập tức
    schedulesData = schedulesData.filter(s => s.id !== viewingSchId);
    renderCalendar();
    renderScheduleList();
    renderUpcomingSchedules();
    closeModals();

    try {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${viewingSchId}`;
      const res = await authService.fetchWithAuth(url, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error("Không thể xóa sự kiện.");

      // Sync checklist
      if (window.tasksManager && sch && sch.calendarId === window.tasksManager.calendarId) {
        window.tasksManager.loadTasks();
      }

      // Load lại ngầm để đồng bộ dữ liệu
      loadSchedules();
    } catch (e) {
      console.error(e);
      alert("Lỗi khi xóa sự kiện: " + e.message);
      // Khôi phục lại UI cũ nếu xóa lỗi
      schedulesData = backupSchedules;
      renderCalendar();
      renderScheduleList();
      renderUpcomingSchedules();
    }
  }

  // --- Kiểm tra đăng nhập trước khi hiển thị nội dung lịch ---
  async function checkAuthAndLoad() {
    const session = await authService.checkSession();
    if (session.loggedIn) {
      document.querySelector('.schedule-top-row').style.display = 'flex';
      document.querySelector('.schedule-upcoming').style.display = 'block';
      openAddScheduleModalBtn.style.display = 'block';
      
      const msgDiv = document.getElementById('scheduleAuthMessage');
      if (msgDiv) msgDiv.style.display = 'none';
      
      loadSchedules();
    } else {
      document.querySelector('.schedule-top-row').style.display = 'none';
      document.querySelector('.schedule-upcoming').style.display = 'none';
      openAddScheduleModalBtn.style.display = 'none';
      
      let msgDiv = document.getElementById('scheduleAuthMessage');
      if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'scheduleAuthMessage';
        msgDiv.style.cssText = 'text-align: center; padding: 60px 20px; color: var(--text-muted);';
        msgDiv.innerHTML = '<p>Vui lòng đăng nhập Google ở mục <strong>Công việc</strong> để đồng bộ và hiển thị Sự kiện.</p>';
        document.getElementById('schedule-view').appendChild(msgDiv);
      } else {
        msgDiv.style.display = 'block';
      }
    }
  }

  // --- Events ---
  calPrevMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
    loadSchedules(); // Tải lại sự kiện của tháng mới
  });
  
  calNextMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
    loadSchedules(); // Tải lại sự kiện của tháng mới
  });

  openAddScheduleModalBtn.addEventListener('click', openAddModal);
  cancelScheduleBtn.addEventListener('click', closeModals);
  saveScheduleBtn.addEventListener('click', saveSchedule);

  // Segmented control click events
  if (schTypeEventBtn) {
    schTypeEventBtn.addEventListener('click', () => {
      selectedType = 'event';
      schTypeEventBtn.classList.add('active');
      if (schTypeTaskBtn) schTypeTaskBtn.classList.remove('active');
      saveScheduleBtn.textContent = 'Lưu sự kiện';
    });
  }

  if (schTypeTaskBtn) {
    schTypeTaskBtn.addEventListener('click', () => {
      selectedType = 'task';
      schTypeTaskBtn.classList.add('active');
      if (schTypeEventBtn) schTypeEventBtn.classList.remove('active');
      saveScheduleBtn.textContent = 'Lưu công việc';
    });
  }

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
      if (sch.rawEvent && sch.rawEvent.recurrence) {
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

  // Lắng nghe thay đổi dữ liệu (từ tab công việc hoặc các pane khác)
  window.addEventListener('app_data_changed', checkAuthAndLoad);
  window.addEventListener('task_changed', loadSchedules);

  // Initialize
  checkAuthAndLoad();
});
