(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const levelEl = document.getElementById('level');
  const overlay = document.getElementById('overlay');
  const titleEl = document.getElementById('overlayTitle');
  const textEl = document.getElementById('overlayText');
  const emojiEl = document.getElementById('overlayEmoji');
  const mainBtn = document.getElementById('mainBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const soundBtn = document.getElementById('soundBtn');

  const CELLS = 22;
  const foods = [{emoji:'🍎',points:10,weight:58},{emoji:'🍩',points:20,weight:27},{emoji:'⭐',points:50,weight:15}];
  let boardSize = 0, cell = 0, snake = [], direction = {x:1,y:0}, nextDirection = {x:1,y:0}, food = null, obstacles = [];
  let score = 0, level = 1, startedAt = 0, elapsedBefore = 0, lastTick = 0, accumulator = 0;
  let state = 'ready', soundOn = true, audioCtx = null, particles = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    boardSize = rect.width; cell = boardSize / CELLS;
    draw();
  }
  function randomCell() { return {x:Math.floor(Math.random()*CELLS),y:Math.floor(Math.random()*CELLS)}; }
  function occupied(p) { return snake.some(s=>s.x===p.x&&s.y===p.y) || obstacles.some(o=>o.x===p.x&&o.y===p.y); }
  function placeFood() {
    let p; do { p=randomCell(); } while (occupied(p));
    const roll=Math.random()*100; let total=0; let item=foods[0];
    for(const f of foods){total+=f.weight;if(roll<total){item=f;break;}}
    food={...p,...item};
  }
  function reset() {
    snake=[{x:10,y:11},{x:9,y:11},{x:8,y:11},{x:7,y:11}];
    direction={x:1,y:0};nextDirection={x:1,y:0};obstacles=[];score=0;level=1;elapsedBefore=0;startedAt=performance.now();particles=[];
    placeFood(); updateStats(); state='playing';overlay.hidden=true;pauseBtn.hidden=false;lastTick=0;accumulator=0;draw();
  }
  function updateStats(){scoreEl.textContent=score;levelEl.textContent=level;timeEl.textContent=formatTime(elapsedBefore+(state==='playing'?(performance.now()-startedAt)/1000:0));}
  function formatTime(s){s=Math.floor(s);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
  function speed(){return Math.max(65,145-(level-1)*9);}
  function addObstacle(){let p;do{p=randomCell();}while(occupied(p)||Math.abs(p.x-snake[0].x)<4||Math.abs(p.y-snake[0].y)<4|| (food&&p.x===food.x&&p.y===food.y));obstacles.push(p);}
  function tick(){
    direction=nextDirection;
    const head={x:snake[0].x+direction.x,y:snake[0].y+direction.y};
    if(head.x<0||head.y<0||head.x>=CELLS||head.y>=CELLS||obstacles.some(o=>o.x===head.x&&o.y===head.y)){gameOver();return;}
    const eating=head.x===food.x&&head.y===food.y;
    const body=eating?snake:snake.slice(0,-1);
    if(body.some(s=>s.x===head.x&&s.y===head.y)){gameOver();return;}
    snake.unshift(head);
    if(eating){score+=food.points;burst(head.x,head.y,food.emoji);beep(620,0.07);const newLevel=Math.floor(score/100)+1;if(newLevel>level){level=newLevel;if(level>=3&&obstacles.length<Math.min(8,level+1))addObstacle();}placeFood();}
    else snake.pop();
    updateStats();
  }
  function gameOver(){state='over';elapsedBefore+=(performance.now()-startedAt)/1000;pauseBtn.hidden=true;titleEl.textContent='انتهت الجولة!';textEl.textContent=`حققت ${score} نقطة في ${formatTime(elapsedBefore)}. هل تحاول مرة أخرى؟`;emojiEl.textContent='🏁';mainBtn.textContent='العب مرة أخرى ←';overlay.hidden=false;beep(180,0.22);updateStats();}
  function pause(){if(state==='playing'){state='paused';elapsedBefore+=(performance.now()-startedAt)/1000;titleEl.textContent='استراحة قصيرة';textEl.textContent='اللعبة متوقفة مؤقتًا. جاهز تكمل؟';emojiEl.textContent='⏸️';mainBtn.textContent='استكمال اللعب ←';overlay.hidden=false;pauseBtn.hidden=true;updateStats();}else if(state==='paused'){state='playing';startedAt=performance.now();overlay.hidden=true;pauseBtn.hidden=false;lastTick=0;}}
  function setDirection(name){const dirs={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};const d=dirs[name];if(!d||state!=='playing')return;if(d.x===-direction.x&&d.y===-direction.y)return;nextDirection=d;}
  function draw(){
    if(!boardSize)return;const w=boardSize;ctx.clearRect(0,0,w,w);
    ctx.fillStyle='#17283b';ctx.fillRect(0,0,w,w);
    ctx.strokeStyle='rgba(178,211,231,.055)';ctx.lineWidth=1;
    for(let i=0;i<=CELLS;i++){const p=i*cell;ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,w);ctx.stroke();ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(w,p);ctx.stroke();}
    for(const o of obstacles){rounded(o.x*cell+2,o.y*cell+2,cell-4,cell-4,5,'#e45e75');ctx.fillStyle='#ff9aaa';ctx.font=`${cell*.56}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✦',(o.x+.5)*cell,(o.y+.5)*cell);}
    if(food){ctx.save();ctx.shadowColor='#ffd166';ctx.shadowBlur=14;ctx.font=`${cell*.78}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(food.emoji,(food.x+.5)*cell,(food.y+.52)*cell);ctx.restore();}
    snake.forEach((s,i)=>{const pad=i===0?1.5:2.3;const x=s.x*cell+pad,y=s.y*cell+pad;rounded(x,y,cell-pad*2,cell-pad*2,cell*.28,i===0?'#65edb7':`hsl(${155-i*2},66%,${57-i*.35}%)`);if(i===0){ctx.fillStyle='#153c37';const eyeR=Math.max(1.5,cell*.055);let ex=(s.x+.5)*cell,ey=(s.y+.5)*cell;if(direction.x) {ctx.beginPath();ctx.arc(ex+direction.x*cell*.19,ey-cell*.13,eyeR,0,Math.PI*2);ctx.arc(ex+direction.x*cell*.19,ey+cell*.13,eyeR,0,Math.PI*2);ctx.fill();}else{ctx.beginPath();ctx.arc(ex-cell*.13,ey+direction.y*cell*.19,eyeR,0,Math.PI*2);ctx.arc(ex+cell*.13,ey+direction.y*cell*.19,eyeR,0,Math.PI*2);ctx.fill();}}});
    particles=particles.filter(p=>p.life>0);for(const p of particles){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();p.x+=p.vx;p.y+=p.vy;p.life-=.045;}ctx.globalAlpha=1;
  }
  function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function burst(x,y,emoji){for(let i=0;i<9;i++){const a=Math.PI*2*i/9;particles.push({x:(x+.5)*cell,y:(y+.5)*cell,vx:Math.cos(a)*2.2,vy:Math.sin(a)*2.2,r:2+Math.random()*2,life:1,color:i%2?'#ffd166':'#55e6b1'});}if(emoji==='⭐')score+=0;}
  function beep(freq,duration){if(!soundOn)return;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;o.type='sine';g.gain.setValueAtTime(.045,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch(_){}}
  function loop(now){if(state==='playing'){if(!lastTick)lastTick=now;accumulator+=Math.min(50,now-lastTick);lastTick=now;const step=speed();while(accumulator>=step&&state==='playing'){tick();accumulator-=step;}updateStats();}else{lastTick=now;}draw();requestAnimationFrame(loop);}
  mainBtn.addEventListener('click',()=>{if(state==='paused')pause();else reset();});pauseBtn.addEventListener('click',pause);
  soundBtn.addEventListener('click',()=>{soundOn=!soundOn;soundBtn.textContent=soundOn?'🔊':'🔇';if(soundOn)beep(520,.06);});
  window.addEventListener('keydown',e=>{const map={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};if(map[e.key]){e.preventDefault();setDirection(map[e.key]);}if(e.key===' '){e.preventDefault();if(state==='playing'||state==='paused')pause();}});
  document.querySelectorAll('[data-dir]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();setDirection(b.dataset.dir);});});
  let touchStart=null;canvas.addEventListener('pointerdown',e=>{touchStart={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointerup',e=>{if(!touchStart)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))<12)return;if(Math.abs(dx)>Math.abs(dy))setDirection(dx>0?'right':'left');else setDirection(dy>0?'down':'up');});
  window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
  resize();requestAnimationFrame(loop);
})();
