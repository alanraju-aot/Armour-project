// TITANIUM COATING SERVICES, INC. - Work Order Report Manager Logic

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
  const fieldId = document.getElementById('field-id');
  const fieldPart = document.getElementById('field-part');
  const fieldCoating = document.getElementById('field-coating');
  const fieldName = document.getElementById('field-name');
  const fieldPo = document.getElementById('field-po');
  const fieldReceivingDate = document.getElementById('field-receiving-date');
  const fieldPriority = document.getElementById('field-priority');
  const fieldDueDate = document.getElementById('field-due-date');
  const fieldInstructions = document.getElementById('field-instructions');

  // Middle Section
  const fieldReceivingInitial = document.getElementById('field-receiving-initial');
  const fieldShippingInitial = document.getElementById('field-shipping-initial');
  const fieldSandblast = document.getElementById('field-sandblast');
  const fieldBoxText = document.getElementById('field-box-text');
  const fieldQcText = document.getElementById('field-qc-text');
  const fieldShipVia = document.getElementById('field-ship-via');
  const fieldDescription = document.getElementById('field-description');
  const fieldShippingDateTop = document.getElementById('field-shipping-date-top');

  // Footer Section
  const fieldFooterRecDate = document.getElementById('field-footer-receiving-date');
  const fieldFooterRecInitial = document.getElementById('field-footer-receiving-initial');
  const fieldFooterQcInitial = document.getElementById('field-footer-qc-initial');
  const fieldFooterShipDate = document.getElementById('field-footer-shipping-date');
  const fieldFooterShipInitial = document.getElementById('field-footer-shipping-initial');
  const fieldForTcs = document.getElementById('field-for-tcs');
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
    for (let i = 0; i < 3; i++) {
      const partVal = document.getElementById(`part-row-${i}`).value.trim();
      const qtyVal = document.getElementById(`qty-row-${i}`).value;
      const sizeVal = document.getElementById(`size-row-${i}`).value.trim();
      parts.push({
        part: partVal,
        quantity: qtyVal !== '' ? parseInt(qtyVal) || '' : '',
        size: sizeVal
      });
    }
    return parts;
  }

  function setPartsTableData(partsArray) {
    const parts = Array.isArray(partsArray) ? partsArray : [];
    for (let i = 0; i < 3; i++) {
      const partInput = document.getElementById(`part-row-${i}`);
      const qtyInput = document.getElementById(`qty-row-${i}`);
      const sizeInput = document.getElementById(`size-row-${i}`);
      if (parts[i]) {
        partInput.value = parts[i].part || '';
        qtyInput.value = parts[i].quantity !== undefined && parts[i].quantity !== null ? parts[i].quantity : '';
        sizeInput.value = parts[i].size || '';
      } else {
        partInput.value = '';
        qtyInput.value = '';
        sizeInput.value = '';
      }
    }
  }

  // Dynamically add a class to track empty values for print/PDF transparent overrides
  function updateEmptyClasses() {
    if (!workOrderForm) return;
    const inputs = workOrderForm.querySelectorAll('input, select, textarea');
    inputs.forEach(el => {
      if (el.id === 'field-id' && el.value === 'NEW') {
        el.classList.add('is-empty');
        return;
      }
      if (el.value === '' || (el.tagName === 'SELECT' && el.selectedIndex === 0 && el.options[0].value === '')) {
        el.classList.add('is-empty');
      } else {
        el.classList.remove('is-empty');
      }
    });
  }

  function updatePriorityStyles() {
    if (!fieldPriority) return;
    const val = fieldPriority.value;
    fieldPriority.classList.remove('priority-high', 'priority-medium', 'priority-low');
    if (val === 'High' || val === 'Rush') {
      fieldPriority.classList.add('priority-high');
    } else if (val === 'Medium' || val === 'Priority') {
      fieldPriority.classList.add('priority-medium');
    } else if (val === 'Low' || val === 'Standard') {
      fieldPriority.classList.add('priority-low');
    }
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
    const shipDate = record.footerShippingDate || record.finishDate || '';
    if (shipDate !== '') {
      return 'completed';
    }
    const recDate = record.receivingDate || record.startDate || '';
    if (recDate !== '') {
      return 'in-progress';
    }
    return 'pending';
  }

  // Calculate & Refresh Stats Panel
  function updateStats() {
    statsTotal.textContent = workOrders.length;
    statsHigh.textContent = workOrders.filter(w => w.priority === 'High' || w.priority === 'Rush').length;
    statsPending.textContent = workOrders.filter(w => getJobStatus(w) === 'in-progress').length;
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

      let priorityClass = 'badge-medium';
      const p = order.priority ? order.priority.toLowerCase() : '';
      if (p === 'high' || p === 'rush') {
        priorityClass = 'badge-high';
      } else if (p === 'medium' || p === 'priority') {
        priorityClass = 'badge-medium';
      } else if (p === 'low' || p === 'standard') {
        priorityClass = 'badge-low';
      }
      const status = getJobStatus(order);

      let statusIndicator = '';
      if (status === 'completed') {
        statusIndicator = `<span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--color-success); display: inline-block; margin-right: 4px;" title="Completed"></span>`;
      } else if (status === 'in-progress') {
        statusIndicator = `<span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--primary); display: inline-block; margin-right: 4px;" title="In Progress"></span>`;
      } else {
        statusIndicator = `<span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--text-muted); display: inline-block; margin-right: 4px;" title="Pending"></span>`;
      }

      card.innerHTML = `
        <div class="record-card-header">
          <span class="record-card-id">#${order.id}</span>
          <span class="record-card-date">${order.dueDate ? order.dueDate : 'No Due Date'}</span>
        </div>
        <div class="record-card-name">${order.customerName || 'Unnamed'}</div>
        <div class="record-card-footer">
          <span class="record-card-desc">${statusIndicator} ${order.partNo || 'N/A'}</span>
          <span class="badge ${priorityClass}">${order.priority || 'Medium'}</span>
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

    // Make sure dynamically loaded coatings are appended to select if they don't exist
    if (record.coating) {
      const coatingOptions = Array.from(fieldCoating.options).map(opt => opt.value);
      if (!coatingOptions.includes(record.coating)) {
        const newOpt = document.createElement('option');
        newOpt.value = record.coating;
        newOpt.textContent = record.coating;
        fieldCoating.appendChild(newOpt);
      }
    }

    // Populate Fields with fallback mapping for old schemas
    fieldId.value = record.id;
    fieldPart.value = record.partNo || '';
    fieldCoating.value = record.coating || '';
    fieldName.value = record.customerName || '';
    fieldPo.value = record.poNumber || '';

    // Fallback: receivingDate -> startDate
    fieldReceivingDate.value = record.receivingDate || record.startDate || '';

    // Map legacy priority values
    let priorityVal = record.priority || 'Medium';
    if (priorityVal === 'Rush' || priorityVal === 'High') priorityVal = 'High';
    else if (priorityVal === 'Priority' || priorityVal === 'Medium') priorityVal = 'Medium';
    else if (priorityVal === 'Standard' || priorityVal === 'Low') priorityVal = 'Low';
    fieldPriority.value = priorityVal;

    updatePriorityStyles();

    fieldDueDate.value = record.dueDate || '';
    fieldInstructions.value = record.instructions || '';

    // Middle initials, sandblast & additional info
    fieldReceivingInitial.value = record.receivingInitial || '';
    fieldShippingInitial.value = record.shippingInitial || '';

    // Map legacy sandblast values
    let sbValue = record.sandblast || '';
    if (sbValue.toUpperCase() === 'NONE') sbValue = 'none';
    else if (sbValue.toUpperCase() === 'FINE') sbValue = 'matte';
    else if (sbValue.toUpperCase() === 'ROUGH') sbValue = 'satin';
    fieldSandblast.value = sbValue;

    if (fieldBoxText) fieldBoxText.value = record.boxText || record.additionalInfo || '';
    if (fieldQcText) fieldQcText.value = record.qcText || '';

    // Load new elements
    if (fieldShipVia) fieldShipVia.value = record.shipVia || '';
    if (fieldDescription) fieldDescription.value = record.description || '';

    const shipDate = record.footerShippingDate || record.finishDate || '';
    if (fieldShippingDateTop) fieldShippingDateTop.value = shipDate;

    // Footer items
    fieldFooterRecDate.value = record.footerReceivingDate || record.receivingDate || record.startDate || '';
    fieldFooterRecInitial.value = record.footerReceivingInitial || record.receivingInitial || '';
    fieldFooterQcInitial.value = record.footerQcInitial || '';
    fieldFooterShipDate.value = shipDate;
    fieldFooterShipInitial.value = record.footerShippingInitial || record.shippingInitial || '';
    fieldForTcs.value = record.forTcs || '';

    // Parts & Quantities Table
    let partsData = record.parts;
    if (!Array.isArray(partsData)) {
      // Migrate old schema to parts table on-the-fly
      partsData = [
        { part: record.partNo || '', quantity: record.quantity || '', size: '' }
      ];
      // Pad to 3 rows
      while (partsData.length < 3) {
        partsData.push({ part: '', quantity: '', size: '' });
      }
    }
    setPartsTableData(partsData);

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
    return {
      id: fieldId.value,
      partNo: fieldPart.value.trim(),
      coating: fieldCoating.value,
      customerName: fieldName.value.trim(),
      poNumber: fieldPo.value.trim(),
      receivingDate: fieldReceivingDate.value,
      priority: fieldPriority.value,
      dueDate: fieldDueDate.value,
      instructions: fieldInstructions.value.trim(),
      receivingInitial: fieldReceivingInitial.value.trim(),
      shippingInitial: fieldShippingInitial.value.trim(),
      sandblast: fieldSandblast.value,
      boxText: fieldBoxText ? fieldBoxText.value.trim() : '',
      qcText: fieldQcText ? fieldQcText.value.trim() : '',
      footerReceivingDate: fieldFooterRecDate.value,
      footerReceivingInitial: fieldFooterRecInitial.value.trim(),
      footerQcInitial: fieldFooterQcInitial.value.trim(),
      footerShippingDate: fieldFooterShipDate.value,
      footerShippingInitial: fieldFooterShipInitial.value.trim(),
      forTcs: fieldForTcs.value.trim(),
      shipVia: fieldShipVia ? fieldShipVia.value : '',
      description: fieldDescription ? fieldDescription.value : '',
      parts: getPartsTableData(),
      // Backward compatibility fields
      startDate: fieldReceivingDate.value,
      finishDate: fieldFooterShipDate.value,
      quantity: getPartsTableData().reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)
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
        if (key === 'id') return false;
        if (key === 'priority' && currentForm[key] === '') return false;
        if (key === 'sandblast' && currentForm[key] === '') return false;
        if (key === 'shipVia' && currentForm[key] === '') return false;
        if (key === 'description' && currentForm[key] === '') return false;
        if (key === 'quantity') return false;
        if (key === 'startDate' || key === 'finishDate') return false;
        if (key === 'parts') {
          return currentForm.parts.some(p => p.part !== '' || p.quantity !== '' || p.size !== '');
        }
        return currentForm[key] !== '' && currentForm[key] !== null;
      });
      isDirty = hasAnyInput;
    } else {
      original = filteredOrders[currentIndex];

      // Compare values
      isDirty = Object.keys(currentForm).some(key => {
        if (key === 'quantity' || key === 'startDate' || key === 'finishDate') return false;
        if (key === 'parts') {
          const origParts = Array.isArray(original.parts) ? original.parts : [];
          for (let i = 0; i < 3; i++) {
            const curP = currentForm.parts[i] || { part: '', quantity: '', size: '' };
            const origP = origParts[i] || { part: '', quantity: '', size: '' };
            if ((curP.part || '') !== (origP.part || '') || (curP.quantity || '') !== (origP.quantity || '') || (curP.size || '') !== (origP.size || '')) {
              return true;
            }
          }
          return false;
        }
        return (currentForm[key] || '') !== (original[key] || '');
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

    // Clear dates to avoid default values showing in empty reports
    fieldReceivingDate.value = '';
    fieldFooterRecDate.value = '';
    fieldDueDate.value = '';

    // Reset controls
    navCurrentInput.value = '*';
    navFirst.disabled = true;
    navPrev.disabled = true;
    navNext.disabled = true;
    navLast.disabled = true;

    metaCreated.textContent = '--';
    metaModified.textContent = '--';

    document.querySelectorAll('.record-card').forEach(card => card.classList.remove('active'));

    fieldName.focus();
    isDirty = false;
    unsavedAlert.style.display = 'none';
    updateEmptyClasses();
    updatePriorityStyles();
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
    updatePriorityStyles();
  }

  // --- FILTERING & SEARCH CONTROLS ---

  function applySearchAndFilters(resetIndexToLatest = true) {
    const activeSearch = sidebarSearchInput.value.toLowerCase().trim();

    const priority = filterPriority.value;
    const statusFilter = filterStatus.value;

    // Filter main dataset
    filteredOrders = workOrders.filter(order => {
      // 1. Text Search (Matches ID, Customer Name, PO #, Coating, Part No, additional info, and parts list/size)
      let matchesSearch = true;
      if (activeSearch !== '') {
        const partsMatch = Array.isArray(order.parts) && order.parts.some(p =>
          (p.part && p.part.toLowerCase().includes(activeSearch)) ||
          (p.size && p.size.toLowerCase().includes(activeSearch))
        );
        matchesSearch = (
          (order.id && order.id.toLowerCase().includes(activeSearch)) ||
          (order.customerName && order.customerName.toLowerCase().includes(activeSearch)) ||
          (order.partNo && order.partNo.toLowerCase().includes(activeSearch)) ||
          (order.poNumber && order.poNumber.toLowerCase().includes(activeSearch)) ||
          (order.coating && order.coating.toLowerCase().includes(activeSearch)) ||
          (order.instructions && order.instructions.toLowerCase().includes(activeSearch)) ||
          (order.boxText && order.boxText.toLowerCase().includes(activeSearch)) ||
          (order.qcText && order.qcText.toLowerCase().includes(activeSearch)) ||
          partsMatch
        );
      }

      // 2. Priority Filter
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
      "Work Order ID", "Customer Name", "Priority", "Part No", "PO Number", "Due Date",
      "Coating", "Receiving Date", "Instructions", "Receiving Initial", "Shipping Initial",
      "Sandblast", "BOX", "QC", "Footer Receiving Date", "Footer Receiving Initial", "Footer QC Initial",
      "Footer Shipping Date", "Footer Shipping Initial", "For TCS Notes", "Parts List", "Ship Via", "Description"
    ];

    const csvRows = [csvHeaders.join(",")];

    workOrders.forEach(order => {
      const partsText = Array.isArray(order.parts) ?
        order.parts.filter(p => p.part || p.quantity || p.size).map(p => {
          let partInfo = p.part || 'Unnamed';
          let details = [];
          if (p.quantity !== undefined && p.quantity !== '') details.push(`Qty: ${p.quantity}`);
          if (p.size) details.push(`Size: ${p.size}`);
          return details.length > 0 ? `${partInfo} (${details.join(", ")})` : partInfo;
        }).join(" | ") : "";

      const values = [
        order.id || '',
        order.customerName || '',
        order.priority || '',
        order.partNo || '',
        order.poNumber || '',
        order.dueDate || '',
        order.coating || '',
        order.receivingDate || '',
        order.instructions || '',
        order.receivingInitial || '',
        order.shippingInitial || '',
        order.sandblast || '',
        order.boxText || '',
        order.qcText || '',
        order.footerReceivingDate || '',
        order.footerReceivingInitial || '',
        order.footerQcInitial || '',
        order.footerShippingDate || '',
        order.footerShippingInitial || '',
        order.forTcs || '',
        partsText,
        order.shipVia || '',
        order.description || ''
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
      "Batch Num": "batchNum", "Batch #": "batchNum", "batchNum": "batchNum",
      "Part No": "partNo", "Part #": "partNo", "partNo": "partNo",
      "Description": "description", "description": "description",
      "Coating": "coating", "coating": "coating",
      "Material": "material", "material": "material",
      "Start Date": "startDate", "startDate": "startDate",
      "Finish Date": "finishDate", "finishDate": "finishDate",
      "Quantity": "quantity", "quantity": "quantity",
      "UM": "um", "um": "um",
      "Customer Name": "customerName", "Name": "customerName", "customerName": "customerName",
      "PO Number": "poNumber", "PO #": "poNumber", "poNumber": "poNumber",
      "Sales Ord": "salesOrd", "Sales Order": "salesOrd", "salesOrd": "salesOrd",
      "Due Date": "dueDate", "dueDate": "dueDate",
      "Contact": "contact", "contact": "contact",
      "Priority": "priority", "priority": "priority",
      "Specs": "specs", "specs": "specs",
      "Instructions": "instructions", "instructions": "instructions",
      "Visual Assessment": "visual", "Visual": "visual", "visual": "visual",
      "Substrate Hardness": "hardness", "Hardness": "hardness", "hardness": "hardness",
      "Created Time": "createdTime", "createdTime": "createdTime",
      "Last Modified Time": "lastModifiedTime", "lastModifiedTime": "lastModifiedTime",
      "Receiving Date": "receivingDate", "receivingDate": "receivingDate",
      "Receiving Initial": "receivingInitial", "receivingInitial": "receivingInitial",
      "Shipping Initial": "shippingInitial", "shippingInitial": "shippingInitial",
      "Sandblast": "sandblast", "sandblast": "sandblast",
      "BOX(TEXT)": "boxText", "BOX": "boxText", "boxText": "boxText",
      "QC(TEXT)": "qcText", "QC": "qcText", "qcText": "qcText",
      "Footer Receiving Date": "footerReceivingDate", "footerReceivingDate": "footerReceivingDate",
      "Footer Receiving Initial": "footerReceivingInitial", "footerReceivingInitial": "footerReceivingInitial",
      "Footer QC Initial": "footerQcInitial", "footerQcInitial": "footerQcInitial",
      "Footer Shipping Date": "footerShippingDate", "footerShippingDate": "footerShippingDate",
      "Footer Shipping Initial": "footerShippingInitial", "footerShippingInitial": "footerShippingInitial",
      "For TCS Notes": "forTcs", "forTcs": "forTcs",
      "Parts List": "parts",
      "Ship Via": "shipVia", "shipVia": "shipVia",
      "Description": "description", "description": "description"
    };

    const records = [];
    for (let r = 1; r < lines.length; r++) {
      const rowData = lines[r];
      const record = {};

      headers.forEach((header, colIdx) => {
        const prop = propertyMapping[header] || header;
        let val = rowData[colIdx] || '';
        if (prop === 'quantity') {
          val = parseInt(val) || 0;
        }

        if (prop === 'parts') {
          const partsArray = [];
          if (val) {
            const items = val.split(' | ');
            items.forEach(item => {
              const qtyMatch = item.match(/Qty:\s*(\d+)/i);
              const sizeMatch = item.match(/Size:\s*([^,)]+)/i);
              let partName = item;
              let qty = '';
              let size = '';
              if (qtyMatch) {
                qty = parseInt(qtyMatch[1]) || '';
              }
              if (sizeMatch) {
                size = sizeMatch[1].trim();
              }
              partName = item.replace(/\s*\([^)]+\)/g, '').trim();
              if (partName || qty || size) {
                partsArray.push({ part: partName, quantity: qty, size: size });
              }
            });
          }
          // Pad to 3 rows
          while (partsArray.length < 3) {
            partsArray.push({ part: '', quantity: '', size: '' });
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
    // Date synchronization
    if (fieldShippingDateTop) {
      fieldShippingDateTop.addEventListener('input', (e) => {
        const val = e.target.value;
        if (fieldFooterShipDate) fieldFooterShipDate.value = val;
        checkDirtyState();
        updateEmptyClasses();
      });
      fieldShippingDateTop.addEventListener('change', (e) => {
        const val = e.target.value;
        if (fieldFooterShipDate) fieldFooterShipDate.value = val;
        checkDirtyState();
        updateEmptyClasses();
      });
    }

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
    const formFields = [
      fieldPart, fieldCoating, fieldName, fieldPo, fieldReceivingDate,
      fieldPriority, fieldDueDate, fieldInstructions,
      fieldReceivingInitial, fieldShippingInitial, fieldSandblast, fieldBoxText, fieldQcText,
      fieldFooterRecDate, fieldFooterRecInitial, fieldFooterQcInitial,
      fieldFooterShipDate, fieldFooterShipInitial, fieldForTcs,
      fieldShipVia, fieldDescription, fieldShippingDateTop
    ];

    // Add Parts Table inputs for change alert tracking
    for (let i = 0; i < 3; i++) {
      formFields.push(document.getElementById(`part-row-${i}`));
      formFields.push(document.getElementById(`qty-row-${i}`));
      formFields.push(document.getElementById(`size-row-${i}`));
    }

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
