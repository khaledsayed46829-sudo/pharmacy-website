;(function(){
'use strict';
/* =========================================================
   ELIXIR PHARMACY — Customer app (front-end only)
   Storage: localStorage (shared keys between app.js & admin.js)
   ========================================================= */
/* ---------- tiny helpers ---------- */
function $(id){ return document.getElementById(id); }
function qs(sel, root){ return (root||document).querySelector(sel); }
function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function pillHtml(status,label){ return '<span class="status-pill ' + status + '">' + esc(label) + '</span>'; }
function formatDate(ts){ try{ return new Date(ts||Date.now()).toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'}); }catch(e){ return ''; } }
function formatTime(ts){ try{ return new Date(ts||Date.now()).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } }
function normAr(s){ return String(s||'').toLowerCase().replace(/[ً-ْٰ]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim(); }

/* ---------- storage ---------- */
var memFallback = {};
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return (k in memFallback)?memFallback[k]:null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} memFallback[k]=v; }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} delete memFallback[k]; }
function getJSON(key, def){ var r = lsGet(key); if(!r) return def; try{ return JSON.parse(r); }catch(e){ return def; } }
function setJSON(key, val){ lsSet(key, JSON.stringify(val)); }
function syncEvent(){ try{ window.dispatchEvent(new CustomEvent('elixir:sync')); }catch(e){} }

/* ---------- toast (single definition) ---------- */
var toastTimer = null;
function showToast(msg){
  var t = $('toast'); if(!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2800);
}

/* ---------- prompt / confirm modals (replaces window.prompt/confirm) ---------- */
var promptCb = null;
function openPrompt(opts, cb){
  promptCb = cb || null;
  $('promptTitle').textContent = opts.title || '';
  $('promptDesc').textContent = opts.desc || '';
  $('promptLabel').textContent = opts.label || '';
  var inp = $('promptInput');
  inp.value = opts.value || '';
  inp.placeholder = opts.placeholder || '';
  inp.type = opts.password ? 'password' : 'text';
  $('promptFieldWrap').style.display = opts.confirmOnly ? 'none' : 'flex';
  $('promptOkBtn').textContent = opts.okText || 'تأكيد';
  $('promptOverlay').classList.add('show');
  setTimeout(function(){ if(!opts.confirmOnly) inp.focus(); }, 120);
}
function closePrompt(){ $('promptOverlay').classList.remove('show'); promptCb = null; }
$('promptOkBtn').addEventListener('click', function(){ if(promptCb) promptCb($('promptInput').value); closePrompt(); });
$('promptCancelBtn').addEventListener('click', closePrompt);
$('promptOverlay').addEventListener('click', function(e){ if(e.target===$('promptOverlay')) closePrompt(); });

function confirmModal(title, desc, cb){
  openPrompt({title:title, desc:desc, confirmOnly:true, okText:'تأكيد'}, function(){ cb && cb(); });
}

/* ---------- default data ---------- */
var DEFAULT_CATEGORIES = [
  {value:'skin', label:'العناية بالبشرة', desc:'سيرومات، كريمات، وواقيات شمس من ماركات عالمية موثوقة.', icon:'<path d="M9 3h6v5l4 11a2 2 0 0 1-2 3H7a2 2 0 0 1-2-3l4-11V3z"/>'},
  {value:'vit', label:'الفيتامينات والمكملات', desc:'دعم يومي للمناعة والطاقة من مصادر طبيعية ومختبرة.', icon:'<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/><circle cx="12" cy="12" r="3.5"/>'},
  {value:'baby', label:'العناية بالطفل والأم', desc:'منتجات مطمئنة ومختبرة طبيًا لأمان طفلك من أول يوم.', icon:'<circle cx="12" cy="7" r="3.4"/><path d="M6 21c0-4 2.7-6.5 6-6.5S18 17 18 21"/>'},
  {value:'device', label:'الأجهزة الطبية', desc:'أجهزة قياس الضغط والسكر والحرارة بدقة معتمدة.', icon:'<path d="M4 12h4l2-6 4 12 2-6h4"/>'},
  {value:'personal', label:'العناية الشخصية', desc:'عطور طبية، عناية بالفم، ومستلزمات النظافة اليومية.', icon:'<circle cx="12" cy="12" r="9"/><path d="M9 10c1-2 5-2 6 0M9 15h6"/>'}
];
var DEFAULT_PRODUCTS = [
  {id:1, name:"سيروم فيتامين C المضيء", cat:"skin", catLabel:"العناية بالبشرة", price:640, old:780, badge:"الأكثر مبيعًا", stock:24, active:["فيتامين سي","اسكوربيك اسيد","vitamin c"], usage:"٣–٤ قطرات على بشرة نظيفة صباحًا قبل واقي الشمس.", warnings:"للاستخدام الخارجي فقط. تجنب منطقة العين.", reviews:[{name:"ياسمين", rating:5, text:"نتيجة ممتازة خلال أسبوعين", date:Date.now()-86400000*4}], sold:86},
  {id:2, name:"كريم مرطب بالسيراميد", cat:"skin", catLabel:"العناية بالبشرة", price:410, old:null, badge:null, stock:31, active:["سيراميد","ceramide"], usage:"يُدهن مرتين يوميًا على بشرة جافة.", warnings:"", reviews:[], sold:54},
  {id:3, name:"واقي شمس SPF 50 خفيف", cat:"skin", catLabel:"العناية بالبشرة", price:365, old:420, badge:"عرض", stock:0, active:["واقي شمس","spu","spf"], usage:"يُعاد وضعه كل ٣ ساعات عند التعرض للشمس.", warnings:"", reviews:[{name:"منى", rating:4, text:"خفيف ومش بيسبب لمعان", date:Date.now()-86400000*9}], sold:112},
  {id:4, name:"أقراص فيتامين د٣ ١٠٠٠", cat:"vit", catLabel:"الفيتامينات والمكملات", price:210, old:null, badge:null, stock:60, active:["فيتامين د","vitamin d","colecalciferol"], usage:"قرص واحد يوميًا بعد وجبة دسمة.", warnings:"لا تتجاوز الجرعة الموصى بها.", reviews:[], sold:73},
  {id:5, name:"أوميجا ٣ زيت السمك", cat:"vit", catLabel:"الفيتامينات والمكملات", price:295, old:340, badge:"عرض", stock:18, active:["اوميجا","omega 3","fish oil"], usage:"كبسولة مرتين يوميًا مع الطعام.", warnings:"يُحفظ بعيدًا عن متناول الأطفال.", reviews:[{name:"أحمد", rating:5, text:"جودة ممتازة ورائحة خفيفة", date:Date.now()-86400000*15}], sold:95},
  {id:6, name:"مجمع فيتامينات يومي", cat:"vit", catLabel:"الفيتامينات والمكملات", price:255, old:null, badge:null, stock:42, active:["multivitamin","فيتامينات متعدده"], usage:"قرص واحد يوميًا.", warnings:"", reviews:[], sold:41},
  {id:7, name:"غسول للأطفال بدون عطور", cat:"baby", catLabel:"العناية بالطفل والأم", price:180, old:null, badge:null, stock:27, active:["غسول اطفال","baby wash"], usage:"للاستخدام اليومي على بشرة الطفل.", warnings:"للاستخدام الخارجي فقط.", reviews:[], sold:38},
  {id:8, name:"كريم حفاضات مهدئ", cat:"baby", catLabel:"العناية بالطفل والأم", price:150, old:190, badge:"عرض", stock:5, active:["كريم حفاض","diaper cream","زنك"], usage:"يُدهن عند كل تغيير حفاض.", warnings:"", reviews:[], sold:67},
  {id:9, name:"جهاز قياس ضغط الدم الرقمي", cat:"device", catLabel:"الأجهزة الطبية", price:1250, old:1450, badge:"الأكثر مبيعًا", stock:12, active:["ضغط","bp monitor"], usage:"يقيس ذراعًا، يعمل بالبطاريات.", warnings:"ليس بديلًا عن تشخيص الطبيب.", reviews:[{name:"كامل", rating:5, text:"دقته ممتازة وشاشة واضحة", date:Date.now()-86400000*22}], sold:29},
  {id:10, name:"جهاز قياس السكر مع الشرائط", cat:"device", catLabel:"الأجهزة الطبية", price:980, old:null, badge:null, stock:9, active:["سكر","glucometer","جلوكوز"], usage:"يأتي مع ٢٥ شريط قياس.", warnings:"", reviews:[], sold:21},
  {id:11, name:"ميزان حرارة رقمي سريع", cat:"device", catLabel:"الأجهزة الطبية", price:145, old:null, badge:null, stock:48, active:["حراره","thermometer"], usage:"قياس خلال ١٠ ثوانٍ.", warnings:"", reviews:[], sold:57},
  {id:12, name:"سيروم نياسيناميد ١٠٪", cat:"skin", catLabel:"العناية بالبشرة", price:520, old:null, badge:null, stock:16, active:["نياسيناميد","niacinamide","فيتامين ب٣"], usage:"قطرتان مساءً على بشرة نظيفة.", warnings:"", reviews:[], sold:44},
  {id:13, name:"معجون أسنان بالفحم الطبيعي", cat:"personal", catLabel:"العناية الشخصية", price:95, old:null, badge:null, stock:70, active:["فحم","charcoal","معجون"], usage:"للاستخدام مرتين يوميًا.", warnings:"", reviews:[], sold:83},
  {id:14, name:"غسول فم مطهر", cat:"personal", catLabel:"العناية الشخصية", price:120, old:145, badge:"عرض", stock:3, active:"غسول فم, mouthwash", usage:"يُمضمض مرتين يوميًا لمدة ٣٠ ثانية.", warnings:"لا يُبلع.", reviews:[], sold:49},
  {id:15, name:"أقراص باراسيتامول ٥٠٠ مجم", cat:"vit", catLabel:"الفيتامينات والمكملات", price:45, old:null, badge:null, stock:120, active:["باراسيتامول","paracetamol","بانادول","مسكن"], usage:"قرص إلى قرصين كل ٦–٨ ساعات عند اللزوم، بحد أقصى ٤ أقراص يوميًا.", warnings:"روشتة طبية مطلوبة. لا يُستخدم مع أدوية البرد الأخرى.", reviews:[{name:"سامي", rating:5, text:"الأصلي وسعره كويس", date:Date.now()-86400000*2}], sold:210, rx:true}
];
/* synonyms: trade name -> also matches these terms */
var SYNONYMS = { 'بانادول':['باراسيتامول','paracetamol'], 'بروفين':['ايبوبروفين','ibuprofen'], 'فيتامين سي':['فيتامين c','اسكوربيك'] };

function loadCategories(){
  var cats = getJSON('site:categories', null);
  if(!cats || !cats.length){ cats = DEFAULT_CATEGORIES.slice(); setJSON('site:categories', cats); }
  return cats;
}
function loadProducts(){
  var prods = getJSON('site:products', null);
  if(!prods || !prods.length){ prods = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS)); setJSON('site:products', prods); }
  return prods;
}
var categories = loadCategories();
var products = loadProducts();

