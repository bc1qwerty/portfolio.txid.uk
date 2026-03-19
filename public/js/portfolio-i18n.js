// ── portfolio-i18n.js — Translation & language switching ──
(function () {
  'use strict';

  const pageLang = window.__pageLang || 'ko';
  let lang = localStorage.getItem('lang') || pageLang;

  const LABELS = {
    ko: {탐색기:'탐색기', 도구:'도구', 시각화:'시각화', 통계:'통계', 노드:'노드', 지도:'지도', 포트폴리오:'포트폴리오', 전송:'전송', 배우기:'배우기', 앱모음:'앱모음'},
    en: {탐색기:'Explorer', 도구:'Tools', 시각화:'Viz', 통계:'Stats', 노드:'Nodes', 지도:'Map', 포트폴리오:'Portfolio', 전송:'TX', 배우기:'Learn', 앱모음:'Apps'},
    ja: {탐색기:'探索', 도구:'ツール', 시각화:'可視化', 통계:'統計', 노드:'ノード', 지도:'地図', 포트폴리오:'資産', 전송:'送金', 배우기:'学習', 앱모음:'アプリ'},
  };

  const T = {
    ko: {
      invalid_addr: '유효하지 않은 비트코인 주소입니다.',
      duplicate_addr: '이미 추가된 주소입니다.',
      empty_msg: '주소를 추가하면 잔액이 실시간으로 표시됩니다.',
      browser_only: '모든 데이터는 브라우저에만 저장됩니다.',
      unconfirmed: '미확인',
      unit_count: '개',
      confirm_delete: '삭제하시겠습니까?',
      edit_label: '이름 변경',
      refreshing: '새로고침 중…',
      refresh_all: '전체 새로고침',
      confirm_clear: '모든 주소를 삭제하시겠습니까?',
      not_array: '배열이 아님',
      no_address: '주소 없음',
      import_fail: '가져오기 실패: ',
      explorer: '탐색기',
      rename: '이름 변경',
      delete: '삭제',
      sec_ago: '초 전',
      min_ago: '분 전',
      hour_ago: '시간 전',
      day_ago: '일 전',
      light_mode: '라이트 모드로 전환',
      dark_mode: '다크 모드로 전환',
    },
    en: {
      invalid_addr: 'Invalid Bitcoin address.',
      duplicate_addr: 'Address already added.',
      empty_msg: 'Add an address to see balances in real time.',
      browser_only: 'All data is stored in your browser only.',
      unconfirmed: 'Unconfirmed',
      unit_count: '',
      confirm_delete: 'Delete this address?',
      edit_label: 'Rename',
      refreshing: 'Refreshing…',
      refresh_all: 'Refresh All',
      confirm_clear: 'Delete all addresses?',
      not_array: 'Not an array',
      no_address: 'No addresses',
      import_fail: 'Import failed: ',
      explorer: 'Explorer',
      rename: 'Rename',
      delete: 'Delete',
      sec_ago: 's ago',
      min_ago: 'm ago',
      hour_ago: 'h ago',
      day_ago: 'd ago',
      light_mode: 'Switch to light mode',
      dark_mode: 'Switch to dark mode',
    },
    ja: {
      invalid_addr: '無効なビットコインアドレスです。',
      duplicate_addr: '既に追加されたアドレスです。',
      empty_msg: 'アドレスを追加すると残高がリアルタイムで表示されます。',
      browser_only: '全てのデータはブラウザにのみ保存されます。',
      unconfirmed: '未確認',
      unit_count: '個',
      confirm_delete: '削除しますか？',
      edit_label: '名前変更',
      refreshing: '更新中…',
      refresh_all: '全て更新',
      confirm_clear: '全てのアドレスを削除しますか？',
      not_array: '配列ではありません',
      no_address: 'アドレスなし',
      import_fail: 'インポート失敗: ',
      explorer: 'エクスプローラー',
      rename: '名前変更',
      delete: '削除',
      sec_ago: '秒前',
      min_ago: '分前',
      hour_ago: '時間前',
      day_ago: '日前',
      light_mode: 'ライトモードに切替',
      dark_mode: 'ダークモードに切替',
    },
  };

  function t(key) { return (T[lang] && T[lang][key]) || T.en[key] || key; }

  function getLang() { return lang; }

  function setLang(l) {
    lang = l; localStorage.setItem('lang', lang);
    // Navigate to the correct language page
    var target = '/' + lang + '/';
    if (window.location.pathname !== target) {
      window.location.href = target;
      return;
    }
    document.documentElement.lang = lang;
    var btn = document.getElementById('lang-btn');
    if (btn) btn.textContent = ({ ko: 'KO', en: 'EN', ja: 'JA' })[lang] || 'KO';
    document.getElementById('lang-menu')?.classList.remove('open');
    document.querySelectorAll('[data-ko]').forEach(function (el) {
      var val = el.dataset[lang] || el.dataset.en || el.dataset.ko;
      if (val) {
        if ('placeholder' in el && el.placeholder !== undefined) {
          el.placeholder = val;
        } else {
          el.textContent = val;
        }
      }
    });
    // Trigger re-render via global functions
    if (window.portfolioUI) {
      window.portfolioUI.render();
      window.portfolioUI.updateSummary();
    }
  }

  function toggleLang() {
    var m = document.getElementById('lang-menu');
    m?.classList.toggle('open');
    document.getElementById('lang-btn')?.setAttribute('aria-expanded', String(m?.classList.contains('open') || false));
  }

  document.addEventListener('click', function (e) {
    var m = document.getElementById('lang-menu');
    if (m && !e.target.closest('.lang-dropdown')) {
      m.classList.remove('open');
      document.getElementById('lang-btn')?.setAttribute('aria-expanded', 'false');
    }
  });

  // If stored lang differs from page lang, navigate
  if (lang !== pageLang && ['ko', 'en', 'ja'].includes(lang)) {
    window.location.href = '/' + lang + '/';
  }

  // Export to global scope
  window.portfolioI18n = {
    t: t,
    getLang: getLang,
    setLang: setLang,
    toggleLang: toggleLang,
    LABELS: LABELS,
    T: T,
  };

  // Initialize
  setLang(lang);
})();
