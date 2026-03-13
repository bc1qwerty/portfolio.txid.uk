'use strict';

// ── 언어 ──
let lang = localStorage.getItem('lang') || 'ko';
const LABELS = {
  ko: {탐색기:'탐색기', 도구:'도구', 시각화:'시각화', 통계:'통계', 노드:'노드', 지도:'지도', 포트폴리오:'포트폴리오', 전송:'전송', 배우기:'배우기', 앱모음:'앱모음'},
  en: {탐색기:'Explorer', 도구:'Tools', 시각화:'Viz', 통계:'Stats', 노드:'Nodes', 지도:'Map', 포트폴리오:'Portfolio', 전송:'TX', 배우기:'Learn', 앱모음:'Apps'},
  ja: {탐색기:'探索', 도구:'ツール', 시각화:'可視化', 통계:'統計', 노드:'ノード', 지도:'地図', 포트폴리오:'資産', 전송:'送金', 배우기:'学習', 앱모음:'アプリ'},
};

// ── i18n 번역 ──
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
function t(key){ return (T[lang]&&T[lang][key]) || T.en[key] || key; }

function setLang(l){
  lang=l; localStorage.setItem('lang',lang);
  const btn=document.getElementById('lang-btn');
  if(btn) btn.textContent={ko:'KO',en:'EN',ja:'JA'}[lang]||'KO';
  document.getElementById('lang-menu')?.classList.remove('open');
  document.querySelectorAll('[data-ko]').forEach(el=>{
    const val=el.dataset[lang]||el.dataset.en||el.dataset.ko;
    if(val) el.textContent=val;
  });
  render();updateSummary();
}
function toggleLang(){const m=document.getElementById('lang-menu');m?.classList.toggle('open');document.getElementById('lang-btn')?.setAttribute('aria-expanded',m?.classList.contains('open')||false);}
document.addEventListener('click',e=>{const m=document.getElementById('lang-menu');if(m&&!e.target.closest('.lang-dropdown')){m.classList.remove('open');document.getElementById('lang-btn')?.setAttribute('aria-expanded','false');}});
const API='https://mempool.space/api';
const STORAGE_KEY='btc_portfolio_v2';
let _btcKrw=null,_btcUsd=null;

(function(){setLang(lang);})();
async function fetchRetry(url,timeout,retries){for(let i=0,m=retries||2;i<=m;i++){try{return await fetch(url,{signal:AbortSignal.timeout(timeout||10000)});}catch(e){if(i>=m)throw e;await new Promise(r=>setTimeout(r,1000<<i));}}}

(function(){
  const th=localStorage.getItem('theme')||'dark';
  document.documentElement.setAttribute('data-theme',th);
  updateThemeBtn();
})();
function updateThemeBtn(){
  const btn=document.getElementById('theme-btn');if(!btn)return;
  const isDark=document.documentElement.getAttribute('data-theme')!=='light';
  btn.innerHTML=isDark?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  btn.title=isDark?t('light_mode'):t('dark_mode');
}
function toggleTheme(){
  const h=document.documentElement;
  const n=h.getAttribute('data-theme')==='dark'?'light':'dark';
  h.setAttribute('data-theme',n);localStorage.setItem('theme',n);
  updateThemeBtn();
}

