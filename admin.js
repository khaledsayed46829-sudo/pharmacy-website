;(function(){
'use strict';
var E = window.Elixir || {};
/* =========================================================
   ELIXIR PHARMACY — Admin panel
   Shares localStorage keys with app.js
   ========================================================= */

function $(id){ return document.getElementById(id); }
function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function pillHtml(status,label){ return '<span class="status-pill ' + status + '">' + esc(label) + '</span>'; }
function formatDate(ts){ try{ return new Date(ts||Date.now()).toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'}); }catch(e){ return ''; } }
function formatTime(ts){ try{ return new Date(ts||Date.now()).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } }
function getJSON(key, def){ try{ var r = localStorage.getItem(key); return r ? JSON.parse(r) : def; }catch(e){ return def; } }
function setJSON(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
function syncEvent(){ try{ window.dispatchEvent(new CustomEvent('elixir:sync')); }catch(e){} }
function toast(msg){
  var t = $('toast');
  if(t){ t.textContent = msg; t.classList.add('show'); clearTimeout(t.__tm); t.__tm = setTimeout(function(){ t.classList.remove('show'); }, 2800); }
  else if(E.showToast) E.showToast(msg);
}
function logActivity(action){
  var log = getJSON('site:activity', []);
  log.unshift({ts: Date.now(), time: formatTime(), date: formatDate(), action: action});
  setJSON('site:activity', log.slice(0, 200));
}
function confirmModal(title, desc, cb){ if(E.openPrompt) E.openPrompt({title:title, desc:desc, confirmOnly:true, okText:'تأكيد'}, function(){ cb && cb(); }); else if(window.confirm(desc)) cb(); }
function promptModal(opts, cb){ if(E.openPrompt) E.openPrompt(opts, cb); else { var v = window.prompt(opts.label||'', opts.value||''); if(v!==null) cb(v); } }

var DEFAULT_ADMIN_CREDS = {email:'admin@elixir.com', password:'Elixir@2026'};
var ORDER_STATUS = [['processing','قيد التجهيز'],['transit','في الطريق'],['done','تم التسليم'],['rejected','ملغي']];
var adminCreds = null, products = [], productEditId = null, pfImageData = null;

function loadAdminCreds(){
  adminCreds = getJSON('site:admin-creds', null);
  if(!adminCreds){ adminCreds = {email:DEFAULT_ADMIN_CREDS.email, password:DEFAULT_ADMIN_CREDS.password}; setJSON('site:admin-creds', adminCreds); }
}
function loadProducts(){ products = getJSON('site:products', []); }
function persistProducts(){ setJSON('site:products', products); }
function getOrders(){ return getJSON('site:orders', []); }
function getCustomers(){ return getJSON('site:customers', []); }
function getRx(){ return getJSON('site:rx', []); }
function getCategories(){ return getJSON('site:categories', []); }
function catLabelOf(cat){ var m = getCategories().filter(function(c){ return c.value===cat; })[0]; return m ? m.label : cat; }

/* ---------- open / close ---------- */
window.AdminApp = {
  open: function(){
    document.body.classList.remove('dash-active');
    document.body.classList.add('admin-active');
    $('siteView').style.display = 'none';
    $('dashboardView').style.display = 'none';
    $('adminView').style.display = 'block';
    window.scrollTo(0,0);
    switchPanel('overview');
  },
  close: function(){
    document.body.classList.remove('admin-active');
    $('adminView').style.display = 'none';
    $('siteView').style.display = 'block';
    window.scrollTo(0,0);
  },
  refresh: function(){
    var active = qsa('.dash-panel').filter(function(p){ return p.classList.contains('active'); })[0];
    if(!active) return;
    var panel = active.id.replace('adm-panel-','');
    if(panel==='overview') renderOverview();
    else if(panel==='products') renderProducts();
    else if(panel==='categories') renderCategories();
    else if(panel==='orders') renderOrders();
    else if(panel==='rx') renderRx();
    else if(panel==='customers') renderCustomers();
    else if(panel==='coupons') renderCoupons();
    else if(panel==='activity') renderActivity();
  }
};
$('logoutBtn').addEventListener('click', function(){
  window.AdminApp.close();
  if(window.AdminUI && window.AdminUI.clearAdmin) window.AdminUI.clearAdmin();
  try{ localStorage.removeItem('session:admin-active'); }catch(e){}
  toast('تم تسجيل الخروج من لوحة الإدارة');
});
$('backToStoreFromAdminBtn').addEventListener('click', function(){ window.AdminApp.close(); });

/* ---------- panels ---------- */
var panelTitles = {overview:'نظرة عامة', products:'المنتجات', categories:'الأقسام', orders:'الطلبات', rx:'الروشتات', customers:'العملاء', coupons:'الكوبونات', activity:'سجل النشاط', settings:'إعدادات الإدارة'};
function switchPanel(panel){
  qsa('#nav button').forEach(function(b){ b.classList.toggle('active', b.dataset.panel===panel); });
  qsa('.dash-panel').forEach(function(p){ p.classList.toggle('active', p.id==='adm-panel-'+panel); });
  $('panelTitle').textContent = panelTitles[panel] || 'لوحة الإدارة';
  $('sidebar').classList.remove('open');
  if(panel==='overview') renderOverview();
  if(panel==='products') renderProducts();
  if(panel==='categories') renderCategories();
  if(panel==='orders') renderOrders();
  if(panel==='rx') renderRx();
  if(panel==='customers') renderCustomers();
  if(panel==='coupons') renderCoupons();
  if(panel==='activity') renderActivity();
  if(panel==='settings') renderSettings();
}
$('nav').addEventListener('click', function(e){
  var btn = e.target.closest('button'); if(!btn) return;
  switchPanel(btn.dataset.panel);
});
$('menuBtn').addEventListener('click', function(){ $('sidebar').classList.toggle('open'); });

/* ---------- overview + charts ---------- */
var salesChart = null, topChart = null;
function renderOverview(){
  loadProducts();
  var orders = getOrders(), customers = getCustomers(), rx = getRx();
  $('statProducts').textContent = products.length;
  $('admStatOrders').textContent = orders.length;
  $('statCustomers').textContent = customers.length;
  var revenue = orders.reduce(function(s,o){ return s + (o.total||0); }, 0);
  $('statRevenue').textContent = revenue + ' ج.م';
  var pendingRx = rx.filter(function(r){ return r.status==='transit'; }).length;
  $('rxBadge').style.display = pendingRx ? 'flex' : 'none';
  $('rxBadge').textContent = pendingRx;

  var tbody = $('admOverviewOrders');
  tbody.innerHTML = orders.length===0
    ? '<tr><td colspan="5" style="color:var(--muted); padding:18px 0;">لا توجد طلبات بعد</td></tr>'
    : orders.slice(0,6).map(function(o){
        return '<tr><td>#' + esc(o.id) + '</td><td>' + esc(o.customerName||'—') + '</td><td>' + esc(o.date) + '</td><td>' + o.total + ' ج.م</td><td>' + pillHtml(o.status, o.statusLabel) + '</td></tr>';
      }).join('');

  if(typeof Chart === 'undefined') return;
  /* sales last 6 months */
  var months = [], sums = [];
  for(var i=5;i>=0;i--){
    var d = new Date(); d.setMonth(d.getMonth()-i);
    var key = d.getFullYear() + '-' + d.getMonth();
    months.push(d.toLocaleDateString('ar-EG', {month:'long'}));
    sums.push(orders.filter(function(o){
      var od = new Date(o.ts||0);
      return (od.getFullYear() + '-' + od.getMonth()) === key;
    }).reduce(function(s,o){ return s + (o.total||0); }, 0));
  }
  if(salesChart) salesChart.destroy();
  salesChart = new Chart($('salesChart'), { type:'bar',
    data:{ labels:months, datasets:[{ data:sums, backgroundColor:'#c9861f', borderRadius:8, maxBarThickness:38 }] },
    options:{ plugins:{legend:{display:false}}, maintainAspectRatio:false, scales:{y:{beginAtZero:true}} } });

  /* top products by sold */
  var top = products.slice().sort(function(a,b){ return (b.sold||0)-(a.sold||0); }).slice(0,5);
  if(topChart) topChart.destroy();
  topChart = new Chart($('topChart'), { type:'doughnut',
    data:{ labels:top.map(function(p){ return p.name; }), datasets:[{ data:top.map(function(p){ return p.sold||0; }), backgroundColor:['#c9861f','#173f31','#ad8a4f','#2c6b55','#e6cf9b'], borderWidth:2, borderColor:'#fff' }] },
    options:{ maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{boxWidth:12, font:{size:11}}}} } });
}

/* ---------- CSV export ---------- */
function exportCSV(filename, rows){
  if(!rows.length){ toast('لا توجد بيانات للتصدير'); return; }
  var headers = Object.keys(rows[0]);
  var csv = '\ufeff' + headers.join(',') + '\n' + rows.map(function(r){
    return headers.map(function(h){ var v = String(r[h]==null?'':r[h]).replace(/"/g,'""'); return '"' + v + '"'; }).join(',');
  }).join('\n');
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  toast('تم تصدير الملف بنجاح');
  logActivity('تصدير تقرير ' + filename);
}
function exportOrders(){ 
  exportCSV('elixir-orders.csv', getOrders().map(function(o){
    return {'رقم الطلب':o.id, 'العميل':o.customerName, 'التاريخ':o.date, 'العنوان':o.address, 'الدفع':o.payment, 'الإجمالي':o.total, 'الحالة':o.statusLabel};
  }));
}
$('exportOrdersBtn').addEventListener('click', exportOrders);
$('exportOrdersBtn2').addEventListener('click', exportOrders);
$('exportCustomersBtn').addEventListener('click', function(){
  exportCSV('elixir-customers.csv', getCustomers().map(function(c){
    return {'الاسم':c.name, 'البريد':c.email, 'الهاتف':c.phone, 'تاريخ التسجيل':c.joined, 'الحالة':c.blocked?'محظور':'نشط'};
  }));
});

/* ---------- products ---------- */
var productFilterCat = 'all', productSearchTerm = '';
function stockBadge(p){
  if((p.stock||0)<=0) return '<span class="status-pill rejected">نفد</span>';
  if(p.stock<=5) return '<span class="status-pill transit">منخفض (' + p.stock + ')</span>';
  return '<span class="status-pill done">' + p.stock + '</span>';
}
function renderProducts(){
  var sel = $('productCatFilter');
  var cats = getCategories();
  if(sel.options.length !== cats.length + 1){
    sel.innerHTML = '<option value="all">كل الأقسام</option>' + cats.map(function(c){ return '<option value="' + c.value + '">' + esc(c.label) + '</option>'; }).join('');
  }
  var list = products.filter(function(p){
    var actives = (Array.isArray(p.active) ? p.active : String(p.active||'').split(',')).join(' ');
    var matchCat = productFilterCat==='all' || p.cat===productFilterCat;
    var matchTerm = !productSearchTerm || (p.name + ' ' + actives).toLowerCase().indexOf(productSearchTerm) > -1;
    return matchCat && matchTerm;
  });
  var tbody = $('productsTable');
  tbody.innerHTML = list.length===0
    ? '<tr><td colspan="6" style="color:var(--muted); padding:18px 0;">لا توجد منتجات مطابقة</td></tr>'
    : list.map(function(p){
        return '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.catLabel) + '</td>' +
          '<td>' + p.price + ' ج.م' + (p.old ? ' <span style="color:var(--muted); text-decoration:line-through; font-size:11.5px;">' + p.old + '</span>' : '') + '</td>' +
          '<td>' + stockBadge(p) + '</td>' +
          '<td>' + (p.badge ? esc(p.badge) : '—') + '</td>' +
          '<td class="admin-row-actions">' +
            '<button data-paction="edit" data-id="' + p.id + '">تعديل</button>' +
            '<button class="danger" data-paction="delete" data-id="' + p.id + '">حذف</button>' +
          '</td></tr>';
      }).join('');
}
$('productSearch').addEventListener('input', function(e){ productSearchTerm = e.target.value.trim().toLowerCase(); renderProducts(); });
$('productCatFilter').addEventListener('change', function(e){ productFilterCat = e.target.value; renderProducts(); });

var productModalOverlay = $('adminProductModal');
function fillCatSelect(){
  var sel = $('pfCat');
  sel.innerHTML = getCategories().map(function(c){ return '<option value="' + c.value + '">' + esc(c.label) + '</option>'; }).join('');
}
function openProductModal(id){
  fillCatSelect();
  productEditId = id || null;
  pfImageData = null;
  $('pfImagePreview').style.display = 'none';
  if(id){
    var p = products.filter(function(x){ return x.id===id; })[0]; if(!p) return;
    $('productModalTitle').textContent = 'تعديل المنتج';
    $('pfName').value = p.name;
    $('pfActive').value = (Array.isArray(p.active) ? p.active.join(', ') : p.active || '');
    $('pfCat').value = p.cat;
    $('pfBadge').value = p.badge || '';
    $('pfStock').value = p.stock || 0;
    $('pfPrice').value = p.price;
    $('pfOld').value = p.old || '';
    $('pfUsage').value = p.usage || '';
    $('pfWarnings').value = p.warnings || '';
    if(p.image){ $('pfImagePreview').src = p.image; $('pfImagePreview').style.display = 'block'; }
  } else {
    $('productModalTitle').textContent = 'إضافة منتج جديد';
    ['pfName','pfActive','pfBadge','pfStock','pfPrice','pfOld','pfUsage','pfWarnings'].forEach(function(i){ $(i).value=''; });
  }
  ['pfNameField','pfPriceField'].forEach(function(i){ $(i).classList.remove('invalid'); });
  productModalOverlay.classList.add('show');
}
function closeProductModal(){ productModalOverlay.classList.remove('show'); }
$('adminProductModalCloseBtn').addEventListener('click', closeProductModal);
productModalOverlay.addEventListener('click', function(e){ if(e.target===productModalOverlay) closeProductModal(); });
$('addProductBtn').addEventListener('click', function(){ openProductModal(null); });
$('pfImage').addEventListener('change', function(e){
  var file = e.target.files[0]; if(!file) return;
  var reader = new FileReader();
  reader.onload = function(){
    var img = new Image();
    img.onload = function(){
      var cv = document.createElement('canvas');
      var scale = Math.min(1, 500 / img.width);
      cv.width = img.width * scale; cv.height = img.height * scale;
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      pfImageData = cv.toDataURL('image/jpeg', 0.8);
      $('pfImagePreview').src = pfImageData;
      $('pfImagePreview').style.display = 'block';
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

$('productSaveBtn').addEventListener('click', function(){
  var name = $('pfName').value.trim();
  var active = $('pfActive').value.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
  var cat = $('pfCat').value;
  var badge = $('pfBadge').value.trim();
  var stock = Math.max(0, parseInt($('pfStock').value, 10) || 0);
  var price = parseFloat($('pfPrice').value);
  var old = $('pfOld').value ? parseFloat($('pfOld').value) : null;
  var usage = $('pfUsage').value.trim();
  var warnings = $('pfWarnings').value.trim();
  var ok = true;
  $('pfNameField').classList.toggle('invalid', name.length < 2); if(name.length < 2) ok = false;
  $('pfPriceField').classList.toggle('invalid', !(price > 0)); if(!(price > 0)) ok = false;
  if(!ok) return;
  var data = {name:name, active:active, cat:cat, catLabel:catLabelOf(cat), badge:badge||null, stock:stock, price:price, old:old, usage:usage, warnings:warnings};
  if(pfImageData) data.image = pfImageData;
  if(productEditId){
    var p = products.filter(function(x){ return x.id===productEditId; })[0];
    if(p) Object.assign(p, data);
  } else {
    var newId = products.reduce(function(m,x){ return Math.max(m, x.id); }, 0) + 1;
    products.push(Object.assign({id:newId, reviews:[], sold:0}, data));
  }
  persistProducts();
  closeProductModal(); renderProducts();
  syncEvent();
  logActivity((productEditId ? 'تعديل منتج: ' : 'إضافة منتج: ') + name);
  toast(productEditId ? 'تم تحديث المنتج بنجاح' : 'تمت إضافة المنتج وظهر في المتجر');
  productEditId = null;
});
$('productsTable').addEventListener('click', function(e){
  var el = e.target.closest('[data-paction]'); if(!el) return;
  var id = parseInt(el.dataset.id, 10);
  if(el.dataset.paction==='edit') openProductModal(id);
  else if(el.dataset.paction==='delete'){
    var p = products.filter(function(x){ return x.id===id; })[0];
    confirmModal('حذف منتج', 'هل أنت متأكد من حذف "' + (p ? p.name : '') + '"؟ سيختفي من المتجر فورًا.', function(){
      products = products.filter(function(x){ return x.id!==id; });
      persistProducts(); renderProducts(); syncEvent();
      logActivity('حذف منتج: ' + (p ? p.name : id));
      toast('تم حذف المنتج');
    });
  }
});

/* ---------- categories ---------- */
function renderCategories(){
  var cats = getCategories();
  $('catsTable').innerHTML = cats.length===0
    ? '<tr><td colspan="3" style="color:var(--muted); padding:18px 0;">لا توجد أقسام</td></tr>'
    : cats.map(function(c){
        var count = products.filter(function(p){ return p.cat===c.value; }).length;
        return '<tr><td>' + esc(c.label) + '</td><td>' + count + '</td>' +
          '<td class="admin-row-actions">' +
            '<button data-cataction="rename" data-value="' + c.value + '">إعادة تسمية</button>' +
            (count===0 ? '<button class="danger" data-cataction="delete" data-value="' + c.value + '">حذف</button>' : '') +
          '</td></tr>';
      }).join('');
}
$('addCatBtn').addEventListener('click', function(){
  var label = $('newCatLabel').value.trim();
  if(label.length < 2){ toast('أدخل اسم قسم صحيح'); return; }
  var cats = getCategories();
  var value = 'cat' + Date.now();
  cats.push({value:value, label:label, desc:'', icon:'<circle cx="12" cy="12" r="9"/>'});
  setJSON('site:categories', cats);
  $('newCatLabel').value = '';
  renderCategories(); syncEvent();
  logActivity('إضافة قسم: ' + label);
  toast('تمت إضافة القسم');
});
$('catsTable').addEventListener('click', function(e){
  var el = e.target.closest('[data-cataction]'); if(!el) return;
  var value = el.dataset.value;
  var cats = getCategories();
  var cat = cats.filter(function(c){ return c.value===value; })[0]; if(!cat) return;
  if(el.dataset.cataction==='rename'){
    promptModal({title:'إعادة تسمية القسم', desc:'', label:'الاسم الجديد', value:cat.label}, function(v){
      if(!v || v.trim().length < 2) return;
      cat.label = v.trim();
      setJSON('site:categories', cats);
      products.forEach(function(p){ if(p.cat===value) p.catLabel = cat.label; });
      persistProducts(); renderCategories(); syncEvent();
      logActivity('إعادة تسمية قسم إلى: ' + cat.label);
      toast('تم تحديث القسم');
    });
  } else if(el.dataset.cataction==='delete'){
    confirmModal('حذف قسم', 'حذف قسم "' + cat.label + '"؟', function(){
      setJSON('site:categories', cats.filter(function(c){ return c.value!==value; }));
      renderCategories(); syncEvent();
      toast('تم حذف القسم');
    });
  }
});

/* ---------- orders ---------- */
function renderOrders(){
  var orders = getOrders();
  var tbody = $('ordersTable');
  tbody.innerHTML = orders.length===0
    ? '<tr><td colspan="7" style="color:var(--muted); padding:18px 0;">لا توجد طلبات بعد</td></tr>'
    : orders.map(function(o){
        return '<tr><td>#' + esc(o.id) + '</td>' +
          '<td>' + esc(o.customerName||'—') + '<br><span style="color:var(--muted); font-size:11.5px;">' + esc(o.customerContact||'') + '</span></td>' +
          '<td>' + esc(o.date) + '</td>' +
          '<td style="font-size:12px;">' + esc(o.address||'—') + '</td>' +
          '<td style="font-size:12px;">' + ({cash:'عند الاستلام',card:'بطاقة',vodafone:'فودافون كاش'}[o.payment]||o.payment||'—') + '</td>' +
          '<td>' + o.total + ' ج.م</td>' +
          '<td><select class="status-select" data-order="' + esc(o.id) + '" data-key="' + esc(o.customerKey||'') + '">' +
            ORDER_STATUS.map(function(s){ return '<option value="' + s[0] + '"' + (o.status===s[0]?' selected':'') + '>' + s[1] + '</option>'; }).join('') +
          '</select></td></tr>';
      }).join('');
}
$('ordersTable').addEventListener('change', function(e){
  var sel = e.target.closest('.status-select'); if(!sel) return;
  var orderId = sel.dataset.order, key = sel.dataset.key, newStatus = sel.value;
  var newLabel = ORDER_STATUS.filter(function(s){ return s[0]===newStatus; })[0][1];
  var orders = getOrders();
  var rec = orders.filter(function(o){ return o.id===orderId; })[0];
  if(rec){
    rec.status = newStatus; rec.statusLabel = newLabel;
    (rec.timeline||[]).forEach(function(t,i){
      var idx = ORDER_STATUS.findIndex(function(s){ return s[0]===newStatus; });
      if(i <= idx + 1){ t.done = true; if(!t.time) t.time = Date.now(); }
    });
    setJSON('site:orders', orders);
  }
  /* mirror into customer account */
  try{
    var raw = localStorage.getItem('account:' + key);
    if(raw){
      var acc = JSON.parse(raw);
      var ord = (acc.orders||[]).filter(function(o){ return o.id===orderId; })[0];
      if(ord){ ord.status = newStatus; ord.statusLabel = newLabel; ord.timeline = rec ? rec.timeline : ord.timeline; }
      acc.notifications = acc.notifications || [];
      acc.notifications.unshift({title:'تحديث حالة الطلب #' + orderId, detail:'الطلب الآن: ' + newLabel, ts:Date.now()});
      localStorage.setItem('account:' + key, JSON.stringify(acc));
    }
  }catch(err){}
  logActivity('تحديث حالة الطلب #' + orderId + ' إلى ' + newLabel);
  toast('تم تحديث حالة الطلب #' + orderId);
  renderOverview();
  syncEvent();
});

/* ---------- prescriptions (from customers) ---------- */
function renderRx(){
  var rx = getRx();
  var badge = $('rxBadge');
  var pending = rx.filter(function(r){ return r.status==='transit'; }).length;
  badge.style.display = pending ? 'flex' : 'none';
  badge.textContent = pending;
  var box = $('admRxList');
  if(rx.length===0){ box.innerHTML = '<p style="color:var(--muted); font-size:13.5px;">لا توجد روشتات واردة بعد — روشتات العملاء هتظهر هنا فور رفعها.</p>'; return; }
  box.innerHTML = rx.map(function(r){
    var matched = (r.matched||[]).map(function(id){ return products.filter(function(p){ return p.id===id; })[0]; }).filter(Boolean);
    return '<div class="rx-card" style="align-items:flex-start;">' +
      (r.image ? '<img class="rx-thumb-img" src="' + r.image + '" data-rx="view" data-id="' + r.id + '" style="width:86px; height:86px;">' : '<div class="rx-ic">' + '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" style="width:20px;"><path d="M9 3h6v5l4 11a2 2 0 0 1-2 3H7a2 2 0 0 1-2-3l4-11V3z"/></svg>' + '</div>') +
      '<div class="rx-body" style="flex:1;">' +
        '<strong>' + esc(r.id) + ' — ' + esc(r.customerName||'عميل') + '</strong>' +
        '<span>' + esc(r.date) + ' ' + esc(r.time||'') + ' — ' + esc(r.customerContact||'') + '</span>' +
        (r.notes ? '<span style="color:var(--gold);">ملاحظات: ' + esc(r.notes) + '</span>' : '') +
        (matched.length ? '<span>أدوية متعرف عليها: ' + matched.map(function(p){ return esc(p.name); }).join('، ') + '</span>' : '') +
      '</div>' +
      '<div style="display:flex; flex-direction:column; gap:8px;">' +
        pillHtml(r.status, r.statusLabel) +
        (r.status==='transit' ?
          '<button class="btn-add" data-rx="approve" data-id="' + r.id + '" style="padding:9px 16px; font-size:12px;">اعتماد وتجهيز</button>' +
          '<button class="btn-outline" data-rx="reject" data-id="' + r.id + '" style="padding:8px 14px; font-size:12px; color:var(--red); border-color:#ecc8bf;">رفض</button>' :
          '') +
      '</div></div>';
  }).join('');
}
$('admRxList').addEventListener('click', function(e){
  var el = e.target.closest('[data-rx]'); if(!el) return;
  var id = el.dataset.id;
  var rx = getRx();
  var rec = rx.filter(function(r){ return r.id===id; })[0];
  if(!rec) return;
  if(el.dataset.rx==='view' && rec.image){
    var w = window.open('', '_blank');
    if(w) w.document.write('<html dir="rtl"><head><title>روشتة ' + esc(id) + '</title></head><body style="margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#111;"><img src="' + rec.image + '" style="max-width:100%; max-height:100vh;"></body></html>');
  }
  else if(el.dataset.rx==='approve'){
    rec.status = 'done'; rec.statusLabel = 'تم الاعتماد';
    setJSON('site:rx', rx);
    notifyCustomerRx(rec, 'تم اعتماد روشتتك ' + rec.id + ' — جاري تجهيز الأدوية');
    logActivity('اعتماد روشتة ' + rec.id);
    renderRx(); syncEvent();
    toast('تم اعتماد الروشتة');
  }
  else if(el.dataset.rx==='reject'){
    confirmModal('رفض روشتة', 'رفض روشتة ' + rec.id + '؟', function(){
      rec.status = 'rejected'; rec.statusLabel = 'مرفوضة';
      setJSON('site:rx', rx);
      notifyCustomerRx(rec, 'روشتتك ' + rec.id + ' لم تُعتمد — تواصل مع الصيدلي على 19077');
      logActivity('رفض روشتة ' + rec.id);
      renderRx(); syncEvent();
      toast('تم رفض الروشتة');
    });
  }
});
function notifyCustomerRx(rec, msg){
  try{
    var raw = localStorage.getItem('account:' + rec.customerKey);
    if(raw){
      var acc = JSON.parse(raw);
      acc.notifications = acc.notifications || [];
      acc.notifications.unshift({title:'تحديث الروشتة ' + rec.id, detail:msg, ts:Date.now()});
      var myRx = (acc.prescriptions||[]).filter(function(x){ return x.id===rec.id; })[0];
      if(myRx){ myRx.status = rec.status; myRx.statusLabel = rec.statusLabel; }
      localStorage.setItem('account:' + rec.customerKey, JSON.stringify(acc));
    }
  }catch(e){}
}

/* ---------- customers ---------- */
var customerSearchTerm = '', customerStatusFilter = 'all';
function renderCustomers(){
  var customers = getCustomers(), orders = getOrders();
  var filtered = customers.filter(function(c){
    var blocked = !!c.blocked;
    var matchStatus = customerStatusFilter==='all' || (customerStatusFilter==='blocked' ? blocked : !blocked);
    var hay = ((c.name||'') + ' ' + (c.email||'') + ' ' + (c.phone||'')).toLowerCase();
    return matchStatus && (!customerSearchTerm || hay.indexOf(customerSearchTerm) > -1);
  });
  var tbody = $('customersTable');
  if(customers.length===0){ tbody.innerHTML = '<tr><td colspan="6" style="color:var(--muted); padding:18px 0;">لا يوجد عملاء بعد</td></tr>'; return; }
  if(filtered.length===0){ tbody.innerHTML = '<tr><td colspan="6" style="color:var(--muted); padding:18px 0;">لا توجد نتائج مطابقة</td></tr>'; return; }
  tbody.innerHTML = filtered.map(function(c){
    var count = orders.filter(function(o){ return o.customerKey===c.key; }).length;
    var blocked = !!c.blocked;
    return '<tr><td>' + esc(c.name||'—') + '</td><td>' + esc(c.email||c.phone||'—') + '</td><td>' + esc(c.joined||'—') + '</td><td>' + count + '</td>' +
      '<td>' + pillHtml(blocked?'blocked':'active-ok', blocked?'محظور':'نشط') + '</td>' +
      '<td class="admin-row-actions">' +
        (blocked
          ? '<button data-caction="unblock" data-key="' + encodeURIComponent(c.key) + '">إلغاء الحظر</button>'
          : '<button class="danger" data-caction="block" data-key="' + encodeURIComponent(c.key) + '">حظر</button>') +
        '<button class="danger" data-caction="delete" data-key="' + encodeURIComponent(c.key) + '">حذف نهائي</button>' +
      '</td></tr>';
  }).join('');
}
$('customerSearch').addEventListener('input', function(e){ customerSearchTerm = e.target.value.trim().toLowerCase(); renderCustomers(); });
$('customerStatusFilter').addEventListener('change', function(e){ customerStatusFilter = e.target.value; renderCustomers(); });
function setCustomerBlocked(key, blocked){
  var list = getCustomers();
  var c = list.filter(function(x){ return x.key===key; })[0]; if(!c) return;
  var doIt = function(){
    c.blocked = blocked;
    setJSON('site:customers', list);
    renderCustomers(); renderOverview();
    logActivity((blocked?'حظر عميل: ':'إلغاء حظر عميل: ') + c.name);
    toast(blocked ? 'تم حظر ' + c.name : 'تم إلغاء حظر ' + c.name);
    syncEvent();
  };
  if(blocked) confirmModal('حظر عميل', 'حظر "' + (c.name||'') + '"؟ لن يستطيع تسجيل الدخول.', doIt);
  else doIt();
}
function deleteCustomer(key){
  var list = getCustomers();
  var c = list.filter(function(x){ return x.key===key; })[0]; if(!c) return;
  confirmModal('حذف نهائي', 'حذف حساب "' + (c.name||'') + '" نهائيًا مع كل بياناته؟', function(){
    setJSON('site:customers', list.filter(function(x){ return x.key!==key; }));
    try{ localStorage.removeItem('account:' + key); localStorage.removeItem('cart:' + key); }catch(e){}
    renderCustomers(); renderOverview();
    logActivity('حذف نهائي لعميل: ' + c.name);
    toast('تم حذف الحساب نهائيًا');
    syncEvent();
  });
}
$('customersTable').addEventListener('click', function(e){
  var el = e.target.closest('[data-caction]'); if(!el) return;
  var key = decodeURIComponent(el.dataset.key);
  if(el.dataset.caction==='block') setCustomerBlocked(key, true);
  else if(el.dataset.caction==='unblock') setCustomerBlocked(key, false);
  else if(el.dataset.caction==='delete') deleteCustomer(key);
});

/* ---------- coupons ---------- */
function renderCoupons(){
  var coupons = getJSON('site:coupons', []);
  var tbody = $('couponsTable');
  tbody.innerHTML = coupons.length===0
    ? '<tr><td colspan="4" style="color:var(--muted); padding:18px 0;">لا توجد أكواد خصم — أضف أول كود</td></tr>'
    : coupons.map(function(c){
        return '<tr><td style="font-weight:700; letter-spacing:1px;">' + esc(c.code) + '</td>' +
          '<td>' + (c.type==='percent' ? c.value + ' ٪' : c.value + ' ج.م') + '</td>' +
          '<td>' + pillHtml(c.active?'done':'blocked', c.active?'فعّال':'موقوف') + '</td>' +
          '<td class="admin-row-actions">' +
            '<button data-couponaction="toggle" data-code="' + esc(c.code) + '">' + (c.active?'إيقاف':'تفعيل') + '</button>' +
            '<button class="danger" data-couponaction="delete" data-code="' + esc(c.code) + '">حذف</button>' +
          '</td></tr>';
      }).join('');
}
$('addCouponBtn').addEventListener('click', function(){
  var code = $('couponCode').value.trim().toUpperCase();
  var type = $('couponType').value;
  var value = parseFloat($('couponValue').value);
  if(code.length < 3){ toast('الكود قصير — ٣ أحرف على الأقل'); return; }
  if(!(value > 0)){ toast('أدخل قيمة خصم صحيحة'); return; }
  if(type==='percent' && value > 100){ toast('النسبة لا تتجاوز ١٠٠٪'); return; }
  var coupons = getJSON('site:coupons', []);
  if(coupons.some(function(c){ return c.code===code; })){ toast('هذا الكود موجود بالفعل'); return; }
  coupons.unshift({code:code, type:type, value:value, active:true});
  setJSON('site:coupons', coupons);
  $('couponCode').value=''; $('couponValue').value='';
  renderCoupons();
  logActivity('إضافة كوبون: ' + code);
  toast('تمت إضافة كود الخصم');
  syncEvent();
});
$('couponsTable').addEventListener('click', function(e){
  var el = e.target.closest('[data-couponaction]'); if(!el) return;
  var code = el.dataset.code;
  var coupons = getJSON('site:coupons', []);
  var c = coupons.filter(function(x){ return x.code===code; })[0]; if(!c) return;
  if(el.dataset.couponaction==='toggle'){ c.active = !c.active; toast(c.active ? 'تم تفعيل الكود' : 'تم إيقاف الكود'); }
  else {
    confirmModal('حذف كوبون', 'حذف كود "' + code + '"؟', function(){
      coupons = coupons.filter(function(x){ return x.code!==code; });
      setJSON('site:coupons', coupons);
      renderCoupons(); syncEvent();
      toast('تم حذف الكود');
    });
    return;
  }
  setJSON('site:coupons', coupons);
  renderCoupons();
  syncEvent();
});

/* ---------- activity log ---------- */
function renderActivity(){
  var log = getJSON('site:activity', []);
  $('activityList').innerHTML = log.length===0
    ? '<p class="log-empty">لا يوجد نشاط مسجل بعد.</p>'
    : log.map(function(l){
        return '<div class="log-item"><span class="log-dot"></span><span>' + esc(l.action) + '</span><span class="log-time">' + esc(l.date) + ' — ' + esc(l.time) + '</span></div>';
      }).join('');
}

/* ---------- settings ---------- */
function renderSettings(){ $('admSettingsEmail').value = adminCreds ? adminCreds.email : ''; $('settingsPass').value = ''; }
$('settingsSaveBtn').addEventListener('click', function(){
  var email = $('admSettingsEmail').value.trim();
  var pass = $('settingsPass').value.trim();
  if(email.indexOf('@')===-1 || email.length < 5){ toast('أدخل بريدًا إلكترونيًا صحيحًا'); return; }
  adminCreds.email = email;
  if(pass){
    if(pass.length < 4){ toast('كلمة المرور قصيرة جدًا'); return; }
    adminCreds.password = pass;
  }
  setJSON('site:admin-creds', adminCreds);
  $('settingsPass').value = '';
  logActivity('تحديث بيانات دخول الإدارة');
  toast('تم تحديث بيانات دخول الإدارة');
});

/* ---------- init ---------- */
(function init(){
  loadAdminCreds();
  loadProducts();
  var s = getJSON('session:admin-active', null);
  if(s && s.ts && Date.now()-s.ts < 12*60*60*1000){
    if(window.AdminUI && window.AdminUI.applyAdmin) window.AdminUI.applyAdmin();
    window.AdminApp.open();
  }
})();

})();