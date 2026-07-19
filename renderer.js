const stage = document.getElementById('stage');
const pet = document.getElementById('pet');
const petImg = document.getElementById('petImg');
const bubble = document.getElementById('bubble');
const panel = document.getElementById('panel');
const scene = document.getElementById('scene');
const bathEl = document.getElementById('bathScene');
const dot = document.getElementById('dot');
const dressName = document.getElementById('dressName');

// 窗口尺寸（贴住右下角）
const COLLAPSED = 66;
const EXPANDED = { w: 236, h: 300 };
const OUT = { w: 264, h: 212 };

// 「衣柜」文件名 → 中文名。放进 outfits/ 文件夹的图会自动出现；
// 不在这张表里的文件也能穿，只是名字用文件名。
const NAMES = {
  '01-bib.png': '碎花口水兜',
  '02-flower.png': '碎花小裙子',
  '03-mintlolita.png': '薄荷Lolita',
  '04-purplelolita.png': '紫色Lolita',
  '05-creamlolita.png': '米白Lolita',
  '06-bluerose.png': '蓝玫瑰Lolita',
  '07-pinkpuffer.png': '粉色羽绒服',
  '08-lavenderpuffer.png': '香芋紫羽绒服',
  '09-newyear.png': '过年红马甲',
  '10-star.png': '星星连体衣',
  '11-dino.png': '恐龙连体衣',
};

let outfits = []; // [{file, name}]，为空时用默认照片
const FALLBACK = { file: null, name: '小羊本尊' };
const WARM_OUTFITS = new Set(['07-pinkpuffer.png', '08-lavenderpuffer.png', '09-newyear.png', '10-star.png']);
function isWarmOutfit() {
  const o = currentOutfit();
  return o.file && WARM_OUTFITS.has(o.file);
}

function loadState() {
  let old = {};
  try { old = JSON.parse(localStorage.getItem('sheepState') || '{}'); } catch (e) {}
  return {
    outfitIdx: Number.isInteger(old.outfitIdx) ? old.outfitIdx : 0,
    lastFed: old.lastFed || Date.now(),
    lastBath: old.lastBath || Date.now(),
    lastSleep: old.lastSleep || Date.now(),
    fluffyUntil: old.fluffyUntil || 0,
    moodBoostUntil: old.moodBoostUntil || 0,
    out: false,
  };
}
const state = loadState();
let open = false;
let outMode = false;
let bathMode = false;
let sleeping = false;
let closeTimer = null;
let bubbleTimer = null;
let mouseEvents = true;
let lastHeart = 0;
let shownKey = 'outfit';
const FEED_MIN = 5;    // 喂食间隔（分钟）
const BATH_MIN = 10;   // 洗澡间隔（分钟）
const ENERGY_HOURS = 4; // 体力从满到空的小时数

function save() { localStorage.setItem('sheepState', JSON.stringify(state)); }

function currentOutfit() {
  if (!outfits.length) return FALLBACK;
  return outfits[((state.outfitIdx % outfits.length) + outfits.length) % outfits.length];
}
function outfitSrc(o) {
  return o && o.file ? `outfits/${o.file}` : 'assets/sheep-real.png';
}

function applyOutfit() {
  const o = currentOutfit();
  petImg.src = outfitSrc(o);
  dressName.textContent = o.name;
  shownKey = 'outfit';
}

function applySize() {
  stage.classList.toggle('open', open || outMode || bathMode || sleeping);
  stage.classList.toggle('out', outMode);
  stage.classList.toggle('bath', bathMode);
  stage.classList.toggle('sleeping', sleeping);
  if (outMode || bathMode) {
    window.petAPI?.resize?.({ width: OUT.w, height: OUT.h });
  } else if (open || sleeping) {
    window.petAPI?.resize?.({ width: EXPANDED.w, height: EXPANDED.h });
  } else {
    window.petAPI?.resize?.({ width: COLLAPSED, height: COLLAPSED });
  }
}

function say(text, ms = 2200) {
  bubble.textContent = text;
  bubble.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms);
}

// 饿了/脏了/困了的状态
function hoursSince(t) { return (Date.now() - t) / 3.6e6; }
function minsSince(t) { return (Date.now() - t) / 6e4; }
function isHungry() { return minsSince(state.lastFed) > FEED_MIN; }
function dirtyMins() { return minsSince(state.lastBath); }
function isDirty() { return dirtyMins() > BATH_MIN; }

function foodPct() { return Math.max(0, Math.min(100, Math.round(100 * (1 - minsSince(state.lastFed) / FEED_MIN)))); }
function bathPct() { return Math.max(0, Math.min(100, Math.round(100 * (1 - dirtyMins() / BATH_MIN)))); }
function energyPct() { return sleeping ? 100 : Math.max(0, Math.min(100, Math.round(100 * (1 - hoursSince(state.lastSleep) / ENERGY_HOURS)))); }
function moodPct() {
  let m = Math.round((foodPct() + bathPct() + energyPct()) / 3);
  if (Date.now() < (state.moodBoostUntil || 0)) m = Math.min(100, m + 15);
  return Math.max(0, Math.min(100, m));
}
function barColor(p) { return p > 55 ? '#7ac77e' : p > 25 ? '#f2c14e' : '#ef8f7a'; }
function setBar(idKey, pctKey, p) {
  const b = document.getElementById(idKey), t = document.getElementById(pctKey);
  if (b) { b.style.width = p + '%'; b.style.background = barColor(p); }
  if (t) t.textContent = p;
}

function refreshStatus() {
  const fp = foodPct(), bp = bathPct(), ep = energyPct(), mp = moodPct();
  setBar('barFood', 'pctFood', fp);
  setBar('barBath', 'pctBath', bp);
  setBar('barEnergy', 'pctEnergy', ep);
  setBar('barMood', 'pctMood', mp);

  // 脏了 → 变灰：超过洗澡间隔后逐渐变灰（约 20 分钟内灰透）
  const overMin = Math.max(0, dirtyMins() - BATH_MIN);
  const g = Math.min(0.8, overMin / 20 * 0.8);
  const fluffy = Date.now() < (state.fluffyUntil || 0);
  pet.classList.toggle('fluffy', fluffy);
  petImg.style.filter =
    `drop-shadow(0 4px 6px rgba(60,45,36,.28)) grayscale(${g}) brightness(${(1 - g * 0.22) * (fluffy ? 1.06 : 1)}) contrast(${1 - g * 0.08})${fluffy ? ' saturate(1.05)' : ''}`;

  // 饿了 → 委屈/哭泣渐进
  const hungryMin = minsSince(state.lastFed) - FEED_MIN;
  const sulky = hungryMin > 0 && hungryMin <= 3 && !sleeping;
  const crying = hungryMin > 3 && !sleeping;
  pet.classList.toggle('sulky', sulky);
  pet.classList.toggle('hungry', crying);

  // 体力低 → 困倦（呼吸变慢）
  const tiredNow = ep < 30 && !sleeping;
  pet.classList.toggle('tired', tiredNow);

  // 始终显示整只穿衣服的羊；哭泣/委屈用泪珠+抽泣动画表现
  if (!sleeping && !bathMode && shownKey !== 'outfit') {
    shownKey = 'outfit';
    petImg.src = outfitSrc(currentOutfit());
  }

  // 缩起来时用小圆点提示
  if (hungryMin > 0) { dot.style.display = 'block'; dot.style.background = '#ffcf47'; }
  else if (isDirty()) { dot.style.display = 'block'; dot.style.background = '#b9b3ab'; }
  else if (ep < 25) { dot.style.display = 'block'; dot.style.background = '#b7a8e0'; }
  else { dot.style.display = 'none'; }
}

function openPanel() {
  open = true;
  applySize();
  setMouseEvents(true);
  clearTimeout(closeTimer);
  closeTimer = setTimeout(closePanel, 6000);
}
function closePanel() {
  open = false;
  applySize();
}
function keepOpen() {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(closePanel, 6000);
}

function setMouseEvents(enabled) {
  if (mouseEvents === enabled) return;
  mouseEvents = enabled;
  window.petAPI?.mouseEvents?.(enabled);
}

function spawnHeart(x, y) {
  const h = document.createElement('div');
  h.className = 'heart';
  h.textContent = ['💗', '💛', '✨', '🩷'][Math.floor(Math.random() * 4)];
  h.style.left = `${x - 8}px`;
  h.style.top = `${y - 10}px`;
  document.body.appendChild(h);
  setTimeout(() => h.remove(), 1000);
}

// —— 拖动小羊：按住拖到屏幕任意位置 ——
let dragState = null;
let didDrag = false;
pet.addEventListener('mousedown', e => {
  dragState = { x: e.screenX, y: e.screenY };
  didDrag = false;
});
window.addEventListener('mousemove', e => {
  if (!dragState) return;
  const dx = e.screenX - dragState.x, dy = e.screenY - dragState.y;
  if (!didDrag && Math.hypot(dx, dy) < 5) return;
  didDrag = true;
  window.petAPI?.moveBy?.({ dx, dy });
  dragState = { x: e.screenX, y: e.screenY };
});
window.addEventListener('mouseup', () => { dragState = null; });

// —— 点击小羊：展开 / 收起 ——
pet.addEventListener('click', e => {
  e.stopPropagation();
  if (didDrag) { didDrag = false; return; } // 拖动结束不当点击
  if (outMode || bathMode || sleeping) return; // 出门/洗澡/睡觉时点羊只撸不收起
  if (open) closePanel();
  else { openPanel(); say('咩~ 我在这儿'); }
});

