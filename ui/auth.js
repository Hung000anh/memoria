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

    if (session.loggedIn) {
      const email = session.user?.email || "Google User";
      const avatar = session.user?.user_metadata?.avatar_url || "";
      
      container.innerHTML = `
        <div class="nav-item user-btn active" id="sidebarUserBtn" title="${email}" style="position: relative; border-left: none; padding-left: 12px; width: 100%; display: flex; align-items: center; justify-content: flex-start;">
          ${avatar 
            ? `<img src="${avatar}" class="user-avatar" style="width: 22px; height: 22px; border-radius: 50%; display: block; flex-shrink: 0;" />` 
            : `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
          }
          <span class="nav-label" style="font-size: 13px; margin-left: 12px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;">${email.split('@')[0]}</span>
          <button id="sidebarLogoutBtn" title="Đăng xuất" style="background: none; border: none; cursor: pointer; color: #ef4444; position: absolute; right: 12px; font-weight: bold; display: none; font-size: 16px;">&times;</button>
        </div>
      `;

      const userBtn = document.getElementById("sidebarUserBtn");
      const logoutBtn = document.getElementById("sidebarLogoutBtn");
      if (userBtn && logoutBtn) {
        userBtn.addEventListener("mouseenter", () => {
          const label = userBtn.querySelector(".nav-label");
          if (label && getComputedStyle(label).display !== "none") {
            logoutBtn.style.display = "block";
          }
        });
        userBtn.addEventListener("mouseleave", () => {
          logoutBtn.style.display = "none";
        });
        
        logoutBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (confirm("Bạn có muốn đăng xuất khỏi Google?")) {
            await this.logout();
            window.location.reload();
          }
        });

        // Hỗ trợ click logout khi ở giao diện sidebar thu nhỏ
        userBtn.addEventListener("click", async () => {
          const label = userBtn.querySelector(".nav-label");
          if (label && getComputedStyle(label).display === "none") {
            if (confirm("Đăng xuất khỏi Google?")) {
              await this.logout();
              window.location.reload();
            }
          }
        });
      }
    } else {
      container.innerHTML = `
        <button class="nav-item user-btn" id="sidebarUserBtn" title="Đăng nhập Google" style="width: 100%; display: flex; align-items: center; justify-content: flex-start; padding-left: 12px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span class="nav-label" style="font-size: 13px; margin-left: 12px; font-weight: 500;">Đăng nhập</span>
        </button>
      `;

      const loginBtn = document.getElementById("sidebarUserBtn");
      if (loginBtn) {
        loginBtn.addEventListener("click", async () => {
          try {
            const res = await this.login(true);
            window.location.reload();
          } catch (err) {
            console.error(err);
            alert("Đăng nhập thất bại: " + err.message);
          }
        });
      }
    }
  }
}

window.authService = new AuthService();

// Tự động kiểm tra session và render sidebar khi DOM đã sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
  authService.checkSession();
});
