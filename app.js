'use strict';
const API='https://mempool.space/api';
const STORAGE_KEY='btc_portfolio_v2';
let _btcKrw=null,_btcUsd=null;

(function(){const t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',t);document.getElementById('theme-btn').textContent=t==='dark'?'🌙':'☀️';})();
function toggleTheme(){const h=document.documentElement;const n=h.getAttribute('data-theme')==='dark'?'light':'dark';h.setAttribute('data-theme',n);localStorage.setItem('theme',n);document.getElementById('theme-btn').textContent=n==='dark'?'🌙':'☀️';}

function getPortfolio(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');}catch{return[];}}
function savePortfolio(p){localStorage.setItem(STORAGE_KEY,JSON.stringify(p));}

async function loadPrices(){
  try{
    const[u,cg]=await Promise.all([
      fetch('https://api.upbit.com/v1/ticker?markets=KRW-BTC').then(r=>r.json()),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd').then(r=>r.json()),
    ]);
    _btcKrw=u[0].trade_price;_btcUsd=cg.bitcoin.usd;
    updateSummary();
  }catch{}
}

function addAddress(){
  const addr=document.getElementById('addr-input').value.trim();
  const label=document.getElementById('addr-label').value.trim();
  if(!addr)return;
  if(!/^(bc1|1|3)[a-zA-Z0-9]{25,62}$/.test(addr)){alert('유효하지 않은 비트코인 주소입니다.');return;}
  const p=getPortfolio();
  if(p.find(a=>a.addr===addr)){alert('이미 추가된 주소입니다.');return;}
  p.push({addr,label:label||addr.slice(0,12)+'…',balance:null,txCount:null,added:Date.now()});
  savePortfolio(p);
  document.getElementById('addr-input').value='';
  document.getElementById('addr-label').value='';
  render();
  fetchBalance(addr);
}

async function fetchBalance(addr){
  try{
    const info=await fetch(`${API}/address/${addr}`).then(r=>r.json());
    const c=info.chain_stats||{},m=info.mempool_stats||{};
    const bal=(c.funded_txo_sum-c.spent_txo_sum+m.funded_txo_sum-m.spent_txo_sum)/1e8;
    const tx=c.tx_count+m.tx_count;
    const p=getPortfolio();
    const idx=p.findIndex(a=>a.addr===addr);
    if(idx>=0){p[idx].balance=bal;p[idx].txCount=tx;p[idx].updated=Date.now();}
    savePortfolio(p);render();updateSummary();
  }catch{}
}

function render(){
  const p=getPortfolio();
  const el=document.getElementById('addr-list');
  const summary=document.getElementById('portfolio-summary');
  if(!p.length){el.innerHTML='<div class="empty">주소를 추가하면 잔액이 실시간으로 표시됩니다.<br>모든 데이터는 브라우저에만 저장됩니다. 🔒</div>';summary.style.display='none';return;}
  summary.style.display='grid';
  const maxBal=Math.max(...p.map(a=>a.balance||0),0.0001);
  el.innerHTML=p.map((a,i)=>{
    const bal=a.balance!=null?a.balance.toFixed(8):'…';
    const krw=a.balance!=null&&_btcKrw?Math.round(a.balance*_btcKrw).toLocaleString()+'원':'—';
    const usd=a.balance!=null&&_btcUsd?'$'+(a.balance*_btcUsd).toFixed(2):'—';
    const pct=a.balance!=null?((a.balance/maxBal)*100).toFixed(0):0;
    const ago=a.updated?timeSince(a.updated):'미확인';
    return`<div class="addr-card" id="ac-${i}">
      <div class="addr-main">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="addr-label-text">${escHtml(a.label)}</span>
          <span class="badge badge-green" style="font-size:.6rem">${addrType(a.addr)}</span>
        </div>
        <div class="addr-hash">${a.addr}</div>
        <div class="addr-stats">
          <span class="addr-bal">${bal} BTC</span>
          <span class="addr-bal-krw">${krw}</span>
          <span class="addr-bal-krw">${usd}</span>
          <span class="addr-tx">${a.txCount!=null?a.txCount.toLocaleString()+' TX':''}</span>
          <span class="addr-tx" style="color:var(--text3)">${ago}</span>
        </div>
        <div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div>
      </div>
      <div class="addr-actions">
        <button class="icon-btn" onclick="window.open('https://txid.uk/#/address/${a.addr}')" title="탐색기">🔍</button>
        <button class="icon-btn" onclick="editLabel(${i})" title="이름 변경">✏️</button>
        <button class="icon-btn" onclick="removeAddr(${i})" title="삭제">🗑</button>
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
  document.getElementById('addr-count').textContent=p.length+'개';
}

function removeAddr(i){if(!confirm('삭제하시겠습니까?'))return;const p=getPortfolio();p.splice(i,1);savePortfolio(p);render();updateSummary();}
function editLabel(i){const p=getPortfolio();const v=prompt('이름 변경',p[i].label);if(v===null)return;p[i].label=v.trim()||p[i].addr.slice(0,12)+'…';savePortfolio(p);render();}
async function refreshAll(){const p=getPortfolio();await Promise.all(p.map(a=>fetchBalance(a.addr)));}
function clearAll(){if(!confirm('모든 주소를 삭제하시겠습니까?'))return;savePortfolio([]);render();updateSummary();}
function exportData(){const p=getPortfolio();const blob=new Blob([JSON.stringify(p,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='btc_portfolio.json';a.click();}
function importData(){const inp=document.createElement('input');inp.type='file';inp.accept='.json';inp.onchange=e=>{const fr=new FileReader();fr.onload=ev=>{try{const p=JSON.parse(ev.target.result);savePortfolio(p);render();refreshAll();}catch{alert('유효하지 않은 파일');}};fr.readAsText(e.target.files[0]);};inp.click();}
function addrType(a){if(a.startsWith('bc1p'))return'P2TR';if(a.startsWith('bc1q'))return'SegWit';if(a.startsWith('3'))return'P2SH';return'P2PKH';}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function timeSince(ts){const s=Math.floor((Date.now()-ts)/1000);if(s<60)return s+'초 전';if(s<3600)return Math.floor(s/60)+'분 전';if(s<86400)return Math.floor(s/3600)+'시간 전';return Math.floor(s/86400)+'일 전';}

document.getElementById('addr-input').addEventListener('keydown',e=>{if(e.key==='Enter')addAddress();});
loadPrices();render();
const p=getPortfolio();if(p.length)refreshAll();