let sunsetTimer = null;
const sceneBg = document.getElementById('sceneBg');
const WEATHERS = ['day', 'rain', 'snow', 'wind', 'night'];
const WEATHER_ICON = { day: '☀️', rain: '🌧️', snow: '❄️', wind: '💨', night: '🌙' };
const WEATHER_WORD = { day: '晴天草地，追蝴蝶啦 🦋', rain: '下雨天，自动撑起大雨伞 ☂️', snow: '下雪咯，围好围巾喝奶茶 🧣', wind: '风好大呀，毛都吹乱啦 💨', night: '夜晚星空，好安静呀 🌟' };
let weather = 'day';
// —— 真实天气：定位 + open-meteo 免费天气，映射到小羊的场景 ——
let realWeather = null, realTemp = null;
async function fetchRealWeather() {
  try {
    // 定位：先用 ipwho.is，失败再用 ipapi.co，最后用上次缓存的位置
    let lat, lon;
    try {
      const g = await (await fetch('https://ipwho.is/')).json();
      if (g && g.success !== false) { lat = g.latitude; lon = g.longitude; }
    } catch (e) {}
    if (lat == null) {
      try {
        const g = await (await fetch('https://ipapi.co/json/')).json();
        if (g && !g.error) { lat = g.latitude; lon = g.longitude; }
      } catch (e) {}
    }
    if (lat == null) {
      const c = JSON.parse(localStorage.getItem('geoCache') || 'null');
      if (c) { lat = c.lat; lon = c.lon; }
    }
    if (lat == null) return;
    localStorage.setItem('geoCache', JSON.stringify({ lat, lon }));
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const w = (await (await fetch(u)).json()).current_weather;
    realTemp = w.temperature;
    const c = w.weathercode;
    if ([71, 73, 75, 77, 85, 86].includes(c)) realWeather = 'snow';
    else if (c >= 51 && c <= 99) realWeather = 'rain';
    else if (w.windspeed >= 25) realWeather = 'wind';
    else realWeather = w.is_day ? 'day' : 'night';
    // 零下的大晴天也算雪景
    if (realWeather === 'day' && realTemp <= 0) realWeather = 'snow';
    // 温度小标签
    const t = document.getElementById('tempTag');
    if (t) t.textContent = Math.round(realTemp) + '°C';
    // 如果正在外面玩，天气实时同步
    if (outMode) { weather = realWeather; applyWeather(); }
  } catch (e) { /* 没网就保持手动天气 */ }
}
fetchRealWeather();
setInterval(fetchRealWeather, 30 * 60 * 1000);
// 按气温推荐每日穿搭
function outfitAdvice() {
  if (realTemp == null) return '';
  let rec;
  if (realTemp < 5) rec = '粉粉/薰衣草羽绒服，冷冷的要穿厚厚 🧥';
  else if (realTemp < 12) rec = '星星卫衣或恐龙连体衣 🌟';
  else if (realTemp < 20) rec = '洛丽塔小裙子正合适 👗';
  else rec = '轻薄的碎花小裙子，凉快又可爱 🌸';
  return `现在${Math.round(realTemp)}°C，今日穿搭推荐：${rec}`;
}
function applyWeather() {
  sceneBg.src = `assets/parts/scenes/${weather}.png`;
  scene.classList.toggle('rain', weather === 'rain');
  scene.classList.toggle('snow', weather === 'snow');
  scene.classList.toggle('wind', weather === 'wind');
  stage.classList.toggle('windy', weather === 'wind');
  scene.classList.toggle('sunset', false);
  const wb = document.getElementById('weatherBtn');
  if (wb) wb.textContent = WEATHER_ICON[weather];
}
document.getElementById('hatBtn').onclick = () => {
  const on = pet.classList.toggle('hasHat');
  say(on ? '戴上猫耳小帽，羊角也暖暖 🧶' : '把帽子摘下来啦');
};
document.getElementById('weatherBtn').onclick = () => {
  weather = WEATHERS[(WEATHERS.indexOf(weather) + 1) % WEATHERS.length];
  applyWeather();
  say(WEATHER_WORD[weather]);
};
function enterOut() {
  if (sleeping || bathMode) return;
  outMode = true;
  open = false;
  clearTimeout(closeTimer);
  applySize();
  setMouseEvents(true);
  // 优先用真实天气；没网时穿厚衣服下雪、否则晴天
  weather = realWeather || (isWarmOutfit() ? 'snow' : 'day');
  applyWeather();
  say(WEATHER_WORD[weather]);
  // 稍后播报今日穿搭推荐
  setTimeout(() => { const adv = outfitAdvice(); if (adv && outMode) say(adv); }, 4000);
  clearTimeout(sunsetTimer);
  sunsetTimer = setTimeout(() => {
    if (weather === 'day') { scene.classList.add('sunset'); say('夕阳好美呀~ 🌇'); }
  }, 6000);
}
// 点草地任意位置，小羊走过去（雨伞跟着）
scene.addEventListener('click', e => {
  if (!outMode) return;
  if (e.target.closest('button')) return;
  const rect = scene.getBoundingClientRect();
  const petW = 96;
  let right = rect.right - e.clientX - petW / 2;
  right = Math.max(2, Math.min(rect.width - petW - 2, right));
  pet.style.right = right + 'px';
  const umb = scene.querySelector('.umbrella');
  if (umb) umb.style.right = (right + 26) + 'px';
  const tea = scene.querySelector('.teacup');
  if (tea) tea.style.right = (right + 10) + 'px';
  pet.classList.add('hop');
  setTimeout(() => pet.classList.remove('hop'), 600);
});

function exitOut() {
  outMode = false;
  open = true;
  pet.classList.remove('hasHat');
  pet.style.right = '';
  const umb = scene.querySelector('.umbrella');
  if (umb) umb.style.right = '';
  clearTimeout(sunsetTimer);
  scene.classList.remove('sunset');
  stage.classList.remove('windy');
  applySize();
  say('玩累啦，回家~');
  keepOpen();
}

