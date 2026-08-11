/* ═══════════════════════════════════════
   DİCLE ARSA OFİSİ — Firebase App
═══════════════════════════════════════ */

/* ── Firebase Init ── */
const firebaseConfig = {
  apiKey:            "AIzaSyCHd4yMicdzq7lWjUk8IbgQJCwD21x0f5U",
  authDomain:        "diclearsaofisi-72565.firebaseapp.com",
  projectId:         "diclearsaofisi-72565",
  storageBucket:     "diclearsaofisi-72565.firebasestorage.app",
  messagingSenderId: "419244248370",
  appId:             "1:419244248370:web:d46522f17be74219a2db2b",
  measurementId:     "G-YPLLWFGK6Q"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let storage;
try { storage = firebase.storage(); } catch(e) { console.warn('Storage kullanılamıyor:', e); }

/* ── Default listings (Firestore boşsa seed et) ── */
const DEFAULT_LISTINGS = [
  { title: '1 Dönüm (1000 m²) Yatırımlık Arsa',  size: '1000 m²', price: '700.000', priceLabel: 'Toplam Fiyat',    location: 'Marmaraereğlisi / Çeşmeli — Çarlı Manzaralı', parcel: '170/10', tag: 'hot|🔥 ÖNE ÇIKAN',       features: 'Elektrik / Su, Tapulu, Yatırımlık',     image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=80', description: '', order: 0 },
  { title: '300 m² Konumu Mükemmel Arsa',         size: '300 m²',  price: '349.000', priceLabel: 'Toplam Fiyat',    location: 'Marmaraereğlisi / Çeşmeli',                  parcel: '170/10', tag: 'deal|💎 ŞOK FİYAT',      features: 'Kadastro Yolu, Taksit ✓, Tapulu',       image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=700&q=80', description: '', order: 1 },
  { title: 'Deniz Manzaralı 300 m² Arsa',         size: '300 m²',  price: '450.000', priceLabel: 'Toplam Fiyat',    location: 'Marmaraereğlisi / Çeşmeli — 266/31',         parcel: '266/31', tag: 'new|🌊 DENİZ MANZARALI', features: 'Denize Komşu, Tapulu, Manzaralı',       image: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=700&q=80', description: '', order: 2 },
  { title: 'Villa İmarlı 300 m² Arsa',            size: '300 m²',  price: '499.000', priceLabel: 'Toplam Fiyat',    location: 'Marmaraereğlisi / Çeşmeli',                  parcel: '170/10', tag: 'villa|🏡 VİLLA İMARLI',  features: 'Villa İmarlı, Altyapı Var, E-5 Yakını', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=700&q=80', description: '', order: 3 },
  { title: 'Konteyner Bungalov Koyabilir 300 m²', size: '300 m²',  price: '399.000', priceLabel: 'Toplam Fiyat',    location: 'Marmaraereğlisi / Çeşmeli',                  parcel: '170/10', tag: "new|🏕️ BUNGALOV UYGUN", features: "Prefabrik OK, E-5'e Yakın, Tapulu",    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=700&q=80', description: '', order: 4 },
  { title: 'Özel Kampanya — 1 Dönüm Fırsat',      size: '1000 m²', price: '619.000', priceLabel: 'Kampanya Fiyatı', location: 'Marmaraereğlisi / Çeşmeli',                  parcel: '170/10', tag: 'hot|🔥 KAMPANYA',        features: 'Hemen Tapu, Yatırımlık, Müstakil',      image: 'https://images.unsplash.com/photo-1464093515883-ec948246accb?w=700&q=80', description: '', order: 5 }
];

const PW_KEY      = 'dicle_admin_pw_v1';
const SESSION_KEY = 'dicle_admin_session_v1';

let listings     = [];
let editingId    = null;
let currentImage = '';

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ── Firestore: ilanları yükle ── */
async function loadListings() {
  try {
    const snap = await db.collection('listings').orderBy('order', 'asc').get();
    if (snap.empty) {
      await seedDefaultListings();
      const snap2 = await db.collection('listings').orderBy('order', 'asc').get();
      return snap2.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
    }
    return snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
  } catch (err) {
    console.error('Firestore yükleme hatası:', err);
    return DEFAULT_LISTINGS.map((l, i) => ({ ...l, firestoreId: String(i) }));
  }
}

async function seedDefaultListings() {
  const batch = db.batch();
  DEFAULT_LISTINGS.forEach(listing => batch.set(db.collection('listings').doc(), listing));
  await batch.commit();
}

async function saveContactToFirestore(data) {
  await db.collection('contacts').add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/* ── Firebase Storage: fotoğraf yükle ── */
async function uploadImageToStorage(file) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ref  = storage.ref(`listings/${Date.now()}_${safe}`);
  const snap = await ref.put(file);
  return snap.ref.getDownloadURL();
}

/* ── İlan kartlarını render et ── */
function renderListings() {
  const grid = document.getElementById('listingsGrid');
  if (!grid) return;
  if (listings.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-light);">Henüz ilan eklenmemiş. Yönetim panelinden ekleyebilirsiniz.</div>';
    return;
  }
  grid.innerHTML = listings.map(l => {
    const [tagClass, tagText] = (l.tag || '|').split('|');
    const tagHtml      = tagText ? `<span class="tag tag-${escapeHtml(tagClass)}">${escapeHtml(tagText)}</span>` : '';
    const features     = (l.features || '').split(',').map(f => f.trim()).filter(Boolean).slice(0, 3);
    const featuresHtml = features.map(f =>
      `<span class="listing-spec"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ${escapeHtml(f)}</span>`
    ).join('');
    const waMsg  = encodeURIComponent(`Merhaba, "${l.title}" (${l.size} - ${l.price} ₺) ilanı hakkında bilgi almak istiyorum.`);
    const imgSrc = l.image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=80';
    const fid    = escapeHtml(l.firestoreId);
    return `
      <div class="listing-card" data-id="${fid}">
        <div class="card-admin-controls">
          <button class="card-admin-btn edit"   onclick="editListing('${fid}')"    title="Düzenle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="card-admin-btn delete" onclick="confirmDelete('${fid}')" title="Sil">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
        <div class="listing-img">
          <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(l.title)}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=80'" />
          <div class="listing-tags">${tagHtml}</div>
          ${l.parcel ? `<div class="listing-parcel">${escapeHtml(l.parcel)}</div>` : ''}
        </div>
        <div class="listing-body">
          <div class="listing-location">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${escapeHtml(l.location || '')}
          </div>
          <div class="listing-title">${escapeHtml(l.title)}</div>
          <div class="listing-specs">
            <span class="listing-spec"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> ${escapeHtml(l.size)}</span>
            ${featuresHtml}
          </div>
          <div class="listing-footer">
            <div class="listing-price">
              <div class="listing-price-label">${escapeHtml(l.priceLabel || 'Toplam Fiyat')}</div>
              <div class="listing-price-total">${escapeHtml(l.price)} <small>₺</small></div>
            </div>
            <a href="https://wa.me/905332516036?text=${waMsg}" target="_blank" class="btn-card">
              Bilgi Al
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>
        </div>
      </div>`;
  }).join('');

  /* 3D kart animasyonlarını tetikle */
  if (typeof window.initCardAnimations === 'function') {
    requestAnimationFrame(window.initCardAnimations);
  }
}

/* ── Modal yardımcıları ── */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) e.target.classList.remove('open');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
  if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) { e.preventDefault(); openLoginModal(); }
});

function showToast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', !!isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

/* ── Admin giriş / çıkış ── */
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}
function getStoredPwHash() { return localStorage.getItem(PW_KEY) || hashStr('admin123'); }
function isLoggedIn()      { return sessionStorage.getItem(SESSION_KEY) === '1'; }
function applyAdminMode()  { document.body.classList.toggle('admin-mode', isLoggedIn()); }

