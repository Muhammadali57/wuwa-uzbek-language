(() => {
  const API_BASE = window.WUWA_API_BASE || 'https://wuwa-uzbek-language-two.vercel.app/api';
  const state = { language: localStorage.getItem('wuwa-language') || 'en', translations: {}, registry: [] };
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const t = (key, fallback = key) => state.translations[state.language]?.[key] ?? state.translations.en?.[key] ?? fallback;
  const esc = v => { const d = document.createElement('div'); d.textContent = String(v ?? ''); return d.innerHTML; };

  function applyLanguage(lang) {
    if (!state.translations[lang]) lang = state.translations.en ? 'en' : state.language;
    state.language = lang; localStorage.setItem('wuwa-language', lang);
    document.documentElement.lang = lang === 'zh-CN' ? 'zh' : lang;
    $$('[data-i18n]').forEach(el => el.innerHTML = t(el.dataset.i18n));
    $$('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder, el.placeholder));
    $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria, el.getAttribute('aria-label') || '')));
    buildLanguageSelector(); buildCountrySelector($('#country'));
    document.dispatchEvent(new CustomEvent('wuwa:languagechange', { detail: { language: lang } }));
  }

  function buildLanguageSelector() {
    const s = $('#languageSelect'); if (!s || !state.registry.length) return;
    s.innerHTML = state.registry.map(x => `<option value="${esc(x.code)}">${esc(x.nativeName || x.name)}</option>`).join('');
    s.value = state.language;
  }

  const COUNTRY_CODES = ['AF','AL','DZ','AD','AO','AG','AR','AM','AU','AT','AZ','BS','BH','BD','BB','BY','BE','BZ','BJ','BT','BO','BA','BW','BR','BN','BG','BF','BI','CV','KH','CM','CA','CF','TD','CL','CN','CO','KM','CG','CD','CR','CI','HR','CU','CY','CZ','DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE','SZ','ET','FJ','FI','FR','GA','GM','GE','DE','GH','GR','GD','GT','GN','GW','GY','HT','HN','HU','IS','IN','ID','IR','IQ','IE','IL','IT','JM','JP','JO','KZ','KE','KI','KP','KR','KW','KG','LA','LV','LB','LS','LR','LY','LI','LT','LU','MG','MW','MY','MV','ML','MT','MH','MR','MU','MX','FM','MD','MC','MN','ME','MA','MZ','MM','NA','NR','NP','NL','NZ','NI','NE','NG','MK','NO','OM','PK','PW','PS','PA','PG','PY','PE','PH','PL','PT','QA','RO','RU','RW','KN','LC','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SK','SI','SB','SO','ZA','SS','ES','LK','SD','SR','SE','CH','SY','TJ','TZ','TH','TL','TG','TO','TT','TN','TR','TM','TV','UG','UA','AE','GB','US','UY','UZ','VU','VA','VE','VN','YE','ZM','ZW'];
  const flag = code => [...code].map(c => String.fromCodePoint(127397 + c.charCodeAt())).join('');
  function countryName(code) { try { return new Intl.DisplayNames([state.language, 'en'], { type: 'region' }).of(code) || code; } catch { return code; } }
  function buildCountrySelector(s) {
    if (!s) return;
    const current = s.value || 'XX';
    s.innerHTML = `<option value="XX">🌍 ${esc(t('countryLabel', 'Select country'))}</option>` + COUNTRY_CODES.map(c => `<option value="${c}">${flag(c)} ${esc(countryName(c))}</option>`).join('');
    s.value = COUNTRY_CODES.includes(current) ? current : 'XX';
  }
  async function detectCountry() {
    const s = $('#country'); if (!s) return;
    try {
      const r = await fetch(API_BASE + '/geo', { cache: 'no-store' }), d = await r.json();
      if (r.ok && d.ok && COUNTRY_CODES.includes(d.country)) { s.value = d.country; s.dataset.detected = 'true'; }
    } catch { /* manual selection remains available */ }
  }

  function showToast(message) {
    const el = $('#toast'); if (!el) return;
    el.textContent = message; el.classList.add('show'); clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  window.showToast = showToast;
  window.I18N = { ready: Promise.resolve(), t, apply: applyLanguage, get language() { return state.language; }, onChange: fn => document.addEventListener('wuwa:languagechange', fn) };

  function initReveal() {
    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach(x => x.classList.add('visible')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), { threshold: .12 });
    $$('.reveal').forEach(el => io.observe(el));
  }
  function initMenu() {
    const btn = $('#menuToggle'), nav = $('.desktop-nav'); if (!btn || !nav) return;
    btn.addEventListener('click', () => { const open = nav.classList.toggle('mobile-open'); btn.setAttribute('aria-expanded', String(open)); });
    $$('.desktop-nav a').forEach(a => a.addEventListener('click', () => nav.classList.remove('mobile-open')));
  }
  function initShare() {
    $$('[data-share]').forEach(btn => btn.addEventListener('click', async () => {
      const type = btn.dataset.share, url = location.href, text = t('shareText', 'Support Uzbek language in Wuthering Waves');
      if (type === 'copy') { try { await navigator.clipboard.writeText(url); showToast(t('copySuccess', 'Link copied!')); } catch { showToast(t('copyFail', 'Could not copy the link.')); } return; }
      const u = encodeURIComponent(url), tx = encodeURIComponent(text); let target = '';
      if (type === 'reddit') target = `https://www.reddit.com/submit?url=${u}&title=${tx}`;
      if (type === 'x') target = `https://twitter.com/intent/tweet?url=${u}&text=${tx}`;
      if (type === 'telegram') target = `https://t.me/share/url?url=${u}&text=${tx}`;
      if (type === 'native' && navigator.share) { try { await navigator.share({ title: document.title, text, url }); } catch {} return; }
      if (target) window.open(target, '_blank', 'noopener,noreferrer');
    }));
  }
  async function loadLocales() {
    const r = await fetch('locales/index.json', { cache: 'no-store' }); if (!r.ok) throw new Error('Locale registry failed');
    const registry = await r.json(); state.registry = Array.isArray(registry) ? registry : registry.locales || [];
    const loaded = await Promise.all(state.registry.map(async item => { try { const x = await fetch(`locales/${encodeURIComponent(item.code)}.json`, { cache: 'no-store' }); return x.ok ? [item.code, await x.json()] : null; } catch { return null; } }));
    loaded.filter(Boolean).forEach(([code, data]) => state.translations[code] = data);
    if (!state.translations[state.language]) state.language = state.translations.en ? 'en' : Object.keys(state.translations)[0];
  }
  async function init() {
    try { await loadLocales(); } catch (e) { console.error(e); }
    buildLanguageSelector(); applyLanguage(state.language);
    $('#languageSelect')?.addEventListener('change', e => applyLanguage(e.target.value));
    buildCountrySelector($('#country')); detectCountry(); initReveal(); initMenu(); initShare();
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', () => { if (a.getAttribute('href') === '#top') window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  }
  document.addEventListener('DOMContentLoaded', init);
})();