// —— 撸小羊：鼠标在她身上滑动会蹭蹭、冒爱心 ——
pet.addEventListener('mousemove', e => {
  setMouseEvents(true);
  pet.classList.add('love');
  clearTimeout(pet._loveT);
  pet._loveT = setTimeout(() => pet.classList.remove('love'), 500);
  const now = Date.now();
  if (now - lastHeart > 260) {
    lastHeart = now;
    spawnHeart(e.clientX, e.clientY);
  }
  if (open) keepOpen();
});

pet.addEventListener('mouseleave', () => { if (!open) setMouseEvents(false); });

// 透明区域点击穿透：只有在小羊/面板上才拦截鼠标
document.addEventListener('mousemove', e => {
  const hit = (el, pad = 6) => {
    const r = el.getBoundingClientRect();
    return e.clientX >= r.left - pad && e.clientX <= r.right + pad &&
           e.clientY >= r.top - pad && e.clientY <= r.bottom + pad;
  };
  setMouseEvents(hit(pet) || (open && hit(panel, 4)) || (outMode && hit(scene, 4)) || (bathMode && hit(bathEl, 4)));
});
document.addEventListener('mouseleave', () => { if (!open) setMouseEvents(false); });
panel.addEventListener('mousemove', keepOpen);

// —— 功能按钮 ——
document.getElementById('feed').onclick = () => {
  state.lastFed = Date.now();
  state.moodBoostUntil = Date.now() + 6e4;
  save(); refreshStatus();
  pet.classList.remove('hungry', 'sulky');
  pet.classList.add('hop');
  setTimeout(() => pet.classList.remove('hop'), 600);
  const r = pet.getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    setTimeout(() => spawnHeart(r.left + r.width / 2 + (Math.random() * 30 - 15), r.top + r.height / 2), i * 110);
  }
  say('吃到苹果啦，好满足 🍎😋'); keepOpen();
};
document.getElementById('rub').onclick = () => {
  state.moodBoostUntil = Date.now() + 4.5e4; save();
  pet.classList.add('love');
  setTimeout(() => pet.classList.remove('love'), 600);
  const r = pet.getBoundingClientRect();
  for (let i = 0; i < 4; i++) {
    setTimeout(() => spawnHeart(r.left + r.width / 2 + (Math.random() * 26 - 13), r.top + r.height / 2), i * 130);
  }
  say('蹭蹭~ 最喜欢你了 💗'); keepOpen();
};
document.getElementById('bathBtn').onclick = runBath;
function runBath() {
  if (sleeping || outMode) return;
  bathMode = true; open = false;
  clearTimeout(closeTimer);
  applySize();
  setMouseEvents(true);
  // 洗澡流程：先脱衣回归基础形态，洗完再穿回
  petImg.src = 'outfits/01-bib.png';
  const steps = [
    ['bstrip', '把漂亮衣服脱下来~ 👕'],
    ['bshower', '冲冲水，淋浴喷头 🚿'],
    ['bbubble', '搓泡泡，泡泡浴 🫧🦆'],
    ['bshake', '甩甩甩，甩掉水珠 💦'],
    ['bdry', '吹风机呼呼吹干 💨'],
  ];
  let i = 0;
  const next = () => {
    steps.forEach(s => stage.classList.remove(s[0]));
    if (i < steps.length) {
      stage.classList.add(steps[i][0]);
      say(steps[i][1]);
      i++;
      setTimeout(next, i === 2 ? 2600 : 1900);
    } else {
      state.lastBath = Date.now();
      state.fluffyUntil = Date.now() + 2 * 3.6e6;
      save();
      bathMode = false; open = true;
      applyOutfit(); // 穿回原来的衣服
      applySize();
      refreshStatus();
      say('穿回漂亮衣服，香喷喷~ ✨🌸');
      keepOpen();
    }
  };
  next();
}
document.getElementById('sleepBtn').onclick = runSleep;
function runSleep() {
  if (sleeping) return;
  clearTimeout(closeTimer);
  pet.classList.add('yawn');
  say('好困呀，打个哈欠~ 🥱');
  setTimeout(() => {
    pet.classList.remove('yawn', 'tired', 'hungry', 'sulky');
    sleeping = true;
    applySize();
    setMouseEvents(true);
    say('睡着咯，晚安~ 💤');
    const sleepFor = 9000 + Math.random() * 3000;
    setTimeout(() => {
      pet.classList.add('wake');
      state.lastSleep = Date.now();
      state.moodBoostUntil = Date.now() + 6e4;
      save();
      sleeping = false;
      applySize();
      refreshStatus();
      say('睡醒啦，伸个懒腰~ 😊');
      setTimeout(() => pet.classList.remove('wake'), 1100);
      keepOpen();
    }, sleepFor);
  }, 1000);
}
document.getElementById('out').onclick = enterOut;
document.getElementById('homeBtn').onclick = exitOut;
document.getElementById('dress').onclick = () => {
  if (!outfits.length) { say('衣柜还是空的，先放几件衣服呀'); keepOpen(); return; }
  state.outfitIdx = (state.outfitIdx + 1) % outfits.length;
  save(); applyOutfit();
  say(currentOutfit().name); keepOpen();
};
document.getElementById('quitBtn').onclick = () => window.petAPI?.quit?.();