function catLabelOf(cat){
  var m = categories.filter(function(c){ return c.value===cat; })[0];
  return m ? m.label : cat;
}
function productById(id){ return products.filter(function(p){ return p.id===id; })[0]; }

var iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.4"><path d="M9 3h6v5l4 11a2 2 0 0 1-2 3H7a2 2 0 0 1-2-3l4-11V3z"/></svg>';
function productImgHtml(p, size){
  if(p.image) return '<img src="' + p.image + '" alt="' + esc(p.name) + '" style="' + (size||'') + '">';
  return iconSvg;
}
function stockBadge(p){
  if(p.stock<=0) return '<span class="stock-badge out"><span class="stock-dot"></span>نفدت الكمية</span>';
  if(p.stock<=5) return '<span class="stock-badge low"><span class="stock-dot"></span>باقي ' + p.stock + ' فقط</span>';
  return '<span class="stock-badge ok"><span class="stock-dot"></span>متوفر</span>';
}
function avgRating(p){
  var rv = p.reviews || [];
  if(!rv.length) return 0;
  return Math.round(rv.reduce(function(s,r){ return s+(r.rating||0); },0)/rv.length);
}
function starsHtml(n, total){
  total = total || 5;
  var s = '';
  for(var i=1;i<=total;i++) s += '<span class="' + (i<=n?'':'dim') + '">★</span>';
  return '<span class="stars-row">' + s + '</span>';
}

/* ---------- categories / tabs / footer ---------- */
function renderCategories(){
  $('catGrid').innerHTML = categories.map(function(c){
    return '<div class="cat-card" data-cat="' + c.value + '">' +
      '<div class="cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#173f31" stroke-width="1.6">' + c.icon + '</svg></div>' +
      '<h3>' + esc(c.label) + '</h3><p>' + esc(c.desc||'') + '</p>' +
      '<span class="more">استكشف القسم ←</span></div>';
  }).join('');
  $('footerCats').innerHTML = categories.map(function(c){
    return '<li><button data-action="filter-category" data-cat="' + c.value + '">' + esc(c.label) + '</button></li>';
  }).join('');
}
function renderTabs(){
  var active = (qs('.tab-btn.active')||{}).dataset ? qs('.tab-btn.active').dataset.f : 'all';
  $('tabs').innerHTML = '<button class="tab-btn' + (active==='all'?' active':'') + '" data-f="all">الكل</button>' +
    categories.map(function(c){ return '<button class="tab-btn' + (active===c.value?' active':'') + '" data-f="' + c.value + '">' + esc(c.label) + '</button>'; }).join('');
}

