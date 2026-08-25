(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))o(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&o(a)}).observe(document,{childList:!0,subtree:!0});function t(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(r){if(r.ep)return;r.ep=!0;const i=t(r);fetch(r.href,i)}})();const K=["N","E","S","W"],J={N:{dr:-1,dc:0},E:{dr:0,dc:1},S:{dr:1,dc:0},W:{dr:0,dc:-1}},de={N:"E",E:"S",S:"W",W:"N"},H={N:"↑",E:"→",S:"↓",W:"←"};function y(e,n){return`${e},${n}`}function Q(e){return new Set(e.map(n=>y(n.r,n.c)))}function Z(e){const n=[],t=new Set,o={};let r=0;for(let c=0;c<e.rows;c++){const d=e.grid[c]??"";for(let u=0;u<e.cols;u++){const f=d[u]??".";if(f==="#"){t.add(y(c,u));continue}if("NESW".includes(f)){n.push({id:`a${r++}`,r:c,c:u,dir:f,spin:!1});continue}if("nesw".includes(f)){n.push({id:`a${r++}`,r:c,c:u,dir:f.toUpperCase(),spin:!0});continue}"abcd".includes(f)&&(o[f]={r:c,c:u})}}const i=[];o.a&&o.b&&i.push({a:o.a,b:o.b}),o.c&&o.d&&i.push({a:o.c,b:o.d});const a=new Map;for(const c of i)a.set(y(c.a.r,c.a.c),c.b),a.set(y(c.b.r,c.b.c),c.a);return{arrows:n,walls:t,portals:i,portalIndex:a}}function ee(e,n,t,o,r,i,a){const{dr:c,dc:d}=J[e.dir];let u=e.r,f=e.c;const $=new Set;for(let T=0;T<i*a+6;T++){const b=u+c,g=f+d;if(b<0||b>=i||g<0||g>=a)return!0;const k=y(b,g),p=r.get(k);if(p){const s=y(p.r,p.c);if(o.has(s)||n.has(s)||t.has(s)||$.has(`w:${s}`))return!1;$.add(`w:${s}`),u=p.r,f=p.c;continue}if(o.has(k)||n.has(k)||t.has(k))return!1;u=b,f=g}return!1}function ne(e,n,t,o,r,i,a){const c=Q(e);return e.filter(d=>d.dir===n&&ee(d,c,t,o,r,i,a))}const oe=3;function j(e){const n=Z(e);return{level:e,board:n,arrows:n.arrows.map(t=>({...t})),ecos:[],hearts:oe,status:"playing",combo:0,maxCombo:0,lastDir:null,moves:0,mistakes:0,hint:null}}function te(e){return new Set(e.ecos.map(n=>y(n.r,n.c)))}function B(e){return{...e,board:e.board,arrows:e.arrows.map(n=>({...n})),ecos:e.ecos.map(n=>({...n})),hint:e.hint?{...e.hint}:null}}function ue(e){e.hearts=Math.max(0,e.hearts-1),e.mistakes+=1,e.hint=null,e.combo=0,e.hearts===0&&(e.status="lost")}function re(e,n){if(e.status!=="playing")return{ok:!1,reason:"ended",hearts:e.hearts,status:e.status};const t=ne(e.arrows,n,te(e),e.board.walls,e.board.portalIndex,e.level.rows,e.level.cols);if(t.length===0)return ue(e),{ok:!1,reason:"blocked",hearts:e.hearts,status:e.status};const o=new Set(t.map(r=>r.id));return e.arrows=e.arrows.filter(r=>!o.has(r.id)),e.ecos=t.map(r=>({r:r.r,c:r.c})),e.combo=e.lastDir===n?e.combo+1:1,e.maxCombo=Math.max(e.maxCombo,e.combo),e.lastDir=n,e.moves+=1,e.hint=null,e.arrows.length===0&&(e.ecos=[],e.status="won"),{ok:!0,launched:t,stormo:t.length>=2,combo:e.combo,won:e.status==="won"}}function ie(e,n){if(e.status!=="playing")return!1;const t=e.arrows.find(o=>o.id===n);return t!=null&&t.spin?(t.dir=de[t.dir],e.hint=null,!0):!1}function ae(e){return e.status!=="playing"||e.ecos.length===0?!1:(e.ecos=[],e.hint=null,!0)}function fe(e,n){return n.kind==="wind"?re(e,n.dir).ok:n.kind==="spin"?ie(e,n.id):ae(e)}function se(e,n){return ne(e.arrows,n,te(e),e.board.walls,e.board.portalIndex,e.level.rows,e.level.cols)}function pe(e){return K.filter(n=>se(e,n).length>0)}function X(e){const n=[...e.arrows].map(o=>`${o.id}:${o.dir}`).sort().join(";"),t=[...e.ecos].map(o=>`${o.r},${o.c}`).sort().join(";");return`${n}|${t}`}function he(e){const n=[];e.ecos.length>0&&n.push({kind:"wait"});for(const t of pe(e))n.push({kind:"wind",dir:t});for(const t of e.arrows)t.spin&&n.push({kind:"spin",id:t.id});return n}function F(e,n=8e3){const t="arrows"in e&&"board"in e?B(e):j(e);if(t.arrows.length===0)return[];const o=[{state:t,path:[]}],r=new Set([X(t)]);for(let i=0;i<o.length&&i<n;i++){const a=o[i],c=he(a.state);for(const d of c){const u=B(a.state);if(!fe(u,d)||u.status==="lost")continue;const f=X(u);if(r.has(f))continue;const $=[...a.path,d];if(u.status==="won"||u.arrows.length===0)return $;r.add(f),o.push({state:u,path:$})}}return null}function me(e){var n;return((n=F(e))==null?void 0:n[0])??null}function ve(e){return()=>{e|=0,e=e+1831565813|0;let n=Math.imul(e^e>>>15,1|e);return n=n+Math.imul(n^n>>>7,61|n)^n,((n^n>>>14)>>>0)/4294967296}}function we(e,n){return n[Math.floor(e()*n.length)]}function be(e,n,t,o,r,i,a,c=0){for(let d=0;d<40;d++){const u=ve(a+d*17),f=[];let $=0;for(let p=0;p<i;p++){const s=Q(f),S=new Set,z=new Set,m=new Map,P=[];for(let A=0;A<o;A++)for(let L=0;L<r;L++)if(!s.has(`${A},${L}`)){for(const I of K)if(ee({r:A,c:L,dir:I},s,S,z,m,o,r)){const{dr:V,dc:_}=J[I];let U=0,D=A+V,O=L+_;for(;D>=0&&D<o&&O>=0&&O<r;)U++,D+=V,O+=_;U>=0&&P.push({r:A,c:L,dir:I})}}if(P.length===0)break;const C=we(u,P);f.push({id:`a${$++}`,...C,spin:!1})}if(f.length<Math.max(2,i-1))continue;const T=Math.min(c,f.length),b=[...f.keys()];for(let p=0;p<T;p++){const s=Math.floor(u()*b.length),S=b.splice(s,1)[0];S!==void 0&&(f[S].spin=!0)}const g=Array.from({length:o},()=>Array(r).fill("."));for(const p of f){const s=p.spin?p.dir.toLowerCase():p.dir;g[p.r][p.c]=s}const k={id:e,name:n,lesson:t,rows:o,cols:r,grid:g.map(p=>p.join(""))};if(F(k))return k}return null}const ge=[{id:1,name:"Primo vento",lesson:"Non scegli una freccia sola: scateni un vento. Scorri la griglia o usa i tasti sotto.",rows:3,cols:3,grid:["...",".E.","..."]},{id:2,name:"Due venti",lesson:"Ogni direzione è un vento. Soffia verso chi ha la via libera.",rows:3,cols:3,grid:[".S.","...","N.."]},{id:3,name:"Stormo",lesson:"Un solo vento porta via tutte le frecce libere di quella direzione.",rows:3,cols:3,grid:["E..","...","..E"]},{id:4,name:"Eco",lesson:"Le frecce lasciano un'eco per un turno. L'eco occupa la cella.",rows:3,cols:3,grid:["E.S",".N.","..."]},{id:5,name:"Attesa",lesson:"Se l'eco chiude la via, tocca Attendi. Poi lancia di nuovo il vento.",rows:3,cols:4,grid:["E..S","....","...."]},{id:6,name:"Girevole",lesson:"L'anello d'oro ruota. Tieni premuto la freccia, poi lancia il vento.",rows:3,cols:3,grid:[".#.",".n.","..."]},{id:7,name:"Roccia",lesson:"La pietra non si sposta. Gira la freccia e fai svanire l'eco.",rows:3,cols:3,grid:["Es.",".#.","..."]},{id:8,name:"Portale",lesson:"I due anelli sono gemelli: il volo esce dall'altro lato.",rows:3,cols:4,grid:["E.a#","...b","...."]}],ye=[{name:"Doppio stormo",lesson:"Due stormi, due venti. Quale togliere per primo?",rows:4,cols:4,count:6,seed:404,spin:0},{name:"Cerniera",lesson:"Una girevole cambia il vento che puoi lanciare.",rows:4,cols:4,count:7,seed:505,spin:1},{name:"Traforo",lesson:"Pensa all'eco: a volte il passaggio si apre solo dopo l'attesa.",rows:5,cols:5,count:9,seed:606,spin:1},{name:"Croce",lesson:"Quattro direzioni strette. Non lanciare un vento vuoto.",rows:5,cols:5,count:10,seed:707,spin:0},{name:"Lanterna",lesson:"Girevoli e stormi insieme. Ruota solo se serve.",rows:5,cols:6,count:12,seed:808,spin:2},{name:"Sciame",lesson:"Tanti venti possibili. Il combo cresce se ripeti la stessa direzione.",rows:6,cols:6,count:14,seed:909,spin:1},{name:"Sagra",lesson:"La piazza piena. Stormo, eco, attesa, girevoli: svuotala.",rows:6,cols:6,count:16,seed:1010,spin:2}];function $e(){return[{id:11,name:"Traforo",lesson:"Il portale piega il volo oltre la pietra. Prima libera l'uscita.",rows:4,cols:4,grid:["#Ea.","..b.","S...","..N."]},{id:13,name:"Lanterna",lesson:"Due anelli, due girevoli. Ruota, attendi, poi lo stormo.",rows:4,cols:5,grid:[".#e#.","S...a","..N.b",".#w.."]}]}const Se=ye.map((e,n)=>{const t=9+n,o=be(t,e.name,e.lesson,e.rows,e.cols,e.count,e.seed,e.spin);return o?{...o,id:t}:{id:t,name:e.name,lesson:e.lesson,rows:e.rows,cols:e.cols,grid:Array.from({length:e.rows},()=>".".repeat(e.cols))}}),ke=$e(),N=[...ge,...Se].map(e=>ke.find(t=>t.id===e.id)??e).sort((e,n)=>e.id-n.id);function Le(e){const n=Z(e);return{arrows:n.arrows.length,spins:n.arrows.filter(t=>t.spin).length}}function Ee(){return N.map(e=>{const n=j(e),t=F(e);return{id:e.id,name:e.name,ok:t!==null,arrows:n.arrows.length,steps:(t==null?void 0:t.length)??0}})}const le="frecciotte-progress-v2";function Ne(){try{const e=localStorage.getItem(le);if(!e)return{unlocked:1,cleared:[],seenHowTo:!1};const n=JSON.parse(e);return{unlocked:Math.max(1,n.unlocked??1),cleared:Array.isArray(n.cleared)?n.cleared:[],seenHowTo:!!n.seenHowTo}}catch{return{unlocked:1,cleared:[],seenHowTo:!1}}}function ce(e){localStorage.setItem(le,JSON.stringify(e))}const h=document.querySelector("#app");let v=Ne(),l=null,x=!1,w=null,M=v.seenHowTo?"home":"howto";function G(e=18){var n;try{(n=navigator.vibrate)==null||n.call(navigator,e)}catch{}}const Ae=(e,n)=>`
    <svg viewBox="0 0 64 64" aria-hidden="true" style="transform: rotate(${{N:0,E:90,S:180,W:270}[e]}deg)">
      ${n?'<circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="6 5" opacity="0.9"/>':""}
      <path d="M32 8 L52 34 H40 V56 H24 V34 H12 Z" fill="currentColor"/>
    </svg>
  `;function q(){return M==="howto"?xe():M==="home"||!l?Me():E()}function xe(){var e;h.innerHTML=`
    <div class="shell howto">
      <header class="brand">
        <p class="kicker">Nuovo rompicapo</p>
        <h1>Frecciotte</h1>
        <p>Non è un clone: qui comandi il vento.</p>
      </header>
      <ol class="lessons">
        <li>
          <strong>Stormo</strong>
          <span>Scorri o tocca un tasto direzione. Partono tutte le frecce libere di quel vento.</span>
        </li>
        <li>
          <strong>Eco</strong>
          <span>Ogni volo lascia un'eco per un turno. L'eco occupa la cella: a volte devi attendere.</span>
        </li>
        <li>
          <strong>Girevoli</strong>
          <span>Le frecce con l'anello ruotano. Tieni premuto, poi lancia il vento giusto.</span>
        </li>
        <li>
          <strong>Portali</strong>
          <span>Due anelli gemelli piegano il volo dall'altra parte della piazza.</span>
        </li>
      </ol>
      <button class="btn primary hero-play" type="button" data-action="start">Gioca dal telefono</button>
    </div>
  `,(e=h.querySelector('[data-action="start"]'))==null||e.addEventListener("click",()=>{v.seenHowTo=!0,ce(v),M="home",q()})}function Me(){var n,t;const e=v.unlocked;h.innerHTML=`
    <div class="shell screen-home">
      <header class="brand">
        <p class="kicker">Rompicapo dei venti</p>
        <h1>Frecciotte</h1>
        <p>Stormi, echi, girevoli. Svuota la piazza.</p>
      </header>
      <button class="btn primary hero-play" type="button" data-action="continue">
        ${v.cleared.length?"Continua":"Inizia"} · Livello ${Math.min(e,N.length)}
      </button>
      <div class="level-list" role="list">
        ${N.map(o=>{const r=o.id>e,i=v.cleared.includes(o.id),a=Le(o);return`
            <button
              class="level-item ${i?"done":""} ${r?"locked":""}"
              type="button"
              data-level="${o.id}"
              ${r?"disabled":""}
            >
              <span class="meta">
                <strong>${o.id}. ${o.name}</strong>
                <span>${o.rows}×${o.cols} · ${a.arrows} frecce${a.spins?` · ${a.spins} girevoli`:""}</span>
              </span>
              <span class="badge">${r?"Bloccato":i?"Fatto":"Apri"}</span>
            </button>
          `}).join("")}
      </div>
      <button class="btn ghost" type="button" data-action="howto">Come si gioca</button>
    </div>
  `,(n=h.querySelector('[data-action="continue"]'))==null||n.addEventListener("click",()=>{W(Math.min(e,N.length))}),(t=h.querySelector('[data-action="howto"]'))==null||t.addEventListener("click",()=>{M="howto",q()}),h.querySelectorAll("[data-level]").forEach(o=>{o.addEventListener("click",()=>{const r=Number(o.dataset.level);!Number.isFinite(r)||r>v.unlocked||W(r)})})}function W(e){const n=N.find(t=>t.id===e);n&&(l=j(n),x=!1,w=null,M="play",E())}function Te(e,n=!1){return Array.from({length:oe},(t,o)=>`<span class="heart ${o>=e?"empty":""} ${n&&o===e?"shake":""}"></span>`).join("")}function E(e){if(!l)return;const{level:n,arrows:t,hearts:o,status:r,board:i,ecos:a,combo:c,hint:d}=l,u=new Map(t.map(s=>[y(s.r,s.c),s]));for(const s of(e==null?void 0:e.leavingArrows)??[])u.set(y(s.r,s.c),s);const f=new Set(a.map(s=>y(s.r,s.c))),$=(e==null?void 0:e.overlay)??(r==="won"||r==="lost"?r:null),T=new Set(((e==null?void 0:e.leavingArrows)??[]).map(s=>s.id)),b=new Set;if((d==null?void 0:d.kind)==="wind")for(const s of se(l,d.dir))b.add(s.id);(d==null?void 0:d.kind)==="spin"&&b.add(d.id);const g=[];for(let s=0;s<n.rows;s++)for(let S=0;S<n.cols;S++){const z=y(s,S),m=u.get(z),P=i.walls.has(z),C=i.portalIndex.has(z),A=f.has(z),L=["cell",P?"wall":"",C?"portal":"",A?"eco":""].filter(Boolean).join(" ");if(m){const I=T.has(m.id)?`leaving-${m.dir}`:"";g.push(`
          <div class="${L}" data-r="${s}" data-c="${S}">
            <button
              class="arrow-btn ${m.spin?"spin":""} ${b.has(m.id)?"hint":""} ${I}"
              type="button"
              data-id="${m.id}"
              data-spin="${m.spin?"1":"0"}"
              data-dir="${m.dir}"
              aria-label="${m.spin?"Girevole":"Freccia"} ${H[m.dir]}"
            >${Ae(m.dir,m.spin)}</button>
          </div>
        `)}else g.push(`<div class="${L}" data-r="${s}" data-c="${S}">${C?'<span class="portal-ring"></span>':""}</div>`)}const k=(d==null?void 0:d.kind)==="wait",p=l.mistakes===0&&l.maxCombo>=2?3:l.mistakes===0?2:1;h.innerHTML=`
    <div class="shell play">
      <header class="brand compact">
        <h1>Frecciotte</h1>
        <p>${n.name}</p>
      </header>
      <div class="hud">
        <div class="hud-level">
          <span class="label">Livello ${n.id}/${N.length}</span>
          <span class="value">${c>1?`Stormo ×${c}`:"Vento fermo"}</span>
        </div>
        <div class="hearts" aria-label="${o} cuori">${Te(o,e==null?void 0:e.shakeHeart)}</div>
      </div>
      <p class="lesson">${n.lesson}</p>
      <div class="board-wrap ${e!=null&&e.shakeHeart?"flash-bad":""}">
        <div
          class="board"
          style="grid-template-columns: repeat(${n.cols}, 1fr); grid-template-rows: repeat(${n.rows}, 1fr); aspect-ratio: ${n.cols} / ${n.rows};"
        >
          ${g.join("")}
        </div>
        ${w?`<div class="toast">${w}</div>`:""}
        ${$==="won"?`<div class="overlay"><div class="overlay-card">
                <h2>Piazza vuota</h2>
                <p class="stars">${"★".repeat(p)}${"☆".repeat(3-p)}</p>
                <p>${l.mistakes===0?"Nessun vento sbagliato.":`${l.mistakes} venti vuoti.`}</p>
                <button class="btn primary" type="button" data-action="next">
                  ${n.id<N.length?"Livello successivo":"Torna alla lista"}
                </button>
              </div></div>`:$==="lost"?`<div class="overlay"><div class="overlay-card">
                <h2>Venti spezzati</h2>
                <p>I cuori sono finiti. Riprova la piazza.</p>
                <button class="btn primary" type="button" data-action="retry">Riprova</button>
              </div></div>`:""}
      </div>
      <div class="winds" aria-label="Venti">
        <button class="btn wind" data-wind="N" type="button">${H.N}<small>Nord</small></button>
        <button class="btn wind" data-wind="W" type="button">${H.W}<small>Ovest</small></button>
        <button class="btn wind" data-wind="E" type="button">${H.E}<small>Est</small></button>
        <button class="btn wind" data-wind="S" type="button">${H.S}<small>Sud</small></button>
      </div>
      <div class="actions">
        <button class="btn" type="button" data-action="home">Lista</button>
        <button class="btn ${k?"hinted":""}" type="button" data-action="wait" ${l.ecos.length===0?"disabled":""}>Attendi</button>
        <button class="btn" type="button" data-action="hint">Aiuto</button>
        <button class="btn primary" type="button" data-action="retry">Reset</button>
      </div>
    </div>
  `,ze()}function ze(){var n,t,o,r,i;if(!l)return;(n=h.querySelector('[data-action="home"]'))==null||n.addEventListener("click",()=>{M="home",l=null,q()}),(t=h.querySelector('[data-action="retry"]'))==null||t.addEventListener("click",()=>{l&&W(l.level.id)}),(o=h.querySelector('[data-action="next"]'))==null||o.addEventListener("click",()=>{l&&(l.level.id<N.length?W(l.level.id+1):(M="home",l=null,q()))}),(r=h.querySelector('[data-action="wait"]'))==null||r.addEventListener("click",()=>{!l||x||ae(l)&&(w="L'eco svanisce",G(12),E())}),(i=h.querySelector('[data-action="hint"]'))==null||i.addEventListener("click",()=>{if(!l||x)return;const a=me(l);l.hint=a,a?a.kind==="wait"?w="Attendi che l'eco svanisca":a.kind==="spin"?w="Tieni premuto una girevole":w=`Lancia il vento ${H[a.dir]}`:w="Nessun aiuto",E()}),h.querySelectorAll("[data-wind]").forEach(a=>{a.addEventListener("click",()=>{const c=a.dataset.wind;R(c)})});const e=h.querySelector(".board-wrap");e&&He(e),Pe()}function He(e){let n=0,t=0;e.addEventListener("pointerdown",o=>{const r=o;n=r.clientX,t=r.clientY}),e.addEventListener("pointerup",o=>{const r=o,i=r.clientX-n,a=r.clientY-t;Math.hypot(i,a)<42||(Math.abs(i)>Math.abs(a)?R(i>0?"E":"W"):R(a>0?"S":"N"))})}function Pe(){h.querySelectorAll(".arrow-btn").forEach(e=>{let n=null,t=!1;const o=()=>{n!==null&&(window.clearTimeout(n),n=null)};e.addEventListener("pointerdown",r=>{r.stopPropagation(),t=!1,e.dataset.spin==="1"&&(n=window.setTimeout(()=>{if(t=!0,!l)return;const i=e.dataset.id;i&&ie(l,i)&&(G(24),w="Girevole ruotata",E())},420))}),e.addEventListener("pointerup",r=>{if(r.stopPropagation(),o(),t||x||!l)return;const i=e.dataset.dir;i&&R(i)}),e.addEventListener("pointerleave",o),e.addEventListener("pointercancel",o)})}async function R(e){if(!l||x||l.status!=="playing")return;const n=re(l,e);if(!n.ok){G(40),w="Vento vuoto",E({shakeHeart:!0,overlay:n.status==="lost"?"lost":void 0});return}x=!0,G(n.stormo?28:14),w=n.stormo?`Stormo ×${n.launched.length}`:"Via!",E({leavingArrows:n.launched}),await qe(360),n.won?(Ie(),w=null,E({overlay:"won"})):E(),x=!1}function Ie(){if(!l)return;const e=l.level.id;v.cleared.includes(e)||v.cleared.push(e),v.unlocked=Math.max(v.unlocked,Math.min(N.length,e+1)),ce(v)}function qe(e){return new Promise(n=>setTimeout(n,e))}const We=Ee(),Y=We.filter(e=>!e.ok);Y.length&&console.warn("Livelli non risolvibili:",Y);q();"serviceWorker"in navigator&&navigator.serviceWorker.register("./sw.js");window.frecciotte={start:W};
