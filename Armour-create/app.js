// TITANIUM AERODYNAMICS, INC. - Work Order Report Manager Logic

document.addEventListener('DOMContentLoaded', () => {
  // --- APPLICATION STATE ---
  let workOrders = [];
  let filteredOrders = [];
  let currentIndex = null; // Currently selected record index in filteredOrders
  let isDirty = false;
  let activeTheme = 'light';

  // --- DOM ELEMENTS ---
  // Layout Controls
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const menuToggle = document.getElementById('menu-toggle');
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = themeToggle.querySelector('.sun-icon');
  const moonIcon = themeToggle.querySelector('.moon-icon');
  const liveClockDate = document.querySelector('.clock-date');
  const liveClockTime = document.querySelector('.clock-time');

  // Sidebar Elements
  const sidebarSearchInput = document.getElementById('sidebar-search-input');
  const filterPriority = document.getElementById('filter-priority');
  const filterStatus = document.getElementById('filter-status');
  const recordsFeed = document.getElementById('records-feed');
  const statsTotal = document.getElementById('stats-total');
  const statsHigh = document.getElementById('stats-high');
  const statsPending = document.getElementById('stats-pending');

  // Form Elements
  const workOrderForm = document.getElementById('work-order-form');
  const unsavedAlert = document.getElementById('unsaved-alert');
  const fieldId = document.getElementById('field-id'); // WORK ORDER NO
  const fieldDate = document.getElementById('field-date'); // DATE
  const fieldPo = document.getElementById('field-po'); // PO NUMBER
  const fieldInspector = document.getElementById('field-inspector'); // INSPECTOR
  const fieldCustomer = document.getElementById('field-customer'); // CUSTOMER
  const fieldPartCoating = document.getElementById('field-part-coating'); // PART/COATING

  // Process Checkboxes
  const checkUltrasonic = document.getElementById('proc-ultrasonic');
  const checkStripping = document.getElementById('proc-stripping');
  const checkSandBlasting = document.getElementById('proc-sandblasting');
  const checkPolishing = document.getElementById('proc-polishing');
  const checkCoating = document.getElementById('proc-coating');
  const checkOther = document.getElementById('proc-other');
  const fieldOtherText = document.getElementById('proc-other-text');
  const processCheckboxes = [checkUltrasonic, checkStripping, checkSandBlasting, checkPolishing, checkCoating, checkOther];

  // Rework Sign-off Fields
  const fieldReworkPerformedBy = document.getElementById('field-rework-performed-by');
  const fieldReworkDate = document.getElementById('field-rework-date');

  // QC Result Checklist Checkboxes
  const checkPassed = document.getElementById('signoff-passed');
  const checkFailed = document.getElementById('signoff-failed');
  const checkNeedsRework = document.getElementById('signoff-needs-rework');
  const resultCheckboxes = [checkPassed, checkFailed, checkNeedsRework];

  // Signature Section
  const fieldQcInitial = document.getElementById('field-rework-qc-initial');
  const fieldQcDate = document.getElementById('field-rework-qc-date');
  const metaCreated = document.getElementById('meta-created');
  const metaModified = document.getElementById('meta-modified');

  // Top/Action Bar Buttons
  const btnPrint = document.getElementById('btn-print');
  const btnUndo = document.getElementById('btn-undo');
  const btnNew = document.getElementById('btn-new');
  const btnDelete = document.getElementById('btn-delete');
  const btnSave = document.getElementById('btn-save');
  const btnExit = document.getElementById('btn-exit');
  const btnSavePdf = document.getElementById('btn-save-pdf');

  // Recreated MS Access Nav Bar Controls
  const navFirst = document.getElementById('nav-first');
  const navPrev = document.getElementById('nav-prev');
  const navNext = document.getElementById('nav-next');
  const navLast = document.getElementById('nav-last');
  const navNew = document.getElementById('nav-new');
  const navCurrentInput = document.getElementById('nav-current-input');
  const navTotalCount = document.getElementById('nav-total-count');
  const navFilterIndicator = document.getElementById('nav-filter-indicator');
  const navFilterText = document.getElementById('nav-filter-text');
  const navSearchInput = document.getElementById('nav-search-input');

  // Welcome Overlay
  const welcomeOverlay = document.getElementById('welcome-overlay');
  const overlayBtnNew = document.getElementById('overlay-btn-new');
  const overlayBtnLoadFirst = document.getElementById('overlay-btn-load-first');
  const toastContainer = document.getElementById('toast-container');
  const floatingExpandBtn = document.getElementById('floating-expand-btn');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const importFileInput = document.getElementById('import-file-input');

  // --- PARTS TABLE DATA HELPERS ---
  function getPartsTableData() {
    const parts = [];
    for (let i = 0; i < 8; i++) {
      const partDesc = document.getElementById(`part-desc-row-${i}`).value.trim();
      const qtyRej = document.getElementById(`qty-rej-row-${i}`).value;
      const reason = document.getElementById(`reason-row-${i}`).value.trim();
      const qtyCompleted = document.getElementById(`qty-rework-completed-row-${i}`).value;
      const notes = document.getElementById(`notes-row-${i}`).value.trim();
      parts.push({
        partNoDescription: partDesc,
        qtyRejected: qtyRej !== '' ? parseInt(qtyRej) || '' : '',
        reasonForRework: reason,
        qtyReworkCompleted: qtyCompleted !== '' ? parseInt(qtyCompleted) || '' : '',
        notes: notes
      });
    }
    return parts;
  }

  function setPartsTableData(partsArray) {
    const parts = Array.isArray(partsArray) ? partsArray : [];
    for (let i = 0; i < 8; i++) {
      const partInput = document.getElementById(`part-desc-row-${i}`);
      const qtyRejInput = document.getElementById(`qty-rej-row-${i}`);
      const reasonInput = document.getElementById(`reason-row-${i}`);
      const qtyCompletedInput = document.getElementById(`qty-rework-completed-row-${i}`);
      const notesInput = document.getElementById(`notes-row-${i}`);
      
      const item = parts[i];
      if (item) {
        partInput.value = item.partNoDescription || item.part || '';
        
        // Backward compatibility mapping for old fields:
        let fallbackQtyRej = '';
        if (item.qtyRejected !== undefined && item.qtyRejected !== null && item.qtyRejected !== '') {
          fallbackQtyRej = item.qtyRejected;
        } else if (item.qtyReceived !== undefined && item.qtyReceived !== null && item.qtyReceived !== '') {
          fallbackQtyRej = item.qtyReceived;
        } else if (item.quantity !== undefined && item.quantity !== null && item.quantity !== '') {
          fallbackQtyRej = item.quantity;
        }
        qtyRejInput.value = fallbackQtyRej;
        
        reasonInput.value = item.reasonForRework || item.notes || '';
        
        let fallbackQtyCompleted = '';
        if (item.qtyReworkCompleted !== undefined && item.qtyReworkCompleted !== null && item.qtyReworkCompleted !== '') {
          fallbackQtyCompleted = item.qtyReworkCompleted;
        } else if (item.qtyApproved !== undefined && item.qtyApproved !== null && item.qtyApproved !== '') {
          fallbackQtyCompleted = item.qtyApproved;
        }
        qtyCompletedInput.value = fallbackQtyCompleted;
        
        notesInput.value = item.notes || '';
      } else {
        partInput.value = '';
        qtyRejInput.value = '';
        reasonInput.value = '';
        qtyCompletedInput.value = '';
        notesInput.value = '';
      }
    }
  }

  // Dynamically add a class to track empty values for print/PDF transparent overrides
  function updateEmptyClasses() {
    if (!workOrderForm) return;
    const inputs = workOrderForm.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]');
    inputs.forEach(el => {
      if (el.id === 'field-id' && el.value === 'NEW') {
        el.classList.add('is-empty');
        return;
      }
      if (el.value === '') {
        el.classList.add('is-empty');
      } else {
        el.classList.remove('is-empty');
      }
    });
  }

  // QC result checkboxes exclusivity toggles
  function getCheckedFinalResult() {
    const checked = resultCheckboxes.find(cb => cb && cb.checked);
    return checked ? checked.value : '';
  }

  function setCheckedFinalResult(val) {
    resultCheckboxes.forEach(cb => {
      if (cb) {
        cb.checked = (cb.value === val);
      }
    });
  }

  function setupCheckboxExclusivity() {
    resultCheckboxes.forEach(cb => {
      if (cb) {
        cb.addEventListener('change', (e) => {
          if (e.target.checked) {
            resultCheckboxes.forEach(otherCb => {
              if (otherCb && otherCb !== e.target) {
                otherCb.checked = false;
              }
            });
          }
          checkDirtyState();
          updateEmptyClasses();
        });
      }
    });
  }

  function updatePriorityStyles() {
    // Hidden priority field, stub method for compatibility
  }

  // --- INITIALIZATION ---
  function init() {
    // 1. Theme Configuration
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setTheme('dark');
    } else {
      setTheme('light');
    }

    // 2. Setup Live Clock
    updateClock();
    setInterval(updateClock, 1000);

    // 3. Event Listeners registration
    setupEventListeners();

    // 4. Load from Server API with localStorage fallback
    fetch('/api/load')
      .then(response => {
        if (!response.ok) throw new Error("Server database not responding");
        return response.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          workOrders = data;
          console.log("Database successfully loaded from server data folder.");
          completeInit();
        } else {
          loadFromLocalStorage();
        }
      })
      .catch(err => {
        console.warn("Server file database API not available. Using browser LocalStorage:", err);
        loadFromLocalStorage();
      });
  }

  function loadFromLocalStorage() {
    let storedData = localStorage.getItem('work_orders');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        const needsReset = Array.isArray(parsed) && parsed.some(r => r.batchNum !== undefined || r.specs !== undefined);
        if (needsReset) {
          console.log("Old schema detected in localStorage. Resetting to new default samples.");
          storedData = null;
        }
      } catch (e) {
        storedData = null;
      }
    }

    if (storedData) {
      workOrders = JSON.parse(storedData);
      console.log("Database loaded from browser LocalStorage.");
    } else {
      workOrders = [...defaultWorkOrders];
      localStorage.setItem('work_orders', JSON.stringify(workOrders));
      console.log("Database pre-populated with default samples.");
      saveToServerOnly();
    }
    completeInit();
  }

  function completeInit() {
    filteredOrders = [...workOrders];
    updateStats();
    applySearchAndFilters();

    if (filteredOrders.length > 0) {
      loadRecord(filteredOrders.length - 1);
    } else {
      showWelcomeOverlay();
    }
  }

  // --- HELPERS & COMPONENT UTILS ---

  // Live Clock
  function updateClock() {
    const now = new Date();
    const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

    liveClockDate.textContent = now.toLocaleDateString(undefined, dateOptions);
    liveClockTime.textContent = now.toLocaleTimeString(undefined, timeOptions);
  }

  // Theme Toggler
  function setTheme(theme) {
    activeTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    if (theme === 'dark') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }

  // Toast System
  function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let svgIcon = '';
    if (type === 'success') {
      svgIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'warning') {
      svgIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      svgIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    }

    toast.innerHTML = `${svgIcon}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);
  }

  // Compute Job Status
  function getJobStatus(record) {
    if (record.reworkQcResult) {
      return record.reworkQcResult;
    }
    // Fallback for legacy records
    if (record.finalResult) {
      if (record.finalResult === 'All Accepted') return 'Passed';
      if (record.finalResult === 'Rework Required') return 'Needs Additional Rework';
      if (record.finalResult === 'Hold') return 'Failed';
      return record.finalResult;
    }
    return 'pending';
  }

  // Calculate & Refresh Stats Panel
  function updateStats() {
    statsTotal.textContent = workOrders.length;
    statsHigh.textContent = workOrders.filter(w => getJobStatus(w) === 'Passed').length;
    statsPending.textContent = workOrders.filter(w => getJobStatus(w) === 'pending').length;
  }

  // HTML Escaping Helper to prevent XSS injection
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- RECORD LIST VIEW / SIDEBAR RENDERING ---
  function renderSidebar() {
    recordsFeed.innerHTML = '';

    if (filteredOrders.length === 0) {
      recordsFeed.innerHTML = `<div class="no-records-msg" style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No matching records found.</div>`;
      return;
    }

    filteredOrders.forEach((order, index) => {
      const card = document.createElement('div');
      card.className = `record-card ${currentIndex !== null && filteredOrders[currentIndex]?.id === order.id ? 'active' : ''}`;
      card.dataset.index = index;

      const status = getJobStatus(order);
      let priorityClass = 'badge-medium';
      if (status === 'All Accepted') {
        priorityClass = 'badge-low'; // green badge
      } else if (status === 'Rework Required' || status === 'Hold') {
        priorityClass = 'badge-high'; // red badge
      } else if (status === 'Scrap') {
        priorityClass = 'badge-high'; // red badge
      } else {
        priorityClass = 'badge-medium'; // orange badge
      }

      let statusIndicator = '';
      if (status === 'All Accepted') {
        statusIndicator = `<span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--color-success); display: inline-block; margin-right: 4px;" title="All Accepted"></span>`;
      } else if (status === 'Rework Required') {
        statusIndicator = `<span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--color-warning); display: inline-block; margin-right: 4px;" title="Rework Required"></span>`;
      } else if (status === 'Hold') {
        statusIndicator = `<span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--color-info); display: inline-block; margin-right: 4px;" title="Hold"></span>`;
      } else if (status === 'Scrap') {
        statusIndicator = `<span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--color-danger); display: inline-block; margin-right: 4px;" title="Scrap"></span>`;
      } else {
        statusIndicator = `<span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--text-muted); display: inline-block; margin-right: 4px;" title="Pending"></span>`;
      }

      const displayPartCoating = order.partCoating || (order.partNo ? `${order.partNo} / ${order.coating || ''}` : 'N/A');
      const displayDate = order.date || order.receivingDate || 'No Date';

      card.innerHTML = `
        <div class="record-card-header">
          <span class="record-card-id">#${order.id}</span>
          <span class="record-card-date">${escapeHtml(displayDate)}</span>
        </div>
        <div class="record-card-name">${escapeHtml(order.customer || order.customerName || 'Unnamed')}</div>
        <div class="record-card-footer">
          <span class="record-card-desc">${statusIndicator} ${escapeHtml(displayPartCoating)}</span>
          <span class="badge ${priorityClass}">${escapeHtml(status)}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        if (confirmNavigation()) {
          loadRecord(index);
        }
      });

      recordsFeed.appendChild(card);
    });
  }

  // --- WORK ORDER DATA MANAGEMENT (CRUD) ---

  // Load a Record into the Editor Form
  function loadRecord(index) {
    if (index === null || index < 0 || index >= filteredOrders.length) {
      showWelcomeOverlay();
      return;
    }

    currentIndex = index;
    const record = filteredOrders[currentIndex];

    // Hide welcome overlay
    welcomeOverlay.style.display = 'none';

    // Populate Fields with fallback mapping for old schemas
    fieldId.value = record.id;
    fieldDate.value = record.date || record.receivingDate || record.startDate || '';
    fieldPo.value = record.poNumber || '';
    fieldInspector.value = record.inspector || record.receivingInitial || record.footerQcInitial || '';
    fieldCustomer.value = record.customer || record.customerName || '';

    // If partCoating is empty, combine partNo and coating for legacy records
    if (record.partCoating) {
      fieldPartCoating.value = record.partCoating;
    } else {
      const partsArr = [];
      if (record.partNo) partsArr.push(record.partNo);
      if (record.coating) partsArr.push(record.coating);
      fieldPartCoating.value = partsArr.join(" / ");
    }

    // Process Checkboxes
    checkUltrasonic.checked = !!record.processUltrasonic;
    checkStripping.checked = !!record.processStripping;
    checkSandBlasting.checked = !!record.processSandBlasting;
    checkPolishing.checked = !!record.processPolishing;
    checkCoating.checked = !!record.processCoating;
    checkOther.checked = !!record.processOther;
    fieldOtherText.value = record.processOtherText || '';

    // Rework Sign-off
    fieldReworkPerformedBy.value = record.reworkPerformedBy || '';
    fieldReworkDate.value = record.reworkDate || '';

    // QC Checkboxes
    const currentStatus = getJobStatus(record);
    setCheckedFinalResult(currentStatus);

    fieldQcInitial.value = record.reworkQcInitial || record.qcInitial || record.footerQcInitial || '';
    fieldQcDate.value = record.reworkQcDate || record.qcDate || record.footerShippingDate || '';

    // Parts & Quantities Table (Pad to 8 rows)
    let partsData = record.parts;
    if (!Array.isArray(partsData)) {
      partsData = [
        { partNoDescription: record.partNo || '', qtyRejected: record.quantity || '', reasonForRework: record.instructions || '', qtyReworkCompleted: '', notes: '' }
      ];
    }
    const targetParts = [...partsData];
    while (targetParts.length < 8) {
      targetParts.push({ partNoDescription: '', qtyRejected: '', reasonForRework: '', qtyReworkCompleted: '', notes: '' });
    }
    setPartsTableData(targetParts);

    // Track empty classes for print overrides
    updateEmptyClasses();

    // Metadata
    metaCreated.textContent = record.createdTime ? formatTimestamp(record.createdTime) : 'N/A';
    metaModified.textContent = record.lastModifiedTime ? formatTimestamp(record.lastModifiedTime) : 'N/A';

    // Highlight active card in sidebar
    document.querySelectorAll('.record-card').forEach((card, idx) => {
      if (parseInt(card.dataset.index) === currentIndex) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Update Bottom Nav controls
    navCurrentInput.value = currentIndex + 1;
    navTotalCount.textContent = filteredOrders.length;

    // Enable/disable buttons based on positions
    navFirst.disabled = currentIndex === 0;
    navPrev.disabled = currentIndex === 0;
    navNext.disabled = currentIndex === filteredOrders.length - 1;
    navLast.disabled = currentIndex === filteredOrders.length - 1;

    // Reset unsaved flag
    isDirty = false;
    unsavedAlert.style.display = 'none';
  }

  // Aggregate current inputs into an object
  function getFormState() {
    const finalRes = getCheckedFinalResult();
    const partsData = getPartsTableData();
    
    // For backward compatibility and stats, we calculate total quantity
    const totalQty = partsData.reduce((sum, item) => sum + (parseInt(item.qtyRejected) || 0), 0);
    
    // Pick the first part description as partNo for older systems
    const firstPart = partsData.find(p => p.partNoDescription)?.partNoDescription || '';

    return {
      id: fieldId.value,
      date: fieldDate.value,
      poNumber: fieldPo.value.trim(),
      inspector: fieldInspector.value.trim(),
      customer: fieldCustomer.value.trim(),
      partCoating: fieldPartCoating.value.trim(),
      parts: partsData,
      
      processUltrasonic: checkUltrasonic.checked,
      processStripping: checkStripping.checked,
      processSandBlasting: checkSandBlasting.checked,
      processPolishing: checkPolishing.checked,
      processCoating: checkCoating.checked,
      processOther: checkOther.checked,
      processOtherText: fieldOtherText.value.trim(),
      
      reworkPerformedBy: fieldReworkPerformedBy.value.trim(),
      reworkDate: fieldReworkDate.value,
      reworkQcResult: finalRes,
      reworkQcInitial: fieldQcInitial.value.trim(),
      reworkQcDate: fieldQcDate.value,

      // Backward compatibility fields
      finalResult: finalRes === 'Passed' ? 'All Accepted' : (finalRes === 'Failed' ? 'Hold' : (finalRes === 'Needs Additional Rework' ? 'Rework Required' : finalRes)),
      qcInitial: fieldQcInitial.value.trim(),
      qcDate: fieldQcDate.value,
      customerName: fieldCustomer.value.trim(),
      receivingDate: fieldDate.value,
      startDate: fieldDate.value,
      receivingInitial: fieldInspector.value.trim(),
      footerQcInitial: fieldQcInitial.value.trim(),
      footerShippingDate: fieldQcDate.value,
      finishDate: fieldQcDate.value,
      partNo: firstPart,
      quantity: totalQty
    };
  }

  // Check if Form State differs from Saved Record state
  function checkDirtyState() {
    if (currentIndex === null && fieldId.value !== 'NEW') {
      isDirty = false;
      unsavedAlert.style.display = 'none';
      return;
    }

    const currentForm = getFormState();
    let original = null;

    if (fieldId.value === 'NEW') {
      // It's a new unsaved record. Check if any fields are typed.
      const hasAnyInput = Object.keys(currentForm).some(key => {
        if (['id', 'quantity', 'startDate', 'finishDate', 'customerName', 'receivingDate', 'receivingInitial', 'footerQcInitial', 'footerShippingDate', 'partNo', 'finalResult', 'qcInitial', 'qcDate'].includes(key)) return false;
        if (key === 'parts') {
          return currentForm.parts.some(p => p.partNoDescription !== '' || p.qtyRejected !== '' || p.reasonForRework !== '' || p.qtyReworkCompleted !== '' || p.notes !== '');
        }
        return currentForm[key] !== '' && currentForm[key] !== null && currentForm[key] !== false;
      });
      isDirty = hasAnyInput;
    } else {
      original = filteredOrders[currentIndex];

      // Compare values
      isDirty = Object.keys(currentForm).some(key => {
        if (['quantity', 'startDate', 'finishDate', 'customerName', 'receivingDate', 'receivingInitial', 'footerQcInitial', 'footerShippingDate', 'partNo', 'finalResult', 'qcInitial', 'qcDate'].includes(key)) return false;
        if (key === 'parts') {
          const origParts = Array.isArray(original.parts) ? original.parts : [];
          for (let i = 0; i < 8; i++) {
            const curP = currentForm.parts[i] || { partNoDescription: '', qtyRejected: '', reasonForRework: '', qtyReworkCompleted: '', notes: '' };
            const origP = origParts[i] || { partNoDescription: '', qtyRejected: '', reasonForRework: '', qtyReworkCompleted: '', notes: '' };
            const origDesc = origP.partNoDescription || origP.part || '';
            
            // Backward compatibility fallbacks
            let origQtyRej = '';
            if (origP.qtyRejected !== undefined && origP.qtyRejected !== null) {
              origQtyRej = origP.qtyRejected;
            } else if (origP.qtyReceived !== undefined && origP.qtyReceived !== null) {
              origQtyRej = origP.qtyReceived;
            } else if (origP.quantity !== undefined && origP.quantity !== null) {
              origQtyRej = origP.quantity;
            }
            
            const origReason = origP.reasonForRework || origP.notes || '';
            
            let origQtyCompleted = '';
            if (origP.qtyReworkCompleted !== undefined && origP.qtyReworkCompleted !== null) {
              origQtyCompleted = origP.qtyReworkCompleted;
            } else if (origP.qtyApproved !== undefined && origP.qtyApproved !== null) {
              origQtyCompleted = origP.qtyApproved;
            }

            if ((curP.partNoDescription || '') !== origDesc || 
                String(curP.qtyRejected || '') !== String(origQtyRej || '') || 
                (curP.reasonForRework || '') !== origReason || 
                String(curP.qtyReworkCompleted || '') !== String(origQtyCompleted || '') || 
                (curP.notes || '') !== (origP.notes || '')) {
              return true;
            }
          }
          return false;
        }
        const curVal = currentForm[key];
        const origVal = original[key] !== undefined ? original[key] : (
          key === 'date' ? (original.receivingDate || original.startDate || '') : (
            key === 'customer' ? (original.customerName || '') : (
              key === 'inspector' ? (original.receivingInitial || original.footerQcInitial || '') : ''
            )
          )
        );
        
        if (typeof curVal === 'boolean') {
          return curVal !== !!origVal;
        }
        return String(curVal || '') !== String(origVal || '');
      });
    }

    if (isDirty) {
      unsavedAlert.style.display = 'flex';
    } else {
      unsavedAlert.style.display = 'none';
    }
  }

  // Prompt if navigating away with unsaved changes
  function confirmNavigation() {
    if (isDirty) {
      return confirm("You have unsaved changes. Are you sure you want to discard them?");
    }
    return true;
  }

  // Create a new empty Work Order form (Direct method)
  function newRecordDirect() {
    currentIndex = null;
    welcomeOverlay.style.display = 'none';

    // Clear and preset defaults
    workOrderForm.reset();
    fieldId.value = 'NEW';
    setCheckedFinalResult('');

    // Reset controls
    navCurrentInput.value = '*';
    navFirst.disabled = true;
    navPrev.disabled = true;
    navNext.disabled = true;
    navLast.disabled = true;

    metaCreated.textContent = '--';
    metaModified.textContent = '--';

    document.querySelectorAll('.record-card').forEach(card => card.classList.remove('active'));

    fieldCustomer.focus();
    isDirty = false;
    unsavedAlert.style.display = 'none';
    updateEmptyClasses();
  }

  // Handle Create New Record with modal check for unsaved changes
  function newRecord() {
    if (isDirty) {
      const modal = document.getElementById('unsaved-changes-modal');
      modal.style.display = 'flex';

      const btnSaveNew = document.getElementById('modal-btn-save-new');
      const btnDiscardNew = document.getElementById('modal-btn-discard-new');
      const btnCancelNew = document.getElementById('modal-btn-cancel-new');

      btnSaveNew.onclick = () => {
        modal.style.display = 'none';
        saveRecord(); // Save changes
        newRecordDirect(); // Clear form for new record
      };

      btnDiscardNew.onclick = () => {
        modal.style.display = 'none';
        newRecordDirect(); // Discard and create new
      };

      btnCancelNew.onclick = () => {
        modal.style.display = 'none'; // Close modal
      };
    } else {
      newRecordDirect();
    }
  }

  // Revert form state back to original record values
  function undoChanges() {
    if (fieldId.value === 'NEW') {
      newRecordDirect();
    } else if (currentIndex !== null) {
      loadRecord(currentIndex);
      showToast("Changes reverted.", "info");
    }
  }

  // Save current record (INSERT or UPDATE)
  function saveRecord() {
    // Perform standard HTML validity check
    if (!workOrderForm.reportValidity()) {
      showToast("Please fill in all required fields.", "warning");
      return;
    }

    const formState = getFormState();
    const now = new Date().toISOString();

    if (formState.id === 'NEW') {
      // INSERT: Generate unique numeric ID
      let nextId = 1000;
      if (workOrders.length > 0) {
        const ids = workOrders.map(w => parseInt(w.id)).filter(id => !isNaN(id));
        if (ids.length > 0) {
          nextId = Math.max(...ids) + 1;
        }
      }

      const newOrder = {
        ...formState,
        id: nextId.toString(),
        createdTime: now,
        lastModifiedTime: now
      };

      workOrders.push(newOrder);
      saveDatabaseState();
      showToast(`Work Order #${newOrder.id} created successfully!`, "success");

      // Update view
      updateStats();
      applySearchAndFilters();

      // Find new item index in filtered view and load
      const newIndexInFilter = filteredOrders.findIndex(w => w.id === newOrder.id);
      loadRecord(newIndexInFilter !== -1 ? newIndexInFilter : filteredOrders.length - 1);

    } else {
      // UPDATE: Save existing record
      const dbIndex = workOrders.findIndex(w => w.id === formState.id);
      if (dbIndex === -1) {
        showToast("Record database conflict. Save failed.", "danger");
        return;
      }

      // Preserve created timestamp
      const createdTime = workOrders[dbIndex].createdTime || now;

      workOrders[dbIndex] = {
        ...formState,
        createdTime: createdTime,
        lastModifiedTime: now
      };

      saveDatabaseState();
      showToast(`Work Order #${formState.id} saved.`, "success");

      // Preserve current filter state and refresh
      updateStats();

      // Refresh sidebar content list without resetting search
      const currentSelectedId = formState.id;
      applySearchAndFilters(false); // don't reset index to 0

      const newIndexInFilter = filteredOrders.findIndex(w => w.id === currentSelectedId);
      loadRecord(newIndexInFilter !== -1 ? newIndexInFilter : 0);
    }
  }

  // Delete current record
  function deleteRecord() {
    console.log("deleteRecord: function invoked");
    try {
      if (fieldId.value === 'NEW') {
        console.log("deleteRecord: clearing new unsaved form");
        newRecordDirect();
        showToast("Cleared new blank form.", "info");
        return;
      }

      if (currentIndex === null || !filteredOrders[currentIndex]) {
        console.warn("deleteRecord: aborting delete due to null index or missing record data");
        showToast("No active record selected to delete.", "warning");
        return;
      }

      const currentId = filteredOrders[currentIndex].id;
      console.log("deleteRecord: displaying custom modal for target ID:", currentId);

      // Display custom confirmation modal
      const modal = document.getElementById('delete-confirm-modal');
      const textId = document.getElementById('delete-modal-order-id');
      const btnConfirm = document.getElementById('modal-btn-delete-confirm');
      const btnCancel = document.getElementById('modal-btn-delete-cancel');

      textId.textContent = `#${currentId}`;
      modal.style.display = 'flex';

      btnConfirm.onclick = () => {
        console.log("deleteRecord: deletion confirmed via custom modal");
        modal.style.display = 'none';

        // Remove from main DB with type-safe string comparisons
        workOrders = workOrders.filter(w => String(w.id) !== String(currentId));
        saveDatabaseState();
        showToast(`Work Order #${currentId} deleted.`, "warning");

        updateStats();
        
        // Pass false so applySearchAndFilters does not reset the record index inside it
        applySearchAndFilters(false);

        // Load next available neighboring record, or clear
        if (filteredOrders.length > 0) {
          const nextIdx = Math.min(currentIndex, filteredOrders.length - 1);
          console.log("deleteRecord: loading neighboring record at index", nextIdx);
          loadRecord(nextIdx);
        } else {
          console.log("deleteRecord: no records left in active list");
          showWelcomeOverlay();
        }
      };

      btnCancel.onclick = () => {
        console.log("deleteRecord: deletion cancelled via custom modal");
        modal.style.display = 'none';
      };

    } catch (error) {
      console.error("Error in deleteRecord:", error);
      showToast("Error deleting record: " + error.message, "danger");
    }
  }

  // Close workspace / exit
  function exitWorkspace() {
    if (!confirmNavigation()) return;
    showWelcomeOverlay();
  }

  // Show welcome overlay screen
  function showWelcomeOverlay() {
    currentIndex = null;
    isDirty = false;
    unsavedAlert.style.display = 'none';
    welcomeOverlay.style.display = 'flex';

    // Clear elements
    workOrderForm.reset();

    // Reset Navigation input
    navCurrentInput.value = '0';
    navTotalCount.textContent = '0';
    navFirst.disabled = true;
    navPrev.disabled = true;
    navNext.disabled = true;
    navLast.disabled = true;

    document.querySelectorAll('.record-card').forEach(card => card.classList.remove('active'));
    updateEmptyClasses();
  }

  // --- FILTERING & SEARCH CONTROLS ---

  function applySearchAndFilters(resetIndexToLatest = true) {
    const activeSearch = sidebarSearchInput.value.toLowerCase().trim();

    const priority = filterPriority.value;
    const statusFilter = filterStatus.value;

    // Filter main dataset
    filteredOrders = workOrders.filter(order => {
      // 1. Text Search (Matches ID, Customer, PO #, Part/Coating, Inspector, parts list notes/descriptions)
      let matchesSearch = true;
      if (activeSearch !== '') {
        const partsMatch = Array.isArray(order.parts) && order.parts.some(p =>
          (p.partNoDescription && p.partNoDescription.toLowerCase().includes(activeSearch)) ||
          (p.part && p.part.toLowerCase().includes(activeSearch)) ||
          (p.notes && p.notes.toLowerCase().includes(activeSearch))
        );
        matchesSearch = (
          (order.id && order.id.toLowerCase().includes(activeSearch)) ||
          (order.customer && order.customer.toLowerCase().includes(activeSearch)) ||
          (order.customerName && order.customerName.toLowerCase().includes(activeSearch)) ||
          (order.poNumber && order.poNumber.toLowerCase().includes(activeSearch)) ||
          (order.partCoating && order.partCoating.toLowerCase().includes(activeSearch)) ||
          (order.inspector && order.inspector.toLowerCase().includes(activeSearch)) ||
          partsMatch
        );
      }

      // 2. Priority Filter (Ignored as it's hidden now, but kept for compatibility)
      let matchesPriority = true;
      if (priority !== '') {
        const orderPriority = (order.priority || '').toLowerCase();
        const filterPriorityVal = priority.toLowerCase();
        if (filterPriorityVal === 'standard') {
          matchesPriority = orderPriority === 'standard' || orderPriority === 'low';
        } else if (filterPriorityVal === 'priority') {
          matchesPriority = orderPriority === 'priority' || orderPriority === 'medium';
        } else if (filterPriorityVal === 'rush') {
          matchesPriority = orderPriority === 'rush' || orderPriority === 'high';
        } else {
          matchesPriority = orderPriority === filterPriorityVal;
        }
      }

      // 3. Status Filter
      let matchesStatus = true;
      if (statusFilter !== '') {
        const orderStatus = getJobStatus(order);
        matchesStatus = orderStatus === statusFilter;
      }

      return matchesSearch && matchesPriority && matchesStatus;
    });

    // Handle Filter Indicator Status
    const isFiltered = activeSearch !== '' || priority !== '' || statusFilter !== '';
    if (isFiltered) {
      navFilterIndicator.classList.add('active-filter');
      navFilterText.textContent = "Filtered";
    } else {
      navFilterIndicator.classList.remove('active-filter');
      navFilterText.textContent = "Unfiltered";
    }

    // Draw Sidebar
    renderSidebar();

    // Reset currently selected record index if requested
    if (resetIndexToLatest) {
      if (filteredOrders.length > 0) {
        loadRecord(filteredOrders.length - 1);
      } else {
        showWelcomeOverlay();
      }
    }
  }

  // --- RECORD NAVIGATION ACTION LISTENABLE ---
  function navigateFirst() {
    if (filteredOrders.length === 0 || !confirmNavigation()) return;
    loadRecord(0);
  }

  function navigatePrev() {
    if (filteredOrders.length === 0 || currentIndex === 0 || !confirmNavigation()) return;
    loadRecord(currentIndex - 1);
  }

  function navigateNext() {
    if (filteredOrders.length === 0 || currentIndex === filteredOrders.length - 1 || !confirmNavigation()) return;
    loadRecord(currentIndex + 1);
  }

  // Handle manual page input entry
  function navigateLast() {
    if (filteredOrders.length === 0 || !confirmNavigation()) return;
    loadRecord(filteredOrders.length - 1);
  }

  // Handles manual page number entry in MS Access control
  function handlePageInput(e) {
    if (e.key === 'Enter') {
      const val = parseInt(navCurrentInput.value);
      if (!isNaN(val) && val >= 1 && val <= filteredOrders.length) {
        if (confirmNavigation()) {
          loadRecord(val - 1);
        } else {
          // Reset view input
          navCurrentInput.value = currentIndex + 1;
        }
      } else {
        showToast("Invalid record index.", "warning");
        navCurrentInput.value = currentIndex !== null ? currentIndex + 1 : '0';
      }
    }
  }

  // Centralized Database Syncing function
  function saveDatabaseState() {
    // 1. Browser LocalStorage cache
    localStorage.setItem('work_orders', JSON.stringify(workOrders));

    // 2. Physical JSON file on server
    saveToServerOnly();
  }

  function saveToServerOnly() {
    fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workOrders)
    })
      .then(response => {
        if (!response.ok) throw new Error("Server file write failure");
        return response.json();
      })
      .then(result => {
        console.log("Database successfully written to server disk data/work_orders.json:", result);
      })
      .catch(err => {
        console.warn("Could not save database to server disk:", err);
      });
  }

  // Format timestamps nicely
  function formatTimestamp(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Trigger Print Dialog
  function printReport() {
    if (isDirty) {
      showToast("Please save changes before printing.", "warning");
      return;
    }
    window.print();
  }

  // Save Report as PDF to local folder
  function savePdfReport() {
    if (isDirty) {
      showToast("Please save changes before exporting as PDF.", "warning");
      return;
    }

    const orderId = fieldId.value;
    if (!orderId || orderId === 'NEW') {
      showToast("No active record selected to save as PDF.", "warning");
      return;
    }

    // Capture the target element
    const element = document.getElementById('printable-area');
    if (!element) {
      showToast("Printable area not found.", "danger");
      return;
    }

    showToast("Generating PDF...", "info", 2000);

    // html2pdf options
    const opt = {
      margin: 0.3,
      filename: `work_order_${orderId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Use html2pdf to generate the PDF as a raw blob
    html2pdf().set(opt).from(element).toPdf().output('blob').then(function (pdfBlob) {
      // Convert Blob to Base64 to send to API
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      reader.onloadend = function () {
        const base64data = reader.result.split(',')[1];

        // Post data to our local backend server API
        fetch('/api/save-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: orderId,
            pdfBase64: base64data
          })
        })
          .then(response => {
            if (!response.ok) throw new Error("Server PDF write failed");
            return response.json();
          })
          .then(result => {
            if (result.status === 'success') {
              showToast(`PDF saved to local folder: ${result.filename}`, "success", 5000);
            } else {
              throw new Error(result.message || "Unknown error saving PDF");
            }
          })
          .catch(err => {
            console.error("PDF upload error:", err);
            showToast(`Error saving PDF: ${err.message}`, "danger", 5000);
          });
      };
    }).catch(err => {
      console.error("PDF generation error:", err);
      showToast(`PDF generation error: ${err.message}`, "danger", 5000);
    });
  }

  // Export Database to CSV file
  function exportToCsv() {
    const csvHeaders = [
      "Work Order ID", "Customer Name", "PO Number", "Date", "Inspector", "Part/Coating", "Performed By", "Rework Date", "QC Initial", "QC Date", "Rework QC Result", "Processes", "Parts List"
    ];

    const csvRows = [csvHeaders.join(",")];

    workOrders.forEach(order => {
      const partsText = Array.isArray(order.parts) ?
        order.parts.filter(p => p.partNoDescription || p.qtyRejected || p.notes).map(p => {
          let partInfo = p.partNoDescription || 'Unnamed';
          let details = [];
          if (p.qtyRejected !== undefined && p.qtyRejected !== '') details.push(`Rejected: ${p.qtyRejected}`);
          if (p.reasonForRework) details.push(`Reason: ${p.reasonForRework}`);
          if (p.qtyReworkCompleted !== undefined && p.qtyReworkCompleted !== '') details.push(`Completed: ${p.qtyReworkCompleted}`);
          if (p.notes) details.push(`Notes: ${p.notes}`);
          return details.length > 0 ? `${partInfo} (${details.join(", ")})` : partInfo;
        }).join(" | ") : "";

      const procs = [];
      if (order.processUltrasonic) procs.push("Ultrasonic Cleaning");
      if (order.processStripping) procs.push("Stripping");
      if (order.processSandBlasting) procs.push("Sand Blasting");
      if (order.processPolishing) procs.push("Polishing");
      if (order.processCoating) procs.push("Coating");
      if (order.processOther) procs.push(`Other (${order.processOtherText || ''})`);
      const processesText = procs.join(" | ");

      const values = [
        order.id || '',
        order.customer || order.customerName || '',
        order.poNumber || '',
        order.date || order.receivingDate || '',
        order.inspector || order.receivingInitial || '',
        order.partCoating || (order.partNo ? `${order.partNo} / ${order.coating || ''}` : ''),
        order.reworkPerformedBy || '',
        order.reworkDate || '',
        order.reworkQcInitial || order.qcInitial || '',
        order.reworkQcDate || order.qcDate || '',
        getJobStatus(order),
        processesText,
        partsText
      ];

      // Escape fields with quotes and commas
      const escapedValues = values.map(val => {
        let textVal = String(val);
        textVal = textVal.replace(/"/g, '""');
        if (textVal.includes(',') || textVal.includes('\n') || textVal.includes('\r') || textVal.includes('"')) {
          textVal = `"${textVal}"`;
        }
        return textVal;
      });

      csvRows.push(escapedValues.join(","));
    });

    const csvContent = csvRows.join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "armor_coating_work_orders.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Database exported as CSV file.", "success");
  }

  // Import database from File (JSON or CSV)
  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop().toLowerCase();

    reader.onload = function (evt) {
      try {
        const text = evt.target.result;
        let importedRecords = [];

        if (fileExtension === 'json') {
          importedRecords = JSON.parse(text);
          if (!Array.isArray(importedRecords)) {
            throw new Error("Invalid format: JSON must be an array of work orders.");
          }
        } else if (fileExtension === 'csv') {
          importedRecords = parseCsvContent(text);
        } else {
          throw new Error("Unsupported file type. Please upload a .json or .csv file.");
        }

        if (importedRecords.length === 0) {
          throw new Error("No records found in the imported file.");
        }

        const first = importedRecords[0];
        if (!first.id || !first.customerName) {
          throw new Error("Invalid file content layout. Missing critical columns (id, customerName).");
        }

        if (confirm(`Are you sure you want to import ${importedRecords.length} records? This will merge with or overwrite your current database.`)) {
          importedRecords.forEach(imp => {
            const index = workOrders.findIndex(w => w.id === imp.id);
            if (index !== -1) {
              workOrders[index] = imp;
            } else {
              workOrders.push(imp);
            }
          });

          saveDatabaseState();
          showToast(`Successfully imported ${importedRecords.length} records!`, "success");

          updateStats();
          applySearchAndFilters(true);
        }
      } catch (err) {
        showToast(err.message, "danger", 5000);
      } finally {
        importFileInput.value = '';
      }
    };

    reader.readAsText(file);
  }

  // Simple CSV parser supporting double quotes and commas
  function parseCsvContent(text) {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (c === '"') {
          if (next === '"') {
            row[row.length - 1] += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          row[row.length - 1] += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ',') {
          row.push("");
        } else if (c === '\r' || c === '\n') {
          if (c === '\r' && next === '\n') {
            i++;
          }
          if (row.length > 1 || row[0] !== "") {
            lines.push(row);
          }
          row = [""];
        } else {
          row[row.length - 1] += c;
        }
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }

    if (lines.length < 2) return [];

    const headers = lines[0].map(h => h.trim());
    const propertyMapping = {
      "Work Order ID": "id", "Work Order": "id", "id": "id",
      "Customer Name": "customer", "Customer": "customer", "customer": "customer", "customerName": "customer",
      "PO Number": "poNumber", "PO #": "poNumber", "poNumber": "poNumber",
      "Date": "date", "date": "date", "receivingDate": "date", "startDate": "date",
      "Inspector": "inspector", "inspector": "inspector", "receivingInitial": "inspector",
      "Part/Coating": "partCoating", "partCoating": "partCoating", "partNo": "partCoating",
      "QC Initial": "qcInitial", "qcInitial": "qcInitial", "footerQcInitial": "qcInitial",
      "QC Date": "qcDate", "qcDate": "qcDate", "footerShippingDate": "qcDate", "finishDate": "qcDate",
      "Final Result": "finalResult", "finalResult": "finalResult",
      "Parts List": "parts"
    };

    const records = [];
    for (let r = 1; r < lines.length; r++) {
      const rowData = lines[r];
      const record = {};

      headers.forEach((header, colIdx) => {
        const prop = propertyMapping[header] || header;
        let val = rowData[colIdx] || '';

        if (prop === 'parts') {
          const partsArray = [];
          if (val) {
            const items = val.split(' | ');
            items.forEach(item => {
              const qtyRecMatch = item.match(/Received:\s*(\d+)/i) || item.match(/Qty:\s*(\d+)/i);
              const qtyInspMatch = item.match(/Inspected:\s*(\d+)/i);
              const qtyAppMatch = item.match(/Approved:\s*(\d+)/i);
              const qtyRejMatch = item.match(/Rejected:\s*(\d+)/i);
              const notesMatch = item.match(/Notes:\s*([^,)]+)/i);
              const sizeMatch = item.match(/Size:\s*([^,)]+)/i);
              
              let partName = item.replace(/\s*\([^)]+\)/g, '').trim();
              let qtyRec = qtyRecMatch ? parseInt(qtyRecMatch[1]) || '' : '';
              let qtyInsp = qtyInspMatch ? parseInt(qtyInspMatch[1]) || '' : qtyRec;
              let qtyApp = qtyAppMatch ? parseInt(qtyAppMatch[1]) || '' : qtyRec;
              let qtyRej = qtyRejMatch ? parseInt(qtyRejMatch[1]) || '' : '';
              let notes = notesMatch ? notesMatch[1].trim() : (sizeMatch ? `Size: ${sizeMatch[1].trim()}` : '');
              
              if (partName || qtyRec || qtyInsp || qtyApp || qtyRej || notes) {
                partsArray.push({
                  partNoDescription: partName,
                  qtyReceived: qtyRec,
                  qtyInspected: qtyInsp,
                  qtyApproved: qtyApp,
                  qtyRejected: qtyRej,
                  notes: notes
                });
              }
            });
          }
          // Pad to 8 rows
          while (partsArray.length < 8) {
            partsArray.push({ partNoDescription: '', qtyReceived: '', qtyInspected: '', qtyApproved: '', qtyRejected: '', notes: '' });
          }
          record[prop] = partsArray;
        } else {
          record[prop] = val;
        }
      });

      if (record.id) {
        records.push(record);
      }
    }
    return records;
  }

  // --- EVENT LISTENERS REGISTRATION ---
  function setupEventListeners() {
    // Sidebar toggle (Collapse/Expand)
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.add('collapsed');
    });

    menuToggle.addEventListener('click', () => {
      sidebar.classList.remove('collapsed');
    });

    floatingExpandBtn.addEventListener('click', () => {
      sidebar.classList.remove('collapsed');
    });

    // Theme Switcher
    themeToggle.addEventListener('click', () => {
      if (activeTheme === 'dark') {
        setTheme('light');
      } else {
        setTheme('dark');
      }
    });

    // Sidebar search & filter events
    sidebarSearchInput.addEventListener('input', (e) => {
      navSearchInput.value = e.target.value;
      applySearchAndFilters(true);
    });
    filterPriority.addEventListener('change', () => applySearchAndFilters(true));
    filterStatus.addEventListener('change', () => applySearchAndFilters(true));

    // Bottom Navigation Search input
    navSearchInput.addEventListener('input', (e) => {
      sidebarSearchInput.value = e.target.value;
      applySearchAndFilters(true);
    });

    // Form buttons
    btnPrint.addEventListener('click', printReport);
    btnSavePdf.addEventListener('click', savePdfReport);
    btnUndo.addEventListener('click', undoChanges);
    btnNew.addEventListener('click', newRecord);
    btnDelete.addEventListener('click', deleteRecord);
    btnSave.addEventListener('click', saveRecord);
    btnExit.addEventListener('click', exitWorkspace);

    // Export / Import listeners
    btnExportCsv.addEventListener('click', exportToCsv);
    importFileInput.addEventListener('change', handleImportFile);

    // Welcome Screen triggers
    overlayBtnNew.addEventListener('click', newRecord);
    overlayBtnLoadFirst.addEventListener('click', () => {
      if (filteredOrders.length > 0) {
        loadRecord(filteredOrders.length - 1);
      } else {
        newRecord();
      }
    });

    // MS Access navigation buttons
    navFirst.addEventListener('click', navigateFirst);
    navPrev.addEventListener('click', navigatePrev);
    navNext.addEventListener('click', navigateNext);
    navLast.addEventListener('click', navigateLast);
    navNew.addEventListener('click', newRecord);
    navCurrentInput.addEventListener('keydown', handlePageInput);

    // Form change alerts tracking
    setupCheckboxExclusivity();

    const formFields = [
      fieldDate, fieldPo, fieldInspector, fieldCustomer, fieldPartCoating,
      fieldQcInitial, fieldQcDate
    ];

    // Add Parts Table inputs for change alert tracking
    for (let i = 0; i < 8; i++) {
      formFields.push(document.getElementById(`part-desc-row-${i}`));
      formFields.push(document.getElementById(`qty-rej-row-${i}`));
      formFields.push(document.getElementById(`reason-row-${i}`));
      formFields.push(document.getElementById(`qty-rework-completed-row-${i}`));
      formFields.push(document.getElementById(`notes-row-${i}`));
    }

    // Add checkboxes
    resultCheckboxes.forEach(cb => {
      if (cb) formFields.push(cb);
    });

    processCheckboxes.forEach(cb => {
      if (cb) formFields.push(cb);
    });

    formFields.push(fieldOtherText);
    formFields.push(fieldReworkPerformedBy);
    formFields.push(fieldReworkDate);

    formFields.forEach(field => {
      if (field) {
        field.addEventListener('input', () => {
          checkDirtyState();
          updateEmptyClasses();
          updatePriorityStyles();
        });
        field.addEventListener('change', () => {
          checkDirtyState();
          updateEmptyClasses();
          updatePriorityStyles();
        });
      }
    });

    // Prompt browser unload if dirty changes exist
    window.addEventListener('beforeunload', (e) => {
      if (isDirty) {
        // Standard browser alert trigger
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // --- START THE APP ---
  init();
});