/* ---------- products grid ---------- */
var currentFilter = 'all';
function renderProducts(filter){
  if(filter) currentFilter = filter;
  var list = products.filter(function(p){ return currentFilter==='all' || p.cat===currentFilter; });
  $('productGrid').innerHTML = list.length ? list.map(function(p){
    var wished = isWished(p.id);
    return '<div class="product-card" data-card-id="' + p.id + '">' +
      '<div class="product-media" data-action="open-product" data-id="' + p.id + '" style="cursor:pointer;">' + productImgHtml(p) +
        (p.badge ? '<span class="product-badge">' + esc(p.badge) + '</span>' : '') +
        '<button class="wish-btn' + (wished?' active':'') + '" data-action="toggle-wish" data-id="' + p.id + '" aria-label="مفضلة">' +
          '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9.5-9C.8 7.3 2.6 4 6 4c2 0 3.3 1 4 2 1.2-1.5 3-2.5 5-2 3 .8 4.3 4.2 2.6 7.5C15 16 12 20 12 20z"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="product-info">' +
        '<span class="p-cat">' + esc(p.catLabel) + '</span>' +
        '<h3 data-action="open-product" data-id="' + p.id + '" style="cursor:pointer;">' + esc(p.name) + '</h3>' +
        '<div style="display:flex; align-items:center; gap:8px;">' + starsHtml(avgRating(p)) + '<span style="font-size:11px; color:var(--muted);">(' + (p.reviews||[]).length + ')</span></div>' +
        '<div class="p-price"><span class="now">' + p.price + ' ج.م</span>' + (p.old ? '<span class="old">' + p.old + ' ج.م</span>' : '') + '</div>' +
        '<div>' + stockBadge(p) + '</div>' +
        '<button class="add-btn" data-action="add-cart" data-id="' + p.id + '"' + (p.stock<=0?' disabled':'') + '>' + (p.stock<=0?'غير متوفر حاليًا':'أضف إلى السلة') + '</button>' +
      '</div>' +
    '</div>';
  }).join('') : '<p class="empty-state" style="grid-column:1/-1;">لا توجد منتجات في هذا القسم حاليًا.</p>';
  $('statTotalProducts').textContent = '+' + products.length * 300;
}
function scrollToProducts(){ document.getElementById('products').scrollIntoView({behavior:'smooth'}); }
function filterByCategory(cat){
  closeDashboard();
  qsa('.tab-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.f===cat); });
  renderProducts(cat);
  scrollToProducts();
}
$('tabs').addEventListener('click', function(e){
  var btn = e.target.closest('.tab-btn'); if(!btn) return;
  qsa('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  renderProducts(btn.dataset.f);
});
$('catGrid').addEventListener('click', function(e){
  var card = e.target.closest('.cat-card'); if(!card) return;
  filterByCategory(card.dataset.cat);
});

/* ---------- product detail modal ---------- */
var detailQty = 1;
function openProductDetail(id){
  var p = productById(id); if(!p) return;
  detailQty = 1;
  var reviews = p.reviews || [];
  var activeList = (Array.isArray(p.active) ? p.active : String(p.active||'').split(',')).filter(Boolean);
  $('productModalContent').innerHTML =
    '<div class="modal-top">' +
      '<button class="modal-close" data-action="close-product-modal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<h3>تفاصيل المنتج</h3><p>' + esc(p.catLabel) + '</p>' +
    '</div>' +
    '<div class="modal-body">' +
      '<div class="pd-grid">' +
        '<div class="pd-media">' + productImgHtml(p) + '</div>' +
        '<div class="pd-info">' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<div style="display:flex; gap:8px; align-items:center;">' + starsHtml(avgRating(p)) + '<span style="font-size:12px; color:var(--muted);">' + avgRating(p) + '/5 (' + reviews.length + ' تقييم)</span></div>' +
          '<div class="pd-meta">' + stockBadge(p) + (p.badge ? '<span class="product-badge" style="position:static;">' + esc(p.badge) + '</span>' : '') + (p.rx ? pillHtml('transit','يستلزم روشتة') : '') + '</div>' +
          '<div class="pd-price"><span class="now">' + p.price + ' ج.م</span>' + (p.old ? '<span class="old">' + p.old + ' ج.م</span>' : '') + '</div>' +
          (p.usage ? '<div class="pd-sec"><h5>طريقة الاستخدام</h5><p>' + esc(p.usage) + '</p></div>' : '') +
          (p.warnings ? '<div class="pd-sec"><h5>تحذيرات</h5><p>' + esc(p.warnings) + '</p></div>' : '') +
          (activeList.length ? '<div class="pd-sec"><h5>المادة الفعالة</h5><p>' + esc(activeList.join('، ')) + '</p></div>' : '') +
          '<div class="pd-actions">' +
            '<div class="qty-box"><button data-action="pd-qty" data-d="-1">−</button><span id="pdQty">1</span><button data-action="pd-qty" data-d="1">+</button></div>' +
            '<button class="btn-primary" style="padding:12px 24px; font-size:13.5px;" data-action="pd-add" data-id="' + p.id + '"' + (p.stock<=0?' disabled style="padding:12px 24px; font-size:13.5px; opacity:.5;"':'') + '>' + (p.stock<=0?'غير متوفر':'أضف إلى السلة') + '</button>' +
            '<button class="btn-outline" style="padding:11px 18px; font-size:12.5px;" data-action="pd-subscribe" data-id="' + p.id + '">اشتراك شهري</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="pd-sec"><h5>تقييمات العملاء (' + reviews.length + ')</h5>' +
        (reviews.length ? reviews.map(function(r){
          return '<div class="review-item"><div class="rv-head"><div class="rv-avatar">' + esc((r.name||'ع').charAt(0)) + '</div><strong>' + esc(r.name) + '</strong>' + starsHtml(r.rating) + '<span class="rv-date">' + formatDate(r.date) + '</span></div><p>' + esc(r.text) + '</p></div>';
        }).join('') : '<p style="font-size:13px; color:var(--muted);">لا توجد تقييمات بعد — كن أول من يقيّم هذا المنتج.</p>') +
        '<div style="margin-top:14px; border-top:1px dashed var(--line); padding-top:14px;">' +
          '<h5 style="margin-bottom:10px;">أضف تقييمك</h5>' +
          (currentUser ?
            '<div style="display:flex; flex-direction:column; gap:10px;">' +
              '<div class="star-input" id="rvStars">' + [1,2,3,4,5].map(function(i){ return '<button data-rv="' + i + '">★</button>'; }).join('') + '</div>' +
              '<input type="text" id="rvText" placeholder="اكتب رأيك في المنتج..." style="border:1px solid var(--line); border-radius:12px; padding:11px 14px; font-size:13.5px; background:var(--cream);">' +
              '<button class="auth-submit" style="padding:12px;" data-action="pd-review" data-id="' + p.id + '">نشر التقييم</button>' +
            '</div>' :
            '<p style="font-size:13px; color:var(--muted);">سجّل الدخول لإضافة تقييم. <button class="link-btn" data-action="open-auth">تسجيل الدخول</button></p>') +
        '</div>' +
      '</div>' +
    '</div>';
  $('productModalOverlay').classList.add('show');
  qsa('#rvStars button').forEach(function(b){
    b.addEventListener('click', function(){
      qsa('#rvStars button').forEach(function(x){ x.classList.toggle('on', +x.dataset.rv <= +b.dataset.rv); });
      $('productModalContent').dataset.rating = b.dataset.rv;
    });
  });
}
function closeProductDetail(){ $('productModalOverlay').classList.remove('show'); }
$('productModalOverlay').addEventListener('click', function(e){ if(e.target===$('productModalOverlay')) closeProductDetail(); });

/* ---------- cart (persisted per account/guest) ---------- */
function cartKey(){ return currentUser ? 'cart:' + currentAccountKey : 'cart:guest'; }
function getCart(){ return getJSON(cartKey(), []); }
function setCart(c){ setJSON(cartKey(), c); }

function addToCart(id, qty){
  qty = qty || 1;
  var p = productById(id); if(!p) return;
  if(p.stock <= 0){ showToast('عذرًا، نفدت كمية "' + p.name + '"'); return; }
  var cart = getCart();
  var line = cart.filter(function(c){ return c.id===id; })[0];
  var cur = line ? line.qty : 0;
  if(cur + qty > p.stock){ showToast('الكمية المتاحة من "' + p.name + '" هي ' + p.stock + ' فقط'); return; }
  if(line){ line.qty += qty; } else { cart.push({id:p.id, name:p.name, price:p.price, qty:qty}); }
  setCart(cart);
  updateCartUI();
  showToast('تمت إضافة "' + p.name + '" إلى السلة');
}
function changeQty(id, delta){
  var cart = getCart();
  var line = cart.filter(function(c){ return c.id===id; })[0]; if(!line) return;
  var p = productById(id);
  line.qty += delta;
  if(p && line.qty > p.stock){ line.qty = p.stock; showToast('وصلت للحد الأقصى المتاح بالمخزون'); }
  if(line.qty <= 0){ cart = cart.filter(function(c){ return c.id!==id; }); }
  setCart(cart); updateCartUI();
}
function removeFromCart(id){ setCart(getCart().filter(function(c){ return c.id!==id; })); updateCartUI(); }
function cartTotal(){ return getCart().reduce(function(s,c){ return s+(c.price*c.qty); }, 0); }

function updateCartUI(){
  var cart = getCart();
  var count = cart.reduce(function(s,c){ return s+c.qty; }, 0);
  $('cartCount').textContent = count;
  var body = $('drawerBody');
  body.innerHTML = cart.length===0 ? '<div class="drawer-empty">سلتك فارغة حاليًا</div>' :
    cart.map(function(c){
      return '<div class="cart-line"><div class="thumb">' + iconSvg + '</div>' +
        '<div class="info"><strong>' + esc(c.name) + '</strong>' +
        '<div class="qty">' +
          '<button data-action="qty-minus" data-id="' + c.id + '">−</button>' +
          '<span>' + c.qty + '</span>' +
          '<button data-action="qty-plus" data-id="' + c.id + '">+</button>' +
        '</div>' +
        '<button class="remove" data-action="remove-item" data-id="' + c.id + '">إزالة</button>' +
        '</div>' +
        '<div class="price">' + (c.price*c.qty) + ' ج.م</div></div>';
    }).join('');
  $('totalPrice').textContent = cartTotal() + ' ج.م';
}

function openDrawer(){ $('drawer').classList.add('open'); $('overlay').classList.add('show'); }
function closeDrawer(){ $('drawer').classList.remove('open'); $('overlay').classList.remove('show'); }
$('cartBtn').addEventListener('click', openDrawer);
$('drawerClose').addEventListener('click', closeDrawer);
$('overlay').addEventListener('click', closeDrawer);

/* ---------- checkout ---------- */
var appliedCoupon = null;
function openCheckout(){
  var cart = getCart();
  if(cart.length===0){ showToast('السلة فارغة'); return; }
  if(!currentUser){ closeDrawer(); openAuth('login'); showToast('سجّل الدخول لإتمام الطلب'); return; }
  appliedCoupon = null;
  renderCheckout();
  $('checkoutOverlay').classList.add('show');
  closeDrawer();
}
function closeCheckout(){ $('checkoutOverlay').classList.remove('show'); }
$('checkoutCloseBtn').addEventListener('click', closeCheckout);
$('checkoutOverlay').addEventListener('click', function(e){ if(e.target===$('checkoutOverlay')) closeCheckout(); });
$('checkoutBtn').addEventListener('click', openCheckout);

function couponDiscount(total){
  if(!appliedCoupon) return 0;
  if(appliedCoupon.type==='percent') return Math.round(total * appliedCoupon.value / 100);
  return Math.min(appliedCoupon.value, total);
}
function renderCheckout(){
  var cart = getCart();
  var total = cartTotal();
  var addrs = currentUser.addresses || [];
  var hasRx = cart.some(function(c){ var p = productById(c.id); return p && p.rx; });
  $('checkoutBody').innerHTML =
    '<div class="co-section"><h5>١. عنوان التوصيل</h5>' +
      (addrs.length ? addrs.map(function(a,i){
        return '<label class="radio-row' + (a.isDefault?' selected':'') + '"><input type="radio" name="coAddr" value="' + a.id + '"' + (a.isDefault?' checked':'') + '> <span><strong style="font-size:13px;">' + esc(a.label) + '</strong> — <span style="color:var(--muted); font-size:12px;">' + esc(a.detail) + '</span></span></label>';
      }).join('') : '<p style="font-size:13px; color:var(--muted);">لا توجد عناوين محفوظة.</p>') +
      '<button class="new-addr-btn" data-action="addr-add">+ إضافة عنوان جديد</button>' +
    '</div>' +
    '<div class="co-section"><h5>٢. وسيلة الدفع</h5>' +
      '<label class="radio-row selected"><input type="radio" name="coPay" value="cash" checked> الدفع عند الاستلام</label>' +
      '<label class="radio-row"><input type="radio" name="coPay" value="card"> بطاقة ائتمانية / مدى</label>' +
      '<label class="radio-row"><input type="radio" name="coPay" value="vodafone"> فودافون كاش</label>' +
    '</div>' +
    (hasRx ? '<div class="co-section" style="background:#fbf6ea; border-color:var(--gold-soft);"><h5>تنبيه</h5><p style="font-size:12.5px; color:var(--muted);">طلبك يحتوي على دواء يستلزم روشتة طبية — سيقوم الصيدلي بالتواصل معك للتأكيد قبل التجهيز.</p></div>' : '') +
    '<div class="co-section"><h5>٣. كوبون خصم (اختياري)</h5>' +
      '<div class="coupon-row"><input type="text" id="coCoupon" placeholder="أدخل الكود..."><button data-action="apply-coupon">تطبيق</button></div>' +
      '<div id="couponMsg" style="font-size:12px; margin-top:8px;"></div>' +
    '</div>' +
    '<div class="co-section"><h5>ملخص الطلب</h5>' +
      cart.map(function(c){ return '<div class="co-line"><span>' + esc(c.name) + ' × ' + c.qty + '</span><span>' + (c.price*c.qty) + ' ج.م</span></div>'; }).join('') +
      '<div class="co-line total"><span>الإجمالي</span><span id="coTotal">' + total + ' ج.م</span></div>' +
    '</div>' +
    '<button class="auth-submit" data-action="place-order">تأكيد الطلب</button>';
  qsa('input[name="coPay"]').forEach(function(r){
    r.addEventListener('change', function(){
      qsa('input[name="coPay"]').forEach(function(x){ x.closest('.radio-row').classList.toggle('selected', x.checked); });
    });
  });
  qsa('input[name="coAddr"]').forEach(function(r){
    r.addEventListener('change', function(){
      qsa('input[name="coAddr"]').forEach(function(x){ x.closest('.radio-row').classList.toggle('selected', x.checked); });
    });
  });
}
function applyCoupon(){
  var code = ($('coCoupon') ? $('coCoupon').value : '').trim().toUpperCase();
  var msg = $('couponMsg');
  if(!code){ msg.innerHTML = '<span style="color:var(--red);">أدخل كود الخصم أولًا</span>'; return; }
  var coupons = getJSON('site:coupons', []);
  var c = coupons.filter(function(x){ return x.code.toUpperCase()===code && x.active; })[0];
  if(!c){ appliedCoupon = null; msg.innerHTML = '<span style="color:var(--red);">كود غير صالح أو منتهي</span>'; }
  else {
    appliedCoupon = c;
    msg.innerHTML = '<span style="color:#2f6350; font-weight:700;">تم تطبيق الكود — وفر ' + couponDiscount(cartTotal()) + ' ج.م</span>';
  }
  var total = cartTotal() - couponDiscount(cartTotal());
  $('coTotal').textContent = total + ' ج.م';
}

function placeOrder(){
  var cart = getCart();
  if(!cart.length){ showToast('السلة فارغة'); return; }
  var addrId = qs('input[name="coAddr"]:checked');
  var payEl = qs('input[name="coPay"]:checked');
  if(!addrId){ showToast('اختَر عنوان التوصيل أولًا'); return; }
  var addr = (currentUser.addresses||[]).filter(function(a){ return String(a.id)===String(addrId.value); })[0];
  if(!addr){ showToast('اختَر عنوانًا صالحًا'); return; }
  var payment = payEl ? payEl.value : 'cash';
  var subtotal = cartTotal();
  var discount = couponDiscount(subtotal);
  var total = subtotal - discount;
  var orderNum = 'EX-' + (1000 + getJSON('site:orders', []).length + 1);
  var now = Date.now();
  var order = {
    id: orderNum, ts: now, date: formatDate(now), time: formatTime(now),
    customerKey: currentAccountKey, customerName: currentUser.name,
    customerContact: currentUser.email || currentUser.phone || '',
    address: addr.label + ' — ' + addr.detail, payment: payment,
    items: cart.map(function(c){ return {id:c.id, name:c.name, price:c.price, qty:c.qty}; }),
    itemCount: cart.reduce(function(s,c){ return s+c.qty; }, 0),
    subtotal: subtotal, discount: discount, coupon: appliedCoupon ? appliedCoupon.code : null,
    total: total, status: 'processing', statusLabel: 'قيد التجهيز',
    timeline: [{label:'تم استلام الطلب', time: now, done:true},{label:'قيد التجهيز بالصيدلية', time: now, done:true},{label:'في الطريق إليك', time: null, done:false},{label:'تم التسليم', time: null, done:false}]
  };
  var orders = getJSON('site:orders', []);
  orders.unshift(order);
  setJSON('site:orders', orders);
  /* decrement stock & bump sold */
  cart.forEach(function(c){
    var p = productById(c.id);
    if(p){ p.stock = Math.max(0, (p.stock||0) - c.qty); p.sold = (p.sold||0) + c.qty; }
  });
  setJSON('site:products', products);
  /* account updates */
  currentUser.orders.unshift({id:order.id, date:order.date, ts:now, items:order.itemCount, status:order.status, statusLabel:order.statusLabel, total:order.total, address:order.address, payment:payment, discount:discount, coupon:order.coupon, timeline:order.timeline});
  var earned = Math.max(1, Math.round(total * 0.05));
  currentUser.loyaltyPoints += earned;
  currentUser.loyaltyHistory.unshift({label:'طلب #' + order.id, points:earned, ts:now});
  currentUser.notifications.unshift({title:'تم استلام طلبك', detail:'الطلب #' + order.id + ' قيد التجهيز الآن', ts:now});
  saveAccount();
  setCart([]);
  updateCartUI();
  renderProducts(currentFilter);
  renderOverview(); renderOrdersPanel(); renderLoyalty(); renderNotifications();
  syncEvent();
  closeCheckout();
  showToast('تم إرسال طلبك بنجاح — رقمه #' + order.id);
  notifyBrowser('إليكسير', 'تم استلام طلبك #' + order.id + ' وسيصلك خلال ٦٠ دقيقة');
}

/* ---------- order auto-advance (demo simulation) + tracking ---------- */
var STATUS_FLOW = [['processing','قيد التجهيز'],['transit','في الطريق'],['done','تم التسليم']];
function advanceOrders(){
  var changed = false;
  var orders = getJSON('site:orders', []);
  orders.forEach(function(o){
    if(o.status==='done' || o.status==='rejected') return;
    var elapsed = Date.now() - (o.ts||0);
    var want = elapsed > 2*60*1000 ? 'done' : (elapsed > 60*1000 ? 'transit' : 'processing');
    if(want!==o.status){
      o.status = want;
      o.statusLabel = STATUS_FLOW.filter(function(s){ return s[0]===want; })[0][1];
      (o.timeline||[]).forEach(function(t,i){ if(i<=STATUS_FLOW.findIndex(function(s){return s[0]===want;})){ t.done = true; if(!t.time) t.time = Date.now(); } });
      changed = true;
      if(currentUser && o.customerKey===currentAccountKey){
        currentUser.notifications.unshift({title:'تحديث حالة الطلب #' + o.id, detail:'الطلب الآن: ' + o.statusLabel, ts:Date.now()});
        var myOrd = (currentUser.orders||[]).filter(function(x){ return x.id===o.id; })[0];
        if(myOrd){ myOrd.status = o.status; myOrd.statusLabel = o.statusLabel; myOrd.timeline = o.timeline; }
        saveAccount();
        renderNotifications(); renderOverview(); renderOrdersPanel();
        notifyBrowser('إليكسير', 'طلبك #' + o.id + ' الآن ' + o.statusLabel);
      }
    }
  });
  if(changed){ setJSON('site:orders', orders); syncEvent(); }
}
setInterval(advanceOrders, 15000);

function trackProgress(o){
  if(o.status==='done') return 100;
  if(o.status==='transit') return 55;
  if(o.status==='rejected') return 0;
  return 15;
}
function renderOrderDetail(orderId){
  var o = (currentUser.orders||[]).filter(function(x){ return x.id===orderId; })[0];
  var card = $('orderDetailCard');
  if(!o){ card.style.display='none'; return; }
  var prog = trackProgress(o);
  card.style.display = 'block';
  card.innerHTML = '<h4>تتبع الطلب #' + esc(o.id) + '</h4>' +
    '<div class="courier-chip"><span class="cd"></span> المندوب: محمود — تواصل: 01xxxxxxxxx</div>' +
    '<div class="track-map"><div class="map-grid"></div><div class="map-route"></div>' +
      '<div class="track-dot" style="right:calc(12% + ' + (prog*0.76) + '%);"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="13" height="10" rx="1.5"/><path d="M16 10h3l2 3v4h-5"/><circle cx="7.5" cy="18.5" r="1.5"/><circle cx="17.5" cy="18.5" r="1.5"/></svg></div>' +
      '<span class="map-label start">الصيدلية</span><span class="map-label end">منزلك</span></div>' +
    '<div class="track">' +
      ['تم استلام الطلب','قيد التجهيز','في الطريق','تم التسليم'].map(function(l,i){
        var t = (o.timeline||[])[i] || {};
        var doneIdx = STATUS_FLOW.findIndex(function(s){ return s[0]===o.status; });
        var done = o.status==='done' ? true : i <= doneIdx + 1;
        return '<div class="track-step' + (done?' done':'') + '"><div class="dot">' + (done?'✓':(i+1)) + '</div><span>' + l + (t.time?'<br><small style="font-size:10px;">' + formatTime(t.time) + '</small>':'') + '</span></div>';
      }).join('') +
    '</div>' +
    '<div class="co-line total" style="border:none; margin:0;"><span>إجمالي الطلب</span><span>' + o.total + ' ج.م</span></div>';
  card.scrollIntoView({behavior:'smooth', block:'nearest'});
}

/* ---------- wishlist ---------- */
function isWished(id){ return currentUser ? (currentUser.wishlist||[]).indexOf(id) > -1 : false; }
function toggleWish(id){
  if(!currentUser){ openAuth('login'); showToast('سجّل الدخول لحفظ المفضلة'); return; }
  var wl = currentUser.wishlist = currentUser.wishlist || [];
  var idx = wl.indexOf(id);
  if(idx>-1){ wl.splice(idx,1); } else { wl.push(id); }
  saveAccount();
  $('wishCount').textContent = wl.length;
  $('statWish').textContent = wl.length;
  renderProducts(currentFilter);
  renderWishlist();
}
function renderWishlist(){
  var wg = $('wishGrid');
  if(!currentUser){ wg.innerHTML=''; return; }
  var items = products.filter(function(p){ return isWished(p.id); });
  wg.innerHTML = items.length===0 ? '<p style="color:var(--muted); font-size:13.5px;">لا توجد منتجات في المفضلة بعد.</p>' :
    items.map(function(p){
      return '<div class="product-card"><div class="product-media">' + productImgHtml(p) +
        '<button class="wish-btn active" data-action="toggle-wish" data-id="' + p.id + '"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9.5-9C.8 7.3 2.6 4 6 4c2 0 3.3 1 4 2 1.2-1.5 3-2.5 5-2 3 .8 4.3 4.2 2.6 7.5C15 16 12 20 12 20z"/></svg></button>' +
      '</div><div class="product-info"><span class="p-cat">' + esc(p.catLabel) + '</span><h3>' + esc(p.name) + '</h3>' +
      '<div class="p-price"><span class="now">' + p.price + ' ج.م</span></div>' +
      '<button class="add-btn" data-action="add-cart" data-id="' + p.id + '"' + (p.stock<=0?' disabled':'') + '>أضف إلى السلة</button></div></div>';
    }).join('');
}

/* ---------- smart search ---------- */
function searchProducts(term){
  var t = normAr(term);
  if(!t) return [];
  var terms = [t];
  Object.keys(SYNONYMS).forEach(function(k){
    if(normAr(k).indexOf(t) > -1 || t.indexOf(normAr(k)) > -1) terms = terms.concat(SYNONYMS[k].map(normAr));
  });
  return products.filter(function(p){
    var name = normAr(p.name);
    var actives = (Array.isArray(p.active) ? p.active : String(p.active||'').split(',')).map(normAr);
    var cat = normAr(p.catLabel);
    return terms.some(function(x){
      return name.indexOf(x) > -1 || cat.indexOf(x) > -1 || actives.some(function(a){ return a && (a.indexOf(x) > -1 || x.indexOf(a) > -1); });
    });
  });
}
function runSearch(term){
  term = term.trim();
  var box = $('searchResults');
  if(!term){ box.innerHTML = '<div class="search-empty">اكتب اسم دواء أو مادة فعالة — جرّب: باراسيتامول، فيتامين، سيروم...</div>'; return; }
  var matches = searchProducts(term);
  if(matches.length===0){ box.innerHTML = '<div class="search-empty">لا توجد نتائج مطابقة لـ "' + esc(term) + '"</div>'; return; }
  box.innerHTML = matches.map(function(p){
    return '<button class="search-result" data-action="open-product" data-id="' + p.id + '">' +
      '<div class="thumb">' + iconSvg + '</div>' +
      '<div><strong>' + esc(p.name) + '</strong><span>' + esc(p.catLabel) + ' — ' + p.price + ' ج.م</span></div>' +
      (p.stock<=0 ? '<span class="stock-badge out">نفد</span>' : '') +
    '</button>';
  }).join('');
}
function openSearch(){ $('searchOverlay').classList.add('show'); setTimeout(function(){ $('searchInput').focus(); }, 100); }
function closeSearch(){ $('searchOverlay').classList.remove('show'); $('searchInput').value=''; }
$('searchBtn').addEventListener('click', openSearch);
$('searchCloseBtn').addEventListener('click', closeSearch);
$('searchOverlay').addEventListener('click', function(e){ if(e.target===$('searchOverlay')) closeSearch(); });
$('searchInput').addEventListener('input', function(e){ runSearch(e.target.value); });

/* ---------- prescription upload + OCR ---------- */
var rxImageData = null, rxMatched = [];
function openRxModal(){ $('rxOverlay').classList.add('show'); }
function closeRxModal(){ $('rxOverlay').classList.remove('show'); }
$('rxCta').addEventListener('click', function(){ if(!currentUser){ openAuth('login'); showToast('سجّل الدخول لرفع الروشتة'); return; } openRxModal(); });
$('rxCtaHero').addEventListener('click', function(){ if(!currentUser){ openAuth('login'); showToast('سجّل الدخول لرفع الروشتة'); return; } openRxModal(); });
$('rxCloseBtn').addEventListener('click', closeRxModal);
$('rxOverlay').addEventListener('click', function(e){ if(e.target===$('rxOverlay')) closeRxModal(); });
var rxFileInput = $('rxFileInput');
rxFileInput.addEventListener('change', function(e){ handleRxFile(e.target.files[0]); e.target.value=''; });
var rxDrop = $('rxDropZone');
['dragover','dragleave','drop'].forEach(function(ev){
  rxDrop.addEventListener(ev, function(e){ e.preventDefault(); if(ev==='drop' && e.dataTransfer.files[0]) handleRxFile(e.dataTransfer.files[0]); });
});

function handleRxFile(file){
  if(!file || !file.type.match(/image/)){ showToast('من فضلك ارفع صورة واضحة للروشتة'); return; }
  var reader = new FileReader();
  reader.onload = function(){
    var img = new Image();
    img.onload = function(){
      /* compress to keep localStorage small */
      var cv = document.createElement('canvas');
      var scale = Math.min(1, 900 / img.width);
      cv.width = img.width * scale; cv.height = img.height * scale;
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      rxImageData = cv.toDataURL('image/jpeg', 0.7);
      $('rxPreviewImg').src = rxImageData;
      $('rxPreviewWrap').style.display = 'block';
      $('rxSubmitBtn').disabled = false;
      runOCR(rxImageData);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function runOCR(imageData){
  var status = $('ocrStatus'), txt = $('ocrStatusText'), results = $('ocrResults');
  results.innerHTML = ''; rxMatched = [];
  if(typeof Tesseract === 'undefined'){
    status.style.display = 'flex';
    txt.textContent = 'قراءة تلقائية غير متاحة (لا يوجد اتصال) — أرسل الروشتة وسيقرأها الصيدلي يدويًا.';
    return;
  }
  status.style.display = 'flex';
  txt.textContent = 'جاري قراءة الروشتة وتعرف الأدوية...';
  Tesseract.recognize(imageData, 'eng+ara', { logger: function(m){ if(m.status==='recognizing text') txt.textContent = 'جاري قراءة الروشتة... ' + Math.round(m.progress*100) + '٪'; } })
    .then(function(res){
      status.style.display = 'none';
      var text = (res && res.data && res.data.text) || '';
      var normText = normAr(text);
      rxMatched = products.filter(function(p){
        var actives = (Array.isArray(p.active) ? p.active : String(p.active||'').split(','));
        return actives.concat([p.name]).some(function(a){ a = normAr(a); return a.length > 3 && normText.indexOf(a) > -1; });
      });
      if(rxMatched.length){
        results.innerHTML = '<p style="font-size:13px; font-weight:700; margin-top:6px;">أدوية تم التعرف عليها في الروشتة:</p>' + rxMatched.map(function(p){
          return '<div class="ocr-item"><div class="ocr-thumb">' + iconSvg + '</div>' +
            '<div class="ocr-body"><strong>' + esc(p.name) + '</strong><span>' + esc(p.catLabel) + ' — ' + p.price + ' ج.م</span></div>' +
            '<button data-action="ocr-add" data-id="' + p.id + '"' + (p.stock<=0?' disabled':'') + '>أضف للسلة</button></div>';
        }).join('');
      } else {
        results.innerHTML = '<p style="font-size:13px; color:var(--muted); margin-top:10px;">لم نتعرف على أدوية مطابقة تلقائيًا — لا مشكلة، الصيدلي هيراجع الروشتة يدويًا.</p>';
      }
    })
    .catch(function(){
      status.style.display = 'none';
      results.innerHTML = '<p style="font-size:13px; color:var(--muted); margin-top:10px;">تعذرت القراءة التلقائية — الصيدلي هيراجع الروشتة يدويًا.</p>';
    });
}

$('rxSubmitBtn').addEventListener('click', function(){
  if(!currentUser || !rxImageData){ showToast('ارفع صورة الروشتة أولًا'); return; }
  var rx = {
    id: 'RX-' + Date.now(), ts: Date.now(), date: formatDate(), time: formatTime(),
    customerKey: currentAccountKey, customerName: currentUser.name,
    customerContact: currentUser.email || currentUser.phone || '',
    image: rxImageData, notes: $('rxNotes').value.trim(),
    matched: rxMatched.map(function(p){ return p.id; }),
    status: 'transit', statusLabel: 'قيد المراجعة'
  };
  var list = getJSON('site:rx', []);
  list.unshift(rx);
  setJSON('site:rx', list);
  currentUser.prescriptions.unshift({id:rx.id, date:rx.date, ts:rx.ts, image:rx.image, notes:rx.notes, matched:rx.matched, status:rx.status, statusLabel:rx.statusLabel});
  currentUser.notifications.unshift({title:'تم استلام روشتتك', detail:'الروشتة قيد المراجعة الآن وسيتواصل معك الصيدلي', ts:Date.now()});
  saveAccount();
  syncEvent();
  renderPrescriptions(); renderOverview(); renderNotifications();
  rxImageData = null; $('rxPreviewWrap').style.display='none'; $('rxNotes').value=''; $('ocrResults').innerHTML='';
  $('rxSubmitBtn').disabled = true;
  closeRxModal();
  showToast('تم إرسال الروشتة للصيدلي بنجاح');
});
$('rxUploadDashBtn').addEventListener('click', openRxModal);

function renderPrescriptions(){
  var listEl = $('rxList');
  if(!currentUser){ listEl.innerHTML=''; return; }
  var list = currentUser.prescriptions || [];
  listEl.innerHTML = list.length===0 ? '<p style="color:var(--muted); font-size:13.5px;">لا توجد روشتات مرفوعة بعد.</p>' :
    list.map(function(r){
      return '<div class="rx-card">' +
        (r.image ? '<img class="rx-thumb-img" src="' + r.image + '" alt="روشتة" data-action="view-rx" data-id="' + r.id + '">' : '<div class="rx-ic">' + iconSvg + '</div>') +
        '<div class="rx-body"><strong>روشتة ' + esc(r.id) + '</strong><span>' + esc(r.date) + ' — ' + esc(r.time||'') + (r.notes ? ' — ملاحظات: ' + esc(r.notes) : '') + '</span></div>' +
        pillHtml(r.status, r.statusLabel) + '</div>';
    }).join('');
}

/* ---------- auth ---------- */
var currentUser = null, currentAccountKey = null, defaultDropdownHTML = '';
var authOverlay = $('authOverlay');
function emptyAccount(name){ return { name:name||'مستخدم', email:'', phone:'', orders:[], prescriptions:[], wishlist:[], addresses:[], subscriptions:[], loyaltyPoints:0, loyaltyHistory:[], notifications:[] }; }
function loadAccount(key, fallbackName){
  var acc = getJSON('account:' + key, null);
  return acc ? Object.assign(emptyAccount(fallbackName), acc) : emptyAccount(fallbackName);
}
function saveAccount(){ if(currentUser && currentAccountKey) setJSON('account:' + currentAccountKey, currentUser); }

function openAuth(tab){ switchAuthTab(tab||'login'); authOverlay.classList.add('show'); }
function closeAuth(){ authOverlay.classList.remove('show'); }
function clearAuthFields(){ ['loginEmail','loginPass','regName','regEmail','regPhone','regPass'].forEach(function(i){ $(i).value=''; }); ['loginEmailField','loginPassField','regNameField','regEmailField','regPhoneField','regPassField'].forEach(function(i){ $(i).classList.remove('invalid'); }); }
function switchAuthTab(tab){
  qsa('.auth-tab').forEach(function(t){ t.classList.toggle('active', t.dataset.tab===tab); });
  $('loginForm').classList.toggle('active', tab==='login');
  $('registerForm').classList.toggle('active', tab==='register');
  $('authSwitchHint').innerHTML = tab==='login'
    ? 'ليس لديك حساب؟ <button type="button" id="hintToRegister">أنشئ حسابًا جديدًا</button>'
    : 'لديك حساب بالفعل؟ <button type="button" id="hintToLogin">سجّل الدخول</button>';
}
qsa('.auth-tab').forEach(function(t){ t.addEventListener('click', function(){ switchAuthTab(t.dataset.tab); }); });
$('authSwitchHint').addEventListener('click', function(e){
  if(e.target.id==='hintToRegister') switchAuthTab('register');
  if(e.target.id==='hintToLogin') switchAuthTab('login');
});
authOverlay.addEventListener('click', function(e){ if(e.target===authOverlay) closeAuth(); });
$('authCloseBtn').addEventListener('click', closeAuth);
$('openLoginBtn').addEventListener('click', function(){ clearAuthFields(); openAuth('login'); });
function setInvalid(id, bad){ $(id).classList.toggle('invalid', bad); }
function prettifyName(raw){ var c = raw.replace(/[._0-9]/g,' ').trim().split(' ')[0]; return c ? c.charAt(0).toUpperCase()+c.slice(1) : 'مستخدم'; }

function submitLogin(){
  var email = $('loginEmail').value.trim(), pass = $('loginPass').value.trim(), ok = true;
  if(email.length < 3){ setInvalid('loginEmailField', true); ok=false; } else setInvalid('loginEmailField', false);
  if(pass.length < 4){ setInvalid('loginPassField', true); ok=false; } else setInvalid('loginPassField', false);
  if(!ok) return;
  var adminCreds = getJSON('site:admin-creds', {email:'admin@elixir.com', password:'Elixir@2026'});
  if(email.toLowerCase()===adminCreds.email.toLowerCase() && pass===adminCreds.password){
    lsSet('session:admin-active', JSON.stringify({ts:Date.now()}));
    closeAuth(); applyAdminLoggedInUI();
    if(window.AdminApp) window.AdminApp.open();
    return;
  }
  var isEmail = email.indexOf('@') > -1;
  doLogin(email.toLowerCase(), prettifyName(isEmail ? email.split('@')[0] : 'مستخدم إليكسير'), isEmail?email:'', !isEmail?email:'');
}
$('loginSubmitBtn').addEventListener('click', submitLogin);
qsa('#loginForm input').forEach(function(i){ i.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); submitLogin(); } }); });

function submitRegister(){
  var name = $('regName').value.trim(), email = $('regEmail').value.trim(), phone = $('regPhone').value.trim(), pass = $('regPass').value.trim(), ok = true;
  if(name.length < 3){ setInvalid('regNameField', true); ok=false; } else setInvalid('regNameField', false);
  if(email.indexOf('@')===-1 || email.length < 5){ setInvalid('regEmailField', true); ok=false; } else setInvalid('regEmailField', false);
  if(phone.length < 8){ setInvalid('regPhoneField', true); ok=false; } else setInvalid('regPhoneField', false);
  if(pass.length < 4){ setInvalid('regPassField', true); ok=false; } else setInvalid('regPassField', false);
  if(!ok) return;
  doLogin(email.toLowerCase(), name, email, phone, true);
}
$('registerSubmitBtn').addEventListener('click', submitRegister);
qsa('#registerForm input').forEach(function(i){ i.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); submitRegister(); } }); });