// —— 读取衣柜 ——
async function loadWardrobe() {
  let files = [];
  try { files = (await window.petAPI?.listOutfits?.()) || []; } catch (e) {}
  outfits = files.map(f => ({ file: f, name: NAMES[f] || f.replace(/\.[^.]+$/, '') }));
  if (state.outfitIdx >= outfits.length) state.outfitIdx = 0;
  applyOutfit();
}

// 每 20 秒刷新一次状态（安静地，不弹提示）
setInterval(refreshStatus, 20000);

// 待机随机小动作：歪头/晃动/打哈欠（不打扰，仅在非特殊状态时）
setInterval(() => {
  if (outMode || bathMode || sleeping || pet.classList.contains('hungry')) return;
  const r = Math.random();
  if (r < 0.4) { pet.classList.add('idleTilt'); setTimeout(() => pet.classList.remove('idleTilt'), 1400); }
  else if (r < 0.7) { pet.classList.add('idleWiggle'); setTimeout(() => pet.classList.remove('idleWiggle'), 1000); }
  else if (energyPct() < 40) { pet.classList.add('yawn'); setTimeout(() => pet.classList.remove('yawn'), 1000); }
}, 14000);

// —— 自己散步：平时沿屏幕底边慢慢溜达，偶尔停下打盹 ——
let strolling = false;
function stroll() {
  if (open || outMode || bathMode || sleeping || strolling) return;
  strolling = true;
  const dir = Math.random() < 0.5 ? -1 : 1;
  const total = 60 + Math.random() * 140;
  let moved = 0;
  pet.classList.add('walking');
  pet.classList.toggle('faceLeft', dir < 0);
  const iv = setInterval(() => {
    if (open || outMode || bathMode || sleeping) { stopStroll(iv); return; }
    window.petAPI?.moveBy?.({ dx: dir * 3, dy: 0 });
    moved += 3;
    if (moved >= total) stopStroll(iv);
  }, 45);
}
function stopStroll(iv) {
  clearInterval(iv);
  pet.classList.remove('walking', 'faceLeft');
  strolling = false;
}
function doze() {
  if (open || outMode || bathMode || sleeping || strolling) return;
  pet.classList.add('doze');
  setTimeout(() => pet.classList.remove('doze'), 7000 + Math.random() * 5000);
}
setInterval(() => {
  const r = Math.random();
  if (r < 0.5) stroll();
  else if (r < 0.7) doze();
}, 30000);

// 初始化
applySize();
loadWardrobe().then(refreshStatus);
