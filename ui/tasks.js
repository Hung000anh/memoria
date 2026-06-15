// tasks.js - Xử lý logic và API Công việc thuần Google Calendar API

class TasksManager {
  constructor() {
    this.authService = window.authService;
    this.calendarId = null;   // ID của lịch phụ "Công việc"
    this.tasks = [];
    this.completedExpanded = false; // Trạng thái co/giãn mục đã hoàn thành
    this.expandedGroups = new Set(); // Các nhóm lặp lại đang mở rộng
    
    // Bind DOM Elements
    this.tasksContentArea = document.getElementById("tasksContentArea");
    this.authMessageArea = document.getElementById("authMessageArea");
    this.authLoginLargeBtn = document.getElementById("authLoginLargeBtn");
    
    this.taskList = document.getElementById("taskList");
    this.openAddTaskModalBtn = document.getElementById("openAddTaskModalBtn");

    // Modal Sửa/Thêm Công việc Elements
    this.taskModal = document.getElementById("taskModal");
    this.taskModalTitle = document.getElementById("taskModalTitle");
    this.taskTitleInput = document.getElementById("taskTitleInput");
    this.taskNotesInput = document.getElementById("taskNotesInput");
    this.taskStartDueInput = document.getElementById("taskStartDueInput");
    this.taskDueInput = document.getElementById("taskDueInput");
    
    this.taskStartTimeInputGroup = document.getElementById("taskStartTimeInputGroup");
    this.taskStartTimeInput = document.getElementById("taskStartTimeInput");

    this.taskStartDueInput = document.getElementById("taskStartDueInput");
    this.taskAllDayGroup = document.getElementById("taskAllDayGroup");
    this.taskRecurrenceGroup = document.getElementById("taskRecurrenceGroup");

    this.taskRecurrenceSelect = document.getElementById("taskRecurrenceSelect");
    this.taskErrorMsg = document.getElementById("taskErrorMsg");
    this.saveTaskBtn = document.getElementById("saveTaskBtn");
    this.cancelTaskBtn = document.getElementById("cancelTaskBtn");

    this.editingTaskId = null;

    this.initEvents();
  }

  // Khởi tạo các event listeners
  initEvents() {
    // Đăng nhập
    const handleLogin = async () => {
      try {
        const result = await this.authService.login(true);
        this.updateAuthUI(result);
        this.initializeCalendar();
      } catch (err) {
        console.error("Đăng nhập thất bại:", err);
        alert("Không thể đăng nhập Google: " + err.message);
      }
    };

    if (this.authLoginLargeBtn) this.authLoginLargeBtn.addEventListener("click", handleLogin);

    // Mở Modal Thêm
    if (this.openAddTaskModalBtn) {
      this.openAddTaskModalBtn.addEventListener("click", () => {
        this.openTaskModal(null);
      });
    }

    // Lắng nghe sự thay đổi của ngày để cập nhật các tùy chọn lặp lại động
    if (this.taskDueInput) {
      this.taskDueInput.addEventListener("change", () => {
        this.updateRecurrenceOptions();
      });
    }
    if (this.taskStartDueInput) {
      this.taskStartDueInput.addEventListener("change", () => {
        this.updateRecurrenceOptions();
      });
      this.taskStartDueInput.addEventListener("input", () => {
        if (this.taskRecurrenceSelect && this.taskRecurrenceSelect.value === "daily" && this.taskDueInput) {
          this.taskDueInput.value = this.taskStartDueInput.value;
        }
      });
    }

    if (this.taskRecurrenceSelect) {
      this.taskRecurrenceSelect.addEventListener("change", () => this.handleRecurrenceChange());
    }

    // Lắng nghe sự thay đổi của checkbox Cả ngày
    const allDayCheckbox = document.getElementById("taskAllDayCheckbox");
    const timeInputGroup = document.getElementById("taskTimeInputGroup");
    const startTimeInputGroup = document.getElementById("taskStartTimeInputGroup");
    if (allDayCheckbox && timeInputGroup && startTimeInputGroup) {
      allDayCheckbox.addEventListener("change", (e) => {
        const displayVal = e.target.checked ? "none" : "block";
        timeInputGroup.style.display = displayVal;
        startTimeInputGroup.style.display = displayVal;
      });
    }

    // Lắng nghe sự kiện lưu/hủy từ Modal Sửa
    if (this.saveTaskBtn) {
      this.saveTaskBtn.addEventListener("click", () => this.handleSaveTask());
    }
    if (this.cancelTaskBtn) {
      this.cancelTaskBtn.addEventListener("click", () => this.closeTaskModal());
    }

    // Lắng nghe sự kiện báo hết hạn token từ background/auth.js
    chrome.runtime.onMessage.addListener((request) => {
      if (request.action === "auth_required") {
        this.updateAuthUI({ loggedIn: false });
      }
    });
  }

