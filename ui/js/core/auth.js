// auth.js - Xử lý đăng nhập Google qua Supabase bằng chrome.identity

class AuthService {
  constructor() {
    this.supabaseUrl = CONFIG.SUPABASE_URL;
    this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
    this.clientId = CONFIG.GOOGLE_CLIENT_ID;
    this.scopes = CONFIG.GOOGLE_OAUTH_SCOPES.join(" ");
  }

  // Lấy Redirect URL của Extension
  getRedirectUrl() {
    return chrome.identity.getRedirectURL();
  }

  // Khởi tạo và kiểm tra trạng thái đăng nhập
  async checkSession() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["supabase_session", "google_access_token", "user_profile"], (data) => {
        if (data.google_access_token && data.supabase_session) {
          const sessionData = {
            loggedIn: true,
            user: data.user_profile,
            token: data.google_access_token
          };
          this.updateSidebarUI(sessionData);
          resolve(sessionData);
        } else {
          const sessionData = { loggedIn: false };
          this.updateSidebarUI(sessionData);
          resolve(sessionData);
        }
      });
    });
  }

  // Đăng nhập Google (OAuth)
  async login(interactive = true) {
    const redirectUrl = this.getRedirectUrl();
    
    // Tạo URL đăng nhập Supabase với provider là google và các scopes bổ sung
    // CẦN THIẾT: Phải đính kèm apikey (Anon Key) trong URL để Supabase Auth API chấp nhận request
    const authUrl = `${this.supabaseUrl}/auth/v1/authorize?provider=google` +
                    `&apikey=${encodeURIComponent(this.supabaseKey)}` +
                    `&redirect_to=${encodeURIComponent(redirectUrl)}` +
                    `&scopes=${encodeURIComponent(this.scopes)}` +
                    `&query_params=${encodeURIComponent("access_type=offline&prompt=consent")}`;

    console.log("Memoria Auth - Đang gọi URL:", authUrl);
    console.log("Memoria Auth - Redirect URL:", redirectUrl);

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: interactive
      }, async (responseUrl) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!responseUrl) {
          return reject(new Error("Không nhận được phản hồi từ luồng đăng nhập."));
        }

        try {
          const urlObj = new URL(responseUrl);
          // Parse các token từ hash fragment của redirect url (#access_token=...)
          const hashParams = new URLSearchParams(urlObj.hash.substring(1));
          
          const accessToken = hashParams.get("access_token");
          const providerToken = hashParams.get("provider_token");
          const refreshToken = hashParams.get("refresh_token");
          const expiresIn = hashParams.get("expires_in");

          if (!accessToken || !providerToken) {
            throw new Error("Đăng nhập thất bại: Không tìm thấy Access Token.");
          }

          // Lấy thông tin user profile từ token (hoặc từ Supabase user endpoint)
          const user = await this.getUserProfile(accessToken);

          const session = {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: Date.now() + parseInt(expiresIn) * 1000
          };

          const sessionData = { loggedIn: true, user, token: providerToken };

          // Lưu thông tin vào storage
          chrome.storage.local.set({
            supabase_session: session,
            google_access_token: providerToken,
            user_profile: user
          }, () => {
            this.updateSidebarUI(sessionData);
            resolve(sessionData);
          });

        } catch (err) {
          reject(err);
        }
      });
    });
  }

  // Lấy thông tin User Profile từ Supabase Auth API
  async getUserProfile(accessToken) {
    const res = await fetch(`${this.supabaseUrl}/auth/v1/user`, {
      headers: {
        "apikey": this.supabaseKey,
        "Authorization": `Bearer ${accessToken}`
      }
    });
    if (!res.ok) {
      throw new Error("Không thể lấy thông tin người dùng từ Supabase.");
    }
    return await res.json();
  }

  // Đăng xuất
  async logout() {
    return new Promise((resolve) => {
      chrome.storage.local.remove(["supabase_session", "google_access_token", "user_profile"], () => {
        const sessionData = { loggedIn: false };
        this.updateSidebarUI(sessionData);
        resolve(sessionData);
      });
    });
  }

  // Thực hiện một API call với cơ chế tự động làm mới token bằng cách mở lại luồng Auth (silent refresh)
  async fetchWithAuth(url, options = {}) {
    let token = await this.getGoogleToken();
    if (!token) {
      throw new Error("Chưa đăng nhập Google.");
    }

    if (!options.headers) options.headers = {};
    options.headers["Authorization"] = `Bearer ${token}`;

    let response = await fetch(url, options);

    // Nếu token hết hạn (401 Unauthorized), thực hiện silent login để lấy token mới
    if (response.status === 401) {
      console.log("Google token expired. Attempting silent refresh...");
      try {
        const authResult = await this.login(false); // interactive = false
        token = authResult.token;
        options.headers["Authorization"] = `Bearer ${token}`;
        response = await fetch(url, options);
      } catch (e) {
        console.error("Silent refresh failed, user needs to login interactively.", e);
        chrome.runtime.sendMessage({ action: "auth_required" });
        throw new Error("Phiên làm việc Google đã hết hạn. Vui lòng đăng nhập lại.");
      }
    }

    return response;
  }

  async getGoogleToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["google_access_token"], (data) => {
        resolve(data.google_access_token || null);
      });
    });
  }

  // Cập nhật giao diện Sidebar
  updateSidebarUI(session) {
    const container = document.getElementById("sidebarUserContainer");
    if (!container) return;

    // Thiết lập position relative để chứa menu dropdown tuyệt đối
    container.style.position = "relative";

    // Bơm Style CSS cho dropdown một lần duy nhất
    if (!document.getElementById("userDropdownStyle")) {
      const style = document.createElement("style");
      style.id = "userDropdownStyle";
      style.textContent = `
        .user-dropdown-menu {
          position: absolute;
          bottom: 50px;
          left: 6px;
          right: 6px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: none;
          flex-direction: column;
          z-index: 1000;
          overflow: hidden;
          padding: 4px 0;
        }
        .user-dropdown-item {
          padding: 10px 14px;
          font-size: 13px;
          color: var(--text-color);
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background 0.2s, color 0.2s;
          font-family: inherit;
        }
        .user-dropdown-item:hover {
          background: var(--border-color);
        }
        .user-dropdown-item.danger {
          color: #ef4444;
        }
        .user-dropdown-item.danger:hover {
          background: rgba(239, 68, 68, 0.08);
        }
      `;
      document.head.appendChild(style);
    }

    if (session.loggedIn) {
      const email = session.user?.email || "Google User";
      const avatar = session.user?.user_metadata?.avatar_url || "";
      
      container.innerHTML = `
        <div class="nav-item user-btn active" id="sidebarUserBtn" title="${email}" style="border-left: none; padding-left: 12px; width: 100%; display: flex; align-items: center; justify-content: flex-start; cursor: pointer;">
          ${avatar 
            ? `<img src="${avatar}" class="user-avatar" style="width: 22px; height: 22px; border-radius: 50%; display: block; flex-shrink: 0;" />` 
            : `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
          }
          <span class="nav-label" style="font-size: 13px; margin-left: 12px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;">${email.split('@')[0]}</span>
        </div>
        
        <div class="user-dropdown-menu" id="userDropdownMenu">
          <button class="user-dropdown-item" id="btnFeedback">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            Góp ý
          </button>
          <button class="user-dropdown-item" id="btnReportBug">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Báo lỗi
          </button>
          <button class="user-dropdown-item danger" id="btnLogout">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Đăng xuất
          </button>
        </div>
      `;

      const userBtn = document.getElementById("sidebarUserBtn");
      const dropdownMenu = document.getElementById("userDropdownMenu");
      const btnFeedback = document.getElementById("btnFeedback");
      const btnReportBug = document.getElementById("btnReportBug");
      const btnLogout = document.getElementById("btnLogout");

      if (userBtn && dropdownMenu) {
        // Toggle dropdown
        userBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const isShown = dropdownMenu.style.display === "flex";
          dropdownMenu.style.display = isShown ? "none" : "flex";
        });

        // Click Góp ý
        if (btnFeedback) {
          btnFeedback.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = "none";
            window.open("https://mail.google.com/mail/?view=cm&fs=1&to=hung000anh@gmail.com&su=" + encodeURIComponent("Góp ý ứng dụng Memoria"));
          });
        }

        // Click Báo lỗi
        if (btnReportBug) {
          btnReportBug.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = "none";
            const modal = document.getElementById("bugReportModal");
            if (modal) modal.classList.add("active");
          });
        }

        // Click Đăng xuất
        if (btnLogout) {
          btnLogout.addEventListener("click", async (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = "none";
            if (confirm("Bạn có muốn đăng xuất khỏi Google?")) {
              await this.logout();
              window.location.reload();
            }
          });
        }

        // Click ngoài để ẩn
        document.addEventListener("click", (e) => {
          if (!container.contains(e.target)) {
            dropdownMenu.style.display = "none";
          }
        });
      }
    } else {
      container.innerHTML = `
        <button class="nav-item user-btn" id="sidebarUserBtn" title="Người dùng" style="width: 100%; display: flex; align-items: center; justify-content: flex-start; padding-left: 12px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span class="nav-label" style="font-size: 13px; margin-left: 12px; font-weight: 500;">Đăng nhập</span>
        </button>

        <div class="user-dropdown-menu" id="userDropdownMenu">
          <button class="user-dropdown-item" id="btnLogin">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            Đăng nhập
          </button>
          <button class="user-dropdown-item" id="btnFeedback">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            Góp ý
          </button>
          <button class="user-dropdown-item" id="btnReportBug">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Báo lỗi
          </button>
        </div>
      `;

      const userBtn = document.getElementById("sidebarUserBtn");
      const dropdownMenu = document.getElementById("userDropdownMenu");
      const btnLogin = document.getElementById("btnLogin");
      const btnFeedback = document.getElementById("btnFeedback");
      const btnReportBug = document.getElementById("btnReportBug");

      if (userBtn && dropdownMenu) {
        // Toggle dropdown
        userBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const isShown = dropdownMenu.style.display === "flex";
          dropdownMenu.style.display = isShown ? "none" : "flex";
        });

        // Click Đăng nhập
        if (btnLogin) {
          btnLogin.addEventListener("click", async (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = "none";
            try {
              const res = await this.login(true);
              window.location.reload();
            } catch (err) {
              console.error(err);
              alert("Đăng nhập thất bại: " + err.message);
            }
          });
        }

        // Click Góp ý
        if (btnFeedback) {
          btnFeedback.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = "none";
            window.open("https://mail.google.com/mail/?view=cm&fs=1&to=hung000anh@gmail.com&su=" + encodeURIComponent("Góp ý ứng dụng Memoria"));
          });
        }

        // Click Báo lỗi
        if (btnReportBug) {
          btnReportBug.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = "none";
            const modal = document.getElementById("bugReportModal");
            if (modal) modal.classList.add("active");
          });
        }

        // Click ngoài để ẩn
        document.addEventListener("click", (e) => {
          if (!container.contains(e.target)) {
            dropdownMenu.style.display = "none";
          }
        });
      }
    }
  }
}

// Xử lý logic Modal Báo lỗi
function initBugReportModal() {
  const modal = document.getElementById('bugReportModal');
  const descInput = document.getElementById('bugDescInput');
  const imageInput = document.getElementById('bugImageInput');
  const previewContainer = document.getElementById('bugImagePreviewContainer');
  const previewImg = document.getElementById('bugImagePreview');
  const errorMsg = document.getElementById('bugErrorMsg');
  const submitBtn = document.getElementById('submitBugBtn');
  const cancelBtn = document.getElementById('cancelBugBtn');

  if (!modal) return;

  // Preview ảnh
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewContainer.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      previewImg.src = '';
      previewContainer.style.display = 'none';
    }
  });

  const closeModal = () => {
    modal.classList.remove('active');
    descInput.value = '';
    imageInput.value = '';
    previewImg.src = '';
    previewContainer.style.display = 'none';
    errorMsg.style.display = 'none';
  };

  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const desc = descInput.value.trim();
      if (!desc) {
        errorMsg.textContent = 'Vui lòng mô tả chi tiết lỗi bạn gặp phải.';
        errorMsg.style.display = 'block';
        return;
      }

      const email = 'hung000anh@gmail.com';
      const subject = encodeURIComponent('[Memoria] Báo cáo lỗi ứng dụng');
      
      let bodyText = `Mô tả lỗi:\n${desc}\n\n`;
      if (imageInput.files.length > 0) {
        bodyText += `(Lưu ý: Hãy đính kèm tệp ảnh bạn đã chọn vào thư này trước khi gửi!)\n`;
      }
      const body = encodeURIComponent(bodyText);

      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`);
      closeModal();
    });
  }
}

window.authService = new AuthService();

// Tự động kiểm tra session và render sidebar khi DOM đã sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
  authService.checkSession();
  initBugReportModal();
});
