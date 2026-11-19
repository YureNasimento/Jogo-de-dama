const $=s=>document.querySelector(s);
const DIRS=[[-1,-1],[-1,1],[1,-1],[1,1]];
const sideOf=v=>v>0?1:v<0?-1:0;           // 1 = você, -1 = máquina
const inb=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
let board,turn,sel,over,busy,lastMv,quiet,legal=[],gen=0,diff='medio';

function newBoard(){const b=[];for(let r=0;r<8;r++){b.push([]);for(let c=0;c<8;c++)b[r].push((r+c)%2?(r<3?-1:r>4?1:0):0)}return b}

/* ---------- Regras ---------- */
function capSeq(b,r,c,piece,caps,path,out){
  const s=sideOf(piece),king=Math.abs(piece)===2;let found=false;
  for(const[dr,dc]of DIRS){
    let y=r+dr,x=c+dc;
    if(king)while(inb(y,x)&&b[y][x]===0){y+=dr;x+=dc}
    if(!inb(y,x)||sideOf(b[y][x])!==-s||caps.some(p=>p[0]===y&&p[1]===x))continue;
    let ly=y+dr,lx=x+dc;
    while(inb(ly,lx)&&b[ly][lx]===0){
      found=true;
      capSeq(b,ly,lx,piece,[...caps,[y,x]],[...path,[ly,lx]],out);
      if(!king)break;
      ly+=dr;lx+=dc;
    }
  }
  if(!found&&caps.length)out.push({path,caps});
}
function genMoves(b,s){
  const caps=[],simple=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const v=b[r][c];if(sideOf(v)!==s)continue;
    b[r][c]=0;const out=[];capSeq(b,r,c,v,[],[],out);b[r][c]=v;
    out.forEach(o=>caps.push({from:[r,c],...o}));
    const king=Math.abs(v)===2;
    for(const[dr,dc]of DIRS){
      if(!king&&dr!==-s)continue;
      let y=r+dr,x=c+dc;
      while(inb(y,x)&&b[y][x]===0){simple.push({from:[r,c],path:[[y,x]],caps:[]});if(!king)break;y+=dr;x+=dc}
    }
  }
  if(!caps.length)return simple;
  const mx=Math.max(...caps.map(m=>m.caps.length));   // lei da maioria
  return caps.filter(m=>m.caps.length===mx);
}
function apply(b,m){
  const n=b.map(r=>r.slice());let v=n[m.from[0]][m.from[1]];
  n[m.from[0]][m.from[1]]=0;m.caps.forEach(([y,x])=>n[y][x]=0);
  const[ey,ex]=m.path[m.path.length-1];
  if(Math.abs(v)===1&&((v>0&&ey===0)||(v<0&&ey===7)))v*=2;  // promoção só ao terminar a jogada
  n[ey][ex]=v;return n;
}

/* ---------- Máquina ---------- */
function evalB(b){let s=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const v=b[r][c];if(!v)continue;
    const k=Math.abs(v)===2;let val=k?320:100+(v>0?7-r:r)*6;
    if(!k&&((v>0&&r===7)||(v<0&&r===0)))val+=15;
    s+=v>0?-val:val}
  return s}
function mm(b,s,d,al,be){
  const ms=genMoves(b,s);
  if(!ms.length)return s===-1?-1e5-d:1e5+d;
  if(d===0)return evalB(b);
  let best=s===-1?-Infinity:Infinity;
  for(const m of ms){
    const v=mm(apply(b,m),-s,d-1,al,be);
    if(s===-1){best=Math.max(best,v);al=Math.max(al,v)}else{best=Math.min(best,v);be=Math.min(be,v)}
    if(be<=al)break}
  return best}
function aiTurn(){
  busy=true;const g=gen;render();
  setTimeout(()=>{
    if(g!==gen)return;
    const d={facil:1,medio:3,dificil:5}[diff],nz={facil:80,medio:10,dificil:2}[diff];
    let best=null,bs=-Infinity;
    for(const m of genMoves(board,-1)){const sc=mm(apply(board,m),1,d-1,-Infinity,Infinity)+Math.random()*nz;if(sc>bs){bs=sc;best=m}}
    busy=false;commit(best);
  },500);
}

