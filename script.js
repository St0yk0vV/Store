// Складови наличности — чист JS, без CSS, 1 файл
(function () {
  var STORAGE_KEY = 'carehome_inventory_simple_v1';

  function loadItems() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) || []; } catch (e) { return []; }
  }
  function saveItems(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  function uid() { return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }

  var state = { items: loadItems(), filters: { q: '', category: '' } };

  var el = {
    searchInput: document.getElementById('searchInput'),
    filterCategory: document.getElementById('filterCategory'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),

    form: document.getElementById('itemForm'),
    itemId: document.getElementById('itemId'),
    name: document.getElementById('name'),
    category: document.getElementById('category'),
    quantity: document.getElementById('quantity'),
    dateIn: document.getElementById('dateIn'),
    dateOut: document.getElementById('dateOut'),
    notes: document.getElementById('notes'),
    resetBtn: document.getElementById('resetBtn'),

    exportCsvBtn: document.getElementById('exportCsvBtn'),
    exportJsonBtn: document.getElementById('exportJsonBtn'),
    importJsonInput: document.getElementById('importJsonInput'),

    tableBody: document.querySelector('#itemsTable tbody')
  };

  function clearForm() {
    el.itemId.value = '';
    el.name.value = '';
    el.category.value = '';
    el.quantity.value = '';
    el.dateIn.value = '';
    el.dateOut.value = '';
    el.notes.value = '';
  }

  function formToItem() {
    return {
      id: el.itemId.value || uid(),
      name: el.name.value.trim(),
      category: el.category.value,
      quantity: el.quantity.value.trim(),
      dateIn: el.dateIn.value || '',
      dateOut: el.dateOut.value || '',
      notes: el.notes.value.trim()
    };
  }

  function validateItem(item) {
    if (!item.name) { alert('Моля, въведете име на артикул.'); return false; }
    if (!item.category) { alert('Моля, изберете категория.'); return false; }
    return true;
  }

  function upsertItem(item) {
    var idx = state.items.findIndex(function (x) { return x.id === item.id; });
    if (idx === -1) state.items.push(item); else state.items[idx] = item;
    saveItems(state.items); render(); clearForm();
  }

  function deleteItem(id) {
    if (!confirm('Да се изтрие ли записът?')) return;
    state.items = state.items.filter(function (x) { return x.id !== id; });
    saveItems(state.items); render();
  }

  function editItem(id) {
    var it = state.items.find(function (x) { return x.id === id; });
    if (!it) return;
    el.itemId.value = it.id;
    el.name.value = it.name;
    el.category.value = it.category;
    el.quantity.value = it.quantity;
    el.dateIn.value = it.dateIn;
    el.dateOut.value = it.dateOut;
    el.notes.value = it.notes;
    window.scrollTo(0, 0);
  }

  function applyFilters(items) {
    var q = state.filters.q.toLowerCase();
    var cat = state.filters.category;
    return items.filter(function (x) {
      var okQ = !q || (x.name && x.name.toLowerCase().indexOf(q) !== -1);
      var okC = !cat || x.category === cat;
      return okQ && okC;
    });
  }

  function render() {
    var filtered = applyFilters(state.items);
    el.tableBody.innerHTML = '';
    filtered.forEach(function (it, i) {
      var tr = document.createElement('tr');
      function td(text) { var d = document.createElement('td'); d.textContent = text || ''; return d; }
      tr.appendChild(td(String(i + 1)));
      tr.appendChild(td(it.name));
      tr.appendChild(td(it.category));
      tr.appendChild(td(it.quantity));
      tr.appendChild(td(it.dateIn));
      tr.appendChild(td(it.dateOut));
      tr.appendChild(td(it.notes));

      var actions = document.createElement('td');
      var bEdit = document.createElement('button'); bEdit.textContent = 'Редакция'; bEdit.onclick = function () { editItem(it.id); };
      var bDel = document.createElement('button'); bDel.textContent = 'Изтриване'; bDel.onclick = function () { deleteItem(it.id); };
      actions.appendChild(bEdit); actions.appendChild(document.createTextNode(' ')); actions.appendChild(bDel);
      tr.appendChild(actions);

      el.tableBody.appendChild(tr);
    });
  }

  // --- Експорт/Импорт ---
  function toCsv(items) {
    var headers = ['Име на артикул', 'Категория', 'Количество', 'Дата на въвеждане', 'Дата на отписване', 'Бележки'];
    function esc(v) { if (v == null) v = ''; v = String(v).replace(/"/g, '""'); return /[",\n;]/.test(v) ? '"' + v + '"' : v; }
    var rows = items.map(function (it) { return [it.name, it.category, it.quantity, it.dateIn, it.dateOut, it.notes].map(esc).join(';'); });
    return [headers.join(';')].concat(rows).join('\n'); // ; за Excel в BG/EU
  }
  function download(filename, mime, content) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }

  // Събития
  el.form.addEventListener('submit', function (ev) { ev.preventDefault(); var item = formToItem(); if (!validateItem(item)) return; upsertItem(item); });
  el.resetBtn.addEventListener('click', function () { clearForm(); });
  el.searchInput.addEventListener('input', function () { state.filters.q = el.searchInput.value || ''; render(); });
  el.filterCategory.addEventListener('change', function () { state.filters.category = el.filterCategory.value || ''; render(); });
  el.clearFiltersBtn.addEventListener('click', function () { el.searchInput.value=''; el.filterCategory.value=''; state.filters.q=''; state.filters.category=''; render(); });

  el.exportCsvBtn.addEventListener('click', function () {
    var filtered = applyFilters(state.items);
    var csv = toCsv(filtered);
    var today = new Date().toISOString().slice(0, 10);
    download('inventory_' + today + '.csv', 'text/csv;charset=utf-8', csv);
  });

  el.exportJsonBtn.addEventListener('click', function () {
    var json = JSON.stringify(state.items, null, 2);
    var today = new Date().toISOString().slice(0, 10);
    download('inventory_backup_' + today + '.json', 'application/json', json);
  });

  el.importJsonInput.addEventListener('change', function () {
    var file = el.importJsonInput.files && el.importJsonInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result || '[]'));
        if (!Array.isArray(data)) throw new Error('Невалиден формат');
        state.items = data; saveItems(state.items); render();
        alert('Импортът приключи успешно.');
      } catch (e) { alert('Грешка при импорт: ' + e.message); }
    };
    reader.readAsText(file, 'utf-8'); el.importJsonInput.value = '';
  });

  // Старт
  render();
})();