$('forgotPassBtn').addEventListener('click', function(){
  openPrompt({title:'استعادة كلمة المرور', desc:'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين (تجريبي — بدون خادم)', label:'البريد الإلكتروني', placeholder:'example@mail.com'}, function(v){
    if(v && v.indexOf('@')>-1) showToast('تم إرسال رابط الاستعادة إلى ' + v);
    else showToast('أدخل بريدًا إلكترونيًا صحيحًا');
  });
});

function doLogin(key, fallbackName, email, phone, isRegister){
  var customers = getJSON('site:customers', []);
  var existing = customers.filter(function(c){ return c.key===key; })[0];
  if(existing && existing.blocked){ showToast('هذا الحساب محظور من الدخول، تواصل مع خدمة العملاء'); return; }
  currentUser = loadAccount(key, fallbackName);
  currentUser.name = fallbackName || currentUser.name;
  if(email) currentUser.email = email;
  if(phone) currentUser.phone = phone;
  currentAccountKey = key;
  saveAccount();
  var cust = customers.filter(function(c){ return c.key===key; })[0];
  if(cust){ cust.name = currentUser.name; if(email) cust.email = email; if(phone) cust.phone = phone; }
  else customers.unshift({key:key, name:currentUser.name, email:email||'', phone:phone||'', joined:formatDate(), ts:Date.now()});
  setJSON('site:customers', customers);
  applyLoggedInUI();
  syncEvent();
  showToast(isRegister ? 'تم إنشاء حسابك بنجاح، أهلًا بك في إليكسير' : 'تم تسجيل الدخول بنجاح');
}

