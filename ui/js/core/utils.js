const _global = (typeof window !== 'undefined' ? window : self);
_global.utils = {
  sha256: async function(message) {
    const msgBuffer = new TextEncoder().encode(message);                    
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },
  xorHexEncrypt: function(text, pwd) {
    const utf8Text = unescape(encodeURIComponent(text));
    const utf8Pwd = unescape(encodeURIComponent(pwd));
    let hex = '';
    for(let i = 0; i < utf8Text.length; i++) {
      const charCode = utf8Text.charCodeAt(i) ^ utf8Pwd.charCodeAt(i % utf8Pwd.length);
      hex += charCode.toString(16).padStart(2, '0');
    }
    return hex;
  },
  xorHexDecrypt: function(hex, pwd) {
    const utf8Pwd = unescape(encodeURIComponent(pwd));
    let utf8Text = '';
    for(let i = 0; i < hex.length; i+=2) {
      const charCode = parseInt(hex.substr(i, 2), 16) ^ utf8Pwd.charCodeAt((i/2) % utf8Pwd.length);
      utf8Text += String.fromCharCode(charCode);
    }
    try {
      return decodeURIComponent(escape(utf8Text));
    } catch(e) {
      return null;
    }
  },
  renderMarkdown: function(text, isInline = false) {
    if (_global.marked && !_global.markedOptionsSet) {
      _global.marked.setOptions({ gfm: true, breaks: true });
      _global.markedOptionsSet = true;
    }
    if (!text || !_global.marked || !_global.DOMPurify) return text || '';
    const rawHtml = isInline ? _global.marked.parseInline(text) : _global.marked.parse(text);
    // Ensure links open in new tab safely
    const htmlWithTarget = rawHtml.replace(/<a\s+href=("[^"]*"|'[^']*')/g, '<a href=$1 target="_blank" rel="noopener"');
    return _global.DOMPurify.sanitize(htmlWithTarget);
  }
};