function openLoginModal() {
  if (isLoggedIn()) { showToast('Zaten giriş yaptınız'); return; }
  document.getElementById('loginPassword').value = '';
  openModal('loginModal');
  setTimeout(() => document.getElementById('loginPassword').focus(), 100);
}
function doLogin() {
  const pw = document.getElementById('loginPassword').value;
  if (!pw) return;
  if (hashStr(pw) === getStoredPwHash()) {
    sessionStorage.setItem(SESSION_KEY, '1');
    applyAdminMode();
    closeModal('loginModal');
    showToast('✓ Yönetim moduna girildi');
  } else {
    showToast('Şifre hatalı', true);
  }
}
function adminLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  applyAdminMode();
  showToast('Çıkış yapıldı');
}
function openChangePwModal() {
  document.getElementById('newPassword1').value = '';
  document.getElementById('newPassword2').value = '';
  openModal('changePwModal');
}
function doChangePassword() {
  const p1 = document.getElementById('newPassword1').value;
  const p2 = document.getElementById('newPassword2').value;
  if (!p1 || p1.length < 4) { showToast('Şifre en az 4 karakter olmalı', true); return; }
  if (p1 !== p2) { showToast('Şifreler eşleşmiyor', true); return; }
  localStorage.setItem(PW_KEY, hashStr(p1));
  closeModal('changePwModal');
  showToast('✓ Şifre değiştirildi');
}