function applyLoggedInUI(){
  closeAuth();
  $('loggedOutActions').style.display = 'none';
  $('loggedInActions').style.display = 'block';
  var initial = (currentUser.name||'م').trim().charAt(0);
  $('userAvatar').textContent = initial;
  $('dashAvatar').textContent = initial;
  $('userNameLabel').textContent = (currentUser.name||'مستخدم').split(' ')[0];
  $('welcomeName').textContent = 'أهلًا بعودتك، ' + (currentUser.name||'عزيزنا') + ' 👋';
  $('settingsName').value = currentUser.name||'';
  $('settingsEmail').value = currentUser.email||'';
  $('settingsPhone').value = currentUser.phone||'';
  $('wishCount').textContent = (currentUser.wishlist||[]).length;
  updateCartUI();
  renderProducts(currentFilter);
  renderOverview(); renderOrdersPanel(); renderPrescriptions(); renderWishlist(); renderLoyalty(); renderAddresses(); renderSubscriptions(); renderNotifications();
}
function logout(){
  currentUser = null; currentAccountKey = null;
  $('loggedOutActions').style.display = 'flex';
  $('loggedInActions').style.display = 'none';
  $('userDropdown').classList.remove('open');
  $('wishCount').textContent = '0';
  updateCartUI();
  renderProducts(currentFilter);
  closeDashboard();
  showToast('تم تسجيل الخروج');
}
function applyAdminLoggedInUI(){
  defaultDropdownHTML = defaultDropdownHTML || $('userDropdown').innerHTML;
  $('loggedOutActions').style.display = 'none';
  $('loggedInActions').style.display = 'block';
  $('userAvatar').textContent = 'A';
  $('userNameLabel').textContent = 'الإدارة';
  $('userDropdown').innerHTML =
    '<button data-action="open-admin"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> لوحة الإدارة</button>' +
    '<div class="divider"></div>' +
    '<button data-action="admin-logout"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg> تسجيل الخروج</button>';
  $('userDropdown').classList.remove('open');
}
function adminLogout(){
  if(window.AdminApp) window.AdminApp.close();
  lsDel('session:admin-active');
  resetHeaderToLoggedOut();
  showToast('تم تسجيل الخروج من لوحة الإدارة');
}
function resetHeaderToLoggedOut(){
  if(defaultDropdownHTML) $('userDropdown').innerHTML = defaultDropdownHTML;
  $('loggedInActions').style.display = 'none';
  $('loggedOutActions').style.display = 'flex';
}
window.AdminUI = { applyAdmin: applyAdminLoggedInUI, clearAdmin: resetHeaderToLoggedOut };