function getPortfolio(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');}catch{return[];}}
function savePortfolio(p){localStorage.setItem(STORAGE_KEY,JSON.stringify(p));}

async function loadPrices(){
  try{
    const[u,cg]=await Promise.all([
      fetchRetry('https://api.upbit.com/v1/ticker?markets=KRW-BTC',8000).then(r=>r.json()),
      fetchRetry('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',8000).then(r=>r.json()),
    ]);
    _btcKrw=u[0].trade_price;_btcUsd=cg.bitcoin.usd;
    updateSummary();
  }catch(e){console.error('loadPrices error:', e);render();}
}

function addAddress(){
  const addr=document.getElementById('addr-input').value.trim();
  const label=document.getElementById('addr-label').value.trim();
  if(!addr)return;
  if(!/^(bc1|1|3)[a-zA-Z0-9]{25,62}$/.test(addr)){alert(t('invalid_addr'));return;}
  const p=getPortfolio();
  if(p.find(a=>a.addr===addr)){alert(t('duplicate_addr'));return;}
  p.push({addr,label:label||addr.slice(0,12)+'…',balance:null,txCount:null,added:Date.now()});
  savePortfolio(p);
  document.getElementById('addr-input').value='';
  document.getElementById('addr-label').value='';
  render();
  fetchBalance(addr);
}

async function fetchBalance(addr){
  const card=document.querySelector(`[data-addr="${addr}"]`);
  if(card) card.classList.add('loading');
  try{
    const info=await fetchRetry(`${API}/address/${addr}`,10000).then(r=>r.json());
    const c=info.chain_stats||{},m=info.mempool_stats||{};
    const bal=(c.funded_txo_sum-c.spent_txo_sum+m.funded_txo_sum-m.spent_txo_sum)/1e8;
    const tx=c.tx_count+m.tx_count;
    const p=getPortfolio();
    const idx=p.findIndex(a=>a.addr===addr);
    if(idx>=0){p[idx].balance=bal;p[idx].txCount=tx;p[idx].updated=Date.now();}
    savePortfolio(p);render();updateSummary();
  }catch(e){console.error('fetchBalance error:', e);}
  finally{if(card) card.classList.remove('loading');}
}

function render(){
  const p=getPortfolio();
  const el=document.getElementById('addr-list');
  const summary=document.getElementById('portfolio-summary');
  if(!p.length){el.innerHTML=`<div class="empty">${t('empty_msg')}<br>${t('browser_only')} 🔒</div>`;summary.classList.add('hidden');return;}
  summary.classList.remove('hidden');
  const maxBal=Math.max(...p.map(a=>a.balance||0),0.0001);
  el.innerHTML=p.map((a,i)=>{
    const bal=a.balance!=null?a.balance.toFixed(8):'…';
    const krw=a.balance!=null&&_btcKrw?Math.round(a.balance*_btcKrw).toLocaleString()+'원':'—';
    const usd=a.balance!=null&&_btcUsd?'$'+(a.balance*_btcUsd).toFixed(2):'—';
    const pct=a.balance!=null?((a.balance/maxBal)*100).toFixed(0):0;
    const ago=a.updated?timeSince(a.updated):t('unconfirmed');
    return`<div class="addr-card" id="ac-${i}" data-addr="${a.addr}">
      <div class="addr-main">
        <div class="addr-label-row">
          <span class="addr-label-text">${escHtml(a.label)}</span>
          <span class="badge badge-green badge-sm">${addrType(a.addr)}</span>
        </div>
        <div class="addr-hash">${a.addr}</div>
        <div class="addr-stats">
          <span class="addr-bal">${bal} BTC</span>
          <span class="addr-bal-krw">${krw}</span>
          <span class="addr-bal-krw">${usd}</span>
          <span class="addr-tx">${a.txCount!=null?a.txCount.toLocaleString()+' TX':''}</span>
          <span class="addr-tx text-muted">${ago}</span>
        </div>
        <div class="bar-wrap"><div class="bar" style="--w:${pct}%"></div></div>
      </div>
      <div class="addr-actions">
        <button class="icon-btn" data-action="explorer" data-addr="${escHtml(a.addr)}" title="${t('explorer')}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
        <button class="icon-btn" data-action="edit" data-index="${i}" title="${t('rename')}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="icon-btn" data-action="remove" data-index="${i}" title="${t('delete')}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
      </div>
    </div>`;
  }).join('');
}

function updateSummary(){
  const p=getPortfolio();
  const total=p.reduce((s,a)=>s+(a.balance||0),0);
  document.getElementById('total-btc').textContent=total.toFixed(6)+' BTC';
  document.getElementById('total-krw').textContent=_btcKrw?Math.round(total*_btcKrw).toLocaleString()+'원':'—';
  document.getElementById('total-usd').textContent=_btcUsd?'$'+(total*_btcUsd).toFixed(2):'—';
  document.getElementById('addr-count').textContent=p.length+t('unit_count');
}

function removeAddr(i){if(!confirm(t('confirm_delete')))return;const p=getPortfolio();p.splice(i,1);savePortfolio(p);render();updateSummary();}
function editLabel(i){const p=getPortfolio();const v=prompt(t('edit_label'),p[i].label);if(v===null)return;p[i].label=v.trim()||p[i].addr.slice(0,12)+'…';savePortfolio(p);render();}
async function refreshAll(){const btn=event?.target;if(btn){btn.disabled=true;btn.innerHTML=t('refreshing');}const p=getPortfolio();await Promise.all(p.map(a=>fetchBalance(a.addr)));if(btn){btn.disabled=false;btn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> '+t('refresh_all');}}
function clearAll(){if(!confirm(t('confirm_clear')))return;savePortfolio([]);render();updateSummary();}
function exportData(){const p=getPortfolio();const blob=new Blob([JSON.stringify(p,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='btc_portfolio.json';a.click();}
function importData(){const inp=document.createElement('input');inp.type='file';inp.accept='.json';inp.onchange=e=>{const fr=new FileReader();fr.onload=ev=>{try{const p=JSON.parse(ev.target.result);if(!Array.isArray(p))throw new Error(t('not_array'));const valid=p.filter(a=>a.addr&&typeof a.addr==='string');if(!valid.length)throw new Error(t('no_address'));savePortfolio(valid);render();refreshAll();}catch(e){alert(t('import_fail')+e.message);}};fr.readAsText(e.target.files[0]);};inp.click();}
function openInExplorer(addr) {
  if (/^(bc1|1|3)[a-zA-Z0-9]{25,62}$/.test(addr))
    window.open('https://txid.uk/#/address/' + addr, '_blank');
}
function addrType(a){if(a.startsWith('bc1p'))return'P2TR';if(a.startsWith('bc1q'))return'SegWit';if(a.startsWith('3'))return'P2SH';return'P2PKH';}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function timeSince(ts){const s=Math.floor((Date.now()-ts)/1000);if(s<60)return s+t('sec_ago');if(s<3600)return Math.floor(s/60)+t('min_ago');if(s<86400)return Math.floor(s/3600)+t('hour_ago');return Math.floor(s/86400)+t('day_ago');}

document.getElementById('addr-input').addEventListener('keydown',e=>{if(e.key==='Enter')addAddress();});
loadPrices();render();
const p=getPortfolio();if(p.length)refreshAll();

// URL 파라미터로 주소 자동 추가
(function(){
  const addr = new URLSearchParams(location.search).get('add');
  if (!addr) return;
  if (!/^(bc1|1|3)[a-zA-Z0-9]{25,62}$/.test(addr)) return;
  // 중복 체크 후 추가
  const p = getPortfolio();
  if (!p.find(a => a.addr === addr)) {
    p.push({addr, label: addr.slice(0,12)+'…', balance: null, txCount: null, added: Date.now()});
    savePortfolio(p);
    render();
    fetchBalance(addr);
  }
  // URL 정리
  history.replaceState(null, '', location.pathname);
})();

// ── 이벤트 위임 (동적 생성 요소) ──
document.getElementById('addr-list')?.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'explorer') openInExplorer(btn.dataset.addr);
  else if (action === 'edit') editLabel(parseInt(btn.dataset.index));
  else if (action === 'remove') removeAddr(parseInt(btn.dataset.index));
});

// ── 이벤트 리스너 (inline onclick 대체) ──
document.getElementById('lang-btn')?.addEventListener('click', toggleLang);
document.querySelectorAll('#lang-menu button').forEach(function(btn) {
  var l = btn.textContent === '한국어' ? 'ko' : btn.textContent === 'English' ? 'en' : 'ja';
  btn.addEventListener('click', function() { setLang(l); });
});
document.getElementById('theme-btn')?.addEventListener('click', toggleTheme);
document.getElementById('btn-add')?.addEventListener('click', addAddress);
document.getElementById('btn-refresh')?.addEventListener('click', refreshAll);
document.getElementById('btn-export')?.addEventListener('click', exportData);
document.getElementById('btn-import')?.addEventListener('click', importData);
document.getElementById('btn-clear')?.addEventListener('click', clearAll);
