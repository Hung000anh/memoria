(function() {
  function logDebug(msg) {
    // Debug log disabled for production
  }

  // ==========================================
  // CORE CONVERTER LOGIC (Strategy Pattern)
  // ==========================================
  const converterCore = {
    strategies: {},

    registerStrategy: function(fromFormat, toFormat, convertFn) {
      const key = `${fromFormat.toLowerCase()}_to_${toFormat.toLowerCase()}`;
      this.strategies[key] = convertFn;
    },

    getAvailableTargetFormats: function(fromFormat) {
      const prefix = `${fromFormat.toLowerCase()}_to_`;
      return Object.keys(this.strategies)
        .filter(key => key.startsWith(prefix))
        .map(key => key.substring(prefix.length));
    },

    convert: async function(file, toFormat) {
      const fromFormat = file.name.split('.').pop().toLowerCase();
      const key = `${fromFormat}_to_${toFormat.toLowerCase()}`;
      
      const strategy = this.strategies[key];
      if (!strategy) {
        throw new Error(`Không hỗ trợ chuyển đổi từ ${fromFormat.toUpperCase()} sang ${toFormat.toUpperCase()}`);
      }

      try {
        return await strategy(file);
      } catch (error) {
        console.error(`Lỗi chuyển đổi (${key}):`, error);
        throw new Error(`Chuyển đổi thất bại: ${error.message || error}`);
      }
    }
  };

  // ==========================================
  // ĐĂNG KÝ CÁC STRATEGIES CHUYỂN ĐỔI GỐC
  // ==========================================

  // 1. DOCX -> TXT
  converterCore.registerStrategy('docx', 'txt', async function(file) {
    if (!window.mammoth) {
      throw new Error('Thư viện Mammoth chưa được tải.');
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function(event) {
        const arrayBuffer = event.target.result;
        try {
          const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
          const txtContent = result.value;
          const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
          const newFileName = file.name.replace(/\.docx$/i, '.txt');
          
          resolve({
            blob: blob,
            fileName: newFileName
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function() {
        reject(new Error('Lỗi đọc file DOCX.'));
      };
      reader.readAsArrayBuffer(file);
    });
  });

  // 2. TXT -> DOCX
  converterCore.registerStrategy('txt', 'docx', async function(file) {
    if (!window.docx) {
      throw new Error('Thư viện docx chưa được tải.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function(event) {
        const text = event.target.result;
        try {
          const lines = text.split(/\r?\n/);
          const paragraphs = lines.map(line => {
            return new window.docx.Paragraph({
              children: [new window.docx.TextRun({ text: line })]
            });
          });

          const doc = new window.docx.Document({
            sections: [{
              properties: {},
              children: paragraphs
            }]
          });

          const blob = await window.docx.Packer.toBlob(doc);
          const newFileName = file.name.replace(/\.txt$/i, '.docx');

          resolve({
            blob: blob,
            fileName: newFileName
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function() {
        reject(new Error('Lỗi đọc file TXT.'));
      };
      reader.readAsText(file, 'utf-8');
    });
  });

  // 3. PDF -> TXT
  converterCore.registerStrategy('pdf', 'txt', async function(file) {
    if (!window.pdfjsLib) {
      throw new Error('Thư viện PDF.js chưa được tải.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function(event) {
        const arrayBuffer = event.target.result;
        try {
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");
            fullText += pageText + "\n";
          }

          const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
          const newFileName = file.name.replace(/\.pdf$/i, '.txt');

          resolve({
            blob: blob,
            fileName: newFileName
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function() {
        reject(new Error('Lỗi đọc file PDF.'));
      };
      reader.readAsArrayBuffer(file);
    });
  });

  // 4. TXT -> PDF
  converterCore.registerStrategy('txt', 'pdf', async function(file) {
    if (!window.jspdf) {
      throw new Error('Thư viện jsPDF chưa được tải.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const text = event.target.result;
        try {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();
          const pageHeight = doc.internal.pageSize.height;
          const pageWidth = doc.internal.pageSize.width - 20; // 10px margin mỗi bên
          const lines = doc.splitTextToSize(text, pageWidth);
          let y = 10;

          for (const line of lines) {
            if (y + 10 > pageHeight) {
              doc.addPage();
              y = 10;
            }
            doc.text(line, 10, y);
            y += 7; // Giãn dòng
          }

          const blob = doc.output('blob');
          const newFileName = file.name.replace(/\.txt$/i, '.pdf');

          resolve({
            blob: blob,
            fileName: newFileName
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function() {
        reject(new Error('Lỗi đọc file TXT.'));
      };
      reader.readAsText(file, 'utf-8');
    });
  });

  // 5. EPUB -> TXT
  converterCore.registerStrategy('epub', 'txt', async function(file) {
    if (!window.JSZip) {
      throw new Error('Thư viện JSZip chưa được tải.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function(event) {
        const arrayBuffer = event.target.result;
        try {
          const zip = await window.JSZip.loadAsync(arrayBuffer);
          
          // Đọc container.xml
          const containerFile = zip.file("META-INF/container.xml");
          if (!containerFile) {
            throw new Error('Không tìm thấy container.xml. Định dạng EPUB không hợp lệ.');
          }
          const containerXml = await containerFile.async("text");
          const parser = new DOMParser();
          const containerDoc = parser.parseFromString(containerXml, "text/xml");
          const rootfile = containerDoc.querySelector("rootfile");
          if (!rootfile) {
            throw new Error('Không tìm thấy rootfile trong container.xml');
          }
          const opfPath = rootfile.getAttribute("full-path");

          // Đọc OPF file
          const opfFile = zip.file(opfPath);
          if (!opfFile) {
            throw new Error(`Không tìm thấy file OPF tại: ${opfPath}`);
          }
          const opfXml = await opfFile.async("text");
          const opfDoc = parser.parseFromString(opfXml, "text/xml");

          const itemrefs = Array.from(opfDoc.querySelectorAll("spine > itemref"));
          const manifestItems = Array.from(opfDoc.querySelectorAll("manifest > item"));

          const manifestMap = {};
          manifestItems.forEach(item => {
            manifestMap[item.getAttribute("id")] = item.getAttribute("href");
          });

          const opfFolder = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

          let fullText = "";
          for (const ref of itemrefs) {
            const idref = ref.getAttribute("idref");
            const href = manifestMap[idref];
            if (!href) continue;
            
            const cleanHref = href.split('#')[0];
            const fullHref = opfFolder + cleanHref;
            
            const htmlFile = zip.file(fullHref);
            if (htmlFile) {
              const htmlText = await htmlFile.async("text");
              const htmlDoc = parser.parseFromString(htmlText, "text/html");
              const bodyText = htmlDoc.body ? htmlDoc.body.textContent : htmlDoc.documentElement.textContent;
              fullText += bodyText.trim() + "\n\n";
            }
          }

          const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
          const newFileName = file.name.replace(/\.epub$/i, '.txt');

          resolve({
            blob: blob,
            fileName: newFileName
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function() {
        reject(new Error('Lỗi đọc file EPUB.'));
      };
      reader.readAsArrayBuffer(file);
    });
  });

  // 6. TXT -> EPUB
  converterCore.registerStrategy('txt', 'epub', async function(file) {
    if (!window.JSZip) {
      throw new Error('Thư viện JSZip chưa được tải.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function(event) {
        const text = event.target.result;
        try {
          const title = file.name.replace(/\.txt$/i, '');
          const uuid = 'epub-' + Math.random().toString(36).substring(2, 15);
          
          const zip = new window.JSZip();
          
          // mimetype (STORE - không nén)
          zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
          
          // META-INF/container.xml
          const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
          zip.file("META-INF/container.xml", containerXml);
          
          // OEBPS/content.opf
          const opfXml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${title}</dc:title>
    <dc:language>vi</dc:language>
    <dc:identifier id="BookID">urn:uuid:${uuid}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="content" href="content.html" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="content"/>
  </spine>
</package>`;
          zip.file("OEBPS/content.opf", opfXml);
          
          // OEBPS/toc.ncx
          const ncxXml = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${title}</text>
  </docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel>
        <text>Nội dung</text>
      </navLabel>
      <content src="content.html"/>
    </navPoint>
  </navMap>
</ncx>`;
          zip.file("OEBPS/toc.ncx", ncxXml);
          
          // OEBPS/content.html
          const paragraphs = text.split(/\r?\n/)
            .map(line => line.trim() ? `<p>${escapeHtml(line)}</p>` : '<br/>')
            .join('\n');
            
          const htmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${title}</title>
</head>
<body>
  <h1>${title}</h1>
  ${paragraphs}
</body>
</html>`;
          zip.file("OEBPS/content.html", htmlContent);
          
          const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
          const newFileName = file.name.replace(/\.txt$/i, '.epub');

          resolve({
            blob: blob,
            fileName: newFileName
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = function() {
        reject(new Error('Lỗi đọc file TXT.'));
      };
      reader.readAsText(file, 'utf-8');
    });
    
    function escapeHtml(unsafe) {
      return unsafe
           .replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#039;");
    }
  });

  // ==========================================
  // ĐĂNG KÝ CÁC STRATEGIES BẮC CẦU (MATRIX)
  // ==========================================
  const registerBridge = (from, to, step1Key, step2Key) => {
    converterCore.registerStrategy(from, to, async function(file) {
      const step1 = converterCore.strategies[step1Key];
      const step2 = converterCore.strategies[step2Key];
      if (!step1 || !step2) {
        throw new Error(`Thiếu logic trung gian để thực hiện chuyển đổi ${from.toUpperCase()} sang ${to.toUpperCase()}`);
      }
      const intermediateResult = await step1(file);
      const dummyFile = new File([intermediateResult.blob], intermediateResult.fileName, { type: "text/plain" });
      return await step2(dummyFile);
    });
  };

  // Docx bắc cầu
  registerBridge('docx', 'pdf', 'docx_to_txt', 'txt_to_pdf');
  registerBridge('docx', 'epub', 'docx_to_txt', 'txt_to_epub');

  // PDF bắc cầu
  registerBridge('pdf', 'docx', 'pdf_to_txt', 'txt_to_docx');
  registerBridge('pdf', 'epub', 'pdf_to_txt', 'txt_to_epub');

  // EPUB bắc cầu
  registerBridge('epub', 'docx', 'epub_to_txt', 'txt_to_docx');
  registerBridge('epub', 'pdf', 'epub_to_txt', 'txt_to_pdf');

  // Export to window
  window.converterCore = converterCore;

  // ==========================================
  // UI LOGIC (Batch Converter)
  // ==========================================
  function init() {
    logDebug('[Converter] Khởi tạo module Converter (Hỗ trợ nhiều file)...');

    // Cấu hình worker cục bộ cho PDF.js
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/libs/pdf.worker.min.js';
      logDebug('[Converter] Cấu hình PDF.js worker: OK');
    }
    
    if (window.__loadErrors && window.__loadErrors.length > 0) {
      logDebug('[Converter] Phát hiện các lỗi tải trước đó:');
      window.__loadErrors.forEach(err => logDebug(err));
    } else {
      logDebug('[Converter] Không có lỗi tải trước đó.');
    }
    
    logDebug('[Converter] window.mammoth: ' + (typeof window.mammoth !== 'undefined' ? 'OK' : 'MISSING'));
    logDebug('[Converter] window.docx: ' + (typeof window.docx !== 'undefined' ? 'OK' : 'MISSING'));
    logDebug('[Converter] window.pdfjsLib: ' + (typeof window.pdfjsLib !== 'undefined' ? 'OK' : 'MISSING'));
    logDebug('[Converter] window.jspdf: ' + (typeof window.jspdf !== 'undefined' ? 'OK' : 'MISSING'));
    logDebug('[Converter] window.JSZip: ' + (typeof window.JSZip !== 'undefined' ? 'OK' : 'MISSING'));
    logDebug('[Converter] window.converterCore: ' + (typeof window.converterCore !== 'undefined' ? 'OK' : 'MISSING'));

    const dropzone = document.getElementById('converterDropzone');
    const fileInput = document.getElementById('converterFileInput');
    
    const fileListArea = document.getElementById('converterFileListArea');
    const fileListCount = document.getElementById('fileListCount');
    const btnAddNewFile = document.getElementById('btnAddNewFile');
    const fileListContainer = document.getElementById('converterFileList');
    
    const optionsArea = document.getElementById('converterOptionsArea');
    const targetSelect = document.getElementById('converterTargetSelect');
    const btnConvert = document.getElementById('btnConvert');
    
    const statusArea = document.getElementById('converterStatusArea');

    logDebug('[Converter] Elements found: ' + JSON.stringify({
      dropzone: !!dropzone,
      fileInput: !!fileInput,
      fileListArea: !!fileListArea,
      fileListContainer: !!fileListContainer,
      optionsArea: !!optionsArea,
      statusArea: !!statusArea
    }));

    if (!dropzone || !fileInput || !fileListContainer || !fileListArea) {
      logDebug('[Converter] ERROR: Không tìm thấy dropzone hoặc danh sách file!');
      return;
    }

    let selectedFiles = []; // Mảng chứa các đối tượng: { id, file, status, errorMsg, blob, targetFileName }
    let fileIdCounter = 0;

    // Cấu hình sự kiện click Dropzone
    dropzone.addEventListener('click', () => {
      logDebug('[Converter] Click dropzone -> kích hoạt fileInput.click()');
      fileInput.click();
    });

    btnAddNewFile.addEventListener('click', (e) => {
      e.stopPropagation();
      logDebug('[Converter] Click nút thêm file -> kích hoạt fileInput.click()');
      fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
      logDebug('[Converter] File input thay đổi, số lượng file: ' + e.target.files.length);
      if (e.target.files.length > 0) {
        addFilesToList(e.target.files);
      }
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      logDebug('[Converter] Kéo thả file vào dropzone');
      const dt = e.dataTransfer;
      const files = dt.files;
      logDebug('[Converter] Số lượng file thả: ' + files.length);
      if (files.length > 0) {
        addFilesToList(files);
      }
    });

    // Nút Convert
    if (btnConvert) {
      btnConvert.addEventListener('click', async () => {
        const pendingFiles = selectedFiles.filter(f => f.status !== 'success');
        if (pendingFiles.length === 0) {
          logDebug('[Converter] Không có file nào cần chuyển đổi.');
          showStatus('Tất cả các file đã chuyển đổi thành công.', 'success');
          return;
        }

        const targetFormatSelection = targetSelect.value;
        logDebug('[Converter] Bắt đầu convert hàng loạt -> Target: ' + targetFormatSelection);
        
        showStatus('Đang chuyển đổi danh sách file...', 'loading');
        btnConvert.disabled = true;
        btnAddNewFile.disabled = true;

        let successCount = 0;
        let failCount = 0;

        for (const fileObj of pendingFiles) {
          fileObj.status = 'converting';
          renderFileList();

          const ext = fileObj.file.name.split('.').pop().toLowerCase();
          let targetFormat = targetFormatSelection;
          
          if (targetFormatSelection === 'auto') {
            // Tự động: TXT sang DOCX, DOCX sang TXT, các file khác sang TXT
            if (ext === 'txt') targetFormat = 'docx';
            else if (ext === 'docx') targetFormat = 'txt';
            else targetFormat = 'txt'; // PDF/EPUB -> TXT mặc định
          }

          try {
            logDebug(`[Converter] Đang convert file: ${fileObj.file.name} sang ${targetFormat.toUpperCase()}`);
            const result = await window.converterCore.convert(fileObj.file, targetFormat);
            
            fileObj.status = 'success';
            fileObj.blob = result.blob;
            fileObj.targetFileName = result.fileName;
            successCount++;
            
            // Tự động tải file này xuống
            downloadBlob(result.blob, result.fileName);
          } catch (error) {
            logDebug(`[Converter] Lỗi convert file ${fileObj.file.name}: ${error.message}`);
            fileObj.status = 'error';
            fileObj.errorMsg = error.message;
            failCount++;
          }

          renderFileList();
        }

        btnConvert.disabled = false;
        btnAddNewFile.disabled = false;

        if (failCount === 0) {
          showStatus(`Chuyển đổi thành công ${successCount} file!`, 'success');
        } else {
          showStatus(`Hoàn thành: ${successCount} thành công, ${failCount} thất bại.`, 'error');
        }
      });
    }

    // Thêm các file vào danh sách xử lý
    function addFilesToList(files) {
      logDebug('[Converter] Thêm file vào danh sách...');
      let addedAny = false;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop().toLowerCase();

        // Kiểm tra xem định dạng có được hỗ trợ không
        const targets = window.converterCore.getAvailableTargetFormats(ext);
        if (targets.length === 0) {
          logDebug(`[Converter] File bị bỏ qua vì không hỗ trợ định dạng: ${file.name}`);
          continue;
        }

        // Kiểm tra xem file đã có trong danh sách chưa (tránh trùng)
        const isDuplicate = selectedFiles.some(f => f.file.name === file.name && f.file.size === file.size);
        if (isDuplicate) {
          logDebug(`[Converter] File trùng lặp bị bỏ qua: ${file.name}`);
          continue;
        }

        selectedFiles.push({
          id: 'file-' + (++fileIdCounter),
          file: file,
          status: 'pending',
          errorMsg: '',
          blob: null,
          targetFileName: ''
        });
        addedAny = true;
      }

      if (addedAny) {
        // Cập nhật cấu hình dropdown định dạng đích
        updateTargetSelectOptions();

        // Ẩn dropzone, hiện danh sách file và tùy chọn
        dropzone.style.display = 'none';
        fileListArea.style.display = 'flex';
        optionsArea.style.display = 'flex';
        if (statusArea) statusArea.style.display = 'none';

        renderFileList();
      }
    }

    // Cập nhật các tùy chọn của ô select target format dựa trên các file hiện tại
    function updateTargetSelectOptions() {
      if (!targetSelect) return;
      
      targetSelect.innerHTML = '';

      // Tùy chọn TỰ ĐỘNG luôn xuất hiện cho Batch mode
      const optionAuto = document.createElement('option');
      optionAuto.value = 'auto';
      optionAuto.textContent = 'TỰ ĐỘNG (Xác định theo đuôi file)';
      targetSelect.appendChild(optionAuto);

      // Thêm các lựa chọn xuất cụ thể cho phép chuyển đổi chéo
      const allFormats = ['txt', 'docx', 'pdf', 'epub'];
      allFormats.forEach(format => {
        const option = document.createElement('option');
        option.value = format;
        option.textContent = format.toUpperCase();
        targetSelect.appendChild(option);
      });
    }

    // Render danh sách file lên UI
    function renderFileList() {
      fileListContainer.innerHTML = '';
      fileListCount.textContent = `Danh sách file (${selectedFiles.length})`;

      selectedFiles.forEach(fileObj => {
        const ext = fileObj.file.name.split('.').pop().toLowerCase();
        
        const itemEl = document.createElement('div');
        itemEl.className = 'converter-file-item';
        itemEl.id = fileObj.id;

        // Cấu hình Icon
        let iconClass = ext === 'docx' ? 'docx' : (ext === 'txt' ? 'txt' : (ext === 'pdf' ? 'pdf' : (ext === 'epub' ? 'epub' : '')));
        let iconSvg = '';
        if (ext === 'docx') {
          iconSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M9 15h6"></path>
              <path d="M9 12h6"></path>
            </svg>
          `;
        } else if (ext === 'pdf') {
          iconSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <path d="M10 9H9"></path>
            </svg>
          `;
        } else if (ext === 'epub') {
          iconSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          `;
        } else {
          iconSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          `;
        }

        // Cấu hình Badge Trạng thái
        let badgeClass = 'pending';
        let badgeText = 'Chờ';
        if (fileObj.status === 'converting') {
          badgeClass = 'converting';
          badgeText = 'Đang chạy';
        } else if (fileObj.status === 'success') {
          badgeClass = 'success';
          badgeText = 'Xong';
        } else if (fileObj.status === 'error') {
          badgeClass = 'error';
          badgeText = 'Lỗi';
        }

        itemEl.innerHTML = `
          <div class="file-icon ${iconClass}">
            ${iconSvg}
          </div>
          <div class="file-details">
            <div class="file-name" title="${fileObj.file.name}">${fileObj.file.name}</div>
            <div class="file-size">${formatBytes(fileObj.file.size)}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="file-status-badge ${badgeClass}">${badgeText}</span>
            <button class="btn-remove-file" data-id="${fileObj.id}" title="Gỡ file này">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        `;

        itemEl.querySelector('.btn-remove-file').addEventListener('click', (e) => {
          e.stopPropagation();
          const fileId = e.currentTarget.getAttribute('data-id');
          removeFileFromList(fileId);
        });

        if (fileObj.status === 'success' && fileObj.blob) {
          itemEl.style.cursor = 'pointer';
          itemEl.addEventListener('click', () => {
            downloadBlob(fileObj.blob, fileObj.targetFileName);
          });
        }

        fileListContainer.appendChild(itemEl);
      });
    }

    // Xóa một file khỏi danh sách chọn
    function removeFileFromList(fileId) {
      logDebug('[Converter] Gỡ file ' + fileId);
      selectedFiles = selectedFiles.filter(f => f.id !== fileId);
      
      if (selectedFiles.length === 0) {
        resetConverter();
      } else {
        updateTargetSelectOptions();
        renderFileList();
      }
    }

    // Reset converter về trạng thái ban đầu
    function resetConverter() {
      selectedFiles = [];
      fileIdCounter = 0;
      fileInput.value = '';
      
      dropzone.style.display = 'flex';
      fileListArea.style.display = 'none';
      optionsArea.style.display = 'none';
      if (statusArea) statusArea.style.display = 'none';
      logDebug('[Converter] Đã reset toàn bộ trạng thái');
    }

    // Hiển thị thông báo trạng thái chung
    function showStatus(message, type) {
      if (!statusArea) return;
      statusArea.style.display = 'flex';
      statusArea.className = `converter-status ${type}`;

      if (type === 'loading') {
        statusArea.innerHTML = `
          <span class="spinner"></span>
          <span>${message}</span>
        `;
      } else if (type === 'error') {
        statusArea.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>${message}</span>
        `;
      } else if (type === 'success') {
        statusArea.innerHTML = `
          <div class="success-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>${message}</span>
          </div>
          <div class="success-actions">
            <button id="btnConvertAnother" class="btn-cancel" style="padding: 6px 12px; font-size: 12px; margin-top: 4px;">Chuyển các file khác</button>
          </div>
        `;

        document.getElementById('btnConvertAnother').addEventListener('click', () => {
          resetConverter();
        });
      }
    }

    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function formatBytes(bytes, decimals = 2) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