$('userChip').addEventListener('click', function(e){
  if(e.target.closest('#userDropdown')) return;
  e.stopPropagation();
  $('userDropdown').classList.toggle('open');
});
document.addEventListener('click', function(e){
  var chip = $('userChip');
  if(chip && !chip.contains(e.target)) $('userDropdown').classList.remove('open');
  var nw = qs('.notif-wrap');
  if(nw && !nw.contains(e.target)) $('notifDropdown').classList.remove('open');
});
$('notifBtn').addEventListener('click', function(e){ e.stopPropagation(); $('notifDropdown').classList.toggle('open'); });

/* ---------- dashboard ---------- */
var panelTitles = {overview:'نظرة عامة', orders:'طلباتي', subscriptions:'اشتراكاتي', prescriptions:'الروشتات', wishlist:'المفضلة', loyalty:'نقاط الولاء', addresses:'العناوين', settings:'الإعدادات'};
function openDashboard(panel){
  if(!currentUser){ openAuth('login'); return; }
  document.body.classList.remove('admin-active');
  document.body.classList.add('dash-active');
  $('siteView').style.display = 'none';
  $('dashboardView').style.display = 'block';
  window.scrollTo(0,0);
  switchPanel(panel || 'overview');
}
function closeDashboard(){
  document.body.classList.remove('dash-active');
  $('dashboardView').style.display = 'none';
  $('siteView').style.display = 'block';
}
function switchPanel(panel){
  qsa('#dashNav button').forEach(function(b){ b.classList.toggle('active', b.dataset.panel===panel); });
  qsa('.dash-panel').forEach(function(p){ p.classList.toggle('active', p.id==='panel-'+panel); });
  $('dashTitle').textContent = panelTitles[panel] || 'حسابي';
  if(panel==='wishlist') renderWishlist();
  if(panel==='addresses') renderAddresses();
  if(panel==='subscriptions') renderSubscriptions();
}
$('dashNav').addEventListener('click', function(e){
  var btn = e.target.closest('button'); if(!btn) return;
  switchPanel(btn.dataset.panel);
});
$('backToStoreBtn').addEventListener('click', closeDashboard);
$('shopNowBtn').addEventListener('click', function(){ closeDashboard(); scrollToProducts(); });
$('logoHome').addEventListener('click', function(){ closeDashboard(); window.scrollTo({top:0, behavior:'smooth'}); });

function renderOverview(){
  if(!currentUser) return;
  $('statOrders').textContent = (currentUser.orders||[]).length;
  $('statPoints').textContent = currentUser.loyaltyPoints || 0;
  $('statRx').textContent = (currentUser.prescriptions||[]).filter(function(r){ return r.status==='transit'; }).length;
  $('statWish').textContent = (currentUser.wishlist||[]).length;
  var recent = (currentUser.orders||[]).slice(0,4);
  $('overviewOrders').innerHTML = recent.length===0
    ? '<tr><td colspan="4" style="color:var(--muted); padding:18px 0;">لا توجد طلبات بعد</td></tr>'
    : recent.map(function(o){ return '<tr><td>#' + esc(o.id) + '</td><td>' + esc(o.date) + '</td><td>' + pillHtml(o.status,o.statusLabel) + '</td><td>' + o.total + ' ج.م</td></tr>'; }).join('');
  var subs = currentUser.subscriptions || [];
  $('overviewSubs').innerHTML = subs.length===0
    ? '<p style="color:var(--muted); font-size:13.5px;">لا توجد اشتراكات — دوائك المزمن يوصلك تلقائيًا كل فترة.</p>'
    : subs.map(function(s){
        var p = productById(s.productId);
        return '<div class="rx-card"><div class="rx-ic">' + iconSvg + '</div><div class="rx-body"><strong>' + esc(p?p.name:'منتج محذوف') + '</strong><span>كل ' + s.days + ' يوم — آخر تنفيذ: ' + (s.lastRun ? formatDate(s.lastRun) : 'لم ينفذ بعد') + '</span></div>' + (isSubDue(s)?'<span class="sub-due">يستحق الآن</span>':'') + '</div>';
      }).join('');
}
function renderOrdersPanel(){
  if(!currentUser) return;
  var all = currentUser.orders || [];
  $('allOrders').innerHTML = all.length===0
    ? '<tr><td colspan="6" style="color:var(--muted); padding:18px 0;">لا توجد طلبات بعد</td></tr>'
    : all.map(function(o){
        return '<tr><td>#' + esc(o.id) + '</td><td>' + esc(o.date) + '</td><td>' + o.items + '</td><td>' + pillHtml(o.status,o.statusLabel) + '</td><td>' + o.total + ' ج.م</td>' +
          '<td><button class="link-btn" data-action="view-order" data-id="' + o.id + '">تتبع</button></td></tr>';
      }).join('');
}

