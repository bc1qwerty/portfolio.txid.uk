// ── portfolio-core.js — State management, API calls, localStorage, cloud sync ──
(function () {
  'use strict';

  var t = function (key) { return window.portfolioI18n ? window.portfolioI18n.t(key) : key; };

  var API = 'https://mempool.space/api';
  var STORAGE_KEY = 'btc_portfolio_v2';
  var _btcKrw = null;
  var _btcUsd = null;

  // ── Helpers ──
  function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function addrType(a) { if (a.startsWith('bc1p')) return 'P2TR'; if (a.startsWith('bc1q')) return 'SegWit'; if (a.startsWith('3')) return 'P2SH'; return 'P2PKH'; }
  function timeSince(ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return s + t('sec_ago');
    if (s < 3600) return Math.floor(s / 60) + t('min_ago');
    if (s < 86400) return Math.floor(s / 3600) + t('hour_ago');
    return Math.floor(s / 86400) + t('day_ago');
  }

  // ── Fetch with retry ──
  async function fetchRetry(url, timeout, retries) {
    for (var i = 0, m = retries || 2; i <= m; i++) {
      try { return await fetch(url, { signal: AbortSignal.timeout(timeout || 10000) }); }
      catch (e) { if (i >= m) throw e; await new Promise(function (r) { setTimeout(r, 1000 << i); }); }
    }
    throw new Error('fetchRetry exhausted');
  }

  // ── Portfolio CRUD ──
  function getPortfolio() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; } }
  function savePortfolio(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
  function saveAndSync(p) {
    savePortfolio(p);
    if (window.txidAuth && window.txidAuth.getUser()) {
      fetch('https://api.txid.uk/portfolio', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio: p })
      }).catch(function () { });
    }
  }

  // ── Price loading ──
  // Primary: api.txid.uk/macro/prices (aggregated, fast)
  // Fallback: direct Upbit + CoinGecko calls
  async function loadPrices() {
    try {
      // Try api.txid.uk first (single request, has both USD and KRW)
      var resp = await fetchRetry('https://api.txid.uk/macro/prices', 6000, 1);
      if (resp.ok) {
        var data = await resp.json();
        if (data.btc && data.btc.usd) _btcUsd = data.btc.usd;
        if (data.btc && data.btc.krw) _btcKrw = data.btc.krw;
        // Also accept usdKrw for manual calculation fallback
        if (!_btcKrw && _btcUsd && data.usdKrw) _btcKrw = Math.round(_btcUsd * data.usdKrw);
        if (_btcUsd || _btcKrw) {
          if (window.portfolioUI) window.portfolioUI.updateSummary();
          return;
        }
      }
    } catch (e) {
      console.warn('api.txid.uk prices unavailable, using fallback:', e.message);
    }
    // Fallback: direct API calls
    try {
      var results = await Promise.all([
        fetchRetry('https://api.upbit.com/v1/ticker?markets=KRW-BTC', 8000).then(function (r) { return r.json(); }),
        fetchRetry('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', 8000).then(function (r) { return r.json(); }),
      ]);
      _btcKrw = results[0][0].trade_price;
      _btcUsd = results[1].bitcoin.usd;
      if (window.portfolioUI) window.portfolioUI.updateSummary();
    } catch (e) {
      console.error('loadPrices fallback error:', e);
      if (window.portfolioUI) window.portfolioUI.render();
    }
  }

  // ── Address operations ──
  function addAddress() {
    var addr = document.getElementById('addr-input').value.trim();
    var label = document.getElementById('addr-label').value.trim();
    if (!addr) return;
    if (!/^(bc1|1|3)[a-zA-Z0-9]{25,62}$/.test(addr)) { alert(t('invalid_addr')); return; }
    var p = getPortfolio();
    if (p.find(function (a) { return a.addr === addr; })) { alert(t('duplicate_addr')); return; }
    var item = { addr: addr, label: label || addr.slice(0, 12) + '\u2026', balance: null, txCount: null, added: Date.now() };
    // Save the BTC price at time of adding for profit/loss tracking
    if (_btcKrw) item.addedPriceKrw = _btcKrw;
    if (_btcUsd) item.addedPriceUsd = _btcUsd;
    p.push(item);
    saveAndSync(p);
    document.getElementById('addr-input').value = '';
    document.getElementById('addr-label').value = '';
    if (window.portfolioUI) window.portfolioUI.render();
    fetchBalance(addr);
  }

  async function fetchBalance(addr) {
    var card = document.querySelector('[data-addr="' + addr + '"]');
    if (card) card.classList.add('loading');
    try {
      var info = await fetchRetry(API + '/address/' + addr, 10000).then(function (r) { return r.json(); });
      var c = info.chain_stats || {};
      var m = info.mempool_stats || {};
      var bal = (c.funded_txo_sum - c.spent_txo_sum + m.funded_txo_sum - m.spent_txo_sum) / 1e8;
      var tx = c.tx_count + m.tx_count;
      var p = getPortfolio();
      var idx = p.findIndex(function (a) { return a.addr === addr; });
      if (idx >= 0) { p[idx].balance = bal; p[idx].txCount = tx; p[idx].updated = Date.now(); }
      savePortfolio(p);
      if (window.portfolioUI) { window.portfolioUI.render(); window.portfolioUI.updateSummary(); }
    } catch (e) { console.error('fetchBalance error:', e); }
    finally { if (card) card.classList.remove('loading'); }
  }

  function removeAddr(i) {
    if (!confirm(t('confirm_delete'))) return;
    var p = getPortfolio();
    p.splice(i, 1);
    saveAndSync(p);
    if (window.portfolioUI) { window.portfolioUI.render(); window.portfolioUI.updateSummary(); }
  }

  function editLabel(i) {
    var p = getPortfolio();
    var v = prompt(t('edit_label'), p[i].label);
    if (v === null) return;
    p[i].label = v.trim() || p[i].addr.slice(0, 12) + '\u2026';
    saveAndSync(p);
    if (window.portfolioUI) window.portfolioUI.render();
  }

  async function refreshAll() {
    var btn = document.getElementById('btn-refresh');
    if (btn) { btn.setAttribute('disabled', ''); btn.innerHTML = t('refreshing'); }
    var p = getPortfolio();
    await Promise.all(p.map(function (a) { return fetchBalance(a.addr); }));
    if (btn) {
      btn.removeAttribute('disabled');
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> ' + t('refresh_all');
    }
  }

  function clearAll() {
    if (!confirm(t('confirm_clear'))) return;
    saveAndSync([]);
    if (window.portfolioUI) { window.portfolioUI.render(); window.portfolioUI.updateSummary(); }
  }

  function exportData() {
    var p = getPortfolio();
    var blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'btc_portfolio.json';
    a.click();
  }

  function importData() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json';
    inp.onchange = function (e) {
      var fr = new FileReader();
      fr.onload = function (ev) {
        try {
          var p = JSON.parse(ev.target.result);
          if (!Array.isArray(p)) throw new Error(t('not_array'));
          var valid = p.filter(function (a) { return a.addr && typeof a.addr === 'string'; });
          if (!valid.length) throw new Error(t('no_address'));
          saveAndSync(valid);
          if (window.portfolioUI) window.portfolioUI.render();
          refreshAll();
        } catch (e) { alert(t('import_fail') + e.message); }
      };
      fr.readAsText(e.target.files[0]);
    };
    inp.click();
  }

  function openInExplorer(addr) {
    if (/^(bc1|1|3)[a-zA-Z0-9]{25,62}$/.test(addr))
      window.open('https://txid.uk/#/address/' + addr, '_blank');
  }

  // ── Cloud sync ──
  function mergePortfolios(local, server) {
    var map = new Map();
    server.forEach(function (s) { map.set(s.addr, s); });
    local.forEach(function (l) {
      var existing = map.get(l.addr);
      if (!existing || (l.added && existing.added && l.added > existing.added) || !existing.added) {
        map.set(l.addr, l);
      }
    });
    return Array.from(map.values());
  }

  async function syncPortfolio() {
    try {
      var res = await fetch('https://api.txid.uk/portfolio', { credentials: 'include' });
      if (!res.ok) return;
      var data = await res.json();
      var local = getPortfolio();
      var server = data.portfolio || [];
      var merged = mergePortfolios(local, server);
      savePortfolio(merged);
      await fetch('https://api.txid.uk/portfolio', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio: merged })
      });
      if (window.portfolioUI) { window.portfolioUI.render(); window.portfolioUI.updateSummary(); }
    } catch (e) { console.error('Portfolio sync failed', e); }
  }

  // ── URL param auto-add ──
  function checkUrlAutoAdd() {
    var addr = new URLSearchParams(location.search).get('add');
    if (!addr) return;
    if (!/^(bc1|1|3)[a-zA-Z0-9]{25,62}$/.test(addr)) return;
    var p = getPortfolio();
    if (!p.find(function (a) { return a.addr === addr; })) {
      var item = { addr: addr, label: addr.slice(0, 12) + '\u2026', balance: null, txCount: null, added: Date.now() };
      if (_btcKrw) item.addedPriceKrw = _btcKrw;
      if (_btcUsd) item.addedPriceUsd = _btcUsd;
      p.push(item);
      saveAndSync(p);
      if (window.portfolioUI) window.portfolioUI.render();
      fetchBalance(addr);
    }
    history.replaceState(null, '', location.pathname);
  }

  // Export to global scope
  window.portfolioCore = {
    getPortfolio: getPortfolio,
    savePortfolio: savePortfolio,
    saveAndSync: saveAndSync,
    loadPrices: loadPrices,
    addAddress: addAddress,
    fetchBalance: fetchBalance,
    removeAddr: removeAddr,
    editLabel: editLabel,
    refreshAll: refreshAll,
    clearAll: clearAll,
    exportData: exportData,
    importData: importData,
    openInExplorer: openInExplorer,
    syncPortfolio: syncPortfolio,
    checkUrlAutoAdd: checkUrlAutoAdd,
    getBtcKrw: function () { return _btcKrw; },
    getBtcUsd: function () { return _btcUsd; },
    escHtml: escHtml,
    addrType: addrType,
    timeSince: timeSince,
  };
})();
