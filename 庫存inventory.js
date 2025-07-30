// 工具函式
function uuid(prefix) {
  return prefix + new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0,14);
}
function loadStorage(key) { return JSON.parse(localStorage.getItem(key) || '[]'); }
function saveStorage(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

// 切換頁面
function showSection(name) {
  document.querySelectorAll('section').forEach(s => s.style.display = 'none');
  document.getElementById(name + 'Section').style.display = 'block';
}

// 產品管理
const productForm = document.getElementById('productForm');
let editingProductIndex = null;
productForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('productName').value.trim();
  let products = loadStorage('products');
  if (editingProductIndex === null) {
    products.push({ id: uuid('PR'), name });
  } else {
    products[editingProductIndex].name = name;
  }
  saveStorage('products', products);
  clearProductForm();
  loadProducts();
  loadSelectors();
});
function clearProductForm() {
  editingProductIndex = null;
  productForm.reset();
  document.getElementById('productSubmitBtn').textContent = '新增產品';
}
function loadProducts() {
  const tbody = document.querySelector('#productTable tbody'); tbody.innerHTML = '';
  const products = loadStorage('products');
  products.forEach((p, i) => {
    const tr = tbody.insertRow();
    const stock = computeInventory(p.id);
    tr.innerHTML = `<td>${i+1}</td><td>${p.name}</td><td>${stock}</td><td>` +
      `<button class="action-btn" onclick="startEditProduct(${i})">編輯</button>` +
      `<button class="action-btn" onclick="deleteProduct(${i})">刪除</button>` +
      `</td>`;
  });
}
function startEditProduct(i) {
  const products = loadStorage('products');
  editingProductIndex = i;
  document.getElementById('productName').value = products[i].name;
  document.getElementById('productSubmitBtn').textContent = '更新產品';
}
function deleteProduct(i) {
  if (!confirm('確定刪除產品？')) return;
  let products = loadStorage('products'); products.splice(i, 1);
  saveStorage('products', products);
  loadProducts();
  loadSelectors();
}

// 更新下拉
function loadSelectors() {
  const products = loadStorage('products');
  const pSel = document.getElementById('purchaseProduct');
  const sSel = document.getElementById('saleProduct');
  [pSel, sSel].forEach(sel => {
    sel.innerHTML = '<option value="">--請選擇產品--</option>';
    products.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
  });
}

// 庫存計算
function computeInventory(productId) {
  const inQty = loadStorage('purchases')
    .filter(p => p.productId === productId)
    .reduce((a, b) => a + Number(b.qty), 0);
  const outQty = loadStorage('sales')
    .filter(s => s.productId === productId)
    .reduce((a, b) => a + Number(b.qty), 0);
  return inQty - outQty;
}

// 進貨單 - CRUD
function loadPurchases() {
  const tbody = document.querySelector('#purchaseTable tbody'); tbody.innerHTML = '';
  const purchases = loadStorage('purchases');
  const products = loadStorage('products');
  purchases.forEach((p, i) => {
    const tr = tbody.insertRow();
    if (p.editing) {
      // 編輯模式
      let options = '<option value="">--請選擇--</option>';
      products.forEach(prod => {
        const sel = prod.id === p.productId ? 'selected' : '';
        options += `<option value="${prod.id}" ${sel}>${prod.name}</option>`;
      });
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${p.date}</td>
        <td><select id="pu_product_${i}">${options}</select></td>
        <td><input id="pu_qty_${i}" type="number" value="${p.qty}"></td>
        <td><input id="pu_loc_${i}" value="${p.location}"></td>
        <td><input id="pu_edt_${i}" value="${p.editor}"></td>
        <td>
          <button class="action-btn" onclick="savePurchase(${i})">儲存</button>
          <button class="action-btn" onclick="cancelEditPurchase(${i})">取消</button>
        </td>`;
    } else {
      // 顯示模式
      const name = (products.find(x => x.id === p.productId) || {}).name || '--';
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${p.date}</td>
        <td>${name}</td>
        <td>${p.qty}</td>
        <td>${p.location}</td>
        <td>${p.editor}</td>
        <td>
          <button class="action-btn" onclick="enterEditPurchase(${i})">修改</button>
          <button class="action-btn" onclick="deletePurchase(${i})">刪除</button>
        </td>`;
    }
  });
}
document.getElementById('purchaseForm').addEventListener('submit', e => {
  e.preventDefault();
  const pid = document.getElementById('purchaseProduct').value;
  const qty = document.getElementById('purchaseQty').value;
  const loc = document.getElementById('purchaseLocation').value;
  const edt = document.getElementById('purchaseEditor').value;
  if (!pid) { alert('請選擇產品'); return; }
  const purchases = loadStorage('purchases');
  purchases.push({ id: uuid('P'), date: new Date().toLocaleString(), productId: pid, qty, location: loc, editor: edt });
  saveStorage('purchases', purchases);
  e.target.reset();
  loadPurchases();
  loadProducts();
});
function enterEditPurchase(i) {
  const purchases = loadStorage('purchases');
  purchases[i].editing = true;
  saveStorage('purchases', purchases);
  loadPurchases();
}
function cancelEditPurchase(i) {
  const purchases = loadStorage('purchases');
  delete purchases[i].editing;
  saveStorage('purchases', purchases);
  loadPurchases();
}
function savePurchase(i) {
  const purchases = loadStorage('purchases');
  const p = purchases[i];
  const pid = document.getElementById(`pu_product_${i}`).value;
  const qty = document.getElementById(`pu_qty_${i}`).value;
  const loc = document.getElementById(`pu_loc_${i}`).value;
  const edt = document.getElementById(`pu_edt_${i}`).value;
  p.productId = pid;
  p.qty = qty;
  p.location = loc;
  p.editor = edt;
  delete p.editing;
  saveStorage('purchases', purchases);
  loadPurchases();
  loadProducts();
}

