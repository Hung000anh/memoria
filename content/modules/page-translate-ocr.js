// Dịch chữ HTML và chữ nằm trong các ảnh đang hiển thị trên trang.
// OCR ảnh dùng polygon do PP-OCRv6 trả về để đặt bản dịch đúng vị trí.

(function () {
  'use strict';

  const MAX_UNIQUE_TEXTS = 1000;
  const MAX_OCR_TEXTS = 300;
  const OCR_MIN_SCORE = 0.7;
  const MAX_IMAGES = 50;
  const BATCH_SIZE = 20;
  const FONT_SCALE = 0.95;
  const TEXT_TOP_OFFSET = 3;
  const TRANSLATION_VERTICAL_PADDING = 6;
  const TRANSLATION_HORIZONTAL_PADDING = 3;
  const ENABLE_HTML_TRANSLATION = true;
  const ENABLE_OCR_TRANSLATION = false;
  let pageTranslation = null;
  let toolbar = null;
  let translationRunId = 0;

  // Dọn bản dịch khi người dùng bấm sang route khác trong SPA.
  // Link chỉ đổi hash trong cùng trang (thường do cuộn reader) sẽ được bỏ qua.
  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || event.defaultPrevented || anchor.target === '_blank') return;
    let destination;
    try {
      destination = new URL(anchor.href, location.href);
    } catch (_) {
      return;
    }
    const currentRoute = `${location.origin}${location.pathname}${location.search}`;
    const destinationRoute = `${destination.origin}${destination.pathname}${destination.search}`;
    if (destinationRoute !== currentRoute) undoPageTranslation();
  }, true);

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action !== 'toggle_full_page_translation') return;
    if (pageTranslation) {
      undoPageTranslation();
    } else {
      translateFullPage().catch(error => {
        setToolbar(`Lỗi dịch trang: ${error.message || String(error)}`, false);
      });
    }
  });

  function sendMessage(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) resolve({ success: false, error: chrome.runtime.lastError.message });
          else resolve(response || { success: false, error: 'Không nhận được phản hồi.' });
        });
      } catch (error) {
        resolve({ success: false, error: error.message || String(error) });
      }
    });
  }

  function isVisibleTextNode(node) {
    const raw = node.nodeValue || '';
    if (raw.trim().length < 2) return false;
    const parent = node.parentElement;
    if (!parent || parent.closest('[data-memoria-page-translate-ui]')) return false;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE'].includes(parent.tagName)) return false;
    if (parent.closest('[contenteditable="true"]')) return false;
    const style = window.getComputedStyle(parent);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (Number.parseFloat(style.opacity || '1') === 0) return false;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = range.getClientRects();
    range.detach();
    return rects.length > 0 && Array.from(rects).some(rect => rect.width > 0 && rect.height > 0);
  }

  function collectTextNodes() {
    const nodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) if (isVisibleTextNode(node)) nodes.push(node);
    return nodes;
  }

  function collectVisibleImages(limit = MAX_IMAGES) {
    const extensionRoot = chrome.runtime.getURL('');
    return Array.from(document.images)
      .filter(image => {
        if (!image.isConnected || image.src.startsWith(extensionRoot)) return false;
        if (!image.complete || image.naturalWidth < 120 || image.naturalHeight < 80) return false;
        if (image.closest('[data-memoria-page-translate-ui]')) return false;
        const style = window.getComputedStyle(image);
        if (style.display === 'none' || style.visibility === 'hidden' || Number.parseFloat(style.opacity || '1') === 0) return false;
        const rect = image.getBoundingClientRect();
        return rect.width >= 80 && rect.height >= 50 && rect.width * rect.height >= 10000;
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return ar.top - br.top || ar.left - br.left;
      })
      .slice(0, limit)
      .map(element => ({ element, rect: getElementRect(element) }));
  }

  function getElementRect(element) {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  function getTranslatableText(node) {
    const raw = node.nodeValue || '';
    return { raw, text: raw.trim(), leading: raw.match(/^\s*/)?.[0] || '', trailing: raw.match(/\s*$/)?.[0] || '' };
  }

  function createToolbar() {
    if (toolbar) toolbar.remove();
    toolbar = document.createElement('div');
    toolbar.setAttribute('data-memoria-page-translate-ui', 'true');
    toolbar.style.cssText = 'position:fixed;top:14px;right:14px;z-index:2147483647;display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;background:#fff;color:#111827;font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 5px 20px rgba(0,0,0,.2);';
    const status = document.createElement('span');
    status.id = 'memoria-page-translate-status';
    status.textContent = 'Đang chuẩn bị dịch trang...';
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.textContent = 'Hoàn tác';
    undo.disabled = true;
    undo.style.cssText = 'border:0;border-radius:6px;padding:5px 9px;background:#10b981;color:#fff;cursor:pointer;';
    undo.addEventListener('click', undoPageTranslation);
    toolbar.append(status, undo);
    document.documentElement.appendChild(toolbar);
  }

  function setToolbar(statusText, canUndo) {
    if (!toolbar) return;
    const status = toolbar.querySelector('#memoria-page-translate-status');
    const undo = toolbar.querySelector('button');
    if (status) status.textContent = statusText;
    if (undo) undo.disabled = !canUndo;
  }

  async function translateFullPage() {
    const runId = ++translationRunId;
    createToolbar();
    const nodes = collectTextNodes();
    const entries = nodes.map(node => ({ node, ...getTranslatableText(node) }));
    const uniqueTexts = [...new Set(entries.map(entry => entry.text))].slice(0, MAX_UNIQUE_TEXTS);
    const entriesByText = new Map();
    entries.forEach(entry => {
      if (!uniqueTexts.includes(entry.text)) return;
      if (!entriesByText.has(entry.text)) entriesByText.set(entry.text, []);
      entriesByText.get(entry.text).push(entry);
    });
    const imageTargets = collectVisibleImages();
    if (uniqueTexts.length === 0 && imageTargets.length === 0) {
      setToolbar('Không tìm thấy chữ hoặc ảnh đang hiển thị.', false);
      setTimeout(removeToolbar, 3500);
      return;
    }

    pageTranslation = {
      entries: [],
      imageOverlays: [],
      originalLang: document.documentElement.getAttribute('lang'),
      positionCleanup: null
    };
    try {
      // Nhánh 1: dịch nội dung HTML trên trang.
      if (ENABLE_HTML_TRANSLATION && uniqueTexts.length) {
        await translateHtmlBranch(uniqueTexts, entriesByText);
      }

      // Nhánh 2: OCR ảnh và dịch nội dung trong box đỏ.
      if (ENABLE_OCR_TRANSLATION && imageTargets.length) {
        await translateOcrBranch(imageTargets);
      }

      if (runId !== translationRunId) return;
      const processedParts = [];
      if (ENABLE_HTML_TRANSLATION && uniqueTexts.length) {
        processedParts.push(`${pageTranslation.entries.length} đoạn HTML`);
      }
      if (ENABLE_OCR_TRANSLATION && imageTargets.length) processedParts.push('ảnh OCR');
      setToolbar(`Đã xử lý ${processedParts.join(' và ') || 'nội dung trang'}.`, true);
    } catch (error) {
      if (runId !== translationRunId) return;
      undoPageTranslation();
      createToolbar();
      setToolbar(`Lỗi xử lý dịch: ${error.message || String(error)}`, false);
      setTimeout(removeToolbar, 6000);
    }
  }

  async function translateHtmlBranch(uniqueTexts, entriesByText) {
    setToolbar('Đang dịch text HTML...', true);
    await translateTextEntries(uniqueTexts, entriesByText);
  }

  async function translateOcrBranch(imageTargets) {
    setToolbar(ENABLE_OCR_TRANSLATION
      ? 'Đang nhận dạng và dịch chữ trong box OCR màu đỏ...'
      : 'Đang nhận dạng bounding box OCR màu đỏ...', true);
    const imageResponse = await requestImageOcr(imageTargets, results => ENABLE_OCR_TRANSLATION
      ? translateImageItems(imageTargets, results)
      : debugImageItems(imageTargets, results));
    if (!imageResponse?.success) throw new Error(imageResponse?.error || 'Không thể OCR ảnh trên trang.');
  }

  async function translateTextEntries(uniqueTexts, entriesByText) {
    let completed = 0;
    for (let offset = 0; offset < uniqueTexts.length; offset += BATCH_SIZE) {
      const batch = uniqueTexts.slice(offset, offset + BATCH_SIZE);
      const response = await sendMessage({ action: 'translate_text_batch', texts: batch });
      if (!response?.success || !Array.isArray(response.translations)) {
        throw new Error(response?.error || 'Không thể dịch nội dung trang.');
      }
      pageTranslation.targetLang = response.targetLang || pageTranslation.targetLang;
      if (pageTranslation.targetLang) document.documentElement.setAttribute('lang', pageTranslation.targetLang);
      response.translations.forEach((result, index) => {
        if (!result?.success || !result.translatedText) return;
        const originalText = batch[index];
        (entriesByText.get(originalText) || []).forEach(entry => {
          if (!entry.node.isConnected || entry.node.nodeValue !== entry.raw) return;
          if (result.translatedText.trim() === originalText) return;
          entry.node.nodeValue = entry.leading + result.translatedText.trim() + entry.trailing;
          pageTranslation.entries.push(entry);
        });
      });
      completed += batch.length;
      updateImagePositions();
      setToolbar(`Đang dịch chữ... ${completed}/${uniqueTexts.length} · Đã nhúng ${pageTranslation.entries.length} đoạn`, true);
    }
  }

  async function translateImageItems(imageTargets, imageResults) {
    const state = pageTranslation;
    if (!state) return;
    const jobsByText = new Map();
    const overlays = [];

    for (const result of imageResults) {
      const target = imageTargets[result.index ?? 0];
      if (!target || !result?.success || !result.previewDataUrl || !Array.isArray(result.items)) continue;
      const items = result.items
        .map(item => ({
          text: String(item?.text || '').trim(),
          score: Number(item?.score || 0),
          poly: item?.poly
        }))
        .filter(item => item.text && Array.isArray(item.poly) && item.poly.length >= 4 && item.score >= OCR_MIN_SCORE);
      if (!items.length) continue;

      const overlay = await createImageOverlay(target, result, items);
      if (pageTranslation !== state) {
        overlay.canvas.remove();
        return;
      }
      overlays.push(overlay);
      state.imageOverlays.push(overlay);
      overlay.clusters.forEach(cluster => {
        if (!cluster.sourceText || isSingleCharacterText(cluster.sourceText)) return;
        if (!jobsByText.has(cluster.sourceText)) jobsByText.set(cluster.sourceText, []);
        jobsByText.get(cluster.sourceText).push({ overlay, cluster });
      });
    }

    enableImagePositionTracking();
    const uniqueTexts = [...jobsByText.keys()].slice(0, MAX_OCR_TEXTS);
    let completed = 0;
    for (let offset = 0; offset < uniqueTexts.length; offset += BATCH_SIZE) {
      if (pageTranslation !== state) return;
      const batch = uniqueTexts.slice(offset, offset + BATCH_SIZE);
      const response = await sendMessage({ action: 'translate_text_batch', texts: batch });
      if (!response?.success || !Array.isArray(response.translations)) {
        throw new Error(response?.error || 'Không thể dịch chữ trong box OCR.');
      }
      state.targetLang = response.targetLang || state.targetLang;
      response.translations.forEach((translation, index) => {
        if (!translation?.success || !translation.translatedText) return;
        (jobsByText.get(batch[index]) || []).forEach(job => {
          job.cluster.translation = translation.translatedText.trim();
          job.cluster.memberTranslations = splitTranslationToMembers(job.cluster, job.cluster.translation);
          drawImageOverlay(job.overlay);
        });
      });
      completed += batch.length;
      updateImagePositions();
      setToolbar(`Đang dịch box OCR... ${completed}/${uniqueTexts.length}`, true);
    }
    overlays.forEach(drawImageOverlay);
  }

  async function requestImageOcr(imageTargets, onResults) {
    const GROUP_SIZE = 1;
    const allResults = [];
    for (let offset = 0; offset < imageTargets.length; offset += GROUP_SIZE) {
      const group = imageTargets.slice(offset, offset + GROUP_SIZE);
      const sources = await Promise.all(group.map(async target => ({
        target,
        source: await imageElementToDataUrl(target.element)
      })));
      const directSources = sources.filter(entry => entry.source?.dataUrl);
      const fallbackSources = sources.filter(entry => !entry.source?.dataUrl && isImageInViewport(entry.target.element));
      const requestSources = [...directSources, ...fallbackSources];
      if (!requestSources.length) continue;

      const response = await sendMessage({
        action: 'ocr_images_batch',
        images: requestSources.map(entry => ({
          dataUrl: entry.source?.dataUrl || '',
          rect: entry.source?.dataUrl
            ? { left: 0, top: 0, width: entry.source.width, height: entry.source.height }
            : entry.target.rect
        })),
        dpr: window.devicePixelRatio || 1
      });
      if (!response?.success || !Array.isArray(response.images)) continue;

      const groupResults = response.images.map((result, resultIndex) => {
        const source = requestSources[resultIndex];
        result.index = imageTargets.indexOf(source.target);
        result.previewDataUrl = result.previewDataUrl || source.source?.dataUrl || '';
        return result;
      });
      allResults.push(...groupResults);
      await onResults?.(groupResults);
      setToolbar(`Đã OCR ${Math.min(offset + group.length, imageTargets.length)}/${imageTargets.length} ảnh`, true);
    }
    return { success: true, images: allResults };
  }

  function imageElementToDataUrl(element) {
    return new Promise(resolve => {
      try {
        const maxSide = 2200;
        const scale = Math.min(1, maxSide / Math.max(element.naturalWidth, element.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(element.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(element.naturalHeight * scale));
        const context = canvas.getContext('2d');
        context.drawImage(element, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
      } catch (_) {
        resolve(null);
      }
    });
  }

  function isImageInViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
  }

  function isSingleCharacterText(text) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return true;
    return [...normalized].length === 1;

    // CJK thường không có khoảng trắng giữa các từ; chuỗi từ hai ký tự trở
    // lên vẫn được xem là nội dung cần dịch.
  }

  async function debugImageItems(imageTargets, imageResults) {
    const translationState = pageTranslation;
    if (!translationState) return;
    for (let index = 0; index < imageResults.length; index += 1) {
      const result = imageResults[index];
      const target = imageTargets[result.index ?? index];
      if (!target || !result?.success || !result.previewDataUrl || !Array.isArray(result.items)) continue;
      const items = result.items
        .map(item => ({ text: String(item?.text || '').trim(), score: Number(item?.score || 0), poly: item?.poly }))
        .filter(item => item.text && Array.isArray(item.poly) && item.poly.length >= 4 && item.score >= OCR_MIN_SCORE);
      if (!items.length) continue;
      const overlay = await createImageOverlay(target, result, items, true);
      if (pageTranslation !== translationState) {
        overlay.canvas.remove();
        return;
      }
      translationState.imageOverlays.push(overlay);
    }
    enableImagePositionTracking();
    updateImagePositions();
  }

  function createImageOverlay(target, result, items, debug = false) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || 1;
        canvas.height = image.naturalHeight || 1;
        canvas.style.cssText = 'position:fixed;z-index:2147483645;pointer-events:none;display:none;object-fit:fill;margin:0;padding:0;';
        canvas.style.borderRadius = window.getComputedStyle(target.element).borderRadius;
        document.documentElement.appendChild(canvas);
        const cropScale = Number(result.cropScale || 3);
        const normalizedItems = items
          .map(item => normalizeOcrItem(item, cropScale, canvas.width, canvas.height))
          .filter(Boolean);
        const clusters = mergeOcrItemsIntoClusters(normalizedItems)
          .filter(cluster => !isSingleCharacterText(cluster.sourceText));
        const overlay = { target, image, canvas, clusters, translated: false, debug };
        updateImageOverlayPosition(overlay);
        drawImageOverlay(overlay);
        resolve(overlay);
      };
      image.onerror = () => reject(new Error('Không thể tạo lớp hiển thị cho ảnh OCR.'));
      image.src = result.previewDataUrl;
    });
  }

  function drawImageOverlay(overlay) {
    const { canvas, image, clusters } = overlay;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    if (overlay.debug) {
      drawDebugClusters(ctx, clusters);
      overlay.translated = true;
      canvas.style.display = 'block';
      const rect = overlay.target.element.getBoundingClientRect();
      canvas.style.visibility = rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth
        ? 'visible'
        : 'hidden';
      return;
    }
    let hasTranslation = false;
    clusters.forEach(cluster => {
      if (!cluster.translation) return;
      hasTranslation = true;
      if (cluster.orientation === 'vertical') {
        const translations = cluster.memberTranslations.length
          ? cluster.memberTranslations
          : splitTranslationToMembers(cluster, cluster.translation);
        const commonFontSize = getClusterFontSize(ctx, cluster, translations, canvas.width, canvas.height);
        drawVerticalCluster(ctx, cluster, translations, commonFontSize, canvas.width, canvas.height);
      } else {
        const translations = cluster.memberTranslations.length
          ? cluster.memberTranslations
          : splitTranslationToMembers(cluster, cluster.translation);
        const translationBounds = getTranslationBounds(cluster.bounds, canvas.width, canvas.height);
        const commonFontSize = getClusterFontSize(ctx, cluster, translations, canvas.width, canvas.height, translationBounds);
        const maskBounds = cluster.members.map(member => getPaddedBounds(member.bounds, canvas.width, canvas.height));
        drawOpaqueTextRegion(ctx, cluster.translation, translationBounds, commonFontSize, maskBounds);
      }
    });
    overlay.translated = hasTranslation;
    canvas.style.display = hasTranslation ? 'block' : 'none';
  }

  function drawDebugClusters(ctx, clusters) {
    ctx.save();
    ctx.setLineDash([]);
    clusters.forEach((cluster, index) => {
      const bounds = cluster.bounds;
      // Đỏ: bounding box cuối cùng sau khi gộp cụm.
      ctx.strokeStyle = '#ef1f2f';
      ctx.lineWidth = Math.max(3, Math.round(ctx.canvas.width / 500));
      ctx.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
      ctx.fillStyle = '#ef1f2f';
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(String(index + 1), bounds.left + 4, bounds.top + 4);

      // Xanh: bounding box của từng polygon OCR trước khi gộp.
      ctx.strokeStyle = '#00b8ff';
      ctx.lineWidth = Math.max(1, Math.round(ctx.canvas.width / 1200));
      cluster.members.forEach((member, memberIndex) => {
        const child = member.bounds;
        ctx.strokeRect(child.left, child.top, child.width, child.height);
        ctx.fillStyle = '#00b8ff';
        ctx.font = 'bold 11px Arial, sans-serif';
        ctx.fillText(`${index + 1}.${memberIndex + 1}`, child.left + 2, child.top + 2);
      });
    });
    ctx.restore();
  }

  function drawVerticalCluster(ctx, cluster, translations, commonFontSize, canvasWidth, canvasHeight) {
    const members = cluster.members.map(member => ({
      member,
      bounds: getTranslationBounds(getPaddedBounds(member.bounds, canvasWidth, canvasHeight), canvasWidth, canvasHeight)
    }));

    members.forEach((entry, index) => {
      const text = translations[index] || '';
      drawOpaqueTextRegion(ctx, text, entry.bounds, commonFontSize);
    });
  }

  function getClusterFontSize(ctx, cluster, translations, canvasWidth, canvasHeight, fitBounds = null) {
    const firstMember = cluster.members[0];
    if (!firstMember) return 8;
    const referenceBounds = getPaddedBounds(firstMember.bounds, canvasWidth, canvasHeight);
    const referenceText = translations[0] || cluster.translation;
    const firstFontSize = getReducedFittingFontSize(ctx, referenceText, referenceBounds);
    if (cluster.orientation !== 'vertical') {
      return Math.min(firstFontSize, getReducedFittingFontSize(ctx, cluster.translation, fitBounds || cluster.bounds));
    }
    const memberFontSizes = cluster.members.map((member, index) => {
      const memberBounds = getPaddedBounds(member.bounds, canvasWidth, canvasHeight);
      return getReducedFittingFontSize(ctx, translations[index] || '', memberBounds);
    });
    return Math.min(firstFontSize, ...memberFontSizes);
  }

  function getReducedFittingFontSize(ctx, text, bounds) {
    const fittedFontSize = findFittingFontSize(ctx, text, bounds);
    const maxFontSize = Math.max(10, Math.min(42, bounds.height * 0.68));
    const minimumFontSize = Math.max(8, Math.min(12, maxFontSize));
    return Math.max(minimumFontSize, Math.floor(fittedFontSize * FONT_SCALE));
  }

  function drawOpaqueTextRegion(ctx, text, bounds, forcedFontSize = null, maskBounds = bounds) {
    ctx.save();
    const masks = Array.isArray(maskBounds) ? maskBounds : [maskBounds];
    masks.forEach(mask => coverSourceText(ctx, mask));
    ctx.beginPath();
    ctx.rect(bounds.left, bounds.top, bounds.width, bounds.height);
    ctx.clip();
    drawFittedText(ctx, text, bounds, forcedFontSize);
    ctx.restore();
  }

  function coverSourceText(ctx, bounds) {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const left = Math.max(0, Math.floor(bounds.left));
    const top = Math.max(0, Math.floor(bounds.top));
    const right = Math.min(canvasWidth, Math.ceil(bounds.left + bounds.width));
    const bottom = Math.min(canvasHeight, Math.ceil(bounds.top + bounds.height));
    const width = right - left;
    const height = bottom - top;
    if (width <= 0 || height <= 0) return;

    const samplePadding = Math.max(2, Math.min(10, Math.round(Math.min(width, height) * 0.12)));
    const sourceLeft = Math.max(0, left - samplePadding);
    const sourceTop = Math.max(0, top - samplePadding);
    const sourceRight = Math.min(canvasWidth, right + samplePadding);
    const sourceBottom = Math.min(canvasHeight, bottom + samplePadding);
    const sourceWidth = sourceRight - sourceLeft;
    const sourceHeight = sourceBottom - sourceTop;
    const source = ctx.getImageData(sourceLeft, sourceTop, sourceWidth, sourceHeight);
    const output = ctx.createImageData(width, height);
    const featherRadius = Math.max(2, Math.min(8, Math.round(Math.min(width, height) * 0.12)));

    const getPixel = (x, y) => {
      const sampleX = Math.max(sourceLeft, Math.min(sourceRight - 1, Math.round(x)));
      const sampleY = Math.max(sourceTop, Math.min(sourceBottom - 1, Math.round(y)));
      const index = ((sampleY - sourceTop) * sourceWidth + (sampleX - sourceLeft)) * 4;
      return [source.data[index], source.data[index + 1], source.data[index + 2]];
    };

    const backgroundColor = getDominantBorderColor(source, sourceLeft, sourceTop, sourceWidth, sourceHeight, left, top, right, bottom, samplePadding);

    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const index = ((y - top) * width + (x - left)) * 4;
        const originalColor = getPixel(x, y);
        const edgeDistance = Math.min(x - left, right - 1 - x, y - top, bottom - 1 - y);
        const maskAlpha = Math.max(0, Math.min(1, edgeDistance / featherRadius));
        output.data[index] = Math.round(backgroundColor[0] * maskAlpha + originalColor[0] * (1 - maskAlpha));
        output.data[index + 1] = Math.round(backgroundColor[1] * maskAlpha + originalColor[1] * (1 - maskAlpha));
        output.data[index + 2] = Math.round(backgroundColor[2] * maskAlpha + originalColor[2] * (1 - maskAlpha));
        output.data[index + 3] = 255;
      }
    }
    ctx.putImageData(output, left, top);
  }

  function getDominantBorderColor(imageData, sourceLeft, sourceTop, sourceWidth, sourceHeight, left, top, right, bottom, padding) {
    const buckets = new Map();
    const step = Math.max(1, Math.floor(Math.min(sourceWidth, sourceHeight) / 120));
    for (let y = sourceTop; y < sourceTop + sourceHeight; y += step) {
      for (let x = sourceLeft; x < sourceLeft + sourceWidth; x += step) {
        if (x >= left && x < right && y >= top && y < bottom) continue;
        if (x >= left - padding && x < right + padding && y >= top - padding && y < bottom + padding) {
          const index = ((y - sourceTop) * sourceWidth + (x - sourceLeft)) * 4;
          const red = imageData.data[index];
          const green = imageData.data[index + 1];
          const blue = imageData.data[index + 2];
          const key = `${red >> 4},${green >> 4},${blue >> 4}`;
          const bucket = buckets.get(key) || { count: 0, red: 0, green: 0, blue: 0 };
          bucket.count += 1;
          bucket.red += red;
          bucket.green += green;
          bucket.blue += blue;
          buckets.set(key, bucket);
        }
      }
    }
    const dominant = [...buckets.values()].sort((leftBucket, rightBucket) => rightBucket.count - leftBucket.count)[0];
    if (!dominant) return [255, 255, 255];
    return [
      Math.round(dominant.red / dominant.count),
      Math.round(dominant.green / dominant.count),
      Math.round(dominant.blue / dominant.count)
    ];
  }

  function normalizeOcrItem(item, cropScale, canvasWidth, canvasHeight) {
    const points = item.poly
      .map(point => [Number(point?.[0] || 0) / cropScale, Number(point?.[1] || 0) / cropScale])
      .filter(point => point.every(Number.isFinite))
      .map(([x, y]) => [Math.max(0, Math.min(canvasWidth, x)), Math.max(0, Math.min(canvasHeight, y))]);
    if (points.length < 4) return null;
    return {
      text: item.text,
      points,
      bounds: getPolygonBounds(points, canvasWidth, canvasHeight)
    };
  }

  function mergeOcrItemsIntoClusters(items) {
    const lineClusters = buildOcrLineClusters(items);
    const parent = lineClusters.map((_, index) => index);
    const find = index => {
      while (parent[index] !== index) {
        parent[index] = parent[parent[index]];
        index = parent[index];
      }
      return index;
    };
    const union = (left, right) => {
      const leftRoot = find(left);
      const rightRoot = find(right);
      if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
    };

    for (let left = 0; left < lineClusters.length; left += 1) {
      for (let right = left + 1; right < lineClusters.length; right += 1) {
        if (shouldMergeHorizontalLines(lineClusters[left], lineClusters[right])) union(left, right);
      }
    }

    const groups = new Map();
    lineClusters.forEach((cluster, index) => {
      const root = find(index);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(cluster);
    });

    return [...groups.values()]
      .map(group => {
        const members = group.flatMap(cluster => cluster.members);
        const ordered = members.sort((left, right) => left.bounds.top - right.bounds.top || left.bounds.left - right.bounds.left);
        const bounds = getRawUnionBounds(ordered.map(item => item.bounds));
        return {
          members: ordered,
          orientation: group.some(cluster => cluster.orientation === 'vertical') ? 'vertical' : 'horizontal',
          sourceText: mergeClusterText(ordered),
          bounds,
          translation: '',
          memberTranslations: []
        };
      })
      .filter(cluster => cluster.sourceText)
      .sort((left, right) => left.bounds.top - right.bounds.top || left.bounds.left - right.bounds.left);
  }

  function buildOcrLineClusters(items) {
    const parent = items.map((_, index) => index);
    const find = index => {
      while (parent[index] !== index) {
        parent[index] = parent[parent[index]];
        index = parent[index];
      }
      return index;
    };
    const union = (left, right) => {
      const leftRoot = find(left);
      const rightRoot = find(right);
      if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
    };

    for (let left = 0; left < items.length; left += 1) {
      for (let right = left + 1; right < items.length; right += 1) {
        if (shouldMergeOcrItems(items[left], items[right])) union(left, right);
      }
    }

    const groups = new Map();
    items.forEach((item, index) => {
      const root = find(index);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(item);
    });

    return [...groups.values()]
      .map(group => {
        const preliminaryBounds = getRawUnionBounds(group.map(item => item.bounds));
        const orientation = getClusterOrientation(group, preliminaryBounds);
        const ordered = group.sort((left, right) => orientation === 'vertical'
          ? left.bounds.top - right.bounds.top || left.bounds.left - right.bounds.left
          : left.bounds.left - right.bounds.left || left.bounds.top - right.bounds.top);
        return {
          members: ordered,
          orientation,
          sourceText: mergeClusterText(ordered),
          bounds: getUnionBounds(ordered.map(item => item.bounds)),
          translation: '',
          memberTranslations: []
        };
      })
      .filter(cluster => cluster.sourceText);
  }

  function shouldMergeOcrItems(left, right) {
    const a = left.bounds;
    const b = right.bounds;
    if (rectanglesOverlap(a, b)) return true;
    const averageHeight = (a.height + b.height) / 2;
    const horizontalGap = Math.max(a.left - (b.left + b.width), b.left - (a.left + a.width), 0);
    const averageWidth = (a.width + b.width) / 2;
    const centerXDistance = Math.abs(a.centerX - b.centerX);
    const centerYDistance = Math.abs(a.centerY - b.centerY);
    const verticalGap = Math.max(a.top - (b.top + b.height), b.top - (a.top + a.height), 0);
    const horizontalAligned = centerYDistance <= averageHeight * 0.8 && horizontalGap <= averageHeight * 0.15;
    const verticalAligned = isVerticalBox(left) && isVerticalBox(right) &&
      centerXDistance <= averageWidth * 0.8 && verticalGap <= averageWidth;
    return horizontalAligned || verticalAligned;
  }

  function isVerticalBox(item) {
    return item.bounds.height >= item.bounds.width * 1.15;
  }

  function shouldMergeHorizontalLines(left, right) {
    if (left.orientation !== 'horizontal' || right.orientation !== 'horizontal') return false;
    const a = left.bounds;
    const b = right.bounds;
    const verticalGap = Math.max(a.top - (b.top + b.height), b.top - (a.top + a.height), 0);
    // Không dùng chiều cao toàn bộ line-cluster ở đây: một cluster nhiều
    // dòng sẽ làm ngưỡng phình ra và gộp nhầm các ô thoại cách xa nhau.
    const averageHeight = (getOcrLineHeight(left) + getOcrLineHeight(right)) / 2;
    if (verticalGap > averageHeight * 0.5) return false;
    const horizontalOverlap = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left));
    const overlapRatio = horizontalOverlap / Math.max(1, Math.min(a.width, b.width));
    const horizontalGap = Math.max(a.left - (b.left + b.width), b.left - (a.left + a.width), 0);
    const centerAlignment = Math.abs(a.centerX - b.centerX) <= averageHeight * 0.8;
    return overlapRatio >= 0.35 || (centerAlignment && horizontalGap <= averageHeight * 0.15);
  }

  function getOcrLineHeight(cluster) {
    const members = Array.isArray(cluster?.members) ? cluster.members : [];
    if (!members.length) return Math.max(1, cluster?.bounds?.height || 1);
    return members.reduce((sum, item) => sum + item.bounds.height, 0) / members.length;
  }

  function rectanglesOverlap(left, right) {
    return left.left < right.left + right.width && left.left + left.width > right.left &&
      left.top < right.top + right.height && left.top + left.height > right.top;
  }

  function getUnionBounds(boundsList) {
    const raw = getRawUnionBounds(boundsList);
    const padding = Math.max(2, Math.min(8, Math.round(Math.min(raw.width, raw.height) * 0.04)));
    return {
      left: Math.max(0, raw.left - padding),
      top: Math.max(0, raw.top - padding),
      width: raw.width + padding * 2,
      height: raw.height + padding * 2,
      centerX: raw.centerX,
      centerY: raw.centerY
    };
  }

  function getRawUnionBounds(boundsList) {
    const left = Math.min(...boundsList.map(bounds => bounds.left));
    const top = Math.min(...boundsList.map(bounds => bounds.top));
    const right = Math.max(...boundsList.map(bounds => bounds.left + bounds.width));
    const bottom = Math.max(...boundsList.map(bounds => bounds.top + bounds.height));
    return {
      left,
      top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2
    };
  }

  function getClusterOrientation(items, bounds) {
    const centerSpreadX = Math.max(...items.map(item => item.bounds.centerX)) - Math.min(...items.map(item => item.bounds.centerX));
    const centerSpreadY = Math.max(...items.map(item => item.bounds.centerY)) - Math.min(...items.map(item => item.bounds.centerY));
    const averageWidth = items.reduce((sum, item) => sum + item.bounds.width, 0) / items.length;
    const verticalBoxCount = items.filter(isVerticalBox).length;
    const vertical = verticalBoxCount >= Math.ceil(items.length * 0.6) &&
      bounds.height > bounds.width * 1.15 &&
      centerSpreadY >= centerSpreadX && centerSpreadX <= Math.max(averageWidth * 0.8, 8);
    return vertical ? 'vertical' : 'horizontal';
  }

  function mergeClusterText(items) {
    const texts = [];
    items.forEach(item => {
      const text = item.text.replace(/\s+/g, ' ').trim();
      if (!text) return;
      const duplicateIndex = texts.findIndex(existing => existing === text ||
        (text.length >= 4 && existing.includes(text)) || (existing.length >= 4 && text.includes(existing)));
      if (duplicateIndex === -1) texts.push(text);
      else if (text.length > texts[duplicateIndex].length) texts[duplicateIndex] = text;
    });
    const containsCjk = texts.some(text => /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(text));
    const cjkOnly = texts.every(text => /^[\u3040-\u30ff\u3400-\u9fff\s\p{P}\p{N}]+$/u.test(text));
    let merged = '';
    texts.forEach(text => {
      if (!merged) {
        merged = text;
        return;
      }
      // OCR thường tách từ xuống dòng kiểu "TRIUMP" + "-HANT".
      // Dấu gạch này là dấu ngắt dòng, không phải dấu nối trong từ.
      if (/[A-Za-z]$/.test(merged) && /^-[A-Za-z]/.test(text)) {
        merged += text.slice(1);
      } else if (/[A-Za-z]-$/.test(merged) && /^[A-Za-z]/.test(text)) {
        merged = merged.slice(0, -1) + text;
      } else {
        merged += containsCjk && cjkOnly ? text : ` ${text}`;
      }
    });
    return merged;
  }

  function splitTranslationToMembers(cluster, translation) {
    const members = cluster.members || [];
    if (members.length <= 1) return [translation];
    const sourceWeights = members.map(member => Math.max(1, Array.from(member.text.trim()).length));
    const totalWeight = sourceWeights.reduce((sum, weight) => sum + weight, 0);
    const containsCjk = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(translation);
    const normalizedTranslation = translation.trim();
    const wordUnits = normalizedTranslation.match(/\S+(?:\s+|$)/g) || [];
    const units = containsCjk
      ? Array.from(normalizedTranslation.replace(/\s+/g, ''))
      : (wordUnits.length >= members.length ? wordUnits : Array.from(normalizedTranslation));
    const output = [];
    let cursor = 0;
    let remainingWeight = totalWeight;

    members.forEach((_, index) => {
      const remainingMembers = members.length - index;
      if (index === members.length - 1) {
        output.push(joinTranslationUnits(units.slice(cursor), containsCjk));
        return;
      }
      const desired = Math.round(units.length * sourceWeights[index] / Math.max(1, remainingWeight));
      const count = Math.max(1, Math.min(units.length - cursor - (remainingMembers - 1), desired));
      output.push(joinTranslationUnits(units.slice(cursor, cursor + count), containsCjk));
      cursor += count;
      remainingWeight -= sourceWeights[index];
    });
    return output;
  }

  function joinTranslationUnits(units, containsCjk) {
    return containsCjk ? units.join('').trim() : units.join('').trim();
  }

  function getPaddedBounds(bounds, canvasWidth, canvasHeight) {
    const padding = Math.max(2, Math.min(6, Math.round(Math.min(bounds.width, bounds.height) * 0.04)));
    const left = Math.max(0, bounds.left - padding);
    const top = Math.max(0, bounds.top - padding);
    const right = Math.min(canvasWidth, bounds.left + bounds.width + padding);
    const bottom = Math.min(canvasHeight, bounds.top + bounds.height + padding);
    return {
      left,
      top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2
    };
  }

  function getTranslationBounds(bounds, canvasWidth, canvasHeight) {
    const left = Math.max(0, bounds.left - TRANSLATION_HORIZONTAL_PADDING);
    const top = Math.max(0, bounds.top - TRANSLATION_VERTICAL_PADDING);
    const right = Math.min(canvasWidth, bounds.left + bounds.width + TRANSLATION_HORIZONTAL_PADDING);
    const bottom = Math.min(canvasHeight, bounds.top + bounds.height + TRANSLATION_VERTICAL_PADDING);
    return {
      left,
      top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2
    };
  }

  function drawFittedText(ctx, text, bounds, forcedFontSize = null) {
    const fontSize = forcedFontSize || findFittingFontSize(ctx, text, bounds);
    const layout = getTextLayout(ctx, text, bounds, fontSize);
    ctx.font = `600 ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    layout.lines.forEach((line, index) => ctx.fillText(line, bounds.left, bounds.top + TEXT_TOP_OFFSET + index * layout.lineHeight, layout.maxWidth));
  }

  function findFittingFontSize(ctx, text, bounds) {
    const maxWidth = Math.max(12, bounds.width - 8);
    const maxHeight = Math.max(12, bounds.height - 8 - TEXT_TOP_OFFSET);
    const maxFontSize = Math.max(10, Math.min(42, bounds.height * 0.68));
    const minFontSize = Math.max(8, Math.min(12, maxFontSize));
    for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
      const layout = getTextLayout(ctx, text, bounds, fontSize);
      if (layout.lines.length * layout.lineHeight <= maxHeight) return fontSize;
    }
    return minFontSize;
  }

  function getTextLayout(ctx, text, bounds, fontSize) {
    const maxWidth = Math.max(12, bounds.width - 8);
    ctx.font = `600 ${fontSize}px Arial, sans-serif`;
    return {
      lines: getWrappedLines(ctx, text, maxWidth),
      lineHeight: fontSize * 1.1,
      maxWidth
    };
  }

  function getWrappedLines(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const tokens = words.length > 1 ? words : Array.from(String(text));
    const lines = [];
    let line = '';
    tokens.forEach(token => {
      const candidate = line ? `${line}${words.length > 1 ? ' ' : ''}${token}` : token;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = token;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function getPolygonBounds(points, width, height) {
    const xs = points.map(point => Math.max(0, Math.min(width, point[0])));
    const ys = points.map(point => Math.max(0, Math.min(height, point[1])));
    const left = Math.min(...xs); const right = Math.max(...xs);
    const top = Math.min(...ys); const bottom = Math.max(...ys);
    return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top), centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
  }

  function updateImageOverlayPosition(overlay) {
    if (!overlay?.target.element.isConnected) { overlay.canvas.remove(); return; }
    const rect = overlay.target.element.getBoundingClientRect();
    overlay.canvas.style.left = `${rect.left}px`;
    overlay.canvas.style.top = `${rect.top}px`;
    overlay.canvas.style.width = `${rect.width}px`;
    overlay.canvas.style.height = `${rect.height}px`;
    const visible = rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    overlay.canvas.style.visibility = visible && (overlay.translated || overlay.debug) ? 'visible' : 'hidden';
  }

  function updateImagePositions() {
    if (pageTranslation) pageTranslation.imageOverlays.forEach(updateImageOverlayPosition);
  }

  function enableImagePositionTracking() {
    if (!pageTranslation || pageTranslation.positionCleanup) return;
    const update = () => updateImagePositions();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    pageTranslation.positionCleanup = () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }

  function removeToolbar() {
    if (toolbar) { toolbar.remove(); toolbar = null; }
  }

  function undoPageTranslation() {
    translationRunId += 1;
    if (pageTranslation) {
      pageTranslation.entries.forEach(entry => { if (entry.node.isConnected) entry.node.nodeValue = entry.raw; });
      pageTranslation.imageOverlays.forEach(overlay => overlay.canvas.remove());
      pageTranslation.positionCleanup?.();
      if (pageTranslation.originalLang === null) document.documentElement.removeAttribute('lang');
      else document.documentElement.setAttribute('lang', pageTranslation.originalLang);
      pageTranslation = null;
    }
    removeToolbar();
  }
})();