/* ---------- Fluxo ---------- */
function start(){
  gen++;board=newBoard();turn=1;sel=null;over=false;busy=false;lastMv=null;quiet=0;gp=0;st={c:0,k:0};$('#pts').textContent=0;
  $('#end').classList.add('hide');after();
}
function commit(m){
  const man=Math.abs(board[m.from[0]][m.from[1]])===1;
  if(turn===1){const k=man&&m.path[m.path.length-1][0]===0;st.c+=m.caps.length;if(k)st.k++;gp+=(m.caps.length*PTS.cap+(k?PTS.king:0))*MULT[diff];$('#pts').textContent=gp}
  quiet=(m.caps.length||man)?0:quiet+1;
  board=apply(board,m);lastMv={from:m.from,to:m.path[m.path.length-1]};
  turn=-turn;after();
}
function after(){
  legal=turn===1?genMoves(board,1):[];
  const ms=turn===1?legal:genMoves(board,-1);
  if(!ms.length)return finish(-turn);
  if(quiet>=40)return finish(0);
  render();
  if(turn===-1)aiTurn();
}
function finish(w){
  if(over)return;over=true;render();
  const bonus=(w===1?PTS.win:w===0?PTS.draw:0)*MULT[diff];gp+=bonus;wal.pts+=gp;saveW();$('#pts').textContent=gp;
  $('#endPts').textContent=`+${fmt(gp)} pontos`;
  $('#endDet').textContent=`${st.c} capturas, ${st.k} damas${bonus?`, bônus de ${fmt(bonus)}`:''} (×${MULT[diff]})`;
  $('#endTitle').textContent=w===1?'Você venceu! 👑':w===-1?'A máquina venceu':'Empate';
  $('#end').classList.remove('hide');
}
function step(t){
  const ms=sel.moves.filter(m=>m.path[sel.step][0]===t[0]&&m.path[sel.step][1]===t[1]);
  sel.step++;sel.pos=t;
  const done=ms.find(m=>m.path.length===sel.step);
  if(done){sel=null;commit(done)}else{sel.moves=ms;render()}
}
$('#board').onclick=e=>{
  const q=e.target.closest('.sq');if(!q||over||busy||turn!==1)return;
  const r=+q.dataset.r,c=+q.dataset.c;
  if(sel&&sel.moves.some(m=>m.path[sel.step][0]===r&&m.path[sel.step][1]===c))return step([r,c]);
  if(sel&&sel.step>0)return;
  const mv=legal.filter(m=>m.from[0]===r&&m.from[1]===c);
  sel=mv.length&&!(sel&&sel.pos[0]===r&&sel.pos[1]===c)?{moves:mv,step:0,pos:[r,c]}:null;
  render();
};

/* ---------- Desenho ---------- */
function render(){
  const v=board.map(r=>r.slice());
  if(sel){const[or,oc]=sel.moves[0].from;const pv=v[or][oc];v[or][oc]=0;v[sel.pos[0]][sel.pos[1]]=pv}
  const targets=sel?sel.moves.map(m=>m.path[sel.step]):[];
  const froms=(!sel&&turn===1&&!over&&!busy)?legal.map(m=>m.from):[];
  const eq=(a,r,c)=>a&&a[0]===r&&a[1]===c;
  let h='',np=0,nm=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const dark=(r+c)%2,x=v[r][c],cls=['sq',dark?'d':'l'];
    if(dark&&targets.some(t=>eq(t,r,c)))cls.push('hl');
    if(lastMv&&(eq(lastMv.from,r,c)||eq(lastMv.to,r,c)))cls.push('last');
    let p='';
    if(x){x>0?np++:nm++;
      p=`<div class="pc ${x>0?'p':'m'}${Math.abs(x)===2?' k':''}${froms.some(f=>eq(f,r,c))?' can':''}${sel&&eq(sel.pos,r,c)?' sel':''}"></div>`}
    h+=`<div class="${cls.join(' ')}" data-r="${r}" data-c="${c}">${p}</div>`;
  }
  $('#board').innerHTML=h;$('#cp').textContent=np;$('#cm').textContent=nm;
  let t='';
  if(over)t='Fim de jogo';
  else if(turn===-1)t='A máquina está pensando…';
  else if(sel&&sel.step>0)t='Continue capturando!';
  else t=legal[0]&&legal[0].caps.length?'Sua vez: captura obrigatória!':'Sua vez';
  $('#status').textContent=t;
}

/* ---------- Menu ---------- */
function show(id){['menu','game','wallet','shop','bag'].forEach(x=>$('#'+x).classList.toggle('hide',x!==id));$('#rail').classList.toggle('hide',id!=='menu')}
document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{
  diff=b.dataset.d;document.querySelectorAll('.seg button').forEach(x=>x.classList.toggle('on',x===b))});
