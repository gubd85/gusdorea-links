/* =========================================================
   Gus Dorea Link Page — site.js
   Busca dados do Google Apps Script, determina estado
   (A: sem show / B: com shows), renderiza e rastreia via GA4.
   ========================================================= */

(function () {
  'use strict';

  /* ── Configurações padrão (fallback se o Sheet falhar) ── */
  const DEFAULTS = {
    name:    'Gus Dorea',
    handle:  '@gusdorea',
    domain:  'gusdorea.link',
    bio:     '',
    foto_url: 'assets/photos/gus-portrait-smile.jpg',
    rodape:  'feito com paciência',
    titulo_shows: 'shows',
    titulo_links: 'links',
    estado:  'auto',
  };

  const FALLBACK_SOCIALS = [
    { icon: 'ph-instagram-logo', label: 'Instagram', handle: '@gusdorea', href: 'https://instagram.com/gusdorea', active: 'true' },
    { icon: 'ph-youtube-logo',   label: 'YouTube',   handle: '/gusdorea',  href: 'https://youtube.com/@gusdorea',  active: 'true' },
    { icon: 'ph-tiktok-logo',    label: 'TikTok',    handle: '@gusdorea',  href: 'https://tiktok.com/@gusdorea',   active: 'true' },
  ];

  /* ── Utilitários de data ── */
  const MONTHS   = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const WEEKDAYS = ['dom','seg','ter','qua','qui','sex','sáb'];

  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  /* Converte qualquer formato de data (ISO, Date string do Sheets, etc.) */
  function parseDate(val) {
    if (!val) return null;
    const s = String(val).trim();
    // Já está em YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T12:00:00');
    // Google Sheets às vezes envia "Date(2026,5,13)" ou string completa
    const match = s.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) return new Date(Number(match[1]), Number(match[2]), Number(match[3]), 12);
    // Fallback: deixa o JS tentar
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function dateToISO(d) {
    if (!d) return '';
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function formatShowDate(dateVal) {
    const d = parseDate(dateVal);
    if (!d) return { weekday: '', day: '--', month: '---' };
    return {
      weekday: WEEKDAYS[d.getDay()],
      day:     String(d.getDate()).padStart(2, '0'),
      month:   MONTHS[d.getMonth()],
    };
  }

  /* ── JSONP fetch ── */
  function fetchJSONP(url) {
    return new Promise(function (resolve, reject) {
      var cb = '__gus' + Date.now();
      var el = document.createElement('script');
      var timer = setTimeout(function () {
        cleanup();
        reject(new Error('timeout'));
      }, 8000);

      function cleanup() {
        clearTimeout(timer);
        delete window[cb];
        if (el.parentNode) el.parentNode.removeChild(el);
      }

      window[cb] = function (data) { cleanup(); resolve(data); };
      el.onerror  = function () { cleanup(); reject(new Error('load error')); };
      el.src = url + (url.indexOf('?') > -1 ? '&' : '?') + 'callback=' + cb;
      document.head.appendChild(el);
    });
  }

  /* ── GA4 helper ── */
  function track(event, params) {
    if (typeof gtag === 'function') {
      gtag('event', event, params || {});
    }
  }

  /* ── Tracking nos links ── */
  function attachTracking() {
    document.querySelectorAll('[data-gtrack]').forEach(function (el) {
      el.addEventListener('click', function () {
        try {
          var payload = JSON.parse(el.getAttribute('data-gtrack'));
          track(payload.event, payload.params);
        } catch (_) {}
      });
    });
  }

  /* ── HTML helpers ── */
  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function gtrack(event, params) {
    return 'data-gtrack=\'' + JSON.stringify({ event: event, params: params }).replace(/'/g, '&#39;') + '\'';
  }

  /* ── Render: Hero ── */
  function renderHero(cfg) {
    return (
      '<div class="gf-hero">' +
        '<div class="gf-photo" role="img" aria-label="Foto do ' + esc(cfg.name) + '"' +
          ' style="background-image:url(\'' + esc(cfg.foto_url) + '\')"></div>' +
        '<h1 class="gf-name">' + esc(cfg.name) + '</h1>' +
        '<div class="gf-handle">' + esc(cfg.handle) + '</div>' +
        (cfg.bio ? '<p class="gf-bio">' + esc(cfg.bio) + '</p>' : '') +
        '<div class="gf-rule"></div>' +
      '</div>'
    );
  }

  /* ── Render: Footer ── */
  function renderFooter(cfg) {
    return (
      '<div class="gf-foot">' +
        '<span class="gd">' + esc(cfg.name) + '</span>' +
        '© ' + new Date().getFullYear() + ' · ' + esc(cfg.rodape) +
      '</div>'
    );
  }

  /* ── Render: Estado A (sem show) ── */
  function renderEstadoA(cfg, socials) {
    var socialsHtml = socials.map(function (s) {
      return (
        '<a href="' + esc(s.href) + '" class="gf-social-full" target="_blank" rel="noopener"' +
          ' ' + gtrack('social_click', { social_name: s.label, estado: 'sem_show' }) + '>' +
          '<div class="gf-sf-icon"><i class="ph ' + esc(s.icon) + '"></i></div>' +
          '<div class="gf-sf-meta">' +
            '<span class="gf-sf-label">' + esc(s.label) + '</span>' +
            '<span class="gf-sf-handle">' + esc(s.handle) + '</span>' +
          '</div>' +
          '<span class="gf-sf-arr">→</span>' +
        '</a>'
      );
    }).join('');

    return (
      '<div class="gf">' +
        '<div class="gf-top">' +
          '<span class="gf-mono">' + esc(cfg.domain) + '</span>' +
          '<span class="gf-pill"><span class="dot"></span>sem show essa semana</span>' +
        '</div>' +
        renderHero(cfg) +
        '<div class="gf-socials-full">' + socialsHtml + '</div>' +
        renderFooter(cfg) +
      '</div>'
    );
  }

  /* ── Render: Estado B (com shows e/ou links externos) ──
     Regras:
     - Tem shows  → badge "turnê", sociais COMPACTOS, seção shows visível
     - Sem shows  → badge "sem show", sociais CHEIOS, seção shows oculta
     - Links      → sempre visíveis se existirem
  ── */
  function renderEstadoB(cfg, socials, shows, links) {
    var hasShows = shows.length > 0;
    var estadoSocial = hasShows ? 'com_show' : 'sem_show';

    /* Badge topo */
    var badge = hasShows
      ? '<span class="gf-tour">turnê ' + new Date().getFullYear() + '</span>'
      : '<span class="gf-pill"><span class="dot"></span>sem show essa semana</span>';

    /* Sociais: compactos se tem show, cheios se não tem */
    var socialsHtml;
    if (hasShows) {
      socialsHtml = '<div class="gf-socials-compact">' +
        socials.map(function (s) {
          return (
            '<a href="' + esc(s.href) + '" class="gf-icon-btn" target="_blank" rel="noopener"' +
              ' ' + gtrack('social_click', { social_name: s.label, estado: estadoSocial }) + '>' +
              '<i class="ph ' + esc(s.icon) + '"></i>' +
              '<span class="gf-icon-name">' + esc(s.label) + '</span>' +
            '</a>'
          );
        }).join('') +
      '</div>';
    } else {
      socialsHtml = '<div class="gf-socials-full">' +
        socials.map(function (s) {
          return (
            '<a href="' + esc(s.href) + '" class="gf-social-full" target="_blank" rel="noopener"' +
              ' ' + gtrack('social_click', { social_name: s.label, estado: estadoSocial }) + '>' +
              '<div class="gf-sf-icon"><i class="ph ' + esc(s.icon) + '"></i></div>' +
              '<div class="gf-sf-meta">' +
                '<span class="gf-sf-label">' + esc(s.label) + '</span>' +
                '<span class="gf-sf-handle">' + esc(s.handle) + '</span>' +
              '</div>' +
              '<span class="gf-sf-arr">→</span>' +
            '</a>'
          );
        }).join('') +
      '</div>';
    }

    /* Seção shows — só renderiza se tiver shows */
    var showsSection = hasShows
      ? '<div class="gf-section">' +
          '<div class="gf-sec-head"><span class="gf-sec-label">' + esc(cfg.titulo_shows) + '</span><div class="gf-sec-line"></div></div>' +
          '<div class="gf-shows">' +
            shows.map(function (s) {
              var fd = formatShowDate(s.date_iso);
              return (
                '<a href="' + esc(s.href || '#') + '" class="gf-show" target="_blank" rel="noopener"' +
                  ' ' + gtrack('show_click', { show_venue: s.venue, show_date: s.date_iso }) + '>' +
                  '<div class="gf-show-date">' +
                    '<div class="gf-show-wd">' + esc(fd.weekday) + '</div>' +
                    '<div class="gf-show-d">' + esc(fd.day) + '</div>' +
                    '<div class="gf-show-mo">' + esc(fd.month) + '</div>' +
                  '</div>' +
                  '<div class="gf-show-info">' +
                    '<div class="gf-show-venue">' + esc(s.venue) + '</div>' +
                    '<div class="gf-show-city">' + esc(s.city) + '</div>' +
                    '<div class="gf-show-time">' + esc(s.time) + '</div>' +
                  '</div>' +
                  '<div class="gf-show-cta">ingressos →</div>' +
                '</a>'
              );
            }).join('') +
          '</div>' +
        '</div>'
      : '';

    /* Seção links externos */
    var linksSection = links.length
      ? '<div class="gf-section">' +
          '<div class="gf-sec-head"><span class="gf-sec-label">' + esc(cfg.titulo_links) + '</span><div class="gf-sec-line"></div></div>' +
          '<div class="gf-exts">' +
            links.map(function (l) {
              return (
                '<a href="' + esc(l.href) + '" class="gf-ext" target="_blank" rel="noopener"' +
                  ' ' + gtrack('link_click', { link_label: l.label }) + '>' +
                  '<div class="gf-ext-icon"><i class="ph ph-link-simple"></i></div>' +
                  '<div class="gf-ext-body">' +
                    '<span class="gf-ext-label">' + esc(l.label) + '</span>' +
                    '<span class="gf-ext-sub">' + esc(l.sub) + '</span>' +
                  '</div>' +
                  '<span class="gf-ext-arr">↗</span>' +
                '</a>'
              );
            }).join('') +
          '</div>' +
        '</div>'
      : '';

    return (
      '<div class="gf">' +
        '<div class="gf-top">' +
          '<span class="gf-mono">' + esc(cfg.domain) + '</span>' +
          badge +
        '</div>' +
        renderHero(cfg) +
        socialsHtml +
        showsSection +
        linksSection +
        renderFooter(cfg) +
      '</div>'
    );
  }

  /* ── Main ── */
  var root = document.getElementById('root');

  function parseConfig(rows) {
    var obj = Object.assign({}, DEFAULTS);
    (rows || []).forEach(function (r) { if (r.key) obj[r.key] = r.value; });
    return obj;
  }

  function filterActive(arr) {
    return (arr || []).filter(function (r) {
      return String(r.active || 'true').toLowerCase() !== 'false';
    });
  }

  function run(rawData) {
    var cfg     = parseConfig(rawData.config);
    var socials = filterActive(rawData.socials && rawData.socials.length ? rawData.socials : FALLBACK_SOCIALS);
    var today   = todayISO();
    var shows   = filterActive(rawData.shows).filter(function (s) {
      var d = parseDate(s.date_iso);
      return d && dateToISO(d) >= today;
    });
    var links   = filterActive(rawData.links);

    var estadoKey = String(cfg.estado || 'auto').toLowerCase();
    if (estadoKey === 'auto') estadoKey = (shows.length > 0 || links.length > 0) ? 'b' : 'a';

    root.innerHTML = estadoKey === 'b'
      ? renderEstadoB(cfg, socials, shows, links)
      : renderEstadoA(cfg, socials);

    track('gus_page_view', {
      estado:      estadoKey === 'b' ? 'com_show' : 'sem_show',
      shows_count: shows.length,
    });

    attachTracking();
  }

  var scriptUrl = window.GUS_SCRIPT_URL;

  if (!scriptUrl || scriptUrl.indexOf('REPLACE') > -1) {
    /* Sem configuração: renderiza fallback com sociais padrão */
    run({ config: [], socials: FALLBACK_SOCIALS, shows: [], links: [] });
    return;
  }

  fetchJSONP(scriptUrl)
    .then(run)
    .catch(function (err) {
      console.warn('[Gus Linktree] Erro ao carregar dados, usando fallback:', err);
      run({ config: [], socials: FALLBACK_SOCIALS, shows: [], links: [] });
    });
})();