  // Cập nhật giao diện đăng nhập
  updateAuthUI(session) {
    if (session && session.loggedIn) {
      if (this.tasksContentArea) this.tasksContentArea.style.display = "block";
      if (this.authMessageArea) this.authMessageArea.style.display = "none";
      if (this.openAddTaskModalBtn) this.openAddTaskModalBtn.style.display = "block";
    } else {
      if (this.tasksContentArea) this.tasksContentArea.style.display = "none";
      if (this.authMessageArea) this.authMessageArea.style.display = "block";
      if (this.openAddTaskModalBtn) this.openAddTaskModalBtn.style.display = "none";
    }
  }

  // Khởi trạng thái giao diện đăng nhập khi load panel
  async init() {
    const session = await this.authService.checkSession();
    this.updateAuthUI(session);
    if (session.loggedIn) {
      try {
        await this.initializeCalendar();
        this.loadTasks();
      } catch (e) {
        console.error(e);
        this.taskList.innerHTML = `<li style="color:#ef4444; text-align:center;">Lỗi: ${e.message}</li>`;
      }
    }
  }
  // Tìm hoặc tạo Lịch phụ "Công việc"
  async initializeCalendar() {
    try {
      const listUrl = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
      const res = await this.authService.fetchWithAuth(listUrl);
      if (!res.ok) throw new Error("Không thể lấy danh sách lịch.");

      const data = await res.json();
      const calendars = data.items || [];
      
      // Tìm lịch phụ có tên "Công việc" (hoặc "Công việc" cũ để tương thích ngược)
      let taskCal = calendars.find(cal => cal.summary === "Công việc" || cal.summary === "Công việc");
      
      if (taskCal) {
        this.calendarId = taskCal.id;
      } else {
        // Tạo lịch phụ mới
        const createUrl = "https://www.googleapis.com/calendar/v3/calendars";
        const createRes = await this.authService.fetchWithAuth(createUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: "Công việc",
            description: "Lịch lưu trữ các việc cần làm/công việc từ Memoria"
          })
        });
        
