'use strict';
/* אימונים: תוכניות, אימון פעיל עם טיימר, היסטוריה והתקדמות */
const Gym = (() => {
  const MUSCLES = ['חזה', 'גב', 'רגליים', 'כתפיים', 'ידיים', 'בטן', 'אחר'];
  const D = () => Store.d;
  const S = () => App.state;
  const WS = () => D().settings.weekStart;
  const exById = id => D().exercises.find(e => e.id === id);
  const exName = id => (exById(id) || { name: 'תרגיל שנמחק' }).name;
  const sessionsDesc = () => [...D().sessions].sort((a, b) => b.start - a.start);
  const e1rm = (w, r) => r <= 1 ? w : w * (1 + r / 30);
  const volOf = ses => ses.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + s.w * s.r, 0), 0);
  const setsOf = ses => ses.exercises.reduce((a, e) => a + e.sets.length, 0);
  const dur = ses => Math.round((ses.end - ses.start) / 1000);
  const fmtSet = s => `${U.fmtNum(s.w)}×${s.r}`;

  function lastSets(exId) {
    for (const ses of sessionsDesc()) {
      const e = ses.exercises.find(x => x.exId === exId);
      if (e && e.sets.length) return e.sets;
    }
    return null;
  }
  function history(exId) {
    return [...D().sessions].sort((a, b) => a.start - b.start).map(ses => {
      const e = ses.exercises.find(x => x.exId === exId);
      if (!e || !e.sets.length) return null;
      return {
        ses, sets: e.sets,
        maxW: Math.max(...e.sets.map(s => s.w)),
        e1rm: Math.max(...e.sets.map(s => e1rm(s.w, s.r))),
        vol: e.sets.reduce((a, s) => a + s.w * s.r, 0),
      };
    }).filter(Boolean);
  }

  /* ---------- גרפים ---------- */
  function lineChart(pts, color, unit = '') {
    if (pts.length < 2) return `<p class="muted small center chart-empty">אחרי שני אימונים לפחות יופיע כאן גרף ההתקדמות</p>`;
    const W = 340, H = 170, pl = 40, pr = 12, pt = 14, pb = 26;
    const ys = pts.map(p => p.y);
    let mn = Math.min(...ys), mx = Math.max(...ys);
    if (mn === mx) { mn -= 1; mx += 1; }
    const pad = (mx - mn) * 0.12; mn -= pad; mx += pad;
    const x = i => pl + i * (W - pl - pr) / (pts.length - 1);
    const y = v => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
    const area = `${line}L${x(pts.length - 1).toFixed(1)},${H - pb}L${pl},${H - pb}Z`;
    let grid = '';
    for (let k = 0; k <= 3; k++) {
      const v = mn + (mx - mn) * k / 3, yy = y(v);
      grid += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" class="grid"/><text x="${pl - 6}" y="${yy + 4}" text-anchor="end" class="axis">${U.fmtNum(v)}</text>`;
    }
    const idx = [...new Set([0, Math.floor((pts.length - 1) / 2), pts.length - 1])];
    const xl = idx.map(i => `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" class="axis">${pts[i].label}</text>`).join('');
    const dots = pts.length <= 30 ? pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.y)}" r="3" fill="${color}"/>`).join('') : '';
    const gid = 'g' + Math.random().toString(36).slice(2, 7);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" dir="ltr" role="img" aria-label="גרף התקדמות ${unit}">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      ${grid}<path d="${area}" fill="url(#${gid})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}${xl}</svg>`;
  }
  function barChart(vals, labels, color) {
    const W = 340, H = 140, pl = 8, pr = 8, pt = 16, pb = 24;
    const mx = Math.max(1, ...vals);
    const bw = (W - pl - pr) / vals.length;
    const bars = vals.map((v, i) => {
      const h = (H - pt - pb) * v / mx, xx = pl + i * bw + bw * 0.18, ww = bw * 0.64;
      return `<rect x="${xx}" y="${H - pb - h}" width="${ww}" height="${Math.max(h, v ? 2 : 0)}" rx="4" fill="${color}" opacity="${i === vals.length - 1 ? 1 : .55}"/>
        ${v ? `<text x="${xx + ww / 2}" y="${H - pb - h - 4}" text-anchor="middle" class="axis">${v}</text>` : ''}
        ${labels[i] ? `<text x="${xx + ww / 2}" y="${H - 6}" text-anchor="middle" class="axis">${labels[i]}</text>` : ''}`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" dir="ltr" role="img" aria-label="אימונים בשבוע"><line x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}" class="grid"/>${bars}</svg>`;
  }

  /* ---------- מסך ראשי ---------- */
  function render() {
    const seg = S().gymSeg;
    const head = `<div class="page-head"><div><div class="eyebrow">חדר כושר</div><h1>אימונים</h1></div>
      <div class="head-btns"><button class="icon-btn" data-act="settings" aria-label="הגדרות">${App.ICON.gear}</button>
      <button class="icon-btn accent" data-act="rt-new" aria-label="תוכנית חדשה">${App.ICON.plus}</button></div></div>
      <div class="seg main-seg">
        <button class="${seg === 'plans' ? 'on' : ''}" data-act="gym-seg" data-v="plans">תוכניות</button>
        <button class="${seg === 'history' ? 'on' : ''}" data-act="gym-seg" data-v="history">היסטוריה</button>
        <button class="${seg === 'progress' ? 'on' : ''}" data-act="gym-seg" data-v="progress">התקדמות</button>
      </div>`;
    if (seg === 'history') return head + renderHistory();
    if (seg === 'progress') return head + renderProgress();
    return head + renderPlans();
  }

  function weekStreak() {
    const t = U.today();
    let w = U.weekStart(t, WS()), n = 0;
    const has = ws => D().sessions.some(s => { const d = new Date(s.start); return d >= ws && d < U.addDays(ws, 7); });
    if (has(w)) n++;
    w = U.addDays(w, -7);
    while (has(w)) { n++; w = U.addDays(w, -7); }
    return n;
  }

  function renderPlans() {
    const t = U.today();
    const todayR = D().routines.filter(r => r.days.includes(t.getDay()));
    const a = D().active;
    let hero;
    if (a) {
      hero = `<div class="hero-card"><div><span class="eyebrow light">אימון בתהליך</span><h2>${U.esc(a.name)}</h2><span class="hero-time" data-live="elapsed">${U.fmtTimer((Date.now() - a.start) / 1000)}</span></div>
        <button class="btn btn-white" data-act="wk-open">חזור לאימון</button></div>`;
    } else if (todayR.length) {
      hero = todayR.map(r => `<div class="hero-card"><div><span class="eyebrow light">האימון של היום · יום ${U.DAYS[t.getDay()]}</span><h2>${U.esc(r.name)}</h2>
        <span class="hero-sub">${r.items.length} תרגילים · ${r.items.reduce((s, i) => s + (+i.sets || 0), 0)} סטים</span></div>
        <button class="btn btn-white" data-act="wk-start" data-id="${r.id}">${App.ICON.play} התחל</button></div>`).join('');
    } else {
      hero = `<div class="hero-card soft"><div><span class="eyebrow">יום ${U.DAYS[t.getDay()]}</span><h2>אין אימון מתוכנן להיום</h2>
        <span class="hero-sub">אפשר להתחיל אימון חופשי או מתוכנית אחרת</span></div>
        <button class="btn btn-primary" data-act="wk-start" data-id="">${App.ICON.play} אימון חופשי</button></div>`;
    }

    const ws = U.weekStart(t, WS());
    const thisWeek = D().sessions.filter(s => new Date(s.start) >= ws).length;
    const last90 = D().sessions.filter(s => s.start >= +U.addDays(t, -89)).length;
    const stats = `<div class="stat-grid three">
      <div class="stat"><b>${thisWeek}</b><span>אימונים השבוע</span></div>
      <div class="stat"><b>🔥 ${weekStreak()}</b><span>שבועות ברצף</span></div>
      <div class="stat"><b>${last90}</b><span>ב-90 יום</span></div></div>`;

    // מפת 90 ימים
    const start = U.addDays(U.weekStart(t, WS()), -12 * 7);
    const perDay = {};
    for (const s of D().sessions) { const k = U.dkey(new Date(s.start)); perDay[k] = (perDay[k] || 0) + 1; }
    let cells = '';
    for (let i = 0; i < 91; i++) {
      const d = U.addDays(start, i), k = U.dkey(d), n = perDay[k] || 0;
      cells += `<i class="hm l${Math.min(n, 2)} ${d > t ? 'fut' : ''} ${U.sameDay(d, t) ? 'now' : ''}" title="${U.fmtDM(d)}"></i>`;
    }
    const heat = `<div class="card"><div class="row-between"><b>90 הימים האחרונים</b><span class="muted small">${last90} אימונים</span></div>
      <div class="heatmap">${cells}</div></div>`;

    // לוח שבועי
    const order = [0, 1, 2, 3, 4, 5, 6].map(i => (WS() + i) % 7);
    const week = `<div class="card"><b>השבוע שלי</b><div class="week-plan">${order.map(d => {
      const rs = D().routines.filter(r => r.days.includes(d));
      return `<div class="wp-day ${d === t.getDay() ? 'today' : ''}"><span>${U.DAYS_SHORT[d]}</span><b>${rs.length ? rs.map(r => U.esc(r.name)).join(' + ') : '<em>מנוחה</em>'}</b></div>`;
    }).join('')}</div></div>`;

    const list = D().routines.length ? D().routines.map(r => `<div class="routine-card">
        <button class="rc-main" data-act="rt-edit" data-id="${r.id}">
          <b>${U.esc(r.name)}</b>
          <span class="rc-days">${r.days.length ? [...r.days].sort((x, y) => ((x - WS() + 7) % 7) - ((y - WS() + 7) % 7)).map(d => `<i>${U.DAYS_SHORT[d]}</i>`).join('') : '<em>ללא יום קבוע</em>'}</span>
          <span class="muted small">${r.items.map(i => U.esc(exName(i.exId))).join(' · ') || 'אין תרגילים עדיין'}</span>
        </button>
        <button class="play-btn" data-act="wk-start" data-id="${r.id}" aria-label="התחל ${U.esc(r.name)}">${App.ICON.play}</button>
      </div>`).join('')
      : `<div class="empty small-empty"><div class="empty-emoji">🏋️</div><p>עדיין אין תוכניות. צור תוכנית לכל יום אימון — למשל "חזה וידיים" לימי ראשון ורביעי.</p></div>`;

    return hero + stats + heat + week + `<div class="row-between section-row"><h3 class="section-title">התוכניות שלי</h3><button class="text-btn strong" data-act="rt-new">+ תוכנית חדשה</button></div>` + list;
  }

  function renderHistory() {
    const list = sessionsDesc();
    if (!list.length) return `<div class="empty"><div class="empty-emoji">📋</div><h2>עדיין אין אימונים</h2><p>כל אימון שתסיים יופיע כאן עם הזמן, הנפח והסטים.</p></div>`;
    let out = '', lastM = '';
    for (const s of list) {
      const d = new Date(s.start);
      const m = `${U.MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (m !== lastM) { out += `<h3 class="section-title">${m}</h3>`; lastM = m; }
      out += `<button class="history-card" data-act="ses-open" data-id="${s.id}">
        <div class="hc-date"><b>${d.getDate()}</b><span>${U.DAYS_SHORT[d.getDay()]}</span></div>
        <div class="hc-main"><b>${U.esc(s.name)}</b>
          <span class="hc-meta">⏱ ${U.fmtDur(dur(s))} · 🏋️ ${U.fmtNum(volOf(s))} ק״ג · ${setsOf(s)} סטים</span>
          <span class="muted small">${s.exercises.map(e => `${e.sets.length}× ${U.esc(exName(e.exId))}`).join(' · ')}</span></div>
      </button>`;
    }
    return out;
  }

  function renderProgress() {
    const ses = D().sessions;
    if (!ses.length) return `<div class="empty"><div class="empty-emoji">📈</div><h2>אין עדיין נתונים</h2><p>אחרי כמה אימונים תראה כאן גרפים של שיפור בכל תרגיל.</p></div>`;
    const t = U.today();
    const ws = U.weekStart(t, WS());
    const vals = [], labels = [];
    for (let i = 11; i >= 0; i--) {
      const a = U.addDays(ws, -7 * i), b = U.addDays(a, 7);
      vals.push(ses.filter(s => s.start >= +a && s.start < +b).length);
      labels.push(i % 3 === 0 ? U.fmtDM(a) : '');
    }
    const totalSec = ses.reduce((a, s) => a + dur(s), 0);
    const month = ses.filter(s => s.start >= +U.monthStart(t));
    const overview = `<div class="stat-grid three">
      <div class="stat"><b>${ses.length}</b><span>סה״כ אימונים</span></div>
      <div class="stat"><b>${U.fmtDur(totalSec / ses.length)}</b><span>זמן ממוצע</span></div>
      <div class="stat"><b>${U.fmtNum(month.reduce((a, s) => a + volOf(s), 0) / 1000)}</b><span>טון החודש</span></div></div>
      <div class="card"><b>אימונים בשבוע</b>${barChart(vals, labels, 'var(--accent)')}</div>`;

    const counts = {};
    for (const s of ses) for (const e of s.exercises) counts[e.exId] = (counts[e.exId] || 0) + 1;
    const exIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    if (!S().progEx || !counts[S().progEx]) S().progEx = exIds[0];
    const id = S().progEx;
    const h = history(id);
    const metric = S().progMetric;
    const pts = h.map(x => ({ label: U.fmtDM(new Date(x.ses.start)), y: metric === 'vol' ? x.vol : metric === '1rm' ? x.e1rm : x.maxW }));
    const best = h.reduce((a, x) => ({ w: Math.max(a.w, x.maxW), r: Math.max(a.r, x.e1rm), v: Math.max(a.v, x.vol) }), { w: 0, r: 0, v: 0 });
    const first = h[0], last = h[h.length - 1];
    const diff = h.length > 1 ? last.maxW - first.maxW : 0;

    const ex = `<div class="card">
      <label class="field compact"><span>תרגיל</span>
        <select data-change="prog-ex">${exIds.map(e => `<option value="${e}" ${e === id ? 'selected' : ''}>${U.esc(exName(e))} (${counts[e]})</option>`).join('')}</select></label>
      <div class="seg small-seg">
        <button class="${metric === 'max' ? 'on' : ''}" data-act="prog-metric" data-v="max">משקל מקסימלי</button>
        <button class="${metric === '1rm' ? 'on' : ''}" data-act="prog-metric" data-v="1rm">1RM משוער</button>
        <button class="${metric === 'vol' ? 'on' : ''}" data-act="prog-metric" data-v="vol">נפח</button>
      </div>
      ${lineChart(pts, 'var(--accent)', 'ק״ג')}
      ${h.length > 1 ? `<p class="trend ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${diff > 0 ? '▲' : diff < 0 ? '▼' : '●'} ${diff > 0 ? '+' : ''}${U.fmtNum(diff)} ק״ג במשקל המקסימלי מאז האימון הראשון</p>` : ''}
    </div>
    <div class="stat-grid">
      <div class="stat"><b>${U.fmtNum(best.w)}</b><span>🏆 שיא משקל (ק״ג)</span></div>
      <div class="stat"><b>${U.fmtNum(best.r)}</b><span>1RM משוער (ק״ג)</span></div>
      <div class="stat"><b>${U.fmtNum(best.v)}</b><span>נפח שיא באימון</span></div>
      <div class="stat"><b>${h.length}</b><span>פעמים בוצע</span></div>
    </div>
    <h3 class="section-title">אחרונים</h3>
    <div class="card list-card">${h.slice(-6).reverse().map(x => `<div class="mini-row"><span>${U.fmtDateShort(new Date(x.ses.start))}</span><b dir="ltr">${x.sets.map(fmtSet).join('  ')}</b></div>`).join('')}</div>`;
    return overview + ex;
  }

  /* ---------- אימון פעיל ---------- */
  let wakeLock = null, audio = null;
  async function lockScreen() {
    try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => wakeLock = null); } } catch (e) {}
  }
  function unlockScreen() { try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; }
  function ensureAudio() {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) {}
  }
  function beep() {
    if (!D().settings.sound || !audio) return;
    try {
      [0, 0.28, 0.56].forEach(t => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
        const s = audio.currentTime + t;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.35, s + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 0.2);
        o.start(s); o.stop(s + 0.22);
      });
    } catch (e) {}
  }

  function buildExercise(exId, plan) {
    const last = lastSets(exId);
    const n = plan ? Math.max(1, +plan.sets || 1) : (last ? last.length : 3);
    const sets = [];
    for (let j = 0; j < n; j++) {
      const l = last && (last[j] || last[last.length - 1]);
      const prev = last && last[j];
      let w = l ? l.w : '';
      if (plan && plan.weight !== '' && plan.weight != null && !l) w = plan.weight;
      const r = plan && plan.reps ? plan.reps : (l ? l.r : '');
      sets.push({ w: w === '' ? '' : String(w), r: r === '' ? '' : String(r), done: false, pw: prev ? prev.w : null, pr: prev ? prev.r : null });
    }
    return { key: U.uid(), exId, sets };
  }

  async function start(src) {
    if (D().active) {
      const ok = await App.confirm('יש אימון פעיל. לחזור אליו?', 'חזור לאימון');
      if (ok) openOverlay();
      return;
    }
    let a;
    if (src && src.routineId) {
      const r = D().routines.find(x => x.id === src.routineId);
      if (!r) return;
      a = { id: U.uid(), name: r.name, routineId: r.id, start: Date.now(), exercises: r.items.map(i => buildExercise(i.exId, i)) };
    } else if (src && src.sessionId) {
      const s = D().sessions.find(x => x.id === src.sessionId);
      a = { id: U.uid(), name: s.name, routineId: s.routineId || null, start: Date.now(), exercises: s.exercises.map(e => buildExercise(e.exId, null)) };
    } else {
      a = { id: U.uid(), name: 'אימון חופשי', routineId: null, start: Date.now(), exercises: [] };
    }
    a.restEnd = null; a.restTotal = 0;
    D().active = a;
    Store.save();
    ensureAudio();
    Sheet.closeAll();
    openOverlay();
    App.render();
  }

  function overlay() { return document.getElementById('workout'); }
  function openOverlay() {
    const el = overlay();
    renderWorkout();
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
    document.body.classList.add('noscroll');
    lockScreen();
    App.renderMini();
  }
  function closeOverlay() {
    const el = overlay();
    el.classList.remove('show');
    setTimeout(() => { if (!el.classList.contains('show')) el.hidden = true; }, 300);
    document.body.classList.remove('noscroll');
    App.renderMini();
  }
  const overlayOpen = () => !overlay().hidden && overlay().classList.contains('show');

  function renderWorkout() {
    const a = D().active, el = overlay();
    if (!a) { el.innerHTML = ''; return; }
    const body = el.querySelector('.wk-body');
    const st = body ? body.scrollTop : 0;
    const exs = a.exercises.map((e, i) => {
      const doneN = e.sets.filter(s => s.done).length;
      return `<div class="wk-ex">
        <div class="wk-ex-head"><button class="wk-ex-name" data-act="wk-ex-menu" data-i="${i}">${U.esc(exName(e.exId))}</button>
          <span class="muted small">${doneN}/${e.sets.length}</span>
          <button class="icon-btn sm" data-act="wk-ex-menu" data-i="${i}" aria-label="אפשרויות">${App.ICON.dots}</button></div>
        <div class="wk-row wk-hrow"><span>סט</span><span>קודם</span><span>ק״ג</span><span>חזרות</span><span></span></div>
        ${e.sets.map((s, j) => `<div class="wk-row ${s.done ? 'done' : ''}">
          <span class="setno">${j + 1}</span>
          <span class="prev" dir="ltr">${s.pw != null ? fmtSet({ w: s.pw, r: s.pr }) : '—'}</span>
          <input data-in="w" data-i="${i}" data-j="${j}" inputmode="decimal" enterkeyhint="next" dir="ltr" value="${U.esc(s.w)}" placeholder="${s.pw != null ? U.fmtNum(s.pw) : '0'}" aria-label="משקל סט ${j + 1}">
          <input data-in="r" data-i="${i}" data-j="${j}" inputmode="numeric" enterkeyhint="done" dir="ltr" value="${U.esc(s.r)}" placeholder="${s.pr != null ? s.pr : '0'}" aria-label="חזרות סט ${j + 1}">
          <button class="set-check" data-act="wk-set-done" data-i="${i}" data-j="${j}" aria-label="סמן סט ${j + 1}">${App.ICON.check}</button>
        </div>`).join('')}
        <button class="add-set" data-act="wk-add-set" data-i="${i}">+ הוסף סט</button>
      </div>`;
    }).join('');
    const totalDone = a.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
    el.innerHTML = `<div class="wk-head">
        <button class="icon-btn" data-act="wk-min" aria-label="מזער">${App.ICON.down}</button>
        <div class="wk-title"><input class="wk-name-in" data-in="name" value="${U.esc(a.name)}" aria-label="שם האימון"><div class="wk-timer" data-live="elapsed">${U.fmtTimer((Date.now() - a.start) / 1000)}</div></div>
        <button class="btn btn-good sm" data-act="wk-finish">סיום</button>
      </div>
      <div class="wk-body">
        <div class="wk-meta"><span>${U.fmtDate(new Date(a.start))}</span><span>${totalDone} סטים הושלמו</span></div>
        ${exs || '<div class="empty small-empty"><p>הוסף תרגילים לאימון כדי להתחיל לתעד סטים</p></div>'}
        <button class="btn btn-soft wide" data-act="wk-add-ex">+ הוסף תרגיל</button>
        <button class="btn btn-ghost danger-text wide" data-act="wk-cancel">בטל אימון</button>
        <div class="wk-spacer"></div>
      </div>
      <div class="rest-bar" id="rest-bar" ${a.restEnd ? '' : 'hidden'}>
        <div class="rest-prog"><i id="rest-fill"></i></div>
        <div class="rest-row">
          <button class="rest-btn" data-act="rest-adj" data-d="-15">−15</button>
          <div class="rest-mid"><small>מנוחה</small><b id="rest-time">00:00</b></div>
          <button class="rest-btn" data-act="rest-adj" data-d="15">+15</button>
          <button class="rest-btn skip" data-act="rest-skip">דלג</button>
        </div>
      </div>`;
    const nb = el.querySelector('.wk-body');
    if (nb) nb.scrollTop = st;
    tick();
  }

  function tick() {
    const a = D().active;
    if (!a) return;
    const el = (Date.now() - a.start) / 1000;
    document.querySelectorAll('[data-live="elapsed"]').forEach(n => n.textContent = U.fmtTimer(el));
    const bar = document.getElementById('rest-bar');
    if (a.restEnd) {
      const rem = (a.restEnd - Date.now()) / 1000;
      if (rem <= 0) {
        a.restEnd = null; Store.save();
        if (bar) bar.hidden = true;
        beep(); App.haptic(200);
        if (overlayOpen()) App.toast('המנוחה נגמרה — לסט הבא! 💪');
      } else if (bar) {
        bar.hidden = false;
        document.getElementById('rest-time').textContent = U.fmtTimer(Math.ceil(rem));
        document.getElementById('rest-fill').style.width = `${Math.max(0, Math.min(100, 100 * rem / (a.restTotal || 1)))}%`;
      }
    } else if (bar) bar.hidden = true;
  }

  function startRest(sec) {
    const a = D().active;
    sec = sec || D().settings.rest;
    if (!sec) return;
    a.restEnd = Date.now() + sec * 1000;
    a.restTotal = sec;
  }

  async function finish() {
    const a = D().active;
    const exs = a.exercises.map(e => ({
      exId: e.exId,
      sets: e.sets.filter(s => s.done).map(s => ({ w: U.num(s.w), r: Math.round(U.num(s.r)) })).filter(s => s.r > 0),
    })).filter(e => e.sets.length);
    if (!exs.length) {
      const ok = await App.confirm('לא סימנת אף סט כבוצע. לסגור את האימון בלי לשמור?', 'סגור בלי לשמור', true);
      if (!ok) return;
      D().active = null; Store.save(); unlockScreen(); closeOverlay(); App.refresh();
      return;
    }
    const undone = a.exercises.reduce((n, e) => n + e.sets.filter(s => !s.done).length, 0);
    if (undone) {
      const ok = await App.confirm(`${undone === 1 ? 'סט אחד לא סומן' : undone + ' סטים לא סומנו'} כבוצעים ולא יישמרו. לסיים את האימון?`, 'סיים אימון');
      if (!ok) return;
    }
    const prs = [];
    for (const e of exs) {
      const prev = history(e.exId);
      const prevMax = prev.length ? Math.max(...prev.map(x => x.maxW)) : 0;
      const cur = Math.max(...e.sets.map(s => s.w));
      if (prev.length && cur > prevMax) prs.push({ name: exName(e.exId), w: cur, prev: prevMax });
    }
    const ses = { id: U.uid(), name: (a.name || '').trim() || 'אימון', routineId: a.routineId, start: a.start, end: Date.now(), exercises: exs };
    D().sessions.push(ses);
    D().active = null;
    Store.save();
    unlockScreen();
    closeOverlay();
    App.refresh();
    Sheet.open(() => `<div class="done-hero"><div class="big-emoji">🎉</div><h2>אימון הושלם!</h2><p class="muted">${U.esc(ses.name)}</p></div>
      <div class="stat-grid">
        <div class="stat"><b>${U.fmtTimer(dur(ses))}</b><span>משך</span></div>
        <div class="stat"><b>${U.fmtNum(volOf(ses))}</b><span>נפח (ק״ג)</span></div>
        <div class="stat"><b>${setsOf(ses)}</b><span>סטים</span></div>
        <div class="stat"><b>${ses.exercises.length}</b><span>תרגילים</span></div>
      </div>
      ${prs.length ? `<h3 class="section-title">🏆 שיאים חדשים</h3><div class="card list-card">${prs.map(p => `<div class="mini-row"><span>${U.esc(p.name)}</span><b>${U.fmtNum(p.w)} ק״ג <small class="good">(+${U.fmtNum(p.w - p.prev)})</small></b></div>`).join('')}</div>` : ''}
      <button class="btn btn-primary wide" data-act="sheet-close">מעולה</button>`, { static: true });
  }

  /* ---------- בוחר תרגילים ---------- */
  let picker = null;
  function openPicker(cb, title = 'הוסף תרגילים') {
    picker = { cb, q: '', sel: [], creating: false, newName: '', newMuscle: MUSCLES[0], title };
    Sheet.open(pickerHtml, {
      static: true, tall: true,
      onMount(el) {
        const q = el.querySelector('#pk-q');
        q && q.addEventListener('input', e => { picker.q = e.target.value; el.querySelector('#pk-list').innerHTML = pickerList(); });
        const nn = el.querySelector('#pk-new');
        nn && nn.addEventListener('input', e => picker.newName = e.target.value);
      },
    });
  }
  function pickerList() {
    const q = picker.q.trim();
    const list = D().exercises.filter(e => !q || e.name.includes(q) || (e.muscle || '').includes(q));
    if (!list.length) return `<p class="muted center">לא נמצא תרגיל. אפשר ליצור חדש למעלה.</p>`;
    let out = '';
    for (const m of MUSCLES) {
      const g = list.filter(e => (e.muscle || 'אחר') === m);
      if (!g.length) continue;
      out += `<h4 class="pk-group">${m}</h4>` + g.map(e => {
        const n = picker.sel.filter(x => x === e.id).length;
        return `<button class="pk-item ${n ? 'on' : ''}" data-act="pk-toggle" data-id="${e.id}"><span>${U.esc(e.name)}</span><span class="pk-mark">${n ? App.ICON.check : ''}</span></button>`;
      }).join('');
    }
    return out;
  }
  function pickerHtml() {
    const p = picker;
    return `<div class="sheet-head"><button class="text-btn" data-act="sheet-close">ביטול</button><h2>${p.title}</h2>
        <button class="text-btn strong" data-act="pk-done" ${p.sel.length ? '' : 'disabled'}>הוסף${p.sel.length ? ` (${p.sel.length})` : ''}</button></div>
      <input id="pk-q" class="search" type="search" placeholder="חיפוש תרגיל..." value="${U.esc(p.q)}">
      ${p.creating ? `<div class="card new-ex">
          <input id="pk-new" type="text" maxlength="40" placeholder="שם התרגיל החדש" value="${U.esc(p.newName)}">
          <div class="chips wrap">${MUSCLES.map(m => `<button class="chip ${m === p.newMuscle ? 'on' : ''}" data-act="pk-muscle" data-v="${m}">${m}</button>`).join('')}</div>
          <div class="row-gap"><button class="btn btn-primary sm" data-act="pk-create">צור תרגיל</button><button class="btn btn-ghost sm" data-act="pk-creating">ביטול</button></div>
        </div>` : `<button class="btn btn-soft wide" data-act="pk-creating">+ צור תרגיל חדש</button>`}
      <div id="pk-list">${pickerList()}</div>`;
  }

  /* ---------- טופס תוכנית ---------- */
  let rform = null;
  function openRoutineForm(id) {
    const r = id ? D().routines.find(x => x.id === id) : null;
    rform = r ? JSON.parse(JSON.stringify(r)) : { id: null, name: '', days: [], items: [] };
    Sheet.open(routineHtml, {
      static: true, tall: true,
      onMount(el) {
        el.querySelector('#rf-name').addEventListener('input', e => rform.name = e.target.value);
        el.querySelectorAll('[data-rf]').forEach(inp => inp.addEventListener('input', e => {
          rform.items[+e.target.dataset.i][e.target.dataset.rf] = e.target.value;
        }));
      },
    });
    if (!r) setTimeout(() => document.getElementById('rf-name')?.focus(), 320);
  }
  function routineHtml() {
    const f = rform;
    const order = [0, 1, 2, 3, 4, 5, 6].map(i => (WS() + i) % 7);
    const items = f.items.map((it, i) => `<div class="rf-item">
        <div class="rf-top"><b>${U.esc(exName(it.exId))}</b>
          <span class="rf-btns"><button class="icon-btn sm" data-act="rf-up" data-i="${i}" ${i ? '' : 'disabled'} aria-label="הזז למעלה">${App.ICON.up}</button>
          <button class="icon-btn sm" data-act="rf-del" data-i="${i}" aria-label="הסר">${App.ICON.x}</button></span></div>
        <div class="rf-fields">
          <label><span>סטים</span><input data-rf="sets" data-i="${i}" inputmode="numeric" dir="ltr" value="${U.esc(it.sets)}"></label>
          <label><span>חזרות</span><input data-rf="reps" data-i="${i}" inputmode="numeric" dir="ltr" value="${U.esc(it.reps)}"></label>
          <label><span>משקל (ק״ג)</span><input data-rf="weight" data-i="${i}" inputmode="decimal" dir="ltr" value="${U.esc(it.weight)}" placeholder="אופציונלי"></label>
        </div></div>`).join('');
    return `<div class="sheet-head"><button class="text-btn" data-act="sheet-close">ביטול</button><h2>${f.id ? 'עריכת תוכנית' : 'תוכנית חדשה'}</h2>
        <button class="text-btn strong" data-act="rf-save">שמור</button></div>
      <div class="form">
        <label class="field"><span>שם האימון</span><input id="rf-name" type="text" maxlength="40" placeholder="לדוגמה: חזה וידיים" value="${U.esc(f.name)}"></label>
        <div class="field"><span>באילו ימים</span><div class="day-chips">${order.map(d => `<button class="day-chip ${f.days.includes(d) ? 'on' : ''}" data-act="rf-day" data-v="${d}">${U.DAYS_SHORT[d]}</button>`).join('')}</div></div>
        <div class="field"><span>תרגילים</span>${items || '<p class="muted small">עדיין אין תרגילים</p>'}
          <button class="btn btn-soft wide" data-act="rf-add">+ הוסף תרגילים</button></div>
        ${f.id ? `<button class="btn btn-ghost danger-text wide" data-act="rf-delete">מחק תוכנית</button>` : ''}
      </div>`;
  }

  /* ---------- פרטי אימון מההיסטוריה ---------- */
  function openSession(id) {
    Sheet.open(() => {
      const s = D().sessions.find(x => x.id === id);
      if (!s) return '<p class="muted">האימון נמחק</p>';
      const d = new Date(s.start);
      return `<div class="sheet-head"><h2>${U.esc(s.name)}</h2><button class="icon-btn" data-act="sheet-close" aria-label="סגור">${App.ICON.x}</button></div>
        <p class="muted">${U.fmtDate(d)} · ${U.pad(d.getHours())}:${U.pad(d.getMinutes())}</p>
        <div class="stat-grid three">
          <div class="stat"><b>${U.fmtTimer(dur(s))}</b><span>משך</span></div>
          <div class="stat"><b>${U.fmtNum(volOf(s))}</b><span>נפח (ק״ג)</span></div>
          <div class="stat"><b>${setsOf(s)}</b><span>סטים</span></div></div>
        ${s.exercises.map(e => `<div class="card ses-ex"><b>${U.esc(exName(e.exId))}</b>
          ${e.sets.map((x, j) => `<div class="mini-row"><span>סט ${j + 1}</span><b dir="ltr">${U.fmtNum(x.w)} ק״ג × ${x.r}</b></div>`).join('')}</div>`).join('')}
        <button class="btn btn-primary wide" data-act="ses-repeat" data-id="${s.id}">${App.ICON.play} התחל אימון זהה</button>
        <button class="btn btn-ghost danger-text wide" data-act="ses-delete" data-id="${s.id}">מחק אימון</button>`;
    });
  }

  /* ---------- פעולות ---------- */
  function registerActions(on) {
    on('gym-seg', el => { S().gymSeg = el.dataset.v; App.render(); window.scrollTo(0, 0); });
    on('prog-metric', el => { S().progMetric = el.dataset.v; App.render(); });
    on('rt-new', () => openRoutineForm(null));
    on('rt-edit', el => openRoutineForm(el.dataset.id));
    on('wk-start', el => start(el.dataset.id ? { routineId: el.dataset.id } : null));
    on('wk-open', () => { if (D().active) openOverlay(); });
    on('wk-min', () => { closeOverlay(); App.render(); });
    on('wk-finish', () => finish());
    on('wk-cancel', async () => {
      const ok = await App.confirm('לבטל את האימון? הנתונים שלו לא יישמרו.', 'בטל אימון', true);
      if (!ok) return;
      D().active = null; Store.save(); unlockScreen(); closeOverlay(); App.refresh();
    });
    on('wk-set-done', el => {
      ensureAudio();
      const a = D().active, s = a.exercises[+el.dataset.i].sets[+el.dataset.j];
      if (!s.done) {
        if (s.w === '' && s.pw != null) s.w = String(s.pw);
        if (s.r === '' && s.pr != null) s.r = String(s.pr);
        if (!(U.num(s.r) > 0)) { App.toast('הזן מספר חזרות'); return; }
        s.done = true;
        startRest();
        App.haptic();
      } else s.done = false;
      Store.save();
      renderWorkout();
    });
    on('wk-add-set', el => {
      const e = D().active.exercises[+el.dataset.i];
      const l = e.sets[e.sets.length - 1];
      e.sets.push({ w: l ? l.w : '', r: l ? l.r : '', done: false, pw: null, pr: null });
      Store.save(); renderWorkout();
    });
    on('wk-ex-menu', async el => {
      const a = D().active, i = +el.dataset.i, e = a.exercises[i];
      const choice = await App.menu(exName(e.exId), ['הוסף סט', 'מחק סט אחרון', 'הזז למעלה', 'הזז למטה', 'הסר תרגיל'], 4);
      if (choice === 0) { const l = e.sets[e.sets.length - 1]; e.sets.push({ w: l ? l.w : '', r: l ? l.r : '', done: false, pw: null, pr: null }); }
      if (choice === 1 && e.sets.length) e.sets.pop();
      if (choice === 2 && i > 0) [a.exercises[i - 1], a.exercises[i]] = [a.exercises[i], a.exercises[i - 1]];
      if (choice === 3 && i < a.exercises.length - 1) [a.exercises[i + 1], a.exercises[i]] = [a.exercises[i], a.exercises[i + 1]];
      if (choice === 4) a.exercises.splice(i, 1);
      Store.save(); renderWorkout();
    });
    on('wk-add-ex', () => openPicker(ids => {
      const a = D().active;
      ids.forEach(id => a.exercises.push(buildExercise(id, null)));
      Store.save(); renderWorkout();
      setTimeout(() => { const b = overlay().querySelector('.wk-body'); b && b.scrollTo({ top: b.scrollHeight, behavior: 'smooth' }); }, 50);
    }));
    on('rest-adj', el => {
      const a = D().active; if (!a.restEnd) return;
      a.restEnd += (+el.dataset.d) * 1000;
      a.restTotal = Math.max(1, a.restTotal + (+el.dataset.d));
      Store.save(); tick();
    });
    on('rest-skip', () => { D().active.restEnd = null; Store.save(); tick(); });

    // בוחר
    on('pk-toggle', el => {
      const id = el.dataset.id, i = picker.sel.indexOf(id);
      if (i >= 0) picker.sel.splice(i, 1); else picker.sel.push(id);
      el.classList.toggle('on', i < 0);
      el.querySelector('.pk-mark').innerHTML = i < 0 ? App.ICON.check : '';
      const done = document.querySelector('[data-act="pk-done"]');
      if (done) { done.disabled = !picker.sel.length; done.textContent = picker.sel.length ? `הוסף (${picker.sel.length})` : 'הוסף'; }
    });
    on('pk-done', () => { const ids = [...picker.sel], cb = picker.cb; Sheet.close(); cb(ids); });
    on('pk-creating', () => { picker.creating = !picker.creating; Sheet.top().refresh(); if (picker.creating) setTimeout(() => document.getElementById('pk-new')?.focus(), 50); });
    on('pk-muscle', el => { picker.newMuscle = el.dataset.v; Sheet.top().refresh(); });
    on('pk-create', () => {
      const name = (picker.newName || '').trim();
      if (!name) return App.toast('צריך לתת שם לתרגיל');
      if (D().exercises.some(e => e.name === name)) return App.toast('כבר יש תרגיל בשם הזה');
      const ex = { id: U.uid(), name, muscle: picker.newMuscle };
      D().exercises.push(ex); Store.save();
      picker.sel.push(ex.id); picker.creating = false; picker.newName = ''; picker.q = '';
      Sheet.top().refresh();
      App.toast('התרגיל נוצר ונבחר');
    });

    // טופס תוכנית
    on('rf-day', el => { const d = +el.dataset.v, i = rform.days.indexOf(d); if (i >= 0) rform.days.splice(i, 1); else rform.days.push(d); Sheet.top().refresh(); });
    on('rf-add', () => openPicker(ids => {
      ids.forEach(id => {
        const last = lastSets(id);
        rform.items.push({ id: U.uid(), exId: id, sets: last ? String(last.length) : '3', reps: last ? String(last[0].r) : '10', weight: last ? String(last[0].w) : '' });
      });
      Sheet.top().refresh();
    }));
    on('rf-up', el => { const i = +el.dataset.i; if (i > 0) { [rform.items[i - 1], rform.items[i]] = [rform.items[i], rform.items[i - 1]]; Sheet.top().refresh(); } });
    on('rf-del', el => { rform.items.splice(+el.dataset.i, 1); Sheet.top().refresh(); });
    on('rf-save', () => {
      const f = rform;
      f.name = (f.name || '').trim();
      if (!f.name) { App.toast('צריך לתת שם לתוכנית'); document.getElementById('rf-name')?.focus(); return; }
      f.items.forEach(it => { it.sets = String(Math.max(1, Math.round(U.num(it.sets)) || 1)); it.reps = it.reps === '' ? '' : String(Math.round(U.num(it.reps))); });
      if (f.id) { const i = D().routines.findIndex(r => r.id === f.id); if (i >= 0) D().routines[i] = f; }
      else { f.id = U.uid(); D().routines.push(f); }
      Store.save(); Sheet.close(); App.refresh(); App.toast('התוכנית נשמרה');
    });
    on('rf-delete', async () => {
      const ok = await App.confirm(`למחוק את התוכנית "${rform.name}"? אימונים שכבר ביצעת יישארו בהיסטוריה.`, 'מחק', true);
      if (!ok) return;
      D().routines = D().routines.filter(r => r.id !== rform.id);
      Store.save(); Sheet.closeAll(); App.refresh();
    });

    // היסטוריה
    on('ses-open', el => openSession(el.dataset.id));
    on('ses-repeat', el => start({ sessionId: el.dataset.id }));
    on('ses-delete', async el => {
      const ok = await App.confirm('למחוק את האימון מההיסטוריה?', 'מחק', true);
      if (!ok) return;
      D().sessions = D().sessions.filter(s => s.id !== el.dataset.id);
      Store.save(); Sheet.closeAll(); App.refresh();
    });
  }

  function init() {
    const el = overlay();
    el.addEventListener('input', e => {
      const t = e.target, a = D().active;
      if (!a || !t.dataset.in) return;
      if (t.dataset.in === 'name') a.name = t.value;
      else a.exercises[+t.dataset.i].sets[+t.dataset.j][t.dataset.in] = t.value;
      Store.saveSoon();
    });
    el.addEventListener('focusin', e => { if (e.target.matches('input[data-i]')) setTimeout(() => e.target.select(), 0); });
    setInterval(tick, 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') { tick(); if (overlayOpen()) lockScreen(); }
    });
  }
  function onChange(name, el) {
    if (name === 'prog-ex') { S().progEx = el.value; App.render(); }
  }

  return { render, registerActions, init, onChange, openOverlay, overlayOpen, renderWorkout, tick };
})();