/* ---------- subscriptions ---------- */
function isSubDue(s){ return !s.lastRun || (Date.now() - s.lastRun) >= s.days * 86400000; }
function renderSubscriptions(){
  if(!currentUser) return;
  $('subProduct').innerHTML = products.filter(function(p){ return p.stock > 0; }).map(function(p){
    return '<option value="' + p.id + '">' + esc(p.name) + ' — ' + p.price + ' ج.م</option>';
  }).join('');
  var subs = currentUser.subscriptions || [];
  $('subsList').innerHTML = subs.length===0 ? '<p style="color:var(--muted); font-size:13.5px;">لا توجد اشتراكات نشطة.</p>' :
    subs.map(function(s){
      var p = productById(s.productId);
      return '<div class="sub-card"><div class="sub-ic">' + iconSvg + '</div>' +
        '<div class="sub-body"><strong>' + esc(p?p.name:'منتج محذوف') + '</strong><span>كل ' + s.days + ' يوم — ' + (p ? p.price + ' ج.م' : '') + '</span></div>' +
        (isSubDue(s) ? '<span class="sub-due">يستحق الآن</span>' : '') +
        '<div class="sub-actions">' +
          '<button class="btn-run" data-action="sub-run" data-id="' + s.id + '"' + (isSubDue(s) && p && p.stock>0 ? '' : ' disabled style="opacity:.4;"') + '>جهّز طلبي الآن</button>' +
          '<button class="btn-del" data-action="sub-del" data-id="' + s.id + '">إلغاء</button>' +
        '</div></div>';
    }).join('');
}
function addSubscription(productId, days){
  if(!currentUser){ openAuth('login'); return; }
  currentUser.subscriptions = currentUser.subscriptions || [];
  currentUser.subscriptions.push({id:Date.now(), productId:productId, days:days||30, lastRun:null, createdAt:Date.now()});
  saveAccount();
  renderSubscriptions(); renderOverview();
  showToast('تم إضافة الاشتراك — هنجهز طلبك تلقائيًا كل ' + (days||30) + ' يوم');
}
$('subAddBtn').addEventListener('click', function(){
  addSubscription(parseInt($('subProduct').value,10), parseInt($('subInterval').value,10));
});
function runSubscription(subId){
  var s = (currentUser.subscriptions||[]).filter(function(x){ return x.id===subId; })[0];
  if(!s) return;
  var p = productById(s.productId);
  if(!p || p.stock<=0){ showToast('المنتج غير متوفر حاليًا بالمخزون'); return; }
  if(!isSubDue(s)){ showToast('الاشتراك لسه مش مستحق — آخر تنفيذ ' + formatDate(s.lastRun)); return; }
  addToCart(p.id, 1);
  s.lastRun = Date.now();
  saveAccount();
  renderSubscriptions(); renderOverview();
  showToast('تم تجهيز طلب اشتراكك — أكمل الدفع من السلة');
}

/* ---------- addresses ---------- */
function renderAddresses(){
  var grid = $('addrGrid');
  if(!currentUser){ grid.innerHTML=''; return; }
  var list = currentUser.addresses || [];
  var cards = list.length===0 ? '<p style="color:var(--muted); font-size:13.5px; grid-column:1/-1;">لا توجد عناوين محفوظة بعد.</p>' :
    list.map(function(a){
      return '<div class="addr-card' + (a.isDefault?' default':'') + '">' +
        (a.isDefault ? '<span class="def-tag">الافتراضي</span>' : '') +
        '<strong>' + esc(a.label) + '</strong><p>' + esc(a.detail) + '</p>' +
        '<div class="addr-actions">' +
          '<button data-action="addr-edit" data-id="' + a.id + '">تعديل</button>' +
          (a.isDefault ? '' : '<button data-action="addr-default" data-id="' + a.id + '">تعيين كافتراضي</button>') +
          '<button class="danger" data-action="addr-delete" data-id="' + a.id + '">حذف</button>' +
        '</div></div>';
    }).join('');
  grid.innerHTML = cards + '<button class="addr-add" data-action="addr-add">' +
    '<svg viewBox="0 0 24 24" width="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>إضافة عنوان جديد</button>';
}
function addrPrompt(){
  openPrompt({title:'عنوان جديد', desc:'أدخل اسم العنوان ثم التفاصيل', label:'اسم العنوان (مثال: المنزل)', placeholder:'المنزل'}, function(label){
    if(!label || !label.trim()) return;
    openPrompt({title:'تفاصيل العنوان', desc:'اكتب العنوان بالكامل: المنطقة، الشارع، رقم العمارة، الدور', label:'تفاصيل العنوان', placeholder:'مثال: مدينة نصر، شارع عباس العقاد، عمارة ٥، الدور ٣'}, function(detail){
      if(!detail || !detail.trim()) return;
      currentUser.addresses = currentUser.addresses || [];
      currentUser.addresses.push({id:Date.now(), label:label.trim(), detail:detail.trim(), isDefault: currentUser.addresses.length===0});
      saveAccount(); renderAddresses();
      showToast('تم إضافة العنوان بنجاح');
    });
  });
}

/* ---------- loyalty / notifications / settings ---------- */
function renderLoyalty(){
  if(!currentUser) return;
  var pts = currentUser.loyaltyPoints || 0;
  $('loyaltyBarFill').style.width = Math.min(100, Math.round(pts/1500*100)) + '%';
  $('loyaltySummary').innerHTML = pts===0
    ? 'لسه معندكش نقاط ولاء — أول طلب هيبدأ رصيدك 🎉'
    : 'لديك <strong style="color:var(--emerald-deep)">' + pts + '</strong> نقطة' + (pts<1500 ? ' — بقي <strong style="color:var(--emerald-deep)">' + (1500-pts) + '</strong> نقطة لتصل لمستوى الذهبي' : ' — وصلت لمستوى الذهبي 🏆');
  $('loyaltyHistory').innerHTML = (currentUser.loyaltyHistory||[]).length===0
    ? '<p style="color:var(--muted); font-size:13.5px;">لا يوجد سجل نقاط بعد.</p>'
    : currentUser.loyaltyHistory.map(function(h){
        return '<div class="loyalty-row"><span>' + esc(h.label) + '</span><span class="pts"' + (h.points<0?' style="color:var(--red)"':'') + '>' + (h.points>0?'+':'') + h.points + ' نقطة</span></div>';
      }).join('');
}
$('redeemBtn').addEventListener('click', function(){
  if(!currentUser) return;
  if((currentUser.loyaltyPoints||0) < 500){ showToast('تحتاج ٥٠٠ نقطة على الأقل للاستبدال'); return; }
  currentUser.loyaltyPoints -= 500;
  currentUser.loyaltyHistory.unshift({label:'استبدال قسيمة خصم ٥٠ ج.م', points:-500, ts:Date.now()});
  var coupons = getJSON('site:coupons', []);
  var code = 'LOYAL' + Math.random().toString(36).slice(2,7).toUpperCase();
  coupons.unshift({code:code, type:'fixed', value:50, active:true});
  setJSON('site:coupons', coupons);
  saveAccount(); renderLoyalty(); renderOverview(); syncEvent();
  showToast('تم استبدال ٥٠٠ نقطة — كود الخصم: ' + code);
});
function renderNotifications(){
  if(!currentUser) return;
  var list = currentUser.notifications || [];
  $('notifList').innerHTML = list.length===0 ? '<div class="notif-item">لا توجد إشعارات بعد</div>' :
    list.slice(0,8).map(function(n){ return '<div class="notif-item"><strong>' + esc(n.title) + '</strong><span>' + esc(n.detail) + '</span></div>'; }).join('');
  $('notifBadge').style.display = list.length ? 'flex' : 'none';
  $('notifBadge').textContent = list.length;
}
function notifyBrowser(title, body){
  try{
    if(!('Notification' in window) || Notification.permission!=='granted') return;
    new Notification(title, {body:body});
  }catch(e){}
}
$('profileSaveBtn').addEventListener('click', function(){
  if(!currentUser) return;
  currentUser.name = $('settingsName').value.trim() || currentUser.name;
  currentUser.email = $('settingsEmail').value.trim();
  currentUser.phone = $('settingsPhone').value.trim();
  saveAccount();
  $('userNameLabel').textContent = currentUser.name.split(' ')[0] || 'مستخدم';
  $('welcomeName').textContent = 'أهلًا بعودتك، ' + currentUser.name + ' 👋';
  showToast('تم حفظ البيانات بنجاح');
});
$('passwordSaveBtn').addEventListener('click', function(){
  var v = $('newPassword').value.trim();
  if(v.length < 4){ showToast('كلمة المرور قصيرة جدًا'); return; }
  $('newPassword').value = '';
  showToast('تم تحديث كلمة المرور');
});

