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
const auth = firebase.auth();

/* Oturum tarayıcı kapansa bile sürer (Firebase varsayılanı).
   Güvenliği oturum süresi değil, Firestore kuralları sağlıyor: yetki
   her istekte sunucuda admin UID'sine karşı denetleniyor. Ortak veya
   halka açık bir bilgisayardan panele girilecekse bu satır
   Persistence.SESSION yapılmalı — o zaman sekme kapanınca oturum biter. */
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch(e => console.warn('Auth kalıcılık ayarı uygulanamadı:', e));

/* Firebase Storage bu projede KURULU DEĞİL (Console > Storage > Get Started
   hiç yapılmamış), ayrıca storage-compat SDK'sı da yüklenmiyor. Bu yüzden
   ilan fotoğrafları base64 olarak ilan dokümanına gömülüyor — bkz.
   gorseliBase64Yap. Storage kurulursa: SDK etiketini index.html'e ekle,
   storage.rules'u deploy et, aşağıdaki satır kendiliğinden çalışmaya başlar
   ve uploadImageToStorage birincil yol olur. */
let storage;
try { storage = firebase.storage(); } catch (e) { /* beklenen durum — base64 yedeği kullanılıyor */ }

/* ── Default listings (Firestore boşsa seed et) ── */
const DEFAULT_LISTINGS = [
  { title: '1 Dönüm (1000 m²) Yatırımlık Arsa',  size: '1000 m²', price: '700.000', priceLabel: 'Toplam Fiyat',    location: 'Marmaraereğlisi / Çeşmeli — Çarlı Manzaralı', parcel: '170/10', tag: 'hot|🔥 ÖNE ÇIKAN',       features: 'Elektrik / Su, Tapulu, Yatırımlık',     image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=80', description: '', order: 0 },
  { title: '300 m² Konumu Mükemmel Arsa',         size: '300 m²',  price: '349.000', priceLabel: 'Toplam Fiyat',    location: 'Marmaraereğlisi / Çeşmeli',                  parcel: '170/10', tag: 'deal|💎 ŞOK FİYAT',      features: 'Kadastro Yolu, Taksit ✓, Tapulu',       image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=700&q=80', description: '', order: 1 },
  { title: 'Deniz Manzaralı 300 m² Arsa',         size: '300 m²',  price: '450.000', priceLabel: 'Toplam Fiyat',    location: 'Marmaraereğlisi / Çeşmeli — 266/31',         parcel: '266/31', tag: 'new|🌊 DENİZ MANZARALI', features: 'Denize Komşu, Tapulu, Manzaralı',       image: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=700&q=80', description: '', order: 2 },
  { title: 'Villa İmarlı 300 m² Arsa',            size: '300 m²',  price: '499.000', priceLabel: 'Toplam Fiyat',    location: 'Marmaraereğlisi / Çeşmeli',                  parcel: '170/10', tag: 'villa|🏡 VİLLA İMARLI',  features: 'Villa İmarlı, Altyapı Var, E-5 Yakını', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=700&q=80', description: '', order: 3 },
  { title: 'Konteyner Bungalov Koyabilir 300 m²', size: '300 m²',  price: '399.000', priceLabel: 'Toplam Fiyat',    location: 'Marmaraereğlisi / Çeşmeli',                  parcel: '170/10', tag: "new|🏕️ BUNGALOV UYGUN", features: "Prefabrik OK, E-5'e Yakın, Tapulu",    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=700&q=80', description: '', order: 4 },
  { title: 'Özel Kampanya — 1 Dönüm Fırsat',      size: '1000 m²', price: '619.000', priceLabel: 'Kampanya Fiyatı', location: 'Marmaraereğlisi / Çeşmeli',                  parcel: '170/10', tag: 'hot|🔥 KAMPANYA',        features: 'Hemen Tapu, Yatırımlık, Müstakil',      image: 'https://images.unsplash.com/photo-1464093515883-ec948246accb?w=700&q=80', description: '', order: 5 }
];

let listings     = [];
let editingId    = null;
let currentImage = '';

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* `order` alanı olmayan ilanlar listenin sonuna gider ama LİSTEDE KALIR.
   Eşitlik durumunda başlığa göre sıralanır, böylece sıra her yüklemede
   aynı olur — Firestore doküman sırası garanti değildir. */
function siralaIlanlar(liste) {
  return liste.sort(function (a, b) {
    const x = typeof a.order === 'number' ? a.order : 9999;
    const y = typeof b.order === 'number' ? b.order : 9999;
    if (x !== y) return x - y;
    return String(a.title || '').localeCompare(String(b.title || ''), 'tr');
  });
}

/* ── Firestore: ilanları yükle ── */
async function loadListings() {
  try {
    /* orderBy KULLANILMIYOR. Firestore, sıralanan alanı TAŞIMAYAN
       dokümanları sonuçtan tamamen düşürür: Console'dan elle eklenen
       veya `order` alanı silinmiş bir ilan sitede hiç görünmez, üstelik
       hata da vermez. Sıralama istemcide yapılıyor; 6-50 ilanda fark yok. */
    const snap = await db.collection('listings').get();
    if (!snap.empty) return siralaIlanlar(snap.docs.map(d => ({ ...d.data(), firestoreId: d.id })));

    /* Koleksiyon boş. İki farklı durum olabilir: proje yeni kurulmuş ve
       hiç ilan girilmemiş, ya da yönetici tüm ilanları BİLEREK silmiş.
       Eskiden ayrım yapılmıyordu: yönetici hepsini silince bir sonraki
       sayfa açılışında 6 demo ilan Firestore'a geri yazılıyor, "Henüz
       ilan eklenmemiş" boş durumu hiç görünmüyordu.

       Artık settings/site üzerinde bir "seeded" bayrağı tutuluyor;
       bir kez tohumlandıysa bir daha yapılmaz. Tohumlama yazma
       gerektirdiği için zaten yalnızca giriş yapmış yönetici deneyebilir
       — ziyaretçi için boşuna bir reddedilen istek üretilmiyor. */
    if (!isLoggedIn()) return [];
    const ayar = await db.collection('settings').doc('site').get();
    if (ayar.exists && (ayar.data() || {}).seeded) return [];

    await seedDefaultListings();
    const snap2 = await db.collection('listings').get();
    return siralaIlanlar(snap2.docs.map(d => ({ ...d.data(), firestoreId: d.id })));
  } catch (err) {
    console.error('Firestore yükleme hatası:', err);
    return DEFAULT_LISTINGS.map((l, i) => ({ ...l, firestoreId: String(i) }));
  }
}

async function seedDefaultListings() {
  const batch = db.batch();
  DEFAULT_LISTINGS.forEach(listing => batch.set(db.collection('listings').doc(), listing));
  // Bayrak ilanlarla AYNI batch'te yazılıyor: ikisi birlikte başarılı olur
  // ya da ikisi birden geri alınır. Yarım tohumlanmış durum oluşmaz.
  batch.set(db.collection('settings').doc('site'), { seeded: true }, { merge: true });
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
    /* slice(0,3) girilen özelliklerin yarısını sessizce siliyordu —
       yönetici 6 özellik yazıp 3'ünün kaybolduğunu fark etmiyordu. */
    const features     = (l.features || '').split(',').map(f => f.trim()).filter(Boolean).slice(0, 6);
    /* Açıklama Firestore'a kaydediliyor ve düzenleme formunda geri
       okunuyordu ama karta HİÇ basılmıyordu; yöneticinin yazdığı metni
       ziyaretçi hiç görmüyordu. Satır sonları boşluğa çevriliyor,
       kart yüksekliği CSS'te 3 satırla sınırlanıyor. */
    const aciklama     = escapeHtml((l.description || '').replace(/\s*\n+\s*/g, ' ').trim());
    const featuresHtml = features.map(f =>
      `<span class="listing-spec"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ${escapeHtml(f)}</span>`
    ).join('');
    const waMsg  = encodeURIComponent(`Merhaba, "${l.title}" (${l.size} - ${l.price} ₺) ilanı hakkında bilgi almak istiyorum.`);
    const imgSrc = l.image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=80';
    const fid    = escapeHtml(l.firestoreId);
    return `
      <div class="listing-card" data-id="${fid}">
        ${isLoggedIn() ? `
        <div class="card-admin-controls">
          <button class="card-admin-btn edit"   data-act="edit"   title="Düzenle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="card-admin-btn delete" data-act="delete" title="Sil">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>` : ''}
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
          ${aciklama ? `<p class="listing-desc">${aciklama}</p>` : ''}
          <div class="listing-specs">
            <span class="listing-spec"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> ${escapeHtml(l.size)}</span>
            ${featuresHtml}
          </div>
          <div class="listing-footer">
            <div class="listing-price">
              <div class="listing-price-label">${escapeHtml(l.priceLabel || 'Toplam Fiyat')}</div>
              <div class="listing-price-total">${escapeHtml(l.price)} <small>₺</small></div>
            </div>
            <a href="https://wa.me/905307615120?text=${waMsg}" target="_blank" class="btn-card">
              Bilgi Al
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>
        </div>
      </div>`;
  }).join('');

  /* Kartlar yeni basıldı — ayarlardaki telefon numarasını buradaki
     wa.me linklerine de uygula. applyBranding sayfa açılışında
     çalışıyor, o sırada bu kartlar henüz DOM'da değildi. */
  if (typeof window.__applyPhone === 'function') window.__applyPhone();

  /* 3D kart animasyonlarını tetikle */
  if (typeof window.initCardAnimations === 'function') {
    requestAnimationFrame(window.initCardAnimations);
  }
}

/* Kart yönetim butonları olay delegasyonuyla bağlanır.
   Eskiden onclick="editListing('${fid}')" biçimindeydi: HTML ayrıştırıcısı
   onclick değerini JS'e vermeden ÖNCE &#39; entity'sini gerçek apostrofa
   çözdüğü için escapeHtml koruma sağlamıyordu. Doküman ID'si saldırgan
   tarafından seçilebildiğinde JS enjeksiyonu oluşuyordu.
   data-id ise öznitelik değeri olarak okunur, JS bağlamına hiç girmez. */
document.addEventListener('click', e => {
  const btn = e.target.closest('.card-admin-btn');
  if (!btn) return;
  const card = btn.closest('.listing-card');
  if (!card) return;
  const id = card.dataset.id;
  if (!id) return;
  if (btn.dataset.act === 'edit') editListing(id);
  else if (btn.dataset.act === 'delete') confirmDelete(id);
});

/* ── Modal yardımcıları ── */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) e.target.classList.remove('open');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
  if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) { e.preventDefault(); yonetimeEris(); }
});

/* Yönetim erişimi iki yoldan açılır:
   1) Adres sonuna #yonetim eklemek (telefonda "Ana Ekrana Ekle" ile
      kısayol yapılabilir — Nurhayat Hanım için pratik yol)
   2) Ctrl+Shift+A (masaüstü)
   Kilit ikonu bunlar olmadan hiç görünmez, sıradan ziyaretçi
   yönetim panelinin varlığını fark etmez. */
function yonetimeEris() {
  document.body.classList.add('yonetim-erisim');
  openLoginModal();
}

if (location.hash === '#yonetim') {
  document.body.classList.add('yonetim-erisim');
  // Adresi temizle — paylaşılan bağlantıda #yonetim kalmasın
  history.replaceState(null, '', location.pathname + location.search);
}

function showToast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', !!isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

/* ── Admin giriş / çıkış — Firebase Authentication ────────────────────
   Önceki sistem tamamen istemci tarafındaydı: parola hash'i (tuzsuz
   32-bit DJB2) localStorage'da tutuluyor, oturum sessionStorage'daki bir
   bayrakla işaretleniyordu. Varsayılan parola 'admin123' idi ve tarayıcı
   konsoluna tek satır yazan herkes yönetici olabiliyordu; yetki yalnızca
   CSS ile gizleniyordu.

   Artık oturumu Firebase doğruluyor ve Firestore kuralları admin UID'sini
   kontrol ediyor. İstemciye hiçbir yetki kararı bırakılmıyor: birisi
   arayüzü zorla açsa bile veritabanı yazma isteğini reddeder. */
function isLoggedIn()     { return !!auth.currentUser; }
function applyAdminMode() { document.body.classList.toggle('admin-mode', isLoggedIn()); }

function openLoginModal() {
  if (isLoggedIn()) { showToast('Zaten giriş yaptınız'); return; }
  const em = document.getElementById('loginEmail');
  const pw = document.getElementById('loginPassword');
  if (em) em.value = '';
  if (pw) pw.value = '';
  openModal('loginModal');
  setTimeout(() => { if (em) em.focus(); }, 100);
}

async function doLogin() {
  const email = (document.getElementById('loginEmail').value || '').trim();
  const pw    = document.getElementById('loginPassword').value;
  if (!email || !pw) { showToast('E-posta ve şifre gerekli', true); return; }

  const btn = document.getElementById('loginSubmitBtn');
  const eskiMetin = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Giriş yapılıyor...'; }
  try {
    await auth.signInWithEmailAndPassword(email, pw);
    closeModal('loginModal');
    showToast('✓ Yönetim moduna girildi');
  } catch (e) {
    showToast(girisHatasiMetni(e.code), true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = eskiMetin; }
  }
}

/* Firebase hata kodunu kullanıcıya gösterilebilir metne çevirir.
   Kimlik bilgisi hatalarının hepsi aynı mesajı döndürür — hangi
   e-postanın kayıtlı olduğunu ele vermemek için. */
function girisHatasiMetni(kod) {
  switch (kod) {
    case 'auth/too-many-requests':      return 'Çok fazla deneme yapıldı. Bir süre bekleyip tekrar deneyin.';
    case 'auth/network-request-failed': return 'Bağlantı hatası. İnternetinizi kontrol edin.';
    case 'auth/invalid-email':          return 'Geçersiz e-posta adresi';
    default:                            return 'E-posta veya şifre hatalı';
  }
}

async function adminLogout() {
  try { await auth.signOut(); showToast('Çıkış yapıldı'); }
  catch (e) { showToast('Çıkış yapılamadı: ' + (e.message || e), true); }
}

/* Parola artık uygulamada tutulmuyor, dolayısıyla uygulama içinden
   değiştirilmiyor. Firebase'in kendi sıfırlama akışı kullanılıyor:
   bağlantı yöneticinin e-postasına gider. */
async function sendPasswordReset() {
  const alan  = document.getElementById('loginEmail');
  const email = auth.currentUser ? auth.currentUser.email : (alan ? alan.value.trim() : '');
  if (!email) { showToast('Önce e-posta adresinizi girin', true); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    showToast('✓ Sıfırlama bağlantısı e-postanıza gönderildi');
    closeModal('loginModal');
  } catch (e) {
    showToast('Gönderilemedi: ' + girisHatasiMetni(e.code), true);
  }
}

/* Oturum durumu değişince arayüzü tazele. Sayfa yenilendiğinde
   auth.currentUser hemen dolmaz — Firebase oturumu çözene kadar null'dır.
   Bu yüzden yönetim arayüzü doğrudan değil, buradan tetiklenir. */
auth.onAuthStateChanged(() => {
  applyAdminMode();
  if (listings.length) renderListings();   // yönetim butonları giriş durumuna göre basılır
});

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
    console.warn('Storage yüklenemedi, base64 yedeğine düşülüyor:', err);
    gorseliBase64Yap(file);
  }
}

/* Firebase Storage bu projede kurulu olmadığı için fotoğraflar base64
   olarak ilan dokümanına gömülüyor. Firestore doküman sınırı 1 MB ve
   base64 ham veriyi ~1.37 kat büyütüyor; bu yüzden görsel, hedef boyutun
   altına inene kadar önce kaliteden sonra çözünürlükten kısılıyor.
   Sığmazsa kullanıcıya açıkça hata gösterilir — eskiden hiçbir hata
   yakalayıcı yoktu, bozuk veya desteklenmeyen dosyada (HEIC gibi)
   sessizce hiçbir şey olmuyor, kullanıcı fotoğrafsız kaydediyordu. */
/* Hedef 700KB değil 150KB. Sınırlayıcı olan Firestore'un 1MB doküman
   limiti DEĞİL, bant genişliği: fotoğraflar ilan dokümanına gömülü
   olduğu için her ziyaretçi sayfayı açtığında HEPSİNİ indiriyor.
   6 ilan × 700KB = 4.2MB; mobil bağlantıda kabul edilemez ve Firestore
   ücretsiz kotasını da hızla tüketir.
   Kalite kaybı görünmez: kart görseli 300px yüksekliğe kırpılıyor. */
const BASE64_HEDEF_BAYT = 150 * 1024;

function gorseliBase64Yap(file) {
  const reader = new FileReader();

  reader.onerror = () => {
    showToast('⚠️ Dosya okunamadı. Başka bir fotoğraf deneyin.', true);
  };

  reader.onload = ev => {
    const img = new Image();

    img.onerror = () => {
      showToast('⚠️ Bu görsel açılamadı. JPG veya PNG deneyin (HEIC desteklenmiyor).', true);
    };

    img.onload = () => {
      let genislik = 1200;
      let veri     = null;

      // Önce kaliteyi, yetmezse genişliği kademeli düşür
      // Kart görseli en fazla 380px genişlikte gösteriliyor; 900px kaynak
      // yüksek yoğunluklu ekranlarda bile fazlasıyla yeterli.
      for (const olcek of [900, 700, 560]) {
        genislik = olcek;
        for (const kalite of [0.82, 0.7, 0.6, 0.5]) {
          const aday = canvasaCiz(img, genislik, kalite);
          if (aday.length <= BASE64_HEDEF_BAYT) { veri = aday; break; }
          veri = aday;   // sığmasa da en küçüğünü elde tut
        }
        if (veri && veri.length <= BASE64_HEDEF_BAYT) break;
      }

      if (!veri || veri.length > BASE64_HEDEF_BAYT) {
        showToast('⚠️ Fotoğraf çok büyük, sıkıştırılamadı. Daha küçük bir görsel seçin.', true);
        return;
      }

      currentImage = veri;
      showImagePreview(currentImage);
      const urlEl = document.getElementById('lImageUrl');
      if (urlEl) urlEl.value = '';
      showToast('✓ Fotoğraf hazır');
    };

    img.src = ev.target.result;
  };

  reader.readAsDataURL(file);
}

function canvasaCiz(img, hedefGenislik, kalite) {
  const scale   = Math.min(1, hedefGenislik / img.width);
  const canvas  = document.createElement('canvas');
  canvas.width  = Math.round(img.width  * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', kalite);
}
function previewUrlImage() {
  const url = document.getElementById('lImageUrl').value.trim();
  if (url && /^https?:\/\//.test(url)) { currentImage = url; showImagePreview(url); }
}

/* ── Başlangıç ── */
applyAdminMode();
loadListings().then(data => { listings = data; renderListings(); });

/* ── Navbar scroll + animasyonlar ── */
/* ── Navbar durumu: kaydırma sınıfı, üst şerit ve aktif bölüm takibi ──
   Üçü de tek bir scroll dinleyicisinde ve requestAnimationFrame ile
   sınırlandırılmış halde çalışıyor; her scroll olayında layout okumak
   kaydırmayı takardı. */
const navbar    = document.getElementById('navbar');
const navTopbar = document.getElementById('navTopbar');
const navLinks  = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const navHedefleri = navLinks
  .map(a => ({ link: a, bolum: document.querySelector(a.getAttribute('href')) }))
  .filter(x => x.bolum);

let navBekliyor = false;

function navDurumGuncelle() {
  const y = window.scrollY;

  navbar.classList.toggle('scrolled', y > 60);
  // Üst şerit yalnızca sayfanın tepesinde görünür; aşağı inince
  // navbar'a yer açmak için yukarı kayar.
  if (navTopbar) navTopbar.classList.toggle('hidden', y > 120);

  /* Aktif bölüm: navbar yüksekliği kadar aşağıdaki noktanın hangi
     bölüme denk geldiğine bakılıyor. En son eşleşen kazanır, böylece
     bölümler üst üste binse bile doğru olan işaretlenir. */
  const isaret = y + 140;
  let aktif = null;
  for (const { link, bolum } of navHedefleri) {
    if (bolum.offsetTop <= isaret) aktif = link;
  }
  // Sayfa sonundaysa son bölümü işaretle — kısa bölümler asla
  // eşiği geçemeyebilir.
  if (y + window.innerHeight >= document.body.scrollHeight - 4 && navHedefleri.length) {
    aktif = navHedefleri[navHedefleri.length - 1].link;
  }
  navLinks.forEach(a => a.classList.toggle('active', a === aktif));

  navBekliyor = false;
}

window.addEventListener('scroll', () => {
  if (navBekliyor) return;
  navBekliyor = true;
  requestAnimationFrame(navDurumGuncelle);
}, { passive: true });

navDurumGuncelle();

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
  const eskiMetin = btn ? btn.textContent : '';
  if (btn) { btn.textContent = 'Gönderiliyor...'; btn.disabled = true; }

  /* Alanlar SIRA NUMARASIYLA değil ADIYLA okunuyor. Eskiden
     inputs[0..4] kullanılıyordu: forma ileride bir alan eklenirse veya
     sıra değişirse ad, telefon alanına yazılırdı ve bu SESSİZ bir hata
     olurdu — kimse fark etmeden yanlış veri kaydedilirdi. */
  const el = e.target.elements;
  const al = (ad) => (el[ad] && typeof el[ad].value === 'string' ? el[ad].value.trim() : '');

  /* İKİ AYRI ANAHTAR SETİ, ikisi de gerekli:
     - from_name / from_phone  -> EmailJS şablonunun beklediği adlar
     - name / phone / ...      -> firestore.rules'un beklediği adlar
     Biri diğerinin yerine kullanılırsa ya mail boş gider ya da Firestore
     yazmayı reddeder. Bu ayrım bilinçli, sadeleştirilmemeli. */
  const formData = {
    from_name:  al('name'),
    from_phone: al('phone'),
    sqm:        al('sqm'),
    budget:     al('budget'),
    message:    al('message')
  };

  /* Talep iki bağımsız kanala gidiyor: Firestore kaydı ve EmailJS
     bildirimi. En az biri başarılı olmalı. İkisi de başarısızsa
     kullanıcıya "gönderildi" DENMEZ — talep gerçekten kaybolmuştur.
     Eskiden iki hata da yutuluyor ve her durumda başarı ekranı
     gösteriliyordu; müşteri ulaştığını sanıyor, talep hiçbir yere
     ulaşmıyordu. */
  let firestoreOk = false;
  let emailOk     = false;

  try {
    /* Firestore alan adları EmailJS şablonundakilerden FARKLI:
       from_name/from_phone yerine name/phone yazılıyor. firestore.rules
       bu adlara göre doğrulama yapıyor — biri değişirse diğeri de
       değişmeli, yoksa yazma reddedilir. */
    await saveContactToFirestore({
      name: formData.from_name, phone: formData.from_phone,
      sqm: formData.sqm, budget: formData.budget, message: formData.message
    });
    firestoreOk = true;
  } catch (err) { console.error('Firestore kayıt hatası:', err); }

  try {
    await emailjs.send('service_7cgih6y', 'template_nkzkcp5', formData);
    emailOk = true;
  } catch (err) { console.warn('EmailJS hatası:', err); }

  if (!firestoreOk && !emailOk) {
    if (btn) { btn.textContent = eskiMetin; btn.disabled = false; }
    showToast('⚠️ Talebiniz gönderilemedi. Lütfen telefonla ulaşın.', true);
    return;
  }

  e.target.style.display = 'none';
  const basari = document.getElementById('formSuccess');
  if (basari) basari.style.display = 'block';
}

/* Akıcı kaydırma burada DEĞİL — index.html'deki Lenis sürümü kullanılıyor.
   İkisi birden bağlıyken aynı tıklamada iki kaydırma motoru yarışıyor,
   Lenis sürümü ayrıca sabit navbar için offset:-80 uyguluyor. */