$('#go').onclick=()=>{show('game');start()};
$('#reset').onclick=start;$('#again').onclick=start;
const toMenu=()=>{gen++;busy=false;$('#end').classList.add('hide');show('menu')};
function leave(fn){
  if(over||gp===0||Date.now()<armed){armed=0;fn();return}
  armed=Date.now()+3000;$('#status').textContent=`Sair agora perde ${fmt(gp)} pontos. Toque de novo para confirmar.`;
}
$('#toMenu').onclick=()=>leave(toMenu);$('#endMenu').onclick=toMenu;$('#reset').onclick=()=>leave(start);

/* ---------- Tabuleiro do menu ---------- */
(function(){let h='';for(let r=0;r<8;r++)for(let c=0;c<8;c++){const d=(r+c)%2;let p='';
  if(d){if(r<3)p='<div class="pc m"></div>';else if(r>4)p=`<div class="pc p${r===5&&c===2?' k':''}"></div>`}
  h+=`<div class="sq ${d?'d':'l'}">${p}</div>`}
  $('#hero').innerHTML=h})();

/* ---------- Temas e cores das peças ---------- */
const THEMES=[['doce','Doce noite','#fbe9d0','#6b2d5c'],['oceano','Oceano','#d9f1ff','#1f5f8b'],['floresta','Floresta','#efe6c8','#3d6b4a'],['madeira','Madeira','#f0d9b5','#b58863'],['neon','Neon','#2a2a52','#12122e'],['algodao','Algodão-doce','#fff7ef','#d98cb3']];
const COLORS=[['#ff5d8f','Rosa'],['#2ec4b6','Turquesa'],['#ffc857','Dourado'],['#8e5cff','Roxo'],['#ff7a2f','Laranja'],['#4da3ff','Azul'],['#3ddc84','Verde'],['#e63946','Vermelho']];
let prefs={theme:'doce',a:'#ff5d8f',b:'#2ec4b6',skin:'classica'};
try{Object.assign(prefs,JSON.parse(localStorage.getItem('dama-prefs')||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem('dama-prefs',JSON.stringify(prefs))}catch(e){}};
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(h,t,a)=>'#'+hex(h).map((v,i)=>Math.round(v+(t[i]-v)*a).toString(16).padStart(2,'0')).join('');
function setPiece(k,col){const s=document.documentElement.style;
  s.setProperty('--p'+k,col);s.setProperty('--p'+k+'-l',mix(col,[255,255,255],.55));
  s.setProperty('--p'+k+'-d',mix(col,[0,0,0],.2));s.setProperty('--p'+k+'-s',mix(col,[0,0,0],.5));s.setProperty('--p'+k+'-bg',bgFor(prefs.skin,col))}
function paint(){
  if(!THEMES.some(t=>t[0]===prefs.theme&&(!t[4]||wal.inv.includes(t[4]))))prefs.theme='doce';
  if(!SK.some(s=>s[0]===prefs.skin&&(!s[2]||wal.inv.includes(s[2]))))prefs.skin='classica';
  document.body.dataset.theme=prefs.theme;document.body.dataset.skin=prefs.skin;setPiece('a',prefs.a);setPiece('b',prefs.b);prefs.theme==='natal'?snow.start():snow.stop();
  $('#pTheme').innerHTML=THEMES.filter(t=>!t[4]||wal.inv.includes(t[4])).map(t=>`<button class="th${t[0]===prefs.theme?' on':''}" data-t="${t[0]}"><span class="sw" style="background:linear-gradient(90deg,${t[2]} 50%,${t[3]} 50%)"></span>${t[1]}</button>`).join('');
  const row=(k,label)=>`<p>${label}</p><div class="cols">`+COLORS.map(c=>`<button class="col${prefs[k]===c[0]?' on':''}" data-k="${k}" data-c="${c[0]}" style="background:${c[0]}" aria-label="${c[1]}" title="${c[1]}"></button>`).join('')+'</div>';
  const sks=SK.filter(s=>!s[2]||wal.inv.includes(s[2]));
  $('#pPiece').innerHTML=(sks.length>1?'<p>Estilo</p>'+sks.map(s=>`<button class='th${prefs.skin===s[0]?' on':''}' data-s='${s[0]}'><span class='pv' style='background:${bgFor(s[0],prefs.a)}'></span>${s[1]}</button>`).join(''):'')+row('a','Suas peças')+row('b','Peças da máquina');
}
$('#pTheme').onclick=e=>{const b=e.target.closest('.th');if(!b)return;prefs.theme=b.dataset.t;save();paint()};
$('#pPiece').onclick=e=>{const sb=e.target.closest('[data-s]');if(sb){prefs.skin=sb.dataset.s;save();paint();return}const b=e.target.closest('.col');if(!b)return;const k=b.dataset.k,o=k==='a'?'b':'a',c=b.dataset.c;
  if(prefs[o]===c)prefs[o]=prefs[k];prefs[k]=c;save();paint()};
function closePops(){document.querySelectorAll('.pop').forEach(p=>p.classList.add('hide'));document.querySelectorAll('.tb').forEach(b=>b.setAttribute('aria-expanded','false'))}
[['bTheme','pTheme'],['bPiece','pPiece']].forEach(([b,p])=>{$('#'+b).onclick=()=>{const was=$('#'+p).classList.contains('hide');closePops();if(was){$('#'+p).classList.remove('hide');$('#'+b).setAttribute('aria-expanded','true')}}});
document.addEventListener('click',e=>{if(!e.composedPath().some(n=>n.classList&&n.classList.contains('dd')))closePops()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePops()});
/* ---------- Pontos e Dcoin ---------- */
const MULT={facil:1,medio:2,dificil:4},RATE=100,PTS={cap:10,king:25,win:200,draw:50};
let wal={pts:0,dc:0,inv:[]},gp=0,amt=1,back='menu',st={c:0,k:0},armed=0;
try{Object.assign(wal,JSON.parse(localStorage.getItem('dama-wallet')||'{}'))}catch(e){}
const n0=v=>Number.isFinite(v)&&v>0?Math.floor(v):0;wal.pts=n0(wal.pts);wal.dc=n0(wal.dc);if(!Array.isArray(wal.inv))wal.inv=[];
const saveW=()=>{try{localStorage.setItem('dama-wallet',JSON.stringify(wal))}catch(e){}};
const fmt=n=>n.toLocaleString('pt-BR');
function renderWallet(){
  const max=Math.floor(wal.pts/RATE);amt=Math.max(max?1:0,Math.min(amt,max));
  $('#wPts').textContent=fmt(wal.pts);$('#wDc').textContent=fmt(wal.dc);$('#wAmt').textContent=amt;
  $('#wInfo').textContent=amt?`${fmt(amt*RATE)} pontos viram ${fmt(amt)} Dcoin`:`Junte ${RATE} pontos para o primeiro Dcoin`;
  $('#wGo').disabled=!amt;$('#wMax').disabled=!amt;
}
function openWallet(from){back=from;$('#wMsg').textContent='';show('wallet');renderWallet()}
$('#bWallet').onclick=()=>{closePops();if($('#wallet').classList.contains('hide'))openWallet($('#game').classList.contains('hide')?'menu':'game')};
$('#endWallet').onclick=()=>{$('#end').classList.add('hide');openWallet('menu')};
$('#wBack').onclick=()=>back==='shop'?openShop():show(back);
$('#wMinus').onclick=()=>{amt--;renderWallet()};
$('#wPlus').onclick=()=>{amt++;renderWallet()};
$('#wMax').onclick=()=>{amt=Math.floor(wal.pts/RATE);renderWallet()};
$('#wGo').onclick=()=>{if(!amt)return;wal.pts-=amt*RATE;wal.dc+=amt;saveW();$('#wMsg').textContent=`Pronto! +${fmt(amt)} Dcoin na carteira`;amt=1;renderWallet()};

/* ---------- Loja de Natal e Artefatos ---------- */
const ITEMS=[
{id:'noel',n:'Papai Noel',p:40,a:`<svg viewBox='0 0 80 80'><circle cx='40' cy='48' r='16' fill='#ffd2ae'/><path d='M23 48c0 24 34 24 34 0-6 7-28 7-34 0z' fill='#fff'/><path d='M22 40c-2-24 26-30 38-12l-6 14z' fill='#e63946'/><rect x='20' y='37' width='40' height='9' rx='4.5' fill='#fff'/><circle cx='60' cy='26' r='6' fill='#fff'/><circle cx='34' cy='50' r='2' fill='#2b1055'/><circle cx='46' cy='50' r='2' fill='#2b1055'/><circle cx='40' cy='54' r='3' fill='#ff9a8a'/></svg>`},
{id:'neve',n:'Boneco de neve',p:25,a:`<svg viewBox='0 0 80 80'><circle cx='40' cy='58' r='18' fill='#fff' stroke='#b9d3ea' stroke-width='2'/><circle cx='40' cy='32' r='13' fill='#fff' stroke='#b9d3ea' stroke-width='2'/><rect x='30' y='13' width='20' height='10' rx='2' fill='#222'/><rect x='26' y='21' width='28' height='4' rx='2' fill='#222'/><path d='M40 33l13 3-13 3z' fill='#ff8a2b'/><circle cx='35' cy='29' r='2' fill='#222'/><circle cx='45' cy='29' r='2' fill='#222'/><rect x='28' y='42' width='24' height='6' rx='3' fill='#e63946'/><circle cx='40' cy='56' r='2' fill='#222'/><circle cx='40' cy='64' r='2' fill='#222'/></svg>`},
{id:'rena',n:'Rena',p:30,a:`<svg viewBox='0 0 80 80'><path d='M28 36L21 16M22 24l-9-3M52 36l7-20M58 24l9-3' stroke='#7a4a26' stroke-width='4' stroke-linecap='round' fill='none'/><ellipse cx='25' cy='40' rx='5' ry='8' fill='#a0653d'/><ellipse cx='55' cy='40' rx='5' ry='8' fill='#a0653d'/><ellipse cx='40' cy='48' rx='16' ry='20' fill='#b87a4b'/><ellipse cx='40' cy='60' rx='10' ry='8' fill='#e8c39b'/><circle cx='40' cy='60' r='5' fill='#e63946'/><circle cx='33' cy='45' r='2.5' fill='#222'/><circle cx='47' cy='45' r='2.5' fill='#222'/></svg>`},
{id:'duende',n:'Duende',p:25,a:`<svg viewBox='0 0 80 80'><path d='M24 52l-9-6 10-2zM56 52l9-6-10-2z' fill='#ffd2ae'/><circle cx='40' cy='52' r='15' fill='#ffd2ae'/><path d='M24 44L40 8l16 36z' fill='#2e9e5b'/><rect x='24' y='41' width='32' height='7' rx='3.5' fill='#e63946'/><circle cx='40' cy='8' r='4' fill='#ffc857'/><circle cx='34' cy='54' r='2' fill='#2b1055'/><circle cx='46' cy='54' r='2' fill='#2b1055'/><path d='M35 60q5 5 10 0' stroke='#c2185b' stroke-width='2' fill='none' stroke-linecap='round'/><path d='M28 68h24l4 10H24z' fill='#e63946'/></svg>`},
{id:'pinheiro',n:'Pinheirinho',p:15,a:`<svg viewBox='0 0 80 80'><rect x='35' y='66' width='10' height='10' fill='#7a4a26'/><path d='M40 18L62 40H18z' fill='#2e9e5b'/><path d='M40 30L66 54H14z' fill='#27864d'/><path d='M40 44L70 68H10z' fill='#1f6f3f'/><path d='M40 4l3.5 8H52l-7 5 3 8-8-5-8 5 3-8-7-5h8.5z' fill='#ffc857'/><circle cx='34' cy='50' r='3' fill='#e63946'/><circle cx='48' cy='60' r='3' fill='#4da3ff'/><circle cx='36' cy='62' r='3' fill='#ffc857'/><circle cx='46' cy='42' r='2.5' fill='#ff5d8f'/></svg>`},
{id:'biscoito',n:'Biscoito de gengibre',p:15,a:`<svg viewBox='0 0 80 80'><g fill='#c47a3a'><circle cx='40' cy='20' r='12'/><rect x='27' y='30' width='26' height='28' rx='10'/><rect x='12' y='33' width='56' height='11' rx='5.5'/><rect x='27' y='52' width='11' height='22' rx='5.5'/><rect x='42' y='52' width='11' height='22' rx='5.5'/></g><circle cx='35' cy='18' r='2' fill='#fff'/><circle cx='45' cy='18' r='2' fill='#fff'/><path d='M35 24q5 4 10 0' stroke='#fff' stroke-width='2' fill='none' stroke-linecap='round'/><circle cx='40' cy='40' r='2.5' fill='#e63946'/><circle cx='40' cy='49' r='2.5' fill='#2e9e5b'/><path d='M14 44h8M58 44h8M29 72h7M44 72h7' stroke='#fff' stroke-width='2.5' stroke-linecap='round'/></svg>`},
{id:'pinguim',n:'Pinguim de gorro',p:35,a:`<svg viewBox='0 0 80 80'><ellipse cx='28' cy='76' rx='8' ry='3.5' fill='#ff8a2b'/><ellipse cx='52' cy='76' rx='8' ry='3.5' fill='#ff8a2b'/><ellipse cx='40' cy='50' rx='21' ry='26' fill='#2b2f4a'/><ellipse cx='40' cy='58' rx='13' ry='15' fill='#fff'/><circle cx='33' cy='40' r='2.5' fill='#fff'/><circle cx='47' cy='40' r='2.5' fill='#fff'/><path d='M35 44h10l-5 6z' fill='#ff8a2b'/><path d='M24 32c0-18 24-22 32-8l-6 12z' fill='#e63946'/><rect x='22' y='30' width='36' height='7' rx='3.5' fill='#fff'/><circle cx='57' cy='24' r='5' fill='#fff'/></svg>`},
{id:'presente',n:'Caixa de presente',p:10,a:`<svg viewBox='0 0 80 80'><rect x='16' y='36' width='48' height='36' rx='4' fill='#e63946'/><rect x='12' y='28' width='56' height='13' rx='4' fill='#c1121f'/><rect x='36' y='28' width='8' height='44' fill='#ffc857'/><ellipse cx='31' cy='21' rx='10' ry='6' fill='none' stroke='#ffc857' stroke-width='4' transform='rotate(-25 31 21)'/><ellipse cx='49' cy='21' rx='10' ry='6' fill='none' stroke='#ffc857' stroke-width='4' transform='rotate(25 49 21)'/></svg>`}
];
const card=(i,extra)=>`<div class='it'><div class='art${i.t==='s'?' sk':''}'>${i.a}</div><b>${i.n}</b>${extra||''}</div>`;
const SK=[['classica','Clássica'],['bola','Bolas de Natal','s-bola'],['doce','Bengalas doces','s-doce']];
function bgFor(sk,c){
  const g=`radial-gradient(circle at 35% 30%,${mix(c,[255,255,255],.55)},${c} 55%,${mix(c,[0,0,0],.2)})`;
  if(sk==='bola')return `radial-gradient(circle at 30% 26%,#fff 0 7%,transparent 8%),${g}`;
  if(sk==='doce')return `repeating-conic-gradient(${c} 0 22.5deg,#fff 22.5deg 45deg)`;
  return g;
}
const thArt=(bg,c,p,f)=>{let s=`<svg viewBox='0 0 80 80'><rect width='80' height='80' rx='8' fill='${bg}'/><rect x='10' y='10' width='60' height='60' rx='4' fill='${f}'/>`;
  for(let r=0;r<4;r++)for(let q=0;q<4;q++)s+=`<rect x='${14+q*13}' y='${14+r*13}' width='13' height='13' fill='${(r+q)%2?p:c}'/>`;return s+'</svg>'};
[['natal','Noite de Natal ✨',90,'#10294f','#fff4e3','#b3202f','#0d3b22'],['neve','Neve Branca',50,'#e8f3ff','#ffffff','#6aa3d6','#3a6ea5'],['aurora','Aurora do Polo Norte',80,'#07142b','#d8f3ff','#16456b','#0a2540']]
  .forEach(([k,n,p,bg,c,d,f])=>{THEMES.push([k,n,c,d,'t-'+k]);ITEMS.push({id:'t-'+k,n,p,t:'t',a:thArt(bg,c,d,f)})});
[['bola','Bolas de Natal',70],['doce','Bengalas doces',70]].forEach(([k,n,p])=>{const cp=k==='bola'?' cap':'';
  ITEMS.push({id:'s-'+k,n,p,t:'s',a:`<span class='pv${cp}' style='background:${bgFor(k,'#e63946')}'></span><span class='pv${cp}' style='background:${bgFor(k,'#2e9e5b')}'></span>`})});
ITEMS.forEach(i=>{i.t=i.t||'b'});
let tab='b';
const INFO={b:'Colecione bonequinhos de Natal',t:'Novos planos de fundo para o jogo',s:'Estilos especiais para as suas peças'};
function renderShop(){
  $('#sDc').textContent=fmt(wal.dc);
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));$('#tabInfo').textContent=INFO[tab];
  $('#shopGrid').innerHTML=ITEMS.filter(i=>i.t===tab).map(i=>{const own=wal.inv.includes(i.id);
    return card(i,`<button class='btn buy' data-id='${i.id}'${own?' disabled':''}>${own?'Comprado':`<span class='coin'></span> ${i.p}`}</button>`)}).join('');
}
function renderBag(){
  const own=ITEMS.filter(i=>wal.inv.includes(i.id));
  $('#bagCount').textContent=`${own.length} de ${ITEMS.length} coletados`;
  $('#bagGrid').innerHTML=own.map(i=>card(i,i.t==='b'?'':`<small class='tag'>${i.t==='t'?'Tema':'Peças'}</small>`)).join('');
  $('#bagEmpty').classList.toggle('hide',own.length>0);
}
function buy(id){
  const it=ITEMS.find(i=>i.id===id);if(!it||wal.inv.includes(id))return;
  if(wal.dc<it.p){$('#sMsg').textContent=`Faltam ${it.p-wal.dc} Dcoin. Converta pontos na carteira.`;return}
  wal.dc-=it.p;wal.inv.push(id);saveW();
  $('#sMsg').textContent=it.t==='t'?`${it.n} liberado! Escolha no botão 🎨 do topo.`:it.t==='s'?`${it.n} liberado! Escolha no botão das peças, no topo.`:`${it.n} guardado em Artefatos!`;renderShop();paint();
}
function openShop(){$('#sMsg').textContent='';show('shop');renderShop()}
function openBag(){show('bag');renderBag()}
$('#shopGrid').onclick=e=>{const b=e.target.closest('.buy');if(b&&!b.disabled)buy(b.dataset.id)};
$('#bShop').onclick=openShop;$('#bBag').onclick=openBag;
$('#sBag').onclick=openBag;$('#gShop').onclick=openShop;
$('#sBack').onclick=()=>show('menu');$('#gBack').onclick=()=>show('menu');
$('#sWallet').onclick=()=>openWallet('shop');
$('.tabs').onclick=e=>{const b=e.target.closest('button');if(b){tab=b.dataset.t;$('#sMsg').textContent='';renderShop()}};
/* ---------- Cenário animado de Natal ---------- */
const snow=(()=>{
  const cv=$('#snow'),cx=cv.getContext('2d'),rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let fl=[],on=false,raf=0,w=0,h=0;
  function size(){const d=devicePixelRatio||1;w=innerWidth;h=innerHeight;cv.width=w*d;cv.height=h*d;cx.setTransform(d,0,0,d,0,0);
    fl=Array.from({length:Math.round(Math.min(130,w*h/8000))},()=>({x:Math.random()*w,y:Math.random()*h,r:1+Math.random()*3,s:.4+Math.random()*1.3,p:Math.random()*6.28}))}
  function tick(t){cx.clearRect(0,0,w,h);cx.fillStyle='#fff';
    for(const f of fl){if(!rm){f.y+=f.s;f.x+=Math.sin(t/1500+f.p)*.4;if(f.y>h+5){f.y=-5;f.x=Math.random()*w}}
      cx.globalAlpha=.45+f.r/8;cx.beginPath();cx.arc(f.x,f.y,f.r,0,6.283);cx.fill()}
    if(on&&!rm)raf=requestAnimationFrame(tick)}
  addEventListener('resize',()=>{if(on){size();if(rm)tick(0)}});
  return{start(){if(on)return;on=true;size();raf=requestAnimationFrame(tick)},stop(){on=false;cancelAnimationFrame(raf);cx.clearRect(0,0,w,h)}};
})();
(function buildScene(){
  const rnd=(a,b)=>a+Math.random()*(b-a),cols=['#ff4d6d','#ffd166','#4dd2ff','#6ee7a0'];
  let h='';
  for(let i=0;i<46;i++)h+=`<i class='star' style='left:${rnd(0,100).toFixed(1)}%;top:${rnd(0,62).toFixed(1)}%;--s:${rnd(1,3).toFixed(1)}px;animation-delay:${rnd(0,3).toFixed(1)}s'></i>`;
  h+=`<div class='moon'></div>`;
  for(let i=0;i<20;i++){const c=cols[i%4];h+=`<b class='bulb' style='left:${(i*100/19).toFixed(1)}%;top:${(4+10*Math.abs(Math.sin(i*Math.PI/3))).toFixed(1)}px;background:${c};color:${c};animation-delay:${((i%4)*.4).toFixed(1)}s'></b>`}
  h+=`<svg class='sleigh' viewBox='0 0 150 56' width='120' height='45'><g class='bob'><g id='dr'><ellipse cx='50' cy='32' rx='14' ry='7' fill='#8a5a33'/><circle cx='66' cy='24' r='5.5' fill='#8a5a33'/><path d='M64 19l-3-8M62 14l-5-1M68 19l3-8M70 14l5-1' stroke='#6b4423' stroke-width='1.6' fill='none'/><circle cx='71.5' cy='25' r='2' fill='#ff3b3b'/><path d='M40 38v10M48 38v10M56 38v9M60 37l4 9' stroke='#6b4423' stroke-width='2'/></g><use href='#dr' x='-38'/><path d='M74 31H96' stroke='#ffd76a' stroke-width='1.2'/><path d='M92 30h40c0 11-8 17-20 17H98z' fill='#c1121f'/><path d='M88 50q30 4 48-2' stroke='#ffd76a' stroke-width='2.5' fill='none' stroke-linecap='round'/><rect x='111' y='26' width='14' height='9' rx='3' fill='#e63946'/><circle cx='118' cy='22' r='5' fill='#ffd2ae'/><path d='M112 21l6-13 6 13z' fill='#e63946'/><circle cx='118' cy='8' r='2.5' fill='#fff'/></g></svg>`;
  const lc=['#ff4d6d','#ffd166','#4dd2ff'];
  const tree=(x,y,s)=>`<g transform='translate(${x} ${y}) scale(${s})'><rect x='-3' y='-6' width='6' height='9' fill='#4a2518'/><path d='M0-56L14-34H-14z' fill='#14633a'/><path d='M0-42L18-18H-18z' fill='#14633a'/><path d='M0-26L22-4H-22z' fill='#14633a'/><path d='M0-56L5-47H-5zM0-42L6-33H-6zM0-26L7-17H-7z' fill='#fff'/>`+[[-6,-30],[7,-21],[-12,-10],[11,-9],[0,-44]].map((p,i)=>`<circle class='bl' cx='${p[0]}' cy='${p[1]}' r='2.2' fill='${lc[i%3]}' style='animation-delay:${i*.3}s'/>`).join('')+`</g>`;
  const T=[[190,166,.8],[216,170,1],[300,165,1],[335,170,1.25],[368,164,.9],[-90,162,1],[-140,168,1.3],[-210,164,1.1],[-300,168,1.4],[470,164,1.2],[540,170,1.4],[620,164,1.1],[700,170,1.3]];
  const hill1='M-900 150Q-100 118 120 158T400 138T1300 148',hill2='M-900 208Q-200 176 150 208T420 192T1300 202';
  h+=`<svg class='gnd' viewBox='0 0 400 260' preserveAspectRatio='xMidYMax meet'><path d='${hill1}V400H-900Z' fill='#264a78'/><path d='${hill1}' fill='none' stroke='#eaf6ff' stroke-width='3' opacity='.8'/>${T.map(t=>tree(...t)).join('')}<rect x='40' y='124' width='56' height='42' fill='#7a3b2a'/><rect x='80' y='100' width='8' height='20' fill='#5b2a1f'/><circle class='sm' cx='84' cy='98' r='4' fill='#fff' opacity='.7'/><circle class='sm' style='animation-delay:1.3s' cx='84' cy='98' r='4' fill='#fff' opacity='.7'/><circle class='sm' style='animation-delay:2.6s' cx='84' cy='98' r='4' fill='#fff' opacity='.7'/><path d='M34 126L68 98L102 126Z' fill='#3a2230'/><path d='M34 126L68 98L102 126L96 126L68 106L40 126Z' fill='#fff'/><rect class='fl' x='50' y='136' width='14' height='14' fill='#ffd76a'/><rect x='74' y='142' width='12' height='24' fill='#4a2518'/><path d='${hill2}V400H-900Z' fill='#355f94'/><path d='${hill2}' fill='none' stroke='#eaf6ff' stroke-width='3' opacity='.85'/><g transform='translate(338 206)'><circle cy='-9' r='10' fill='#fff'/><circle cy='-27' r='7.5' fill='#fff'/><rect x='-5' y='-42' width='10' height='6' fill='#222'/><rect x='-8' y='-37' width='16' height='2.5' fill='#222'/><path d='M0-27l8 2-8 2z' fill='#ff8a2b'/><rect x='-8' y='-21' width='16' height='3.5' rx='1.7' fill='#e63946'/><circle cx='-2.5' cy='-29' r='1' fill='#222'/><circle cx='2.5' cy='-29' r='1' fill='#222'/></g></svg>`;
  $('#scene').insertAdjacentHTML('afterbegin',h);
})();
paint();
