// ════════════════════════════════════════
// TEMA SİSTEMİ + LOCALSTORAGE
// ════════════════════════════════════════

const THEMES = {
  green: {
    name: '🌿 Yeşil (Varsayılan)',
    colors: {
      '--green-dark': '#1e4d20',
      '--green-mid': '#2C5F2E',
      '--green-light': '#4a8f3f',
      '--green-accent': '#7ab648',
      '--gold': '#c9a961',
      '--cream': '#f5f0e8',
      '--cream-dark': '#ede5d4',
      '--text-dark': '#1a1a1a',
      '--text-mid': '#444',
      '--text-light': '#777',
      '--white': '#ffffff',
    }
  },
  blue: {
    name: '🔵 Mavi',
    colors: {
      '--green-dark': '#0d47a1',
      '--green-mid': '#1565c0',
      '--green-light': '#1976d2',
      '--green-accent': '#42a5f5',
      '--gold': '#64b5f6',
      '--cream': '#e3f2fd',
      '--cream-dark': '#bbdefb',
      '--text-dark': '#0d47a1',
      '--text-mid': '#1565c0',
      '--text-light': '#64b5f6',
      '--white': '#ffffff',
    }
  },
  gold: {
    name: '✨ Altın',
    colors: {
      '--green-dark': '#b8860b',
      '--green-mid': '#daa520',
      '--green-light': '#ffd700',
      '--green-accent': '#ffa500',
      '--gold': '#f0e68c',
      '--cream': '#fffacd',
      '--cream-dark': '#eee8aa',
      '--text-dark': '#8b6914',
      '--text-mid': '#b8860b',
      '--text-light': '#daa520',
      '--white': '#ffffff',
    }
  },
  dark: {
    name: '🌙 Koyu',
    colors: {
      '--green-dark': '#1a1a1a',
      '--green-mid': '#2d2d2d',
      '--green-light': '#404040',
      '--green-accent': '#4a9eff',
      '--gold': '#ffa500',
      '--cream': '#1e1e1e',
      '--cream-dark': '#2a2a2a',
      '--text-dark': '#e0e0e0',
      '--text-mid': '#b0b0b0',
      '--text-light': '#808080',
      '--white': '#1a1a1a',
    }
  },
  purple: {
    name: '💜 Mor',
    colors: {
      '--green-dark': '#4a148c',
      '--green-mid': '#6a1b9a',
      '--green-light': '#7b1fa2',
      '--green-accent': '#ab47bc',
      '--gold': '#ce93d8',
      '--cream': '#f3e5f5',
      '--cream-dark': '#e1bee7',
      '--text-dark': '#4a148c',
      '--text-mid': '#6a1b9a',
      '--text-light': '#ab47bc',
      '--white': '#ffffff',
    }
  },
  red: {
    name: '❤️ Kırmızı',
    colors: {
      '--green-dark': '#b71c1c',
      '--green-mid': '#c62828',
      '--green-light': '#d32f2f',
      '--green-accent': '#f44336',
      '--gold': '#ef9a9a',
      '--cream': '#ffebee',
      '--cream-dark': '#ffcdd2',
      '--text-dark': '#b71c1c',
      '--text-mid': '#c62828',
      '--text-light': '#f44336',
      '--white': '#ffffff',
    }
  }
};

// ════ TEMA UYGULA ════
function applyTheme(themeName) {
  const theme = THEMES[themeName] || THEMES.green;
  Object.entries(theme.colors).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
  localStorage.setItem('selectedTheme', themeName);
  localStorage.setItem('siteSettings', JSON.stringify({...getSiteSettings(), theme: themeName}));
}

// ════ SAYFA AYARLARI ════
function getSiteSettings() {
  return JSON.parse(localStorage.getItem('siteSettings')) || {
    siteName: 'DİCLE ARSA OFİSİ',
    siteSubtitle: 'NESİPOĞULLARI',
    heroTitle: 'Hayalinizdeki<br><em>Yere</em> Sahip Olun',
    heroDesc: 'Trakya\'nın incisi Marmaraereğlisi\'nde, denize komşu, E-5 yoluna yakın, tapulu yatırımlık ve villa imarlı arsalar.',
    phone: '0533 251 60 36',
    logo: null,
    theme: 'green'
  };
}

// ════ SAİT AYARLARINI KAYDET ════
function saveSiteSettings(settings) {
  localStorage.setItem('siteSettings', JSON.stringify(settings));
}

// ════ RESİM YÜKLEME (BASE64) ════
function uploadImageAsBase64(file, callback) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    callback(base64);
  };
  reader.readAsDataURL(file);
}

// ════ İLAN VERILERINI YÜKLE ════
function getListings() {
  return JSON.parse(localStorage.getItem('listings')) || [];
}

function saveListings(listings) {
  localStorage.setItem('listings', JSON.stringify(listings));
}

function addListing(listing) {
  const listings = getListings();
  listing.id = Date.now();
  listings.push(listing);
  saveListings(listings);
  return listing;
}

function updateListing(id, updatedListing) {
  let listings = getListings();
  listings = listings.map(l => l.id === id ? {...l, ...updatedListing} : l);
  saveListings(listings);
}

function deleteListing(id) {
  let listings = getListings();
  listings = listings.filter(l => l.id !== id);
  saveListings(listings);
}

// ════ İLK YÜKLEME ════
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('selectedTheme') || 'green';
  applyTheme(savedTheme);
  updateSiteUI();
});

// ════ SİTE UI GÜNCELLEME ════
function updateSiteUI() {
  const settings = getSiteSettings();

  // Logo ve başlık güncelleme
  const logoText = document.querySelector('.nav-logo-text');
  if (logoText) {
    logoText.innerHTML = `${settings.siteName}<span>${settings.siteSubtitle}</span>`;
  }

  // Hero başlığı güncelleme
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    heroTitle.innerHTML = settings.heroTitle;
  }

  // Hero açıklaması güncelleme
  const heroDesc = document.querySelector('.hero-desc');
  if (heroDesc) {
    heroDesc.textContent = settings.heroDesc;
  }
}

// ════ EXPORT ════
window.ThemeSystem = {
  applyTheme,
  getSiteSettings,
  saveSiteSettings,
  uploadImageAsBase64,
  updateSiteUI,
  getListings,
  saveListings,
  addListing,
  updateListing,
  deleteListing,
  THEMES
};
