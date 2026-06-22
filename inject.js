(function() {
  const checkActive = () => document.documentElement.getAttribute('dauxanh-allow-copy-active') === 'true';

  // 1. Vô hiệu hóa preventDefault đối với các sự kiện bôi đen/copy
  const originalPreventDefault = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function() {
    if (checkActive() && ['copy', 'cut', 'contextmenu', 'selectstart', 'mousedown', 'mouseup'].includes(this.type)) {
      return;
    }
    return originalPreventDefault.apply(this, arguments);
  };

  // 2. Vô hiệu hóa các thuộc tính sự kiện inline dạng onselectstart, onmousedown...
  const nullSetter = {
    set: function() {},
    get: function() { return null; },
    configurable: true
  };
  
  const targets = [document, window];
  const events = ['onselectstart', 'oncopy', 'oncut', 'oncontextmenu', 'onmousedown', 'onmouseup', 'onselect'];
  
  targets.forEach(target => {
    events.forEach(evt => {
      try {
        Object.defineProperty(target, evt, nullSetter);
      } catch(e) {}
    });
  });

  // Khi document.body xuất hiện hoặc load xong, gán cho body
  const applyToBody = () => {
    if (document.body) {
      events.forEach(evt => {
        try {
          Object.defineProperty(document.body, evt, nullSetter);
        } catch(e) {}
      });
    }
  };
  
  if (document.body) {
    applyToBody();
  } else {
    document.addEventListener('DOMContentLoaded', applyToBody);
  }
})();