        if (!createRes.ok) throw new Error("Không thể tạo lịch phụ Công việc.");
        const createdCal = await createRes.json();
        this.calendarId = createdCal.id;
      }
    } catch (e) {
      console.error("Lỗi initializeCalendar:", e);
      throw e;
    }
  }
  // Tải danh sách Công việc (Sự kiện trên lịch Công việc)
  async loadTasks() {
    if (!this.calendarId) return;

    this.taskList.innerHTML = `<li style="text-align:center; color:var(--text-muted); padding: 20px;">Đang tải công việc...</li>`;
    
    try {
      const now = new Date();
      // Tải công việc từ 3 tháng trước đến 1 năm sau
      const timeMinDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const timeMaxDate = new Date(now.getFullYear(), now.getMonth() + 12, 1);
      const timeMin = timeMinDate.toISOString();
      const timeMax = timeMaxDate.toISOString();

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`;
      const res = await this.authService.fetchWithAuth(url);
      if (!res.ok) throw new Error("Không thể tải các sự kiện công việc.");

      const data = await res.json();
      const items = data.items || [];
      
      this.tasks = items
        .filter(ev => ev.status !== "cancelled")
        .map(ev => {
          const title = ev.summary || "(Không có tiêu đề)";
          const isCompleted = title.startsWith("✓ ") || ev.colorId === "8" || ev.colorId === "2" || ev.colorId === "10" || (ev.extendedProperties?.private?.status === "completed");

          let displayTitle = title;
          if (displayTitle.startsWith("✓ ")) {
            displayTitle = displayTitle.substring(2);
          }

          const startDateStr = ev.start.dateTime ? ev.start.dateTime.split("T")[0] : ev.start.date;
          const startTimeStr = ev.start.dateTime ? ev.start.dateTime.split("T")[1].substring(0, 5) : "";
          
          let dateStr = ev.end.dateTime ? ev.end.dateTime.split("T")[0] : ev.end.date;
          if (!ev.end.dateTime && ev.end.date) {
            dateStr = this.getPreviousDay(ev.end.date);
          }
          const timeStr = ev.end.dateTime ? ev.end.dateTime.split("T")[1].substring(0, 5) : "";
          const allDay = !ev.start.dateTime;

          let rec = "none";
          if (ev.recurringEventId) {
            rec = ev.extendedProperties?.private?.recurrence || "recurring";
          }

          return {
            id: ev.id,
            title: displayTitle,
            notes: ev.description || "",
            startDate: startDateStr,
            startTime: startTimeStr,
            date: dateStr,
            time: timeStr,
            allDay: allDay,
            recurrence: rec,
            status: isCompleted ? "completed" : "needsAction",
            rawEvent: ev
          };
        });

      this.renderTasks();
    } catch (e) {
      console.error(e);
      this.taskList.innerHTML = `<li style="color:#ef4444; text-align:center;">Lỗi: ${e.message}</li>`;
    }
  }

  // Định dạng ngày hạn chót
  formatTaskDue(dateStr, timeStr, allDay, startTimeStr) {
    if (!dateStr) return "";
    try {
      const [y, m, d] = dateStr.split("-");
      const formattedDate = `${d}/${m}/${y}`;
      if (allDay || !timeStr) {
        return formattedDate;
      }
      if (startTimeStr) {
        return `${formattedDate} từ ${startTimeStr} đến ${timeStr}`;
      }
      return `${formattedDate} lúc ${timeStr}`;
    } catch (e) {
      return dateStr;
    }
  }

  // Cập nhật động nhãn lặp lại theo Ngày được chọn
  updateRecurrenceOptions() {
    const dateStr = this.taskDueInput.value;
    if (!dateStr) {
      this.taskRecurrenceSelect.innerHTML = `
        <option value="none">Không lặp lại</option>
        <option value="daily">Hàng ngày</option>
        <option value="weekly">Hàng tuần</option>
        <option value="monthly">Hàng tháng</option>
        <option value="yearly">Hàng năm</option>
      `;
      return;
    }

    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return;

    const weekdays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayName = weekdays[dateObj.getDay()];
    const dayOfMonth = dateObj.getDate();
    const monthNum = dateObj.getMonth() + 1;

    this.taskRecurrenceSelect.innerHTML = `
      <option value="none">Không lặp lại</option>
      <option value="daily">Hàng ngày</option>
      <option value="weekly">Hàng tuần vào ${dayName}</option>
      <option value="monthly">Hàng tháng vào ngày ${dayOfMonth}</option>
      <option value="yearly">Hàng năm vào ngày ${dayOfMonth} tháng ${monthNum}</option>
    `;
  }

  // Tạo Element cho mỗi Task Item
  createTaskItemEl(task, isCompleted) {
    const li = document.createElement("li");
    const statusClass = this.getTaskStatusClass(task);
    li.className = `task-item ${statusClass}`;
    li.dataset.id = task.id;
    li.style.alignItems = "flex-start";

    const isOverdue = statusClass === "status-overdue" && !isCompleted;
    const overdueLabel = isOverdue ? `<span class="task-overdue-label" style="color: #ef4444; font-weight: 600; margin-left: 6px;">(Quá hạn)</span>` : '';

    const repIcon = task.recurrence !== 'none' ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#10b981; margin-left:4px; vertical-align:middle;" title="Lặp lại"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>` : '';

    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${isCompleted ? "checked" : ""} style="margin-top: 3px;">
      <div class="task-item-content" style="flex: 1; min-width: 0; cursor: pointer;" title="Nhấn để sửa chi tiết">
        <div class="task-title" style="font-weight: 500; font-size: 14px; word-break: break-word;">${task.title}</div>
        ${task.notes ? `<div class="task-notes" style="font-size: 12px; color: var(--text-muted); margin-top: 4px; white-space: pre-wrap; word-break: break-word;">${task.notes}</div>` : ''}
        ${task.date ? `<div class="task-due" style="font-size: 11px; color: var(--primary); margin-top: 4px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>Hạn: ${this.formatTaskDue(task.date, task.time, task.allDay, task.startTime)}</span>
          ${repIcon}
          ${overdueLabel}
        </div>` : ''}
      </div>
      <div class="task-actions" style="display: flex; gap: 6px; align-items: center; margin-top: -2px;">
        <button class="task-edit-btn" title="Sửa" style="background: none; border: none; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; transition: background-color 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="task-delete-btn" title="Xóa" style="background: none; border: none; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; transition: background-color 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    const contentArea = li.querySelector(".task-item-content");
    contentArea.addEventListener("click", () => {
      this.openTaskModal(task);
    });

    const editBtn = li.querySelector(".task-edit-btn");
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openTaskModal(task);
    });

    const deleteBtn = li.querySelector(".task-delete-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.deleteTask(task.id);
    });

    const checkbox = li.querySelector(".task-checkbox");
    checkbox.addEventListener("change", (e) => {
      this.toggleTaskStatus(task.id, e.target.checked);
    });

    return li;
  }

  // Hiển thị danh sách Tasks lên UI (Gom nhóm các task lặp lại và chia làm 3 phần)
  renderTasks() {
    this.taskList.innerHTML = "";
    
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    // Tách các công việc đã hoàn thành và chưa hoàn thành riêng biệt
    const activeTasks = this.tasks.filter(t => t.status !== "completed");
    const completedTasks = this.tasks.filter(t => t.status === "completed");

    // Chỉ gom nhóm các công việc lặp lại ĐANG HOẠT ĐỘNG
    const groups = {};
    const singleTasks = [];

    activeTasks.forEach(task => {
      const recId = task.rawEvent.recurringEventId;
      if (recId && task.date && task.date > todayStr) {
        const timeKey = task.allDay ? "allday" : task.time;
        const groupKey = `${recId}_${task.title}_${task.notes}_${timeKey}`;
        if (!groups[groupKey]) {
          groups[groupKey] = {
            key: groupKey,
            title: task.title,
            notes: task.notes,
            recurrence: task.recurrence,
            instances: [],
            isRecurring: true
          };
        }
        groups[groupKey].instances.push(task);
      } else {
        singleTasks.push(task);
      }
    });

    // Sắp xếp các instance trong mỗi group
    Object.keys(groups).forEach(groupKey => {
      const group = groups[groupKey];
      group.instances.sort((a, b) => new Date(a.date + (a.time ? "T" + a.time : "")) - new Date(b.date + (b.time ? "T" + b.time : "")));
    });

    // Các phần danh sách tương ứng theo yêu cầu của user
    const todayItems = [];
    const overdueItems = [];
    const upcomingItems = [];
    const completedItems = [...completedTasks]; // Từng sự kiện hoàn thành hiển thị riêng lẻ trong mục hoàn thành

    // Phân loại active single tasks
    singleTasks.forEach(task => {
      const status = this.getTaskStatusClass(task);
      if (status === "status-overdue") {
        overdueItems.push(task);
      } else {
        // Chỉ hiện trong phần Công việc hôm nay nếu hạn chót là hôm nay hoặc không cài ngày
        if (!task.date || task.date === todayStr) {
          todayItems.push(task);
        } else if (task.date > todayStr) {
          upcomingItems.push(task);
        }
      }
    });

    // Phân loại active groups
    Object.keys(groups).forEach(groupKey => {
      const group = groups[groupKey];
      const earliestActive = group.instances[0];
      if (earliestActive) {
        const status = this.getTaskStatusClass(earliestActive);
        if (status === "status-overdue") {
          overdueItems.push(group);
        } else {
          // Chỉ hiển thị trong Công việc hôm nay nếu sự kiện tiếp theo là hôm nay
          if (earliestActive.date === todayStr) {
            todayItems.push(group);
          } else if (earliestActive.date > todayStr) {
            upcomingItems.push(group);
          }
        }
      }
    });

    // Hàm phụ để lấy thời gian so sánh phục vụ việc sắp xếp
    const getCompareDate = (item) => {
      if (item.isRecurring) {
        const earliestActive = item.instances[0];
        if (earliestActive) {
          return new Date(earliestActive.date + (earliestActive.time ? "T" + earliestActive.time : ""));
        }
        return new Date();
      } else {
        return new Date(item.date + (item.time ? "T" + item.time : ""));
      }
    };

    // Sắp xếp
    todayItems.sort((a, b) => getCompareDate(a) - getCompareDate(b));
    overdueItems.sort((a, b) => getCompareDate(a) - getCompareDate(b));
    upcomingItems.sort((a, b) => getCompareDate(a) - getCompareDate(b));
    completedItems.sort((a, b) => getCompareDate(b) - getCompareDate(a));

    // Hàm phụ render Header cho các section
    const renderSectionHeader = (title, count, isCollapsible = false, isCollapsed = false, onToggle = null) => {
      const headerDiv = document.createElement("div");
      headerDiv.className = "task-section-header";
      headerDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-top: 16px; margin-bottom: 8px; cursor: pointer; padding-bottom: 4px; border-bottom: 1px solid var(--border-color);";

      const titleSpan = document.createElement("span");
      titleSpan.style.cssText = "font-weight: 600; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px;";
      titleSpan.textContent = `${title} (${count})`;
      headerDiv.appendChild(titleSpan);

      if (isCollapsible) {
        const toggleIcon = document.createElement("span");
        toggleIcon.className = "toggle-icon";
        toggleIcon.style.cssText = "display: inline-flex; align-items: center; transition: transform 0.2s;";
        if (isCollapsed) {
          toggleIcon.style.transform = "rotate(-90deg)";
        }
        toggleIcon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        `;
        headerDiv.appendChild(toggleIcon);

        headerDiv.addEventListener("click", () => {
          if (onToggle) onToggle();
        });
      }

      return headerDiv;
    };

    // --- RENDER PHẦN 1: CÔNG VIỆC HÔM NAY ---
    if (todayItems.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.style.cssText = "text-align:center; color:var(--text-muted); padding: 16px 0; font-style:italic; font-size:13px; list-style:none;";
      emptyLi.textContent = "Không có công việc nào cho hôm nay";
      this.taskList.appendChild(emptyLi);
    } else {
      todayItems.forEach(item => {
        const li = item.isRecurring ? this.createTaskGroupEl(item) : this.createTaskItemEl(item, false);
        this.taskList.appendChild(li);
      });
    }

    // --- RENDER PHẦN 2: CÔNG VIỆC QUÁ HẠN ---
    if (overdueItems.length > 0) {
      const overdueHeader = renderSectionHeader("Công việc quá hạn", overdueItems.length);
      overdueHeader.querySelector("span").style.color = "#ef4444";
      this.taskList.appendChild(overdueHeader);

      overdueItems.forEach(item => {
        const li = item.isRecurring ? this.createTaskGroupEl(item) : this.createTaskItemEl(item, false);
        this.taskList.appendChild(li);
      });
    }

    // --- RENDER PHẦN 3: SỰ KIỆN SẮP TỚI ---
    if (upcomingItems.length > 0) {
      const upcomingHeader = renderSectionHeader("Sự kiện sắp tới", upcomingItems.length);
      this.taskList.appendChild(upcomingHeader);

      upcomingItems.forEach(item => {
        const li = item.isRecurring ? this.createTaskGroupEl(item) : this.createTaskItemEl(item, false);
        this.taskList.appendChild(li);
      });
    }

    // --- RENDER PHẦN 4: CÔNG VIỆC ĐÃ HOÀN THÀNH ---
    if (completedItems.length > 0) {
      const completedHeader = renderSectionHeader(
        "Đã hoàn thành", 
        completedItems.length, 
        true, 
        !this.completedExpanded, 
        () => {
          this.completedExpanded = !this.completedExpanded;
          this.renderTasks();
        }
      );
      this.taskList.appendChild(completedHeader);

      if (this.completedExpanded) {
        const completedUl = document.createElement("ul");
        completedUl.style.cssText = "margin: 0; padding: 0; list-style: none;";
        completedItems.forEach(item => {
          const li = this.createTaskItemEl(item, true); // Các sự kiện đã hoàn thành luôn hiển thị dạng đơn lẻ trong phần đã hoàn thành
          completedUl.appendChild(li);
        });
        this.taskList.appendChild(completedUl);
      }
    }
  }

  // Định dạng thời gian cho các occurrence trong chuỗi lặp
  formatOccurrenceTime(dateStr, timeStr, allDay) {
    if (!dateStr) return "";
    try {
      const dateObj = new Date(dateStr);
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const isToday = dateObj.toDateString() === today.toDateString();
      const isTomorrow = dateObj.toDateString() === tomorrow.toDateString();

      const [y, m, d] = dateStr.split("-");
      let displayDate = `${d}/${m}/${y}`;

      if (isToday) {
        displayDate = "Hôm nay";
      } else if (isTomorrow) {
        displayDate = "Ngày mai";
      } else {
        const weekdays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
        const dayName = weekdays[dateObj.getDay()];
        displayDate = `${dayName}, ${d}/${m}/${y}`;
      }

      if (allDay || !timeStr) {
        return displayDate;
      }
      return `${displayDate} lúc ${timeStr}`;
    } catch (e) {
      return dateStr;
    }
  }



  // Lấy class trạng thái (hoàn thành, quá hạn, chưa làm)
  getTaskStatusClass(task) {
    if (task.status === "completed") {
      return "status-completed";
    }

    if (!task.date) {
      return "status-pending";
    }

    try {
      const todayObj = new Date();
      const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
      if (task.date < todayStr) {
        return "status-overdue";
      }
    } catch (e) {
      console.warn("Lỗi kiểm tra hạn chót:", e);
    }

    return "status-pending";
  }

  // Tạo Element cho Nhóm Công việc Lặp lại
  createTaskGroupEl(group) {
    const li = document.createElement("li");
    li.style.alignItems = "stretch";

    const isExpanded = this.expandedGroups.has(group.key);
    const earliestActive = group.instances[0];
    const displayTask = earliestActive || group.instances[group.instances.length - 1];

    let groupStatusClass = "status-pending";
    if (earliestActive) {
      groupStatusClass = this.getTaskStatusClass(earliestActive);
    }
    li.className = `task-item task-group ${groupStatusClass}`;

    const repIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#10b981; margin-left:4px; vertical-align:middle;" title="Lặp lại"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>`;

    li.innerHTML = `
      <div class="task-group-main-row" style="display: flex; align-items: flex-start; width: 100%; gap: 10px;">
        <button class="task-group-toggle-btn" title="Xem danh sách lặp" style="background: none; border: none; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; margin-top: 2px;">
          <span class="toggle-symbol" style="font-size: 16px; font-family: monospace; line-height: 1; font-weight: bold; width: 12px; text-align: center;">${isExpanded ? '−' : '+'}</span>
        </button>
        
        <div class="task-item-content" style="flex: 1; min-width: 0; cursor: pointer;">
          <div class="task-title" style="font-weight: 500; font-size: 14px; word-break: break-word;">
            <span>${group.title}</span>
            ${repIcon}
          </div>
          ${group.notes ? `<div class="task-notes" style="font-size: 12px; color: var(--text-muted); margin-top: 4px; white-space: pre-wrap; word-break: break-word;">${group.notes}</div>` : ''}
          <div class="task-due" style="font-size: 11px; color: var(--primary); margin-top: 4px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>${earliestActive ? `Tiếp theo: ${this.formatTaskDue(earliestActive.date, earliestActive.time, earliestActive.allDay)}` : 'Đã hoàn thành hết chu kỳ hiện tại'}</span>
          </div>
        </div>

        <div class="task-actions" style="display: flex; gap: 6px; align-items: center; margin-top: -2px;">
          <button class="task-edit-btn" title="Sửa" style="background: none; border: none; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; transition: background-color 0.2s;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="task-delete-btn" title="Xóa" style="background: none; border: none; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; transition: background-color 0.2s;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="task-group-occurrences" style="display: ${isExpanded ? 'flex' : 'none'}; width: 100%; margin-top: 10px; padding-left: 26px; border-left: 2px dashed var(--border-color); flex-direction: column; gap: 8px;">
        <!-- Danh sách occurrences sẽ được chèn ở dưới -->
      </div>
    `;

    const occurrencesContainer = li.querySelector(".task-group-occurrences");

    // Chỉ hiển thị tối đa 10 sự kiện lặp tiếp theo đang hoạt động
    const visibleOccurrences = group.instances.slice(0, 10);
    visibleOccurrences.forEach(inst => {
      const occurrenceDiv = document.createElement("div");
      const statusClass = this.getTaskStatusClass(inst);
      occurrenceDiv.className = `occurrence-item ${statusClass}`;
      occurrenceDiv.dataset.instanceId = inst.id;
      occurrenceDiv.style.cssText = "display: flex; align-items: center; gap: 10px; padding: 4px 0; font-size: 13px;";

      const isInstCompleted = inst.status === 'completed';

      occurrenceDiv.innerHTML = `
        <input type="checkbox" class="occurrence-checkbox" ${isInstCompleted ? "checked" : ""} style="cursor: pointer; width: 16px; height: 16px; margin: 0; flex-shrink: 0;">
        <span class="occurrence-time" style="flex: 1; min-width: 0; word-break: break-word;">
          ${this.formatOccurrenceTime(inst.date, inst.time, inst.allDay)}
        </span>
      `;
      
      const occurrenceCheckbox = occurrenceDiv.querySelector(".occurrence-checkbox");
      occurrenceCheckbox.addEventListener("change", (e) => {
        this.toggleTaskStatus(inst.id, e.target.checked);
      });

      occurrencesContainer.appendChild(occurrenceDiv);
    });

    if (group.instances.length > 10) {
      const remainingCount = group.instances.length - 10;
      const footerDiv = document.createElement("div");
      footerDiv.className = "occurrence-footer";
      footerDiv.style.cssText = "font-size: 12px; color: var(--text-muted); padding-left: 26px; font-style: italic; margin-top: 4px;";
      footerDiv.textContent = `... và ${remainingCount} sự kiện khác`;
      occurrencesContainer.appendChild(footerDiv);
    }

    const toggleBtn = li.querySelector(".task-group-toggle-btn");
    const toggleSymbol = li.querySelector(".toggle-symbol");
    const contentArea = li.querySelector(".task-item-content");

    const toggleExpand = (e) => {
      e.stopPropagation();
      const currentlyExpanded = this.expandedGroups.has(group.key);
      if (currentlyExpanded) {
        this.expandedGroups.delete(group.key);
        occurrencesContainer.style.display = "none";
        toggleSymbol.textContent = "+";
      } else {
        this.expandedGroups.add(group.key);
        occurrencesContainer.style.display = "flex";
        toggleSymbol.textContent = "−";
      }
    };

    toggleBtn.addEventListener("click", toggleExpand);
    contentArea.addEventListener("click", toggleExpand);

    const editBtn = li.querySelector(".task-edit-btn");
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openTaskModal(displayTask);
    });

    const deleteBtn = li.querySelector(".task-delete-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.deleteTask(displayTask.id);
    });

    return li;
  }


  // Bật/tắt trạng thái hoàn thành công việc (chỉ hoàn thành 1 occurrence cho task lặp)
  async toggleTaskStatus(taskId, isChecked) {
    const status = isChecked ? "completed" : "needsAction";
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = this.tasks[taskIndex];
    const backupStatus = task.status;
    
    // Cập nhật UI ngay lập tức
    task.status = status;
    this.renderTasks();

    try {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events/${taskId}`;
      const res = await this.authService.fetchWithAuth(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: isChecked ? `✓ ${task.title}` : task.title,
          colorId: isChecked ? "8" : null,
          extendedProperties: {
            private: {
              status: status,
              recurrence: task.recurrence
            }
          }
        })
      });

      if (!res.ok) throw new Error("Google Calendar API trả về lỗi " + res.status);
      this.loadTasks();
      window.dispatchEvent(new CustomEvent("task_changed"));
    } catch (e) {
      console.error(e);
      alert("Không thể cập nhật trạng thái: " + e.message);
      task.status = backupStatus;
      this.renderTasks();
    }
  }

  async deleteTask(taskId) {
    const backupTasks = [...this.tasks];
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!confirm("Bạn có chắc chắn muốn xóa công việc này không?")) return;

    // Optimistic UI update
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.renderTasks();

    try {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events/${taskId}`;
      const res = await this.authService.fetchWithAuth(url, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Google Calendar API trả về lỗi " + res.status);
      this.loadTasks();
      
      // Dispatch event to sync with schedule.js
      window.dispatchEvent(new CustomEvent("task_changed"));
    } catch (e) {
      console.error(e);
      alert("Lỗi khi xóa công việc: " + e.message);
      this.tasks = backupTasks;
      this.renderTasks();
    }
  }

  // Mở Modal Sửa/Thêm Công việc (Load sự kiện gốc khi sửa)
  async openTaskModal(task) {
    const allDayCheckbox = document.getElementById("taskAllDayCheckbox");
    const timeInputGroup = document.getElementById("taskTimeInputGroup");
    const timeInput = document.getElementById("taskTimeInput");


    if (task) {
      this.editingTaskId = task.id;
      this.taskModalTitle.textContent = "Đang tải...";
      if (this.taskTitleInput) this.taskTitleInput.value = "";
      if (this.taskNotesInput) this.taskNotesInput.value = "";
      if (this.taskModal) this.taskModal.classList.add("active");

      let masterEvent = task.rawEvent;
      const recId = task.rawEvent.recurringEventId;
      
      // Nếu là một occurrence lặp lại, fetch master event để lấy toàn bộ recurrence rule
      if (recId) {
        try {
          const getUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events/${recId}`;
          const res = await this.authService.fetchWithAuth(getUrl);
          if (res.ok) {
            masterEvent = await res.json();
          }
        } catch (e) {
          console.error("Không thể lấy sự kiện gốc của chuỗi lặp:", e);
        }
      }

      this.editingTaskId = masterEvent.id;
      this.taskModalTitle.textContent = "Sửa công việc";
      this.taskTitleInput.value = masterEvent.summary || "";
      // Nếu tiêu đề gốc có dấu ✓ thì bỏ đi
      if (this.taskTitleInput.value.startsWith("✓ ")) {
        this.taskTitleInput.value = this.taskTitleInput.value.substring(2);
      }
      this.taskNotesInput.value = masterEvent.description || "";
      
      const startDateStr = masterEvent.start.dateTime ? masterEvent.start.dateTime.split("T")[0] : masterEvent.start.date;
      let dueDateStr = masterEvent.end.dateTime ? masterEvent.end.dateTime.split("T")[0] : masterEvent.end.date;
      if (!masterEvent.end.dateTime && masterEvent.end.date) {
        dueDateStr = this.getPreviousDay(masterEvent.end.date);
      }
      const startTimeStr = masterEvent.start.dateTime ? masterEvent.start.dateTime.split("T")[1].substring(0, 5) : "";
      const timeStr = masterEvent.end.dateTime && masterEvent.start.dateTime ? masterEvent.end.dateTime.split("T")[1].substring(0, 5) : "";
      const allDay = !masterEvent.start.dateTime;

      if (this.taskStartDueInput) this.taskStartDueInput.value = startDateStr || "";
      this.taskDueInput.value = dueDateStr || "";
      if (allDayCheckbox) allDayCheckbox.checked = allDay;
      const displayVal = allDay ? "none" : "block";
      if (timeInputGroup) timeInputGroup.style.display = displayVal;
      if (this.taskStartTimeInputGroup) this.taskStartTimeInputGroup.style.display = displayVal;
      if (this.taskStartTimeInput) this.taskStartTimeInput.value = startTimeStr || "";
      if (timeInput) timeInput.value = timeStr || "";

      this.updateRecurrenceOptions();

      // Cập nhật giá trị lặp
      let recValue = "none";
      if (masterEvent.recurrence && masterEvent.recurrence.length > 0) {
        const rrule = masterEvent.recurrence[0];
        if (rrule.includes("FREQ=DAILY")) recValue = "daily";
        else if (rrule.includes("FREQ=WEEKLY")) recValue = "weekly";
        else if (rrule.includes("FREQ=MONTHLY")) recValue = "monthly";
        else if (rrule.includes("FREQ=YEARLY")) recValue = "yearly";
      }
      this.taskRecurrenceSelect.value = recValue;
    } else {
      this.editingTaskId = null;
      this.taskModalTitle.textContent = "Thêm công việc";
      this.taskTitleInput.value = "";
      this.taskNotesInput.value = "";
      
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      if (this.taskStartDueInput) this.taskStartDueInput.value = todayStr;
      if (this.taskDueInput) this.taskDueInput.value = todayStr;
      
      if (allDayCheckbox) allDayCheckbox.checked = true;
      if (timeInputGroup) timeInputGroup.style.display = "none";
      if (this.taskStartTimeInputGroup) this.taskStartTimeInputGroup.style.display = "none";
      if (this.taskStartTimeInput) this.taskStartTimeInput.value = "";
      if (timeInput) timeInput.value = "";

      this.updateRecurrenceOptions();
      this.taskRecurrenceSelect.value = "none";
      if (this.taskModal) this.taskModal.classList.add("active");
    }

    if (this.taskErrorMsg) this.taskErrorMsg.style.display = "none";
  }

  // Đóng Modal
  closeTaskModal() {
    if (this.taskModal) this.taskModal.classList.remove("active");
    this.editingTaskId = null;
  }

  // Giờ kết thúc (+1 giờ)
  getEndTime(dateStr, timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const d = new Date(dateStr);
    d.setHours(parseInt(hours) + 1, parseInt(minutes));
    return d.toISOString();
  }

  // Ngày kết thúc tiếp theo cả ngày
  getNextDay(dateStr) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Ngày trước đó cả ngày
  getPreviousDay(dateStr) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Lưu công việc
  async handleSaveTask() {
    if (!this.calendarId) return;

    const title = this.taskTitleInput.value.trim();
    if (!title) {
      if (this.taskErrorMsg) {
        this.taskErrorMsg.textContent = "Tiêu đề không được để trống!";
        this.taskErrorMsg.style.display = "block";
      }
      return;
    }

    const startDate = this.taskStartDueInput.value;
    const date = this.taskDueInput.value;
    if (!startDate || !date) {
      if (this.taskErrorMsg) {
        this.taskErrorMsg.textContent = "Vui lòng chọn ngày bắt đầu và ngày hạn chót!";
        this.taskErrorMsg.style.display = "block";
      }
      return;
    }
    if (date < startDate) {
      if (this.taskErrorMsg) {
        this.taskErrorMsg.textContent = "Ngày hạn chót phải sau hoặc trùng với ngày bắt đầu!";
        this.taskErrorMsg.style.display = "block";
      }
      return;
    }

    const notes = this.taskNotesInput.value.trim();
    const allDayCheckbox = document.getElementById("taskAllDayCheckbox");
    const allDay = allDayCheckbox ? allDayCheckbox.checked : true;
    const timeInput = document.getElementById("taskTimeInput");
    const startTimeInput = document.getElementById("taskStartTimeInput");
    
    const startTime = allDay ? "" : (startTimeInput ? startTimeInput.value : "");
    const time = allDay ? "" : (timeInput ? timeInput.value : "");
    const recurrence = this.taskRecurrenceSelect.value;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!allDay) {
      if (!startTime || !time) {
        if (this.taskErrorMsg) {
          this.taskErrorMsg.textContent = "Vui lòng nhập đầy đủ giờ bắt đầu và giờ hạn chót!";
          this.taskErrorMsg.style.display = "block";
        }
        return;
      }
      if (startDate === date && time < startTime) {
        if (this.taskErrorMsg) {
          this.taskErrorMsg.textContent = "Giờ hạn chót phải sau giờ bắt đầu khi trong cùng một ngày!";
          this.taskErrorMsg.style.display = "block";
        }
        return;
      }
    }

    const isEdit = this.editingTaskId !== null;
    let isCompleted = false;
    if (isEdit) {
      const existingTask = this.tasks.find(t => t.id === this.editingTaskId);
      if (existingTask && existingTask.status === "completed") {
        isCompleted = true;
      }
    }

    let isTaskOverdue = false;
    if (!isCompleted) {
      if (!allDay && time) {
        const dueTime = new Date(`${date}T${time}:00`);
        if (dueTime < new Date()) {
          isTaskOverdue = true;
        }
      } else {
        const todayObj = new Date();
        const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
        if (date < todayStr) {
          isTaskOverdue = true;
        }
      }
    }

    const eventBody = {
      summary: title,
      description: notes,
      colorId: isCompleted ? "2" : (isTaskOverdue ? "11" : "5"),
      start: !allDay && startTime ? {
        dateTime: `${date}T${startTime}:00`,
        timeZone
      } : {
        date: date
      },
      end: !allDay && time ? {
        dateTime: this.getEndTime(date, time),
        timeZone
      } : {
        date: this.getNextDay(date)
      },
      extendedProperties: {
        private: {
          recurrence: recurrence
        }
      }
    };

    if (recurrence !== "none") {
      eventBody.recurrence = [`RRULE:FREQ=${recurrence.toUpperCase()}`];
    } else {
      eventBody.recurrence = null;
    }

    this.saveTaskBtn.disabled = true;
    this.saveTaskBtn.textContent = "Đang lưu...";

    let backupTasks = [...this.tasks];

    try {
      if (isEdit) {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events/${this.editingTaskId}`;
        const res = await this.authService.fetchWithAuth(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventBody)
        });
        if (!res.ok) throw new Error("Lỗi cập nhật sự kiện: " + res.status);
      } else {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events`;
        const res = await this.authService.fetchWithAuth(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventBody)
        });
        if (!res.ok) throw new Error("Lỗi tạo mới sự kiện: " + res.status);
      }
      
      this.closeTaskModal();
      this.loadTasks();

      // Thông báo cho schedule.js cập nhật nếu có
      window.dispatchEvent(new CustomEvent("task_changed"));
    } catch (e) {
      console.error(e);
      alert("Lỗi khi lưu công việc: " + e.message);
      this.tasks = backupTasks;
      this.renderTasks();
    } finally {
      this.saveTaskBtn.disabled = false;
      this.saveTaskBtn.textContent = isEdit ? "Lưu công việc" : "Thêm công việc";
    }
  }
}

// Khởi tạo global instance
window.tasksManager = new TasksManager();
document.addEventListener("DOMContentLoaded", () => {
  window.tasksManager.init();
});
