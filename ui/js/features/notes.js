document.addEventListener('DOMContentLoaded', () => {
  const { sha256, xorHexEncrypt, xorHexDecrypt, renderMarkdown } = window.utils;

  const noteTitleInput = document.getElementById('noteTitleInput');
  const noteInput = document.getElementById('noteInput');
  const addNoteBtn = document.getElementById('addNoteBtn');
  const noteList = document.getElementById('noteList');

  let editingNoteIndex = -1;
  const addNoteModal = document.getElementById('addNoteModal');
  const addNoteModalTitle = document.getElementById('addNoteModalTitle');
  const noteErrorMsg = document.getElementById('noteErrorMsg');
  const openAddNoteModalBtn = document.getElementById('openAddNoteModalBtn');
  const cancelNoteBtn = document.getElementById('cancelNoteBtn');

  function openNoteModal(isEdit = false) {
    if (!isEdit) {
      editingNoteIndex = -1;
      if (noteTitleInput) noteTitleInput.value = '';
      if (noteInput) noteInput.value = '';
      if (addNoteModalTitle) addNoteModalTitle.textContent = 'Thêm ghi chú';
    } else {
      if (addNoteModalTitle) addNoteModalTitle.textContent = 'Sửa ghi chú';
    }
    if (noteErrorMsg) noteErrorMsg.style.display = 'none';
    if (addNoteModal) addNoteModal.classList.add('active');
  }

  function closeNoteModal() {
    if (addNoteModal) addNoteModal.classList.remove('active');
    editingNoteIndex = -1;
    if (noteTitleInput) noteTitleInput.value = '';
    if (noteInput) noteInput.value = '';
  }

  if (openAddNoteModalBtn) openAddNoteModalBtn.addEventListener('click', () => openNoteModal(false));
  if (cancelNoteBtn) cancelNoteBtn.addEventListener('click', closeNoteModal);

  // Tự động co giãn ô nhập nội dung
  if (noteInput) {
    noteInput.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight + 2) + 'px'; // +2px bù cho border
    });
  }

  // Nhấn Enter ở Tiêu đề sẽ tự động nhảy xuống Nội dung
  if (noteTitleInput) {
    noteTitleInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault(); // Ngăn submit form (nếu có)
        if (noteInput) noteInput.focus();
      }
    });
  }

  // Logic Modal Password
  let pendingNoteIndex = -1;
  let pendingNoteAction = '';
  const passwordModal = document.getElementById('passwordModal');
  const passwordModalInput = document.getElementById('passwordModalInput');
  const passwordErrorMsg = document.getElementById('passwordErrorMsg');
  const passwordModalTitle = document.getElementById('passwordModalTitle');

  function openPasswordModal(action, index) {
    pendingNoteIndex = index;
    pendingNoteAction = action;
    if (passwordModalInput) passwordModalInput.value = '';
    if (passwordErrorMsg) passwordErrorMsg.style.display = 'none';

    if (passwordModalTitle) {
      if (action === 'lock') passwordModalTitle.textContent = 'Tạo mật mã để Khóa';
      else if (action === 'unlock') passwordModalTitle.textContent = 'Nhập mật mã để Mở khóa';
      else if (action === 'view_locked') passwordModalTitle.textContent = 'Nhập mật mã để Xem';
    }

    if (passwordModal) passwordModal.classList.add('active');
    if (passwordModalInput) passwordModalInput.focus();
  }

  function closePasswordModal() {
    if (passwordModal) passwordModal.classList.remove('active');
    pendingNoteIndex = -1;
  }

  const passwordCancelBtn = document.getElementById('passwordCancelBtn');
  const passwordConfirmBtn = document.getElementById('passwordConfirmBtn');
  if (passwordCancelBtn) passwordCancelBtn.addEventListener('click', closePasswordModal);
  if (passwordConfirmBtn) passwordConfirmBtn.addEventListener('click', confirmPassword);

  if (passwordModalInput) {
    passwordModalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmPassword();
    });
  }

  async function confirmPassword() {
    if (!passwordModalInput) return;
    const pwd = passwordModalInput.value.trim();
    if (!pwd) {
      if (passwordErrorMsg) {
        passwordErrorMsg.textContent = 'Mật mã không được để trống!';
        passwordErrorMsg.style.display = 'block';
      }
      return;
    }

    const hashedPwd = await sha256(pwd);

    chrome.storage.local.get({ notes: [] }, (data) => {
      const notes = data.notes;
      const note = notes[pendingNoteIndex];
      if (!note) return;

      if (pendingNoteAction === 'lock') {
        note.passwordHash = hashedPwd;
        // Chỉ mã hóa nội dung, giữ nguyên tiêu đề
        note.titleIsPlain = true;
        note.text = xorHexEncrypt(note.text || '', pwd);
        note.locked = true;
        chrome.storage.local.set({ notes }, () => {
          closePasswordModal();
          loadNotes();
        });
      } else if (pendingNoteAction === 'unlock' || pendingNoteAction === 'view_locked') {
        if (note.passwordHash === hashedPwd || note.password === pwd) { // Hỗ trợ tương thích ngược với pass cũ
          // Nếu titleIsPlain = true thì không cần giải mã tiêu đề
          const decryptedTitle = (note.title && note.passwordHash && !note.titleIsPlain) ? xorHexDecrypt(note.title, pwd) : note.title;
          const decryptedText = note.text && note.passwordHash ? xorHexDecrypt(note.text, pwd) : note.text;

          if (decryptedText !== null) {
            if (pendingNoteAction === 'unlock') {
              note.title = decryptedTitle || '';
              note.text = decryptedText || '';
              note.locked = false;
              delete note.passwordHash;
              delete note.password;
              chrome.storage.local.set({ notes }, () => {
                closePasswordModal();
                loadNotes();
              });
            } else {
              // pendingNoteAction === 'view_locked'
              closePasswordModal();
              // Chỉ hiển thị tạm thời trên Modal, không lưu vào Storage (vẫn giữ trạng thái khóa)
              if (viewNoteTitle) viewNoteTitle.innerHTML = decryptedTitle ? renderMarkdown(decryptedTitle, true) : 'Ghi chú';

              let timeStr = '';
              if (note.id) {
                const date = new Date(note.id);
                if (!isNaN(date.getTime())) {
                  timeStr = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                }
              }
              if (viewNoteTime) viewNoteTime.innerHTML = timeStr;
              if (viewNoteText) viewNoteText.innerHTML = renderMarkdown(decryptedText);
              if (viewNoteModal) viewNoteModal.classList.add('active');
            }
          } else {
            if (passwordErrorMsg) {
              passwordErrorMsg.textContent = 'Lỗi giải mã dữ liệu!';
              passwordErrorMsg.style.display = 'block';
            }
          }
        } else {
          if (passwordErrorMsg) {
            passwordErrorMsg.textContent = 'Mật mã không đúng!';
            passwordErrorMsg.style.display = 'block';
          }
        }
      }
    });
  }

  // Logic View Note Modal
  const viewNoteModal = document.getElementById('viewNoteModal');
  const viewNoteTitle = document.getElementById('viewNoteTitle');
  const viewNoteTime = document.getElementById('viewNoteTime');
  const viewNoteText = document.getElementById('viewNoteText');
  const closeViewNoteBtn = document.getElementById('closeViewNoteBtn');

  function closeViewNoteModal() {
    if (viewNoteModal) viewNoteModal.classList.remove('active');
  }
  if (closeViewNoteBtn) closeViewNoteBtn.addEventListener('click', closeViewNoteModal);

  function loadNotes() {
    chrome.storage.local.get({ notes: [] }, (data) => {
      if (!noteList) return;
      noteList.innerHTML = '';
      data.notes.forEach((note, index) => {
        const li = document.createElement('li');
        li.className = 'list-item';

        const isLocked = note.locked;

        let displayTitle = '';
        if (isLocked) {
          displayTitle = note.titleIsPlain ? (note.title || '(Không có tiêu đề)') : 'Ghi chú đã khóa';
        } else {
          displayTitle = note.title || '';
        }

        let titleHtml = displayTitle ? `<div class="markdown-body" style="font-weight: 600; font-size: 14px; margin-bottom: 6px; color: var(--primary); display: flex; align-items: flex-start; gap: 6px;">
          <span style="word-break: break-word; display: inline-block;">${renderMarkdown(displayTitle, true)}</span>
        </div>` : '';

        let timeHtml = '';
        if (note.id) {
          const date = new Date(note.id);
          if (!isNaN(date.getTime())) {
            timeHtml = `<div style="font-size: 11px; color: var(--text-muted); margin-top: 8px; display: flex; align-items: center; gap: 4px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}
            </div>`;
          }
        }

        const displayText = isLocked ? '<span style="color: var(--text-muted); font-style: italic;">Nội dung đã bị khóa, vui lòng mở khóa để xem...</span>' : renderMarkdown(note.text || note.content || '');

        const lockIcon = isLocked
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>';

        li.innerHTML = `
          <div class="list-item-content note-clickable-area" data-index="${index}" style="display: flex; flex-direction: column; cursor: pointer; flex: 1; min-width: 0;" title="Nhấn để xem chi tiết">
            ${titleHtml}
            <div class="note-text-display ${isLocked ? '' : 'note-text-clamp markdown-body'}" style="font-size: 13px;">${displayText}</div>
            ${timeHtml}
          </div>
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding-left: 10px; gap: 8px; flex-shrink: 0;">
            <button class="btn-lock" data-index="${index}" title="${isLocked ? 'Mở khóa' : 'Khóa ghi chú'}">${lockIcon}</button>
            ${isLocked ? '' : `<button class="btn-edit" data-index="${index}" title="Sửa"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>`}
            <button class="btn-delete" data-index="${index}" title="Xóa"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
          </div>
        `;
        noteList.appendChild(li);
      });

      // Xử lý sự kiện click để xem chi tiết ghi chú trong Modal
      noteList.querySelectorAll('.note-clickable-area').forEach(el => {
        el.addEventListener('click', (e) => {
          const idx = e.currentTarget.getAttribute('data-index');
          const note = data.notes[idx];

          if (note.locked) {
            openPasswordModal('view_locked', idx);
            return;
          }

          if (viewNoteTitle) viewNoteTitle.innerHTML = note.title ? renderMarkdown(note.title, true) : 'Ghi chú';

          // Format thời gian
          let timeStr = '';
          if (note.id) {
            const date = new Date(note.id);
            if (!isNaN(date.getTime())) {
              timeStr = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            }
          }
          if (viewNoteTime) viewNoteTime.innerHTML = timeStr;

          if (viewNoteText) viewNoteText.innerHTML = renderMarkdown(note.text || note.content || '');
          if (viewNoteModal) viewNoteModal.classList.add('active');
        });
      });

      noteList.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          deleteNote(e.currentTarget.getAttribute('data-index'));
        });
      });
      noteList.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-index'));
          const note = data.notes[idx];
          if (note.locked) return; // Không cho sửa khi đang khóa

          if (noteTitleInput) noteTitleInput.value = note.title || '';
          if (noteInput) {
            noteInput.value = note.text || note.content || '';
          }
          editingNoteIndex = idx;
          openNoteModal(true);
          
          // Tính toán lại chiều cao sau khi Modal đã hiển thị (display: flex)
          if (noteInput) {
            noteInput.style.height = 'auto';
            noteInput.style.height = (noteInput.scrollHeight + 2) + 'px';
          }
        });
      });

      noteList.querySelectorAll('.btn-lock').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = e.currentTarget.getAttribute('data-index');
          const isLocked = data.notes[idx].locked;
          openPasswordModal(isLocked ? 'unlock' : 'lock', idx);
        });
      });
    });
  }

  function addNote() {
    const title = noteTitleInput ? noteTitleInput.value.trim() : '';
    const text = noteInput ? noteInput.value.trim() : '';
    if (!text) {
      if (noteErrorMsg) {
        noteErrorMsg.textContent = 'Vui lòng nhập nội dung ghi chú!';
        noteErrorMsg.style.display = 'block';
      }
      return;
    }

    chrome.storage.local.get({ notes: [] }, (data) => {
      const notes = data.notes;

      if (editingNoteIndex !== -1) {
        notes[editingNoteIndex].title = title;
        notes[editingNoteIndex].text = text;
      } else {
        notes.unshift({ title, text, id: Date.now() });
      }

      chrome.storage.local.set({ notes }, () => {
        closeNoteModal();
        loadNotes();
      });
    });
  }

  function deleteNote(index) {
    chrome.storage.local.get({ notes: [] }, (data) => {
      const notes = data.notes;
      notes.splice(index, 1);
      chrome.storage.local.set({ notes }, loadNotes);
    });
  }

  if (addNoteBtn) addNoteBtn.addEventListener('click', addNote);

  window.addEventListener('app_data_changed', loadNotes);

  // Initialize
  loadNotes();
});