/* ---------- global delegated actions ---------- */
document.addEventListener('click', function(e){
  var el = e.target.closest('[data-action]');
  if(!el) return;
  var action = el.dataset.action;
  var id = el.dataset.id ? (isNaN(+el.dataset.id) ? el.dataset.id : +el.dataset.id) : null;
  switch(action){
    case 'toggle-wish': toggleWish(id); break;
    case 'add-cart': addToCart(id); break;
    case 'qty-plus': changeQty(id, 1); break;
    case 'qty-minus': changeQty(id, -1); break;
    case 'remove-item': removeFromCart(id); break;
    case 'open-product': closeSearch(); openProductDetail(id); break;
    case 'close-product-modal': closeProductDetail(); break;
    case 'pd-qty':
      var p = productById(+$('productModalContent').querySelector('[data-action="pd-add"]').dataset.id);
      detailQty = Math.max(1, Math.min(detailQty + (+el.dataset.d), p ? p.stock : 99));
      $('pdQty').textContent = detailQty;
      break;
    case 'pd-add': addToCart(id, detailQty); break;
    case 'pd-subscribe': addSubscription(id, 30); break;
    case 'pd-review': {
      var rating = +($('productModalContent').dataset.rating || 0);
      var text = ($('rvText') ? $('rvText').value : '').trim();
      if(!rating){ showToast('اختَر عدد النجوم أولًا'); break; }
      if(text.length < 3){ showToast('اكتب رأيك باختصار'); break; }
      var prod = productById(id);
      prod.reviews = prod.reviews || [];
      prod.reviews.unshift({name: currentUser.name, rating: rating, text: text, date: Date.now()});
      setJSON('site:products', products);
      renderProducts(currentFilter);
      openProductDetail(id);
      syncEvent();
      showToast('شكرًا لك — تم نشر تقييمك');
      break;
    }
    case 'open-auth': closeProductDetail(); openAuth('login'); break;
    case 'apply-coupon': applyCoupon(); break;
    case 'place-order': placeOrder(); break;
    case 'view-order': renderOrderDetail(id); break;
    case 'ocr-add': addToCart(id, 1); el.disabled = true; el.textContent = 'أُضيف ✓'; break;
    case 'view-rx': {
      var r = (currentUser.prescriptions||[]).filter(function(x){ return x.id===id; })[0];
      if(r && r.image){
        var w = window.open('', '_blank');
        if(w){ w.document.write('<html dir="rtl"><head><title>روشتة ' + esc(id) + '</title></head><body style="margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#111;"><img src="' + r.image + '" style="max-width:100%; max-height:100vh;"></body></html>'); }
      }
      break;
    }
    case 'addr-add': addrPrompt(); break;
    case 'addr-delete':
      confirmModal('حذف العنوان', 'هل أنت متأكد من حذف هذا العنوان؟', function(){
        currentUser.addresses = currentUser.addresses.filter(function(a){ return a.id!==id; });
        saveAccount(); renderAddresses(); showToast('تم حذف العنوان');
      });
      break;
    case 'addr-default':
      currentUser.addresses.forEach(function(a){ a.isDefault = (a.id===id); });
      saveAccount(); renderAddresses(); showToast('تم تعيين العنوان كافتراضي');
      break;
    case 'addr-edit': {
      var addr = (currentUser.addresses||[]).filter(function(a){ return a.id===id; })[0];
      if(addr) openPrompt({title:'تعديل العنوان', desc:addr.label, label:'التفاصيل', value:addr.detail}, function(v){
        if(v && v.trim()){ addr.detail = v.trim(); saveAccount(); renderAddresses(); showToast('تم تحديث العنوان'); }
      });
      break;
    }
    case 'sub-run': runSubscription(id); break;
    case 'sub-del':
      confirmModal('إلغاء الاشتراك', 'هل أنت متأكد من إلغاء هذا الاشتراك؟', function(){
        currentUser.subscriptions = (currentUser.subscriptions||[]).filter(function(x){ return x.id!==id; });
        saveAccount(); renderSubscriptions(); renderOverview(); showToast('تم إلغاء الاشتراك');
      });
      break;
    case 'toggle-switch': el.classList.toggle('on'); break;
    case 'toggle-notifications':
      el.classList.toggle('on');
      if(el.classList.contains('on') && 'Notification' in window){
        if(Notification.permission==='default') Notification.requestPermission().then(function(p){
          showToast(p==='granted' ? 'تم تفعيل إشعارات المتصفح' : 'تم رفض الإذن من المتصفح');
          if(p!=='granted') el.classList.remove('on');
        });
        else if(Notification.permission==='denied'){ showToast('الإشعارات محظورة من إعدادات المتصفح'); el.classList.remove('on'); }
      }
      break;
    case 'open-dashboard': openDashboard(el.dataset.panel); break;
    case 'open-admin': if(window.AdminApp) window.AdminApp.open(); break;
    case 'admin-logout': adminLogout(); break;
    case 'logout': logout(); break;
    case 'filter-category': filterByCategory(el.dataset.cat); break;
    case 'social': showToast('تابعنا على ' + el.dataset.name + ' — قريبًا رابط مباشر'); break;
  }
});

/* ---------- chat ---------- */
var chatOverlay = $('chatOverlay');
var chatReplies = [
  'تمام، وضّحلي الأعراض اللي حاسس بيها وهقولك أنسب حل.',
  'تقدر تاخده بعد الأكل مباشرة لتقليل أي إزعاج في المعدة.',
  'أنصحك بمراجعة الطبيب لو الأعراض استمرت أكتر من يومين.',
  'الجرعة المناسبة مكتوبة على النشرة الداخلية، وأقدر أأكدهالك لو بعتلي اسم الدواء.',
  'تمام، هجهزلك الطلب دلوقتي ويوصلك خلال ٦٠ دقيقة.'
];
function openChat(){ chatOverlay.classList.add('show'); }
function closeChat(){ chatOverlay.classList.remove('show'); }
function sendChat(){
  var input = $('chatInput'), text = input.value.trim();
  if(!text) return;
  var body = $('chatBody');
  var me = document.createElement('div'); me.className='chat-msg me'; me.textContent=text;
  body.appendChild(me); input.value=''; body.scrollTop = body.scrollHeight;
  setTimeout(function(){
    var bot = document.createElement('div'); bot.className='chat-msg bot';
    bot.textContent = chatReplies[Math.floor(Math.random()*chatReplies.length)];
    body.appendChild(bot); body.scrollTop = body.scrollHeight;
  }, 700);
}
$('consultBtnHeader').addEventListener('click', openChat);
$('consultBtnBanner').addEventListener('click', openChat);
$('chatCloseBtn').addEventListener('click', closeChat);
chatOverlay.addEventListener('click', function(e){ if(e.target===chatOverlay) closeChat(); });
$('chatSendBtn').addEventListener('click', sendChat);
$('chatInput').addEventListener('keydown', function(e){ if(e.key==='Enter') sendChat(); });

/* ---------- misc UI ---------- */
var burger = $('burger'), mobileNav = $('mobileNav');
burger.addEventListener('click', function(){ mobileNav.classList.toggle('open'); });
mobileNav.addEventListener('click', function(e){ if(e.target.tagName==='A') mobileNav.classList.remove('open'); });
$('faq').addEventListener('click', function(e){
  var q = e.target.closest('.faq-q'); if(!q) return;
  var item = q.parentElement, a = item.querySelector('.faq-a');
  var isOpen = item.classList.contains('open');
  qsa('.faq-item').forEach(function(f){ f.classList.remove('open'); f.querySelector('.faq-a').style.maxHeight = null; });
  if(!isOpen){ item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
});
function submitNewsletter(){
  var email = $('newsletterEmail').value.trim();
  if(email.indexOf('@')===-1){ showToast('من فضلك أدخل بريدًا إلكترونيًا صحيحًا'); return; }
  showToast('تم الاشتراك بنجاح'); $('newsletterEmail').value='';
}
$('newsletterSubmitBtn').addEventListener('click', submitNewsletter);
$('newsletterEmail').addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); submitNewsletter(); } });

/* static testimonials (review system lives on products) */
$('testimonialsGrid').innerHTML = [
  {av:'م.س', name:'منى سامي', city:'القاهرة', text:'الطلب وصل في أقل من ٤٥ دقيقة، والصيدلي شرحلي طريقة استخدام الدواء بالتفصيل. تجربة راقية فعلاً.'},
  {av:'أ.ك', name:'أحمد كامل', city:'الجيزة', text:'رفعت روشتة والدتي وتم التواصل معايا للتأكيد قبل التوصيل، حسيت بمصداقية عالية جدًا.'},
  {av:'ي.ح', name:'ياسمين حسن', city:'الإسكندرية', text:'تشكيلة العناية بالبشرة عندهم أصلية ومتنوعة، وبرنامج النقاط بيوفر فلوس كتير مع الوقت.'}
].map(function(t){
  return '<div class="test-card"><div class="stars">★★★★★</div><p>' + t.text + '</p>' +
    '<div class="test-who"><div class="test-avatar">' + t.av + '</div><div><strong>' + t.name + '</strong><span>' + t.city + '</span></div></div></div>';
}).join('');

/* ---------- live sync (cross-tab + admin same-tab events) ---------- */
function refreshLiveData(){
  categories = loadCategories();
  var oldProds = products;
  products = loadProducts();
  renderCategories(); renderTabs(); renderProducts(currentFilter);
  if(currentUser){
    var customers = getJSON('site:customers', []);
    var me = customers.filter(function(c){ return c.key===currentAccountKey; })[0];
    if(me && me.blocked){ showToast('تم حظر حسابك من قبل الإدارة'); logout(); return; }
    var acc = getJSON('account:' + currentAccountKey, null);
    if(acc){
      currentUser = Object.assign(emptyAccount(currentUser.name), acc);
      if($('dashboardView').style.display==='block'){ renderOverview(); renderOrdersPanel(); renderLoyalty(); renderNotifications(); renderPrescriptions(); renderSubscriptions(); }
    }
  }
  if($('adminView').style.display==='block' && window.AdminApp && window.AdminApp.refresh) window.AdminApp.refresh();
}
window.addEventListener('storage', function(e){ if(e.key && e.key.indexOf('site:')===0) refreshLiveData(); });
window.addEventListener('elixir:sync', refreshLiveData);

/* ---------- preloader ---------- */
(function(){
  function hidePreloader(){
    var p = $('preloader'); if(!p || p.dataset.done) return;
    p.dataset.done = '1'; p.classList.add('done');
    setTimeout(function(){ if(p.parentNode) p.parentNode.removeChild(p); }, 700);
  }
  window.addEventListener('load', function(){ setTimeout(hidePreloader, 500); });
  setTimeout(hidePreloader, 3200);
})();

/* ---------- init ---------- */
defaultDropdownHTML = $('userDropdown').innerHTML;
renderCategories();
renderTabs();
renderProducts('all');
updateCartUI();
/* admin session auto-open handled by admin.js */

/* ---------- PWA service worker ---------- */
if('serviceWorker' in navigator && location.protocol.indexOf('http')===0){
  window.addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
}

/* shared API for admin.js */
window.Elixir = { esc:esc, getJSON:getJSON, setJSON:setJSON, showToast:showToast, openPrompt:openPrompt, confirmModal:confirmModal, sync:syncEvent, formatDate:formatDate, formatTime:formatTime, pillHtml:pillHtml };
})();