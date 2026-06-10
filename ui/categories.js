const CATEGORY_MAP = {
  // Mạng xã hội & Nhắn tin
  "facebook.com": "Mạng xã hội", "messenger.com": "Mạng xã hội", "instagram.com": "Mạng xã hội", 
  "twitter.com": "Mạng xã hội", "x.com": "Mạng xã hội", "tiktok.com": "Mạng xã hội",
  "zalo.me": "Mạng xã hội", "chat.zalo.me": "Mạng xã hội", "linkedin.com": "Mạng xã hội",
  "reddit.com": "Mạng xã hội", "discord.com": "Mạng xã hội", "telegram.org": "Mạng xã hội",
  "web.whatsapp.com": "Mạng xã hội", "pinterest.com": "Mạng xã hội", "viber.com": "Mạng xã hội",
  "skype.com": "Mạng xã hội", "tumblr.com": "Mạng xã hội", "snapchat.com": "Mạng xã hội",
  "quora.com": "Mạng xã hội", "wechat.com": "Mạng xã hội", "line.me": "Mạng xã hội",

  // Giải trí & Video
  "youtube.com": "Giải trí", "netflix.com": "Giải trí", "spotify.com": "Giải trí",
  "twitch.tv": "Giải trí", "soundcloud.com": "Giải trí", "zingmp3.vn": "Giải trí",
  "nhaccuatui.com": "Giải trí", "phimmoi.net": "Giải trí", "xvideos.com": "Giải trí", "pornhub.com": "Giải trí",
  "vimeo.com": "Giải trí", "dailymotion.com": "Giải trí", "bilibili.com": "Giải trí", 
  "disneyplus.com": "Giải trí", "hbomax.com": "Giải trí", "hulu.com": "Giải trí", 
  "fptplay.vn": "Giải trí", "vieon.vn": "Giải trí", "popcornflix.com": "Giải trí",
  "nct.vn": "Giải trí", "keeng.vn": "Giải trí", "truyentranhtuan.com": "Giải trí", 
  "nettruyen.com": "Giải trí", "animevietsub.tv": "Giải trí", "cgv.vn": "Giải trí", 
  "galaxycine.vn": "Giải trí", "bhdstar.vn": "Giải trí", "truyenqq.com": "Giải trí",
  "mangadex.org": "Giải trí", "myanimelist.net": "Giải trí", "crunchyroll.com": "Giải trí",
  "mangaplus.shueisha.co.jp": "Giải trí", "webtoons.com": "Giải trí", "tapas.io": "Giải trí",

  // Game
  "steamcommunity.com": "Game", "steampowered.com": "Game", "roblox.com": "Game",
  "leagueoflegends.com": "Game", "riotgames.com": "Game", "epicgames.com": "Game", 
  "ign.com": "Game", "gamespot.com": "Game", "garena.vn": "Game", "chess.com": "Game",
  "lienquan.garena.vn": "Game", "fo4.garena.vn": "Game", "valorant.zing.vn": "Game", 
  "vnggames.com": "Game", "nimo.tv": "Game", "nonolive.com": "Game",

  // Công việc & Học tập
  "github.com": "Công việc", "gitlab.com": "Công việc", "bitbucket.org": "Công việc",
  "stackoverflow.com": "Công việc", "notion.so": "Công việc", "trello.com": "Công việc",
  "slack.com": "Công việc", "figma.com": "Công việc", "canva.com": "Công việc",
  "docs.google.com": "Công việc", "drive.google.com": "Công việc", "mail.google.com": "Công việc",
  "office.com": "Công việc", "teams.microsoft.com": "Công việc", "zoom.us": "Công việc",
  "chatgpt.com": "Công việc", "claude.ai": "Công việc", "gemini.google.com": "Công việc",
  "jira.com": "Công việc", "atlassian.com": "Công việc", "asana.com": "Công việc", 
  "monday.com": "Công việc", "wordpress.com": "Công việc", "medium.com": "Công việc",
  "coursera.org": "Học tập", "udemy.com": "Học tập", "duolingo.com": "Học tập", 
  "quizlet.com": "Học tập", "khanacademy.org": "Học tập", "w3schools.com": "Học tập",
  "edx.org": "Học tập", "skillshare.com": "Học tập", "codecademy.com": "Học tập", 
  "freecodecamp.org": "Học tập", "leetcode.com": "Học tập", "hackerrank.com": "Học tập",
  "studocu.com": "Học tập", "chegg.com": "Học tập", "udlms.udn.vn": "Học tập", 
  "elearning.tmu.edu.vn": "Học tập", "dvc.vn": "Học tập", "hocmai.vn": "Học tập", 
  "olm.vn": "Học tập", "shub.edu.vn": "Học tập", "azota.vn": "Học tập", "violet.vn": "Học tập",
  "topcv.vn": "Công việc", "vietnamworks.com": "Công việc", "careerbuilder.vn": "Công việc", "itviec.com": "Công việc",

  // Tin tức & Diễn đàn
  "vnexpress.net": "Tin tức", "dantri.com.vn": "Tin tức", "tuoitre.vn": "Tin tức",
  "thanhnien.vn": "Tin tức", "vietnamnet.vn": "Tin tức", "kenh14.vn": "Tin tức",
  "zingnews.vn": "Tin tức", "bbc.com": "Tin tức", "cnn.com": "Tin tức", 
  "nytimes.com": "Tin tức", "theguardian.com": "Tin tức", "forbes.com": "Tin tức", 
  "bloomberg.com": "Tin tức", "reuters.com": "Tin tức", "wsj.com": "Tin tức", 
  "vneconomy.vn": "Tin tức", "cafef.vn": "Tin tức", "nld.com.vn": "Tin tức", 
  "tienphong.vn": "Tin tức", "laodong.vn": "Tin tức", "baomoi.com": "Tin tức", 
  "vtv.vn": "Tin tức", "soha.vn": "Tin tức", "eva.vn": "Tin tức", "afamily.vn": "Tin tức", 
  "tinhte.vn": "Tin tức", "voz.vn": "Tin tức", "otofun.net": "Tin tức", "ngoisao.vnexpress.net": "Tin tức",

  // Mua sắm
  "shopee.vn": "Mua sắm", "lazada.vn": "Mua sắm", "tiki.vn": "Mua sắm", 
  "amazon.com": "Mua sắm", "aliexpress.com": "Mua sắm", "taobao.com": "Mua sắm",
  "ebay.com": "Mua sắm", "thegioididong.com": "Mua sắm", "dienmayxanh.com": "Mua sắm",
  "shein.com": "Mua sắm", "etsy.com": "Mua sắm", "sendo.vn": "Mua sắm", 
  "chotot.com": "Mua sắm", "fptshop.com.vn": "Mua sắm", "cellphones.com.vn": "Mua sắm",
  "hasaki.vn": "Mua sắm", "watsons.vn": "Mua sắm", "guardian.com.vn": "Mua sắm", 
  "concung.com": "Mua sắm", "kidsplaza.vn": "Mua sắm", "bachhoaxanh.com": "Mua sắm", 
  "winmart.vn": "Mua sắm", "cooponline.vn": "Mua sắm",

  // Ngân hàng & Tài chính
  "techcombank.com.vn": "Tài chính", "vietcombank.com.vn": "Tài chính", "mbbank.com.vn": "Tài chính",
  "momo.vn": "Tài chính", "paypal.com": "Tài chính", "binance.com": "Tài chính",
  "tradingview.com": "Tài chính", "coinmarketcap.com": "Tài chính", "vpb.com.vn": "Tài chính", 
  "bidv.com.vn": "Tài chính", "sacombank.com.vn": "Tài chính", "vib.com.vn": "Tài chính", 
  "tpbank.vn": "Tài chính", "vndirect.com.vn": "Tài chính", "ssi.com.vn": "Tài chính", 
  "tcbs.com.vn": "Tài chính", "coingecko.com": "Tài chính", "my.sepay.vn": "Tài chính",
  "zalopay.vn": "Tài chính", "viettelpay.vn": "Tài chính", "shb.com.vn": "Tài chính", 
  "ocb.com.vn": "Tài chính", "acb.com.vn": "Tài chính", "hdbank.com.vn": "Tài chính", 
  "vss.gov.vn": "Tài chính", "dichvucong.gov.vn": "Tài chính", "thuedientu.gdt.gov.vn": "Tài chính", 
  "fireant.vn": "Tài chính", "vietstock.vn": "Tài chính",

  // Du lịch
  "traveloka.com": "Du lịch", "agoda.com": "Du lịch", "booking.com": "Du lịch", 
  "airbnb.com": "Du lịch", "vietnamairlines.com": "Du lịch", "vietjetair.com": "Du lịch", 
  "tripadvisor.com": "Du lịch", "skyscanner.net": "Du lịch", "vntrip.vn": "Du lịch", 
  "mytour.vn": "Du lịch", "vexere.com": "Du lịch", "bambooairways.com": "Du lịch", 
  "vietravel.com": "Du lịch", "saigontourist.net": "Du lịch",

  // Dịch vụ & Vận chuyển
  "shopeefood.vn": "Dịch vụ", "gojek.com": "Dịch vụ", "grab.com": "Dịch vụ", 
  "be.com.vn": "Dịch vụ", "ahamove.com": "Dịch vụ", "ghtk.vn": "Dịch vụ", 
  "viettelpost.com.vn": "Dịch vụ", "vnpost.vn": "Dịch vụ",

  // Sức khỏe
  "vinmec.com": "Sức khỏe", "hellobacsi.com": "Sức khỏe", "nhathuoclongchau.com.vn": "Sức khỏe", 
  "pharmacity.vn": "Sức khỏe", "webmd.com": "Sức khỏe", "healthline.com": "Sức khỏe",

  // Công cụ tìm kiếm & Công cụ khác
  "google.com": "Tìm kiếm", "google.com.vn": "Tìm kiếm", "bing.com": "Tìm kiếm",
  "yahoo.com": "Tìm kiếm", "duckduckgo.com": "Tìm kiếm", "coccoc.com": "Tìm kiếm",
  "yandex.com": "Tìm kiếm", "baidu.com": "Tìm kiếm", "ecosia.org": "Tìm kiếm",
  "translate.google.com": "Công cụ", "maps.google.com": "Công cụ", "weather.com": "Công cụ", 
  "speedtest.net": "Công cụ", "bit.ly": "Công cụ", "ilovepdf.com": "Công cụ"
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
  "Game": "#6366f1",         // Indigo
  "Công việc": "#10b981",    // Green
  "Học tập": "#8b5cf6",      // Purple
  "Tin tức": "#f59e0b",      // Yellow/Orange
  "Mua sắm": "#ef4444",      // Red
  "Tài chính": "#14b8a6",    // Teal
  "Du lịch": "#0ea5e9",      // Sky
  "Sức khỏe": "#f43f5e",     // Rose
  "Dịch vụ": "#d946ef",      // Fuchsia
  "Công cụ": "#737373",      // Neutral
  "Tìm kiếm": "#64748b",     // Slate
  "Khác": "#94a3b8"          // Gray
};
