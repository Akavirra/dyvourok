
const slides=[...document.querySelectorAll('.slide')];let cur=0,step=0;
function fit(){const s=Math.min(innerWidth/1600,innerHeight/900);const st=document.getElementById('stage');
  st.style.transform=`scale(${s}) translate(-50%,-50%)`;st.style.transformOrigin='0 0';
  st.style.left='50%';st.style.top='50%';st.style.transform=`translate(-50%,-50%) scale(${s})`;st.style.transformOrigin='center';}
function show(i,st){cur=Math.max(0,Math.min(slides.length-1,i));slides.forEach((s,k)=>s.classList.toggle('on',k===cur));
  step=st===undefined?0:st;paint();
  document.getElementById('pg').textContent=`${cur+1} / ${slides.length}`;
  try{history.replaceState(null,'','#'+(cur+1))}catch(e){}}
function paint(){const s=slides[cur];s.dataset.at=step;s.querySelectorAll('[data-step]').forEach(e=>e.classList.toggle('shown',+e.dataset.step<=step));}
function next(){const n=+slides[cur].dataset.steps;if(step<n){step++;paint()}else if(cur<slides.length-1)show(cur+1)}
function prev(){if(step>0){step--;paint()}else if(cur>0){show(cur-1,+slides[cur-1].dataset.steps)}}
addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();next()}
  else if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();prev()}
  else if(e.key==='f'||e.key==='F'){document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}});
document.getElementById('stage').addEventListener('click',e=>{
  if(e.target.closest('button,input,label,video,a'))return;next()});
document.querySelectorAll('.flip').forEach(b=>b.addEventListener('click',()=>b.classList.toggle('open')));
document.querySelectorAll('.bf').forEach(b=>b.addEventListener('click',()=>{const v=b.querySelector('.votes');v.textContent=+v.textContent+1}));
let left=240,tid=null;const tm=document.getElementById('tm'),tgo=document.getElementById('tgo');
const draw=()=>{tm.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;tm.classList.toggle('end',left===0)};
tgo.addEventListener('click',()=>{if(tid){clearInterval(tid);tid=null;tgo.textContent='Старт'}else{tgo.textContent='Пауза';
  tid=setInterval(()=>{if(left>0){left--;draw()}if(left===0){clearInterval(tid);tid=null;tgo.textContent='Старт'}},1000)}});
document.getElementById('trs').addEventListener('click',()=>{clearInterval(tid);tid=null;left=240;tgo.textContent='Старт';draw()});
document.getElementById('bp').onclick=prev;document.getElementById('bn').onclick=next;
document.getElementById('bf').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
addEventListener('resize',fit);fit();{const i=(parseInt(location.hash.slice(1))||1)-1;show(i,/[?&]all/.test(location.search)?+slides[Math.max(0,Math.min(slides.length-1,i))].dataset.steps:0)}