// 銷貨單 - CRUD
function loadSales() {
  const tbody = document.querySelector('#saleTable tbody'); tbody.innerHTML = '';
  const sales = loadStorage('sales');
  const products = loadStorage('products');
  sales.forEach((s, i) => {
    const tr = tbody.insertRow();
    if (s.editing) {
      // 編輯模式
      let options = '<option value="">--請選擇--</option>';
      products.forEach(prod => {
        const sel = prod.id === s.productId ? 'selected' : '';
        options += `<option value="${prod.id}" ${sel}>${prod.name}</option>`;
      });
      tr.innerHTML = `
        <td>${s.id}</td>
        <td>${s.date}</td>
        <td><select id="sa_product_${i}">${options}</select></td>
        <td><input id="sa_qty_${i}" type="number" value="${s.qty}"></td>
        <td>
          <button class="action-btn" onclick="saveSale(${i})">儲存</button>
          <button class="action-btn" onclick="cancelEditSale(${i})">取消</button>
        </td>`;
    } else {
      // 顯示模式
      const name = (products.find(x => x.id === s.productId) || {}).name || '--';
      tr.innerHTML = `
        <td>${s.id}</td>
        <td>${s.date}</td>
        <td>${name}</td>
        <td>${s.qty}</td>
        <td>
          <button class="action-btn" onclick="enterEditSale(${i})">修改</button>
          <button class="action-btn" onclick="deleteSale(${i})">刪除</button>
        </td>`;
    }
  });
}
document.getElementById('saleForm').addEventListener('submit', e => {
  e.preventDefault();
  const pid = document.getElementById('saleProduct').value;
  const qtyVal = Number(document.getElementById('saleQty').value);
  if (!pid) { alert('請選擇產品'); return; }
  const available = computeInventory(pid);
  if (qtyVal > available) { alert(`庫存不足：${available}`); return; }
  const sales = loadStorage('sales');
  sales.push({ id: uuid('S'), date: new Date().toLocaleString(), productId: pid, qty: qtyVal });
  saveStorage('sales', sales);
  e.target.reset();
  loadSales();
  loadProducts();
});
function enterEditSale(i) {
  const sales = loadStorage('sales');
  sales[i].editing = true;
  saveStorage('sales', sales);
  loadSales();
}
function cancelEditSale(i) {
  const sales = loadStorage('sales');
  delete sales[i].editing;
  saveStorage('sales', sales);
  loadSales();
}
function saveSale(i) {
  const sales = loadStorage('sales');
  const s = sales[i];
  const pid = document.getElementById(`sa_product_${i}`).value;
  const qtyVal = Number(document.getElementById(`sa_qty_${i}`).value);
  const originalQty = Number(s.qty);
  const available = computeInventory(pid) + originalQty;
  if (qtyVal > available) { alert(`庫存不足：${available}`); return; }
  s.productId = pid;
  s.qty = qtyVal;
  delete s.editing;
  saveStorage('sales', sales);
  loadSales();
  loadProducts();
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  showSection('products'); loadProducts(); loadSelectors(); loadPurchases(); loadSales();
});
