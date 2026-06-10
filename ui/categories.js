const CATEGORY_MAP = {
  // Mạng xã hội & Nhắn tin
  "facebook.com": "Mạng xã hội", "messenger.com": "Mạng xã hội", "instagram.com": "Mạng xã hội", 
  "twitter.com": "Mạng xã hội", "x.com": "Mạng xã hội", "tiktok.com": "Mạng xã hội",
  "zalo.me": "Mạng xã hội", "chat.zalo.me": "Mạng xã hội", "linkedin.com": "Mạng xã hội",
  "reddit.com": "Mạng xã hội", "discord.com": "Mạng xã hội", "telegram.org": "Mạng xã hội",
  "web.whatsapp.com": "Mạng xã hội", "pinterest.com": "Mạng xã hội",

  // Giải trí & Video
  "youtube.com": "Giải trí", "netflix.com": "Giải trí", "spotify.com": "Giải trí",
  "twitch.tv": "Giải trí", "soundcloud.com": "Giải trí", "zingmp3.vn": "Giải trí",
  "nhaccuatui.com": "Giải trí", "phimmoi.net": "Giải trí", "xvideos.com": "Giải trí", "pornhub.com": "Giải trí",
  "steamcommunity.com": "Giải trí", "steampowered.com": "Giải trí", "roblox.com": "Giải trí",

  // Công việc & Học tập
  "github.com": "Công việc", "gitlab.com": "Công việc", "bitbucket.org": "Công việc",
  "stackoverflow.com": "Công việc", "notion.so": "Công việc", "trello.com": "Công việc",
  "slack.com": "Công việc", "figma.com": "Công việc", "canva.com": "Công việc",
  "docs.google.com": "Công việc", "drive.google.com": "Công việc", "mail.google.com": "Công việc",
  "office.com": "Công việc", "teams.microsoft.com": "Công việc", "zoom.us": "Công việc",
  "chatgpt.com": "Công việc", "claude.ai": "Công việc", "gemini.google.com": "Công việc",
  "coursera.org": "Học tập", "udemy.com": "Học tập", "duolingo.com": "Học tập", 
  "quizlet.com": "Học tập", "khanacademy.org": "Học tập", "w3schools.com": "Học tập",

  // Tin tức
  "vnexpress.net": "Tin tức", "dantri.com.vn": "Tin tức", "tuoitre.vn": "Tin tức",
  "thanhnien.vn": "Tin tức", "vietnamnet.vn": "Tin tức", "kenh14.vn": "Tin tức",
  "zingnews.vn": "Tin tức", "bbc.com": "Tin tức", "cnn.com": "Tin tức", 
  "nytimes.com": "Tin tức", "theguardian.com": "Tin tức",

  // Mua sắm
  "shopee.vn": "Mua sắm", "lazada.vn": "Mua sắm", "tiki.vn": "Mua sắm", 
  "amazon.com": "Mua sắm", "aliexpress.com": "Mua sắm", "taobao.com": "Mua sắm",
  "ebay.com": "Mua sắm", "thegioididong.com": "Mua sắm", "dienmayxanh.com": "Mua sắm",

  // Ngân hàng & Tài chính
  "techcombank.com.vn": "Tài chính", "vietcombank.com.vn": "Tài chính", "mbbank.com.vn": "Tài chính",
  "momo.vn": "Tài chính", "paypal.com": "Tài chính", "binance.com": "Tài chính",
  "tradingview.com": "Tài chính", "coinmarketcap.com": "Tài chính",

  // Công cụ tìm kiếm
  "google.com": "Tìm kiếm", "google.com.vn": "Tìm kiếm", "bing.com": "Tìm kiếm",
  "yahoo.com": "Tìm kiếm", "duckduckgo.com": "Tìm kiếm", "coccoc.com": "Tìm kiếm"
};

function getDomainCategory(domain) {
  if (!domain) return "Khác";
  
  // Exact match
  if (CATEGORY_MAP[domain]) return CATEGORY_MAP[domain];

  // Try matching root domain (e.g. mail.google.com -> google.com)
  const parts = domain.split('.');
  if (parts.length > 2) {
    const rootDomain = parts.slice(-2).join('.');
    if (CATEGORY_MAP[rootDomain]) return CATEGORY_MAP[rootDomain];
    
    // For .com.vn, .co.uk etc
    if (parts.length > 3) {
       const rootDomain2 = parts.slice(-3).join('.');
       if (CATEGORY_MAP[rootDomain2]) return CATEGORY_MAP[rootDomain2];
    }
  }

  return "Khác";
}

const CATEGORY_COLORS = {
  "Mạng xã hội": "#3b82f6", // Blue
  "Giải trí": "#ec4899",     // Pink
  "Công việc": "#10b981",    // Green
  "Học tập": "#8b5cf6",      // Purple
  "Tin tức": "#f59e0b",      // Yellow/Orange
  "Mua sắm": "#ef4444",      // Red
  "Tài chính": "#14b8a6",    // Teal
  "Tìm kiếm": "#64748b",     // Slate
  "Khác": "#94a3b8"          // Gray
};
