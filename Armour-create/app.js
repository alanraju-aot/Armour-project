// Armor Coating Services - Work Order Report Manager Logic

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
  const fieldBatch = document.getElementById('field-batch');
  const fieldPart = document.getElementById('field-part');
  const fieldDescription = document.getElementById('field-description');
  const fieldCoating = document.getElementById('field-coating');
  const fieldMaterial = document.getElementById('field-material');
  const fieldStartDate = document.getElementById('field-start-date');
  const fieldFinishDate = document.getElementById('field-finish-date');
  const fieldQuantity = document.getElementById('field-quantity');
  const fieldUm = document.getElementById('field-um');
  const fieldName = document.getElementById('field-name');
  const fieldPo = document.getElementById('field-po');
  const fieldSalesOrd = document.getElementById('field-sales-ord');
  const fieldDueDate = document.getElementById('field-due-date');
  const fieldContact = document.getElementById('field-contact');
  const fieldPriority = document.getElementById('field-priority');
  const fieldSpecs = document.getElementById('field-specs');
  const fieldInstructions = document.getElementById('field-instructions');
  const fieldVisual = document.getElementById('field-visual');
  const fieldHardness = document.getElementById('field-hardness');
  const metaCreated = document.getElementById('meta-created');
  const metaModified = document.getElementById('meta-modified');

  // Top/Action Bar Buttons
  const btnPrint = document.getElementById('btn-print');
  const btnUndo = document.getElementById('btn-undo');
  const btnNew = document.getElementById('btn-new');
  const btnDelete = document.getElementById('btn-delete');
  const btnSave = document.getElementById('btn-save');
  const btnExit = document.getElementById('btn-exit');

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
    const storedData = localStorage.getItem('work_orders');
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
    if (record.finishDate && record.finishDate !== '') {
      return 'completed';
    }
    if (record.startDate && record.startDate !== '') {
      return 'in-progress';
    }
    return 'pending';
  }

  // Calculate & Refresh Stats Panel
  function updateStats() {
    statsTotal.textContent = workOrders.length;
    statsHigh.textContent = workOrders.filter(w => w.priority === 'High').length;
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

      const priorityClass = `badge-${order.priority ? order.priority.toLowerCase() : 'medium'}`;
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

    // Populate Fields
    fieldId.value = record.id;
    fieldBatch.value = record.batchNum || '';
    fieldPart.value = record.partNo || '';
    fieldDescription.value = record.description || '';
    fieldCoating.value = record.coating || '';
    fieldMaterial.value = record.material || '';
    fieldStartDate.value = record.startDate || '';
    fieldFinishDate.value = record.finishDate || '';
    fieldQuantity.value = record.quantity || '';
    fieldUm.value = record.um || 'PCS';
    fieldName.value = record.customerName || '';
    fieldPo.value = record.poNumber || '';
    fieldSalesOrd.value = record.salesOrd || '';
    fieldDueDate.value = record.dueDate || '';
    fieldContact.value = record.contact || '';
    fieldPriority.value = record.priority || 'Medium';
    fieldSpecs.value = record.specs || '';
    fieldInstructions.value = record.instructions || '';
    fieldVisual.value = record.visual || '';
    fieldHardness.value = record.hardness || '';

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
      batchNum: fieldBatch.value.trim(),
      partNo: fieldPart.value.trim(),
      description: fieldDescription.value.trim(),
      coating: fieldCoating.value.trim(),
      material: fieldMaterial.value.trim(),
      startDate: fieldStartDate.value,
      finishDate: fieldFinishDate.value,
      quantity: parseInt(fieldQuantity.value) || 0,
      um: fieldUm.value,
      customerName: fieldName.value.trim(),
      poNumber: fieldPo.value.trim(),
      salesOrd: fieldSalesOrd.value.trim(),
      dueDate: fieldDueDate.value,
      contact: fieldContact.value.trim(),
      priority: fieldPriority.value,
      specs: fieldSpecs.value.trim(),
      instructions: fieldInstructions.value.trim(),
      visual: fieldVisual.value.trim(),
      hardness: fieldHardness.value.trim()
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
        if (key === 'priority' && currentForm[key] === 'Medium') return false;
        if (key === 'um' && currentForm[key] === 'PCS') return false;
        if (key === 'quantity' && currentForm[key] === 0) return false;
        return currentForm[key] !== '' && currentForm[key] !== null;
      });
      isDirty = hasAnyInput;
    } else {
      original = filteredOrders[currentIndex];
      
      // Compare values
      isDirty = Object.keys(currentForm).some(key => {
        // Quantities comparison
        if (key === 'quantity') {
          return (currentForm[key] || 0) !== (original[key] || 0);
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

  // Create a new empty Work Order form
  function newRecord() {
    if (!confirmNavigation()) return;

    currentIndex = null;
    welcomeOverlay.style.display = 'none';

    // Clear and preset defaults
    workOrderForm.reset();
    fieldId.value = 'NEW';
    
    // Set dates default
    const today = new Date().toISOString().split('T')[0];
    fieldStartDate.value = today;
    
    // Default due date: 7 days in future
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    fieldDueDate.value = nextWeek.toISOString().split('T')[0];

    // Reset controls
    navCurrentInput.value = '*';
    navFirst.disabled = true;
    navPrev.disabled = true;
    navNext.disabled = true;
    navLast.disabled = true;

    metaCreated.textContent = '--';
    metaModified.textContent = '--';

    document.querySelectorAll('.record-card').forEach(card => card.classList.remove('active'));

    fieldBatch.focus();
    isDirty = false;
    unsavedAlert.style.display = 'none';
  }

  // Revert form state back to original record values
  function undoChanges() {
    if (fieldId.value === 'NEW') {
      newRecord();
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
    if (fieldId.value === 'NEW') {
      newRecord();
      showToast("Cleared new blank form.", "info");
      return;
    }

    if (currentIndex === null) return;
    const currentId = filteredOrders[currentIndex].id;

    if (confirm(`Are you sure you want to delete Work Order #${currentId}?`)) {
      // Remove from main DB
      workOrders = workOrders.filter(w => w.id !== currentId);
      saveDatabaseState();
      showToast(`Work Order #${currentId} deleted.`, "warning");

      updateStats();
      applySearchAndFilters();

      // Load next available record, or clear
      if (filteredOrders.length > 0) {
        const nextIdx = Math.min(currentIndex, filteredOrders.length - 1);
        loadRecord(nextIdx);
      } else {
        showWelcomeOverlay();
      }
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
  }

  // --- FILTERING & SEARCH CONTROLS ---

  function applySearchAndFilters(resetIndexToLatest = true) {
    const searchText = sidebarSearchInput.value.toLowerCase().trim();
    const bottomSearchText = navSearchInput.value.toLowerCase().trim();
    const activeSearch = bottomSearchText !== '' ? bottomSearchText : searchText;
    
    const priority = filterPriority.value;
    const statusFilter = filterStatus.value;

    // Filter main dataset
    filteredOrders = workOrders.filter(order => {
      // 1. Text Search (Matches ID, Customer Name, Batch #, PO #, Description, Part #, Coating)
      let matchesSearch = true;
      if (activeSearch !== '') {
        matchesSearch = (
          (order.id && order.id.toLowerCase().includes(activeSearch)) ||
          (order.customerName && order.customerName.toLowerCase().includes(activeSearch)) ||
          (order.batchNum && order.batchNum.toLowerCase().includes(activeSearch)) ||
          (order.partNo && order.partNo.toLowerCase().includes(activeSearch)) ||
          (order.poNumber && order.poNumber.toLowerCase().includes(activeSearch)) ||
          (order.description && order.description.toLowerCase().includes(activeSearch)) ||
          (order.coating && order.coating.toLowerCase().includes(activeSearch)) ||
          (order.material && order.material.toLowerCase().includes(activeSearch))
        );
      }

      // 2. Priority Filter
      let matchesPriority = true;
      if (priority !== '') {
        matchesPriority = order.priority === priority;
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
    const isFiltered = searchText !== '' || bottomSearchText !== '' || priority !== '' || statusFilter !== '';
    if (isFiltered) {
      navFilterIndicator.classList.add('active-filter');
      navFilterText.textContent = "Filtered";
    } else {
      navFilterIndicator.classList.remove('active-filter');
      navFilterText.textContent = "Unfiltered";
    }

    // Sync input displays
    if (bottomSearchText !== searchText) {
      if (bottomSearchText !== '') {
        sidebarSearchInput.value = bottomSearchText;
      } else {
        navSearchInput.value = searchText;
      }
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  // Trigger Print Dialog
  function printReport() {
    if (isDirty) {
      showToast("Please save changes before printing.", "warning");
      return;
    }
    window.print();
  }

  // Export Database to CSV file
  function exportToCsv() {
    const csvHeaders = [
      "Work Order ID", "Batch Num", "Part No", "Description", "Coating", "Material",
      "Start Date", "Finish Date", "Quantity", "UM", "Customer Name", "PO Number",
      "Sales Ord", "Due Date", "Contact", "Priority", "Specs", "Instructions",
      "Visual Assessment", "Substrate Hardness", "Created Time", "Last Modified Time"
    ];

    const csvRows = [csvHeaders.join(",")];

    workOrders.forEach(order => {
      const values = [
        order.id || '',
        order.batchNum || '',
        order.partNo || '',
        order.description || '',
        order.coating || '',
        order.material || '',
        order.startDate || '',
        order.finishDate || '',
        order.quantity || 0,
        order.um || 'PCS',
        order.customerName || '',
        order.poNumber || '',
        order.salesOrd || '',
        order.dueDate || '',
        order.contact || '',
        order.priority || 'Medium',
        order.specs || '',
        order.instructions || '',
        order.visual || '',
        order.hardness || '',
        order.createdTime || '',
        order.lastModifiedTime || ''
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

    reader.onload = function(evt) {
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
      "Last Modified Time": "lastModifiedTime", "lastModifiedTime": "lastModifiedTime"
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
        record[prop] = val;
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
    sidebarSearchInput.addEventListener('input', () => applySearchAndFilters(true));
    filterPriority.addEventListener('change', () => applySearchAndFilters(true));
    filterStatus.addEventListener('change', () => applySearchAndFilters(true));

    // Bottom Navigation Search input
    navSearchInput.addEventListener('input', () => applySearchAndFilters(true));

    // Form buttons
    btnPrint.addEventListener('click', printReport);
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
      fieldBatch, fieldPart, fieldDescription, fieldCoating, fieldMaterial,
      fieldStartDate, fieldFinishDate, fieldQuantity, fieldUm, fieldName,
      fieldPo, fieldSalesOrd, fieldDueDate, fieldContact, fieldPriority,
      fieldSpecs, fieldInstructions, fieldVisual, fieldHardness
    ];

    formFields.forEach(field => {
      field.addEventListener('input', checkDirtyState);
      field.addEventListener('change', checkDirtyState);
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
