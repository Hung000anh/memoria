document.addEventListener('DOMContentLoaded', () => {
  // --- Logic Hẹn giờ (Reminders) ---
  const reminderTextInput = document.getElementById('reminderTextInput');
  const reminderTimeInput = document.getElementById('reminderTimeInput');
  const addReminderBtn = document.getElementById('addReminderBtn');
  const reminderRepeatInput = document.getElementById('reminderRepeatInput');
  const reminderList = document.getElementById('reminderList');

  function loadReminders() {
    chrome.storage.local.get({ customReminders: [] }, (data) => {
      if (!reminderList) return;
      reminderList.innerHTML = '';
      data.customReminders.forEach((rem, index) => {
        const li = document.createElement('li');
        li.className = 'list-item';

        let statusText = '';
        if (rem.isRepeating) {
          statusText = '<span style="color: var(--primary); font-size: 11px; background: rgba(16, 185, 129, 0.1); padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg> Lặp lại</span>';
        } else {
          const isExpired = Date.now() > rem.expiresAt;
          statusText = isExpired ? '<span style="color: #ef4444; font-size: 11px; background: rgba(239, 68, 68, 0.1); padding: 2px 6px; border-radius: 4px;">Đã xong</span>' : '';
        }

        li.innerHTML = `
          <div class="list-item-content" style="flex: 1; min-width: 0;">
            <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px; word-break: break-word;">${rem.text}</div>
            <div style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
              <span style="background: var(--nav-hover-bg); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color); color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                ${rem.minutes} phút
              </span>
              ${statusText}
            </div>
          </div>
          <div style="display: flex; align-items: center; justify-content: center; padding-left: 10px; flex-shrink: 0;">
            <button class="btn-delete" data-index="${index}" title="Xóa"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
          </div>
        `;
        reminderList.appendChild(li);
      });
      reminderList.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          deleteReminder(parseInt(e.currentTarget.getAttribute('data-index')));
        });
      });
    });
  }

  function addReminder() {
    if (!reminderTextInput || !reminderTimeInput) return;
    const text = reminderTextInput.value.trim();
    const minutes = parseInt(reminderTimeInput.value);
    const isRepeating = reminderRepeatInput ? reminderRepeatInput.checked : false;

    if (!text || isNaN(minutes) || minutes <= 0) return;

    const newReminder = {
      id: Date.now(),
      text,
      minutes,
      isRepeating,
      expiresAt: Date.now() + minutes * 60 * 1000
    };

    chrome.storage.local.get({ customReminders: [] }, (data) => {
      const customReminders = data.customReminders;
      customReminders.push(newReminder);

      chrome.runtime.sendMessage({ action: 'create_custom_reminder', reminder: newReminder });

      chrome.storage.local.set({ customReminders }, () => {
        reminderTextInput.value = '';
        reminderTimeInput.value = '';
        if (reminderRepeatInput) reminderRepeatInput.checked = false;
        loadReminders();
      });
    });
  }

  function deleteReminder(index) {
    chrome.storage.local.get({ customReminders: [] }, (data) => {
      const customReminders = data.customReminders;
      const rem = customReminders[index];
      chrome.runtime.sendMessage({ action: 'delete_custom_reminder', id: rem.id });

      customReminders.splice(index, 1);
      chrome.storage.local.set({ customReminders }, loadReminders);
    });
  }

  if (addReminderBtn) addReminderBtn.addEventListener('click', addReminder);

  window.addEventListener('app_data_changed', loadReminders);

  // Initialize
  loadReminders();
});
