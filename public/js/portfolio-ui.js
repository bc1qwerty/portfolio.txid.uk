// ── portfolio-ui.js — UI rendering: cards, summary, donut chart, theme, events ──
(function () {
  'use strict';

  var t = function (key) { return window.portfolioI18n ? window.portfolioI18n.t(key) : key; };
  var core = function () { return window.portfolioCore; };

  // ── Theme ──
  var sunSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>';
  var moonSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var sunSvgSm = sunSvg.replace(/width="15" height="15"/g, 'width="14" height="14"');
  var moonSvgSm = moonSvg.replace(/width="15" height="15"/g, 'width="14" height="14"');

  function updateThemeBtn() {
    var btn = document.getElementById('theme-btn');
    if (!btn) return;
    var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    btn.innerHTML = isDark ? sunSvg : moonSvg;
    btn.title = isDark ? t('light_mode') : t('dark_mode');
  }

  function toggleTheme() {
    var h = document.documentElement;
    var n = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    h.setAttribute('data-theme', n);
    localStorage.setItem('theme', n);
    updateThemeBtn();
  }

  // Initialize theme button
  (function () {
    var th = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', th);
    updateThemeBtn();
  })();

  // ── Donut chart ──
  var CHART_COLORS = ['#f7931a', '#4ecdc4', '#ff6b6b', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8', '#f8b500', '#7fcdcd'];

  function renderDonut(portfolio, total) {
    var section = document.getElementById('chart-section');
    var svg = document.getElementById('donut-chart');
    var legend = document.getElementById('chart-legend');
    if (!section || !svg || !legend) return;
    var items = portfolio.filter(function (a) { return (a.balance || 0) > 0; }).sort(function (a, b) { return (b.balance || 0) - (a.balance || 0); });
    if (items.length < 2 || total <= 0) {
      section.classList.add('hidden');
      var hint = document.getElementById('chart-hint');
      if (hint) hint.style.display = portfolio.length > 0 && items.length < 2 ? '' : 'none';
      return;
    }
    var hint2 = document.getElementById('chart-hint');
    if (hint2) hint2.style.display = 'none';
    section.classList.remove('hidden');
    var cx = 100, cy = 100, r = 70, stroke = 28;
    var circ = 2 * Math.PI * r;
    var offset = 0;
    var paths = '';
    var legendHtml = '';
    items.forEach(function (a, i) {
      var pct = (a.balance || 0) / total;
      var dash = circ * pct;
      var color = CHART_COLORS[i % CHART_COLORS.length];
      paths += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-dasharray="' + dash + ' ' + (circ - dash) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>';
      offset += dash;
      legendHtml += '<div class="legend-item"><span class="legend-dot" style="background:' + color + '"></span><span class="legend-label">' + core().escHtml(a.label) + '</span><span class="legend-pct">' + (pct * 100).toFixed(1) + '%</span></div>';
    });
    svg.innerHTML = paths + '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" fill="currentColor" font-size="16" font-weight="bold">' + total.toFixed(4) + '</text><text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" fill="currentColor" font-size="11" opacity="0.6">BTC</text>';
    legend.innerHTML = legendHtml;
  }

  // ── Render address list ──
  function render() {
    var c = core();
    var p = c.getPortfolio();
    var el = document.getElementById('addr-list');
    var summary = document.getElementById('portfolio-summary');
    if (!el || !summary) return;
    if (!p.length) {
      el.innerHTML = '<div class="empty">' + t('empty_msg') + '<br>' + t('browser_only') + ' \uD83D\uDD12</div>';
      summary.classList.add('hidden');
      return;
    }
    summary.classList.remove('hidden');
    var maxBal = Math.max.apply(null, p.map(function (a) { return a.balance || 0; }).concat([0.0001]));
    el.innerHTML = p.map(function (a, i) {
      var bal = a.balance != null ? a.balance.toFixed(8) : '\u2026';
      var btcKrw = c.getBtcKrw();
      var btcUsd = c.getBtcUsd();
      var krw = a.balance != null && btcKrw ? Math.round(a.balance * btcKrw).toLocaleString() + '\uc6d0' : '\u2014';
      var usd = a.balance != null && btcUsd ? '$' + (a.balance * btcUsd).toFixed(2) : '\u2014';
      var pct = a.balance != null ? ((a.balance / maxBal) * 100).toFixed(0) : 0;
      var ago = a.updated ? c.timeSince(a.updated) : t('unconfirmed');
      // Per-address gain/loss indicator
      var plBadge = '';
      if (a.addedPriceUsd && a.balance != null && btcUsd) {
        var addrCurrentVal = a.balance * btcUsd;
        var addrAddedVal = a.balance * a.addedPriceUsd;
        var addrPl = addrAddedVal > 0 ? ((addrCurrentVal - addrAddedVal) / addrAddedVal * 100) : 0;
        if (addrPl !== 0) {
          var addrPlSign = addrPl >= 0 ? '+' : '';
          var addrPlClass = addrPl >= 0 ? 'pl-badge-positive' : 'pl-badge-negative';
          plBadge = '<span class="addr-pl-badge ' + addrPlClass + '">' + addrPlSign + addrPl.toFixed(1) + '%</span>';
        }
      }
      return '<div class="addr-card" id="ac-' + i + '" data-addr="' + a.addr + '">' +
      '<div class="addr-main">' +
        '<div class="addr-label-row">' +
          '<span class="addr-label-text">' + c.escHtml(a.label) + '</span>' +
          '<span class="badge badge-green badge-sm">' + c.addrType(a.addr) + '</span>' +
          plBadge +
        '</div>' +
        '<div class="addr-hash">' + a.addr + '</div>' +
        '<div class="addr-stats">' +
          '<span class="addr-bal">' + bal + ' BTC</span>' +
          '<span class="addr-bal-krw">' + krw + '</span>' +
          '<span class="addr-bal-krw">' + usd + '</span>' +
          '<span class="addr-tx">' + (a.txCount != null ? a.txCount.toLocaleString() + ' TX' : '') + '</span>' +
          '<span class="addr-tx text-muted">' + ago + '</span>' +
        '</div>' +
        '<div class="bar-wrap"><div class="bar" style="--w:' + pct + '%"></div></div>' +
      '</div>' +
      '<div class="addr-actions">' +
        '<button class="icon-btn" data-action="explorer" data-addr="' + c.escHtml(a.addr) + '" title="' + t('explorer') + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>' +
        '<button class="icon-btn" data-action="edit" data-index="' + i + '" title="' + t('rename') + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
        '<button class="icon-btn" data-action="remove" data-index="' + i + '" title="' + t('delete') + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>' +
      '</div>' +
    '</div>';
    }).join('');
  }

  // ── Update summary stats ──
  function updateSummary() {
    var c = core();
    var p = c.getPortfolio();
    var total = p.reduce(function (s, a) { return s + (a.balance || 0); }, 0);
    var btcKrw = c.getBtcKrw();
    var btcUsd = c.getBtcUsd();
    var totalBtcEl = document.getElementById('total-btc');
    var totalKrwEl = document.getElementById('total-krw');
    var totalUsdEl = document.getElementById('total-usd');
    var addrCountEl = document.getElementById('addr-count');
    if (totalBtcEl) totalBtcEl.textContent = total.toFixed(6) + ' BTC';
    if (totalKrwEl) totalKrwEl.textContent = btcKrw ? Math.round(total * btcKrw).toLocaleString() + '\uc6d0' : '\u2014';
    if (totalUsdEl) totalUsdEl.textContent = btcUsd ? '$' + (total * btcUsd).toFixed(2) : '\u2014';
    if (addrCountEl) addrCountEl.textContent = p.length + t('unit_count');

    // ── Profit/Loss calculation ──
    var plEl = document.getElementById('profit-loss-section');
    if (plEl && btcUsd) {
      var currentTotalUsd = total * btcUsd;
      var addedTotalUsd = 0;
      var hasAddedPrice = false;
      p.forEach(function (a) {
        if (a.addedPriceUsd && a.balance != null) {
          addedTotalUsd += a.balance * a.addedPriceUsd;
          hasAddedPrice = true;
        } else if (a.balance != null) {
          // No saved price — use current price (no profit/loss for this address)
          addedTotalUsd += a.balance * btcUsd;
        }
      });
      if (hasAddedPrice && p.length > 0) {
        var plAmount = currentTotalUsd - addedTotalUsd;
        var plPct = addedTotalUsd > 0 ? ((plAmount / addedTotalUsd) * 100) : 0;
        var isPositive = plAmount >= 0;
        var sign = isPositive ? '+' : '';
        var colorClass = isPositive ? 'pl-positive' : 'pl-negative';

        plEl.classList.remove('hidden');
        var plCurrentEl = document.getElementById('pl-current');
        var plAddedEl = document.getElementById('pl-added');
        var plAmountEl = document.getElementById('pl-amount');
        var plPctEl = document.getElementById('pl-pct');
        if (plCurrentEl) plCurrentEl.textContent = '$' + currentTotalUsd.toFixed(2);
        if (plAddedEl) plAddedEl.textContent = '$' + addedTotalUsd.toFixed(2);
        if (plAmountEl) {
          plAmountEl.textContent = sign + '$' + Math.abs(plAmount).toFixed(2);
          plAmountEl.className = 'pl-val ' + colorClass;
        }
        if (plPctEl) {
          plPctEl.textContent = sign + plPct.toFixed(2) + '%';
          plPctEl.className = 'pl-pct-badge ' + colorClass;
        }

        // KRW profit/loss
        if (btcKrw) {
          var currentTotalKrw = total * btcKrw;
          var addedTotalKrw = 0;
          p.forEach(function (a) {
            if (a.addedPriceKrw && a.balance != null) {
              addedTotalKrw += a.balance * a.addedPriceKrw;
            } else if (a.balance != null) {
              addedTotalKrw += a.balance * btcKrw;
            }
          });
          var plKrw = currentTotalKrw - addedTotalKrw;
          var plKrwEl = document.getElementById('pl-krw');
          if (plKrwEl) {
            var krwSign = plKrw >= 0 ? '+' : '';
            plKrwEl.textContent = krwSign + Math.round(Math.abs(plKrw)).toLocaleString() + '\uc6d0';
            plKrwEl.className = 'pl-sub ' + (plKrw >= 0 ? 'pl-positive' : 'pl-negative');
          }
        }
      } else {
        plEl.classList.add('hidden');
      }
    }

    renderDonut(p, total);
  }

  // ── Hamburger menu ──
  function updateHamburger() {
    var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    var icon = document.getElementById('hamburger-theme-icon');
    if (icon) icon.innerHTML = isDark ? sunSvgSm : moonSvgSm;
    var lang = window.portfolioI18n ? window.portfolioI18n.getLang() : 'ko';
    document.querySelectorAll('#hamburger-panel .settings-lang-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
  }

  // ── Event binding ──
  function bindEvents() {
    var c = core();
    var i18n = window.portfolioI18n;

    // Address input Enter key
    var addrInput = document.getElementById('addr-input');
    if (addrInput) addrInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') c.addAddress(); });

    // Button clicks
    document.getElementById('btn-add')?.addEventListener('click', c.addAddress);
    document.getElementById('btn-refresh')?.addEventListener('click', c.refreshAll);
    document.getElementById('btn-export')?.addEventListener('click', c.exportData);
    document.getElementById('btn-import')?.addEventListener('click', c.importData);
    document.getElementById('btn-clear')?.addEventListener('click', c.clearAll);

    // Address list delegation
    document.getElementById('addr-list')?.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.dataset.action;
      if (action === 'explorer') c.openInExplorer(btn.dataset.addr);
      else if (action === 'edit') c.editLabel(parseInt(btn.dataset.index));
      else if (action === 'remove') c.removeAddr(parseInt(btn.dataset.index));
    });

    // Lang button
    document.getElementById('lang-btn')?.addEventListener('click', i18n.toggleLang);
    document.querySelectorAll('#lang-menu button').forEach(function (btn) {
      var l = btn.textContent === '\ud55c\uad6d\uc5b4' ? 'ko' : btn.textContent === 'English' ? 'en' : 'ja';
      btn.addEventListener('click', function () { i18n.setLang(l); });
    });

    // Theme button
    document.getElementById('theme-btn')?.addEventListener('click', toggleTheme);

    // Hamburger menu
    document.getElementById('hamburger-btn')?.addEventListener('click', function () {
      var panel = document.getElementById('hamburger-panel');
      if (!panel) return;
      var open = panel.classList.toggle('open');
      this.setAttribute('aria-expanded', String(open));
      if (open) updateHamburger();
    });
    document.addEventListener('click', function (e) {
      var wrap = document.querySelector('.hamburger-wrap');
      var panel = document.getElementById('hamburger-panel');
      if (wrap && panel && !wrap.contains(e.target)) {
        panel.classList.remove('open');
        document.getElementById('hamburger-btn')?.setAttribute('aria-expanded', 'false');
      }
    });
    document.querySelectorAll('#hamburger-panel .settings-lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        i18n.setLang(btn.dataset.lang);
        document.getElementById('hamburger-panel')?.classList.remove('open');
        document.getElementById('hamburger-btn')?.setAttribute('aria-expanded', 'false');
      });
    });
    document.getElementById('hamburger-theme-btn')?.addEventListener('click', function () {
      toggleTheme();
      updateHamburger();
    });

    // Auth sync
    if (window.txidAuth && window.txidAuth.onAuthChange) {
      window.txidAuth.onAuthChange(function (user) { if (user) c.syncPortfolio(); });
    }
  }

  // Export to global scope
  window.portfolioUI = {
    render: render,
    updateSummary: updateSummary,
    updateThemeBtn: updateThemeBtn,
    toggleTheme: toggleTheme,
    updateHamburger: updateHamburger,
    bindEvents: bindEvents,
  };

  // ── Initialize ──
  bindEvents();
  core().loadPrices();
  render();
  var portfolio = core().getPortfolio();
  if (portfolio.length) core().refreshAll();
  core().checkUrlAutoAdd();
})();