/* ── İlan CRUD ── */
function openListingModal() {
  if (!isLoggedIn()) { openLoginModal(); return; }
  editingId = null; currentImage = '';
  document.getElementById('listingModalTitle').textContent = 'Yeni İlan Ekle';
  document.getElementById('listingDeleteBtn').style.display = 'none';
  ['lTitle','lSize','lPrice','lFeatures','lDescription','lImageUrl'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('lPriceLabel').value = 'Toplam Fiyat';
  document.getElementById('lLocation').value   = 'Marmaraereğlisi / Çeşmeli';
  document.getElementById('lParcel').value      = '170/10';
  document.getElementById('lTag').value         = '';
  resetImageUploader();
  openModal('listingModal');
}

function editListing(firestoreId) {
  const l = listings.find(x => x.firestoreId === firestoreId);
  if (!l) return;
  editingId = firestoreId; currentImage = l.image || '';
  document.getElementById('listingModalTitle').textContent = 'İlanı Düzenle';
  document.getElementById('listingDeleteBtn').style.display = '';
  document.getElementById('lTitle').value       = l.title       || '';
  document.getElementById('lSize').value        = l.size        || '';
  document.getElementById('lPrice').value       = l.price       || '';
  document.getElementById('lPriceLabel').value  = l.priceLabel  || 'Toplam Fiyat';
  document.getElementById('lLocation').value    = l.location    || '';
  document.getElementById('lParcel').value      = l.parcel      || '';
  document.getElementById('lTag').value         = l.tag         || '';
  document.getElementById('lFeatures').value    = l.features    || '';
  document.getElementById('lDescription').value = l.description || '';
  document.getElementById('lImageUrl').value    = (l.image && l.image.startsWith('data:')) ? '' : (l.image || '');
  showImagePreview(l.image);
  openModal('listingModal');
}

async function saveListing() {
  const title = document.getElementById('lTitle').value.trim();
  const size  = document.getElementById('lSize').value.trim();
  const price = document.getElementById('lPrice').value.trim();
  if (!title || !size || !price) { showToast('Başlık, m² ve fiyat zorunlu', true); return; }

  const urlInput = document.getElementById('lImageUrl').value.trim();
  const image    = currentImage || urlInput || '';
  const data     = {
    title, size, price,
    priceLabel:  document.getElementById('lPriceLabel').value.trim()  || 'Toplam Fiyat',
    location:    document.getElementById('lLocation').value.trim(),
    parcel:      document.getElementById('lParcel').value.trim(),
    tag:         document.getElementById('lTag').value,
    features:    document.getElementById('lFeatures').value.trim(),
    description: document.getElementById('lDescription').value.trim(),
    image
  };

  const btn = document.querySelector('#listingModal .modal-btn-save');
  if (btn) { btn.textContent = 'Kaydediliyor...'; btn.disabled = true; }

  try {
    if (editingId) {
      await db.collection('listings').doc(editingId).update(data);
      const idx = listings.findIndex(x => x.firestoreId === editingId);
      if (idx !== -1) listings[idx] = { ...listings[idx], ...data };
      showToast('✓ İlan güncellendi');
    } else {
      const maxOrder = listings.reduce((m, l) => Math.max(m, l.order || 0), -1);
      const ref = await db.collection('listings').add({ ...data, order: maxOrder + 1 });
      listings.push({ ...data, firestoreId: ref.id, order: maxOrder + 1 });
      showToast('✓ İlan eklendi');
    }
    renderListings();
    closeModal('listingModal');
  } catch (err) {
    console.error(err);
    showToast('Hata: ' + err.message, true);
  } finally {
    if (btn) { btn.textContent = 'Kaydet'; btn.disabled = false; }
  }
}

function confirmDelete(firestoreId) {
  const l = listings.find(x => x.firestoreId === firestoreId);
  if (!l) return;
  if (confirm(`"${l.title}" ilanını silmek istediğinize emin misiniz?`)) _doDeleteListing(firestoreId);
}

function modalDeleteListing() {
  if (!editingId) return;
  const l = listings.find(x => x.firestoreId === editingId);
  if (!l) return;
  if (confirm(`"${l.title}" ilanını silmek istediğinize emin misiniz?`)) {
    _doDeleteListing(editingId);
    closeModal('listingModal');
  }
}

async function _doDeleteListing(firestoreId) {
  try {
    await db.collection('listings').doc(firestoreId).delete();
    listings = listings.filter(x => x.firestoreId !== firestoreId);
    renderListings();
    showToast('İlan silindi');
  } catch (err) {
    console.error(err);
    showToast('Silme hatası: ' + err.message, true);
  }
}

/* ── Fotoğraf yükleme (Storage) ── */
function resetImageUploader() {
  const u = document.getElementById('imageUploader');
  u.classList.remove('has-image');
  u.innerHTML = `<div class="image-uploader-prompt" id="imagePrompt">📷 <strong>Tıklayın</strong> ve bilgisayardan fotoğraf seçin<br><small style="opacity:.7;">veya aşağıya görsel URL'si yapıştırın</small></div><input type="file" id="imageFile" accept="image/*" onchange="handleImageUpload(event)" />`;
}
function showImagePreview(src) {
  if (!src) { resetImageUploader(); return; }
  const u = document.getElementById('imageUploader');
  u.classList.add('has-image');
  u.innerHTML = `<img src="${escapeHtml(src)}" alt="önizleme" /><input type="file" id="imageFile" accept="image/*" onchange="handleImageUpload(event)" />`;
}
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { showToast("Dosya 10MB'dan büyük olamaz", true); return; }
  showToast('📤 Fotoğraf yükleniyor...');
  try {
    const url = await uploadImageToStorage(file);
    currentImage = url;
    showImagePreview(url);
    const urlEl = document.getElementById('lImageUrl');
    if (urlEl) urlEl.value = '';
    showToast('✓ Fotoğraf yüklendi');
  } catch (err) {
    console.warn('Storage yüklenemedi, yerel önizleme kullanılıyor:', err);
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const scale  = Math.min(1, 1200 / img.width);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        currentImage = canvas.toDataURL('image/jpeg', 0.82);
        showImagePreview(currentImage);
        showToast('✓ Fotoğraf hazır (yerel)');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }
}
function previewUrlImage() {
  const url = document.getElementById('lImageUrl').value.trim();
  if (url && /^https?:\/\//.test(url)) { currentImage = url; showImagePreview(url); }
}

/* ── Başlangıç ── */
applyAdminMode();
loadListings().then(data => { listings = data; renderListings(); });

/* ── Navbar scroll + animasyonlar ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => { navbar.classList.toggle('scrolled', window.scrollY > 60); });

const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
function toggleMobile() { hamburger.classList.toggle('open'); mobileMenu.classList.toggle('open'); }
function closeMobile()  { hamburger.classList.remove('open'); mobileMenu.classList.remove('open'); }

const scrollObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); scrollObserver.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.animate-on-scroll').forEach(el => scrollObserver.observe(el));

/* ── İletişim formu → Firestore + EmailJS ── */
async function submitForm(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.form-submit');
  btn.textContent = 'Gönderiliyor...';
  btn.disabled = true;
  const inputs = e.target.querySelectorAll('input, select, textarea');
  const formData = {
    from_name:  inputs[0]?.value || '',
    from_phone: inputs[1]?.value || '',
    sqm:        inputs[2]?.value || '',
    budget:     inputs[3]?.value || '',
    message:    inputs[4]?.value || ''
  };

  try {
    await saveContactToFirestore({
      name: formData.from_name, phone: formData.from_phone,
      sqm: formData.sqm, budget: formData.budget, message: formData.message
    });
  } catch (err) { console.error('Firestore kayıt hatası:', err); }

  try {
    await emailjs.send('service_7cgih6y', 'template_nkzkcp5', formData);
  } catch (err) { console.warn('EmailJS hatası:', err); }

  e.target.style.display = 'none';
  document.getElementById('formSuccess').style.display = 'block';
}

/* Akıcı kaydırma burada DEĞİL — index.html'deki Lenis sürümü kullanılıyor.
   İkisi birden bağlıyken aynı tıklamada iki kaydırma motoru yarışıyor,
   Lenis sürümü ayrıca sabit navbar için offset:-80 uyguluyor. */
