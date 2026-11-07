'use strict';
/* יעדים: יצירה, סימון, רצפים ויומן */
const Habits = (() => {
  const ICONS = ['💧', '🏃', '🚶', '📖', '🧘', '💪', '🏋️', '🥗', '🍎', '🥦', '🥛', '☕',
    '😴', '🛏️', '🦷', '💊', '🧴', '🚿', '🚴', '🏊', '🤸', '🧗', '⚽', '🎾',
    '✍️', '📝', '📚', '🧠', '🗣️', '🎸', '🎨', '💻', '🎧', '📵', '🚭', '🍷',
    '🌅', '☀️', '🌙', '⏰', '🙏', '❤️', '🌿', '🪴', '🐕', '🧹', '💰', '🎯'];
  const COLORS = ['#FF6B6B', '#FF9F43', '#F7C948', '#2ED47A', '#1CC8C8', '#4D8DFF', '#7C6CFF', '#FF6FB5'];

  const D = () => Store.d;
  const WS = () => D().settings.weekStart;
  const S = () => App.state;
  const goals = () => D().goals.filter(g => !g.archived);
  const byId = id => D().goals.find(g => g.id === id);

  /* ---------- לוגיקה ---------- */
  const count = (g, key) => (D().logs[g.id] && D().logs[g.id][key]) || 0;
  function setCount(g, key, n) {
    const L = D().logs[g.id] || (D().logs[g.id] = {});
    if (n <= 0) delete L[key]; else L[key] = n;
    Store.save();
  }
  const isWeekly = g => g.schedule.type === 'weekly';
  const perDay = g => isWeekly(g) ? 1 : Math.max(1, g.schedule.perDay || 1);
  const isSched = (g, d) => g.schedule.type === 'days' ? g.schedule.days.includes(d.getDay()) : true;
  function weekCount(g, d) {
    const s = U.weekStart(d, WS());
    let c = 0;
    for (let i = 0; i < 7; i++) c += count(g, U.dkey(U.addDays(s, i)));
    return c;
  }
  const dayDone = (g, d) => count(g, U.dkey(d)) >= perDay(g);
  function startDate(g) {
    let s = new Date(g.created || Date.now());
    s = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const keys = Object.keys(D().logs[g.id] || {}).sort();
    if (keys[0] && U.parse(keys[0]) < s) s = U.parse(keys[0]);
    return s;
  }
  /* רשימת תקופות (ימים מתוכננים / שבועות) – true הושלם, false פוספס. התקופה הנוכחית נספרת רק אם הושלמה */
  function periods(g) {
    const t = U.today(), out = [], st = startDate(g);
    if (isWeekly(g)) {
      const N = g.schedule.perWeek || 1;
      let w = U.weekStart(st, WS());
      const cur = U.weekStart(t, WS());
      while (w <= cur) {
        const done = weekCount(g, w) >= N;
        if (!(+w === +cur && !done)) out.push(done);
        w = U.addDays(w, 7);
      }
    } else {
      let d = st;
      while (d <= t) {
        if (isSched(g, d)) {
          const done = dayDone(g, d);
          if (!(+d === +t && !done)) out.push(done);
        }
        d = U.addDays(d, 1);
      }
    }
    return out;
  }
  function stats(g) {
    const p = periods(g);
    let cur = 0;
    for (let i = p.length - 1; i >= 0 && p[i]; i--) cur++;
    let best = 0, run = 0;
    for (const v of p) { run = v ? run + 1 : 0; best = Math.max(best, run); }
    const recent = p.slice(-30);
    const rate = recent.length ? Math.round(100 * recent.filter(Boolean).length / recent.length) : 0;
    const total = Object.values(D().logs[g.id] || {}).reduce((a, b) => a + b, 0);
    return { cur, best, rate, total };
  }
  function streakLabel(n, weekly) {
    if (weekly) return n === 1 ? 'שבוע 1' : `${n} שבועות`;
    return n === 1 ? 'יום 1' : `${n} ימים`;
  }
  function scheduleLabel(g) {
    const s = g.schedule;
    if (s.type === 'weekly') return s.perWeek === 1 ? 'פעם בשבוע' : `${s.perWeek} פעמים בשבוע`;
    const pd = s.perDay > 1 ? ` · ${s.perDay} פעמים` : '';
    if (s.type === 'days') {
      if (s.days.length === 7) return 'כל יום' + pd;
      return [...s.days].sort((a, b) => ((a - WS() + 7) % 7) - ((b - WS() + 7) % 7)).map(d => U.DAYS_SHORT[d]).join(' ') + pd;
    }
    return s.perDay > 1 ? `${s.perDay} פעמים ביום` : 'כל יום';
  }
  function status(g, d) {
    const n = count(g, U.dkey(d));
    if (isWeekly(g)) {
      const wc = weekCount(g, d), N = g.schedule.perWeek || 1;
      return { n, target: 1, done: n >= 1, weekDone: wc >= N, prog: n >= 1 ? 1 : 0, sub: `${wc}/${N} השבוע` };
    }
    const t = perDay(g);
    return { n, target: t, done: n >= t, prog: n / t, sub: t > 1 ? `${n}/${t}` : '' };
  }
  /* יחס השלמה ליום (ליעדים יומיים/ימים מסוימים) */
  function dayRatio(d) {
    let tot = 0, done = 0, weeklyLogged = false;
    for (const g of goals()) {
      if (startDate(g) > d) continue;
      if (isWeekly(g)) { if (count(g, U.dkey(d)) > 0) weeklyLogged = true; continue; }
      if (!isSched(g, d)) continue;
      tot++; if (dayDone(g, d)) done++;
    }
    if (!tot) return weeklyLogged ? 1 : null;
    return done / tot;
  }

  /* ---------- רכיבי תצוגה ---------- */
  function ring(p, color, size = 44, stroke = 4) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, h = size / 2;
    p = Math.max(0, Math.min(1, p || 0));
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="var(--ring-bg)" stroke-width="${stroke}"/>
      <circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - p)).toFixed(2)}" transform="rotate(-90 ${h} ${h})"/>
    </svg>`;
  }
  const CHECK = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function card(g, d) {
    const st = status(g, d);
    const s = stats(g);
    const weekly = isWeekly(g);
    const parts = [];
    if (s.cur > 0) parts.push(`<span class="flame">🔥 ${streakLabel(s.cur, weekly)}</span>`);
    else parts.push(U.esc(scheduleLabel(g)));
    if (st.sub) parts.push(st.sub);
    const full = st.done || (weekly && st.weekDone);
    const inner = st.done ? CHECK : (st.target > 1 && st.n > 0 ? `<b>${st.n}</b>` : (weekly && st.weekDone ? CHECK : ''));
    return `<div class="goal-card ${st.done ? 'done' : ''} ${weekly && st.weekDone && !st.done ? 'week-done' : ''}" style="--c:${g.color}">
      <button class="goal-main" data-act="goal-detail" data-id="${g.id}">
        <span class="goal-icon">${U.esc(g.icon)}</span>
        <span class="goal-text">
          <span class="goal-title">${U.esc(g.title)}</span>
          <span class="goal-sub">${parts.join(' · ')}</span>
        </span>
      </button>
      <button class="check ${full ? 'full' : ''}" data-act="goal-tap" data-long="goal-dec" data-id="${g.id}" data-k="${U.dkey(d)}" aria-label="סמן ${U.esc(g.title)}">
        ${ring(st.prog, g.color, 48, 4)}<span class="check-in">${inner}</span>
      </button>
    </div>`;
  }

  /* ---------- מסך היום ---------- */
  function renderToday() {
    const sel = S().date, t = U.today();
    const all = goals();
    const head = `<div class="page-head">
        <div><div class="eyebrow">${U.sameDay(sel, t) ? 'היום' : (sel < t ? 'הצצה אחורה' : '')}</div><h1>${U.fmtDate(sel)}</h1></div>
        <div class="head-btns">
          <button class="icon-btn" data-act="settings" aria-label="הגדרות">${App.ICON.gear}</button>
          <button class="icon-btn accent" data-act="goal-new" aria-label="יעד חדש">${App.ICON.plus}</button>
        </div>
      </div>`;
    if (!all.length) {
      return head + weekStrip(sel) + `<div class="empty">
        <div class="empty-emoji">🎯</div>
        <h2>בוא נתחיל</h2>
        <p>צור את היעד הראשון שלך — שתיית מים, קריאה, הליכה, מה שחשוב לך.</p>
        <button class="btn btn-primary" data-act="goal-new">צור יעד</button>
      </div>`;
    }
    const list = all.filter(g => isSched(g, sel));
    const notToday = all.length - list.length;
    let tot = 0, done = 0;
    for (const g of list) {
      const st = status(g, sel);
      tot++;
      if (st.done || (isWeekly(g) && st.weekDone)) done++;
    }
    const pct = tot ? done / tot : 0;
    const allDone = tot > 0 && done === tot;
    const summary = `<div class="summary ${allDone ? 'all-done' : ''}">
        <div class="summary-ring">${ring(pct, 'url(#gradA)', 64, 7)}<span>${Math.round(pct * 100)}%</span></div>
        <div class="summary-text">
          <b>${allDone ? 'כל היעדים הושלמו! 🎉' : `${done} מתוך ${tot} הושלמו`}</b>
          <span>${allDone ? 'יום מושלם, תמשיך ככה' : 'לחיצה על העיגול מסמנת · לחיצה ארוכה מבטלת'}</span>
        </div>
      </div>`;
    return head + weekStrip(sel) + summary +
      `<div class="goal-list">${list.map(g => card(g, sel)).join('')}</div>` +
      (notToday ? `<p class="muted center small">${notToday === 1 ? 'יעד אחד לא מתוכנן' : notToday + ' יעדים לא מתוכננים'} ליום ${U.DAYS[sel.getDay()]}</p>` : '');
  }

  function weekStrip(sel) {
    const t = U.today();
    const s = U.weekStart(sel, WS());
    const canNext = U.addDays(s, 7) <= t;
    let days = '';
    for (let i = 0; i < 7; i++) {
      const d = U.addDays(s, i), fut = d > t;
      const r = fut ? null : dayRatio(d);
      days += `<button class="ws-day ${U.sameDay(d, sel) ? 'sel' : ''} ${U.sameDay(d, t) ? 'today' : ''}" data-act="pick-date" data-k="${U.dkey(d)}" ${fut ? 'disabled' : ''}>
        <span class="wd">${U.DAYS_SHORT[d.getDay()]}</span>
        <span class="wn">${ring(r ?? 0, r === 1 ? 'var(--good)' : 'var(--accent)', 34, 3)}<b>${d.getDate()}</b></span>
      </button>`;
    }
    return `<div class="week-strip">
      <button class="ws-arrow" data-act="week-shift" data-d="-7" aria-label="שבוע קודם">${App.ICON.chevR}</button>
      <div class="ws-days">${days}</div>
      <button class="ws-arrow" data-act="week-shift" data-d="7" ${canNext ? '' : 'disabled'} aria-label="שבוע הבא">${App.ICON.chevL}</button>
    </div>`;
  }

  /* ---------- יומן ---------- */
  function monthGrid(month, cellFn, actName) {
    const first = U.monthStart(month);
    const start = U.weekStart(first, WS());
    const t = U.today();
    let heads = '';
    for (let i = 0; i < 7; i++) heads += `<span>${U.DAYS_SHORT[(WS() + i) % 7]}</span>`;
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = U.addDays(start, i);
      if (i >= 35 && d.getMonth() !== first.getMonth()) break;
      const inMonth = d.getMonth() === first.getMonth();
      if (!inMonth) { cells += `<span class="cal-cell out"></span>`; continue; }
      const fut = d > t;
      cells += `<button class="cal-cell ${fut ? 'fut' : ''} ${U.sameDay(d, t) ? 'today' : ''}" ${fut ? 'disabled' : ''} data-act="${actName}" data-k="${U.dkey(d)}">${cellFn(d, fut)}</button>`;
    }
    return `<div class="cal-heads">${heads}</div><div class="cal-grid">${cells}</div>`;
  }
  function monthNav(month, act) {
    const t = U.today();
    const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= t;
    return `<div class="month-nav">
      <button class="icon-btn" data-act="${act}" data-d="-1" aria-label="חודש קודם">${App.ICON.chevR}</button>
      <b>${U.MONTHS[month.getMonth()]} ${month.getFullYear()}</b>
      <button class="icon-btn" data-act="${act}" data-d="1" ${canNext ? '' : 'disabled'} aria-label="חודש הבא">${App.ICON.chevL}</button>
    </div>`;
  }

  function renderCalendar() {
    const all = goals();
    const month = S().calMonth;
    const filter = S().calFilter;
    const fg = filter !== 'all' ? byId(filter) : null;
    const head = `<div class="page-head"><div><div class="eyebrow">עמידה ביעדים</div><h1>יומן</h1></div>
      <div class="head-btns"><button class="icon-btn" data-act="settings" aria-label="הגדרות">${App.ICON.gear}</button></div></div>`;
    if (!all.length) return head + `<div class="empty"><div class="empty-emoji">🗓️</div><h2>היומן ריק</h2><p>אחרי שתיצור יעדים ותסמן אותם, תראה כאן את כל ההתקדמות שלך.</p><button class="btn btn-primary" data-act="goal-new">צור יעד</button></div>`;

    const chips = `<div class="chips scroll-x">
      <button class="chip ${filter === 'all' ? 'on' : ''}" data-act="cal-filter" data-id="all">הכל</button>
      ${all.map(g => `<button class="chip ${filter === g.id ? 'on' : ''}" style="--c:${g.color}" data-act="cal-filter" data-id="${g.id}">${U.esc(g.icon)} ${U.esc(g.title)}</button>`).join('')}
    </div>`;

    const cellFn = (d, fut) => {
      const num = `<span class="cal-num">${d.getDate()}</span>`;
      if (fut) return num;
      if (fg) {
        const st = status(fg, d), sch = isSched(fg, d);
        const cls = st.done ? 'hit' : (st.n > 0 ? 'part' : (!sch ? 'off' : ''));
        return `<span class="cal-fill ${cls}" style="--c:${fg.color}">${d.getDate()}</span>`;
      }
      const r = dayRatio(d);
      const dots = all.filter(g => count(g, U.dkey(d)) > 0).slice(0, 4).map(g => `<i style="background:${g.color}"></i>`).join('');
      return `<span class="cal-ring">${ring(r ?? 0, r === 1 ? 'var(--good)' : 'var(--accent)', 34, 3)}${num}</span><span class="dots">${dots}</span>`;
    };

    // סיכום חודשי
    const first = U.monthStart(month);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const end = last < U.today() ? last : U.today();
    const rows = (fg ? [fg] : all).map(g => {
      let hits = 0, planned = 0;
      for (let d = first; d <= end; d = U.addDays(d, 1)) {
        if (startDate(g) > d) continue;
        if (isWeekly(g)) { if (count(g, U.dkey(d)) > 0) hits++; continue; }
        if (!isSched(g, d)) continue;
        planned++; if (dayDone(g, d)) hits++;
      }
      if (isWeekly(g)) {
        const weeks = Math.max(1, Math.ceil((U.addDays(end, 1) - first) / (7 * 864e5)));
        planned = weeks * (g.schedule.perWeek || 1);
      }
      const p = planned ? Math.min(1, hits / planned) : 0;
      const s = stats(g);
      return `<button class="month-row" data-act="goal-detail" data-id="${g.id}" style="--c:${g.color}">
        <span class="goal-icon sm">${U.esc(g.icon)}</span>
        <span class="mr-text"><b>${U.esc(g.title)}</b><span class="bar"><i style="width:${Math.round(p * 100)}%"></i></span></span>
        <span class="mr-num"><b>${hits}${planned ? '/' + planned : ''}</b><small>${s.cur ? '🔥 ' + s.cur : ''}</small></span>
      </button>`;
    }).join('');

    return head + chips + `<div class="card cal-card">${monthNav(month, 'cal-month')}${monthGrid(month, cellFn, 'cal-day')}</div>
      <h3 class="section-title">החודש</h3><div class="card list-card">${rows}</div>`;
  }

  function openDay(key) {
    const d = U.parse(key);
    Sheet.open(() => {
      const list = goals().filter(g => isSched(g, d));
      const others = goals().filter(g => !isSched(g, d));
      return `<div class="sheet-head"><h2>${U.fmtDate(d)}</h2><button class="icon-btn" data-act="sheet-close" aria-label="סגור">${App.ICON.x}</button></div>
        <div class="goal-list">${list.map(g => card(g, d)).join('') || '<p class="muted">אין יעדים מתוכננים ליום הזה</p>'}</div>
        ${others.length ? `<h3 class="section-title">לא מתוכננים ליום הזה</h3><div class="goal-list dim">${others.map(g => card(g, d)).join('')}</div>` : ''}`;
    });
  }

  /* ---------- פרטי יעד ---------- */
  let detailMonth = U.monthStart(U.today());
  function openDetail(id) {
    detailMonth = U.monthStart(U.today());
    Sheet.open(() => {
      const g = byId(id);
      if (!g) return '<p class="muted">היעד נמחק</p>';
      const s = stats(g), weekly = isWeekly(g);
      const cellFn = (d, fut) => {
        if (fut) return `<span class="cal-num">${d.getDate()}</span>`;
        const st = status(g, d), sch = isSched(g, d);
        const cls = st.done ? 'hit' : (st.n > 0 ? 'part' : (!sch ? 'off' : ''));
        return `<span class="cal-fill ${cls}" style="--c:${g.color}">${d.getDate()}</span>`;
      };
      return `<div class="sheet-head"><span></span><div class="head-btns">
          <button class="pill-btn" data-act="goal-edit" data-id="${g.id}">עריכה</button>
          <button class="icon-btn" data-act="sheet-close" aria-label="סגור">${App.ICON.x}</button></div></div>
        <div class="detail-hero" style="--c:${g.color}">
          <span class="goal-icon xl">${U.esc(g.icon)}</span>
          <h2>${U.esc(g.title)}</h2>
          <span class="tag">${U.esc(scheduleLabel(g))}</span>
          ${g.desc ? `<p class="desc">${U.esc(g.desc).replace(/\n/g, '<br>')}</p>` : ''}
        </div>
        <div class="stat-grid" style="--c:${g.color}">
          <div class="stat"><b>🔥 ${s.cur}</b><span>רצף נוכחי (${weekly ? 'שבועות' : 'ימים'})</span></div>
          <div class="stat"><b>🏆 ${s.best}</b><span>רצף שיא</span></div>
          <div class="stat"><b>${s.rate}%</b><span>עמידה ב-30 ${weekly ? 'השבועות' : 'הפעמים'} האחרונים</span></div>
          <div class="stat"><b>${s.total}</b><span>סה״כ ביצועים</span></div>
        </div>
        <div class="card cal-card" style="--c:${g.color}">${monthNav(detailMonth, 'detail-month')}
          ${monthGrid(detailMonth, cellFn, 'detail-day').replace(/data-act="detail-day"/g, `data-act="detail-day" data-id="${g.id}"`)}
          <p class="muted small center">לחיצה על יום מסמנת או מבטלת ביצוע</p>
        </div>`;
    });
  }

  /* ---------- טופס יעד ---------- */
  let form = null;
  function openForm(id) {
    const g = id ? byId(id) : null;
    form = g ? JSON.parse(JSON.stringify(g)) : {
      id: null, title: '', icon: '💧', color: COLORS[5], desc: '',
      schedule: { type: 'daily', perDay: 1, perWeek: 3, days: [0, 1, 2, 3, 4] },
    };
    const sc = form.schedule;
    sc.perDay = sc.perDay || 1; sc.perWeek = sc.perWeek || 3; sc.days = sc.days && sc.days.length ? sc.days : [0, 1, 2, 3, 4];
    Sheet.open(formHtml, {
      static: true, tall: true,
      onMount(el) {
        el.querySelector('#gf-title').addEventListener('input', e => form.title = e.target.value);
        el.querySelector('#gf-desc').addEventListener('input', e => form.desc = e.target.value);
        el.querySelector('#gf-emoji').addEventListener('input', e => {
          const ch = U.firstGrapheme(e.target.value);
          if (ch) { form.icon = ch; e.target.value = ''; Sheet.top().refresh(); }
        });
      },
    });
    if (!g) setTimeout(() => { const i = document.getElementById('gf-title'); i && i.focus(); }, 320);
  }
  function stepper(k, v, min, max) {
    return `<div class="stepper" dir="ltr">
      <button data-act="gf-step" data-k="${k}" data-d="-1" ${v <= min ? 'disabled' : ''} aria-label="פחות">−</button>
      <b>${v}</b>
      <button data-act="gf-step" data-k="${k}" data-d="1" ${v >= max ? 'disabled' : ''} aria-label="יותר">+</button></div>`;
  }
  function formHtml() {
    const f = form, s = f.schedule;
    const daysOrder = [0, 1, 2, 3, 4, 5, 6].map(i => (WS() + i) % 7);
    return `<div class="sheet-head"><button class="text-btn" data-act="sheet-close">ביטול</button>
        <h2>${f.id ? 'עריכת יעד' : 'יעד חדש'}</h2>
        <button class="text-btn strong" data-act="gf-save">שמור</button></div>
      <div class="form" style="--c:${f.color}">
        <div class="preview"><span class="goal-icon xl">${U.esc(f.icon)}</span></div>
        <label class="field"><span>כותרת</span><input id="gf-title" type="text" maxlength="40" placeholder="לדוגמה: לשתות 8 כוסות מים" value="${U.esc(f.title)}"></label>

        <div class="field"><span>אייקון</span>
          <div class="icon-grid">${ICONS.map(i => `<button class="icon-opt ${i === f.icon ? 'on' : ''}" data-act="gf-icon" data-v="${i}">${i}</button>`).join('')}</div>
          <input id="gf-emoji" class="emoji-in" type="text" placeholder="או הקלד כל אימוג׳י מהמקלדת">
        </div>

        <div class="field"><span>צבע</span>
          <div class="color-row">${COLORS.map(c => `<button class="color-opt ${c === f.color ? 'on' : ''}" style="background:${c}" data-act="gf-color" data-v="${c}" aria-label="צבע"></button>`).join('')}</div>
        </div>

        <div class="field"><span>תדירות</span>
          <div class="seg">
            <button class="${s.type === 'daily' ? 'on' : ''}" data-act="gf-type" data-v="daily">כל יום</button>
            <button class="${s.type === 'days' ? 'on' : ''}" data-act="gf-type" data-v="days">ימים מסוימים</button>
            <button class="${s.type === 'weekly' ? 'on' : ''}" data-act="gf-type" data-v="weekly">בשבוע</button>
          </div>
          ${s.type === 'days' ? `<div class="day-chips">${daysOrder.map(d => `<button class="day-chip ${s.days.includes(d) ? 'on' : ''}" data-act="gf-day" data-v="${d}">${U.DAYS_SHORT[d]}</button>`).join('')}</div>` : ''}
          ${s.type === 'weekly'
            ? `<div class="row-between"><span>כמה פעמים בשבוע</span>${stepper('perWeek', s.perWeek, 1, 7)}</div>`
            : `<div class="row-between"><span>כמה פעמים ביום</span>${stepper('perDay', s.perDay, 1, 30)}</div>`}
        </div>

        <label class="field"><span>פירוט — מה בדיוק צריך לעשות</span>
          <textarea id="gf-desc" rows="3" maxlength="500" placeholder="לדוגמה: כוס מים מיד כשקמים, ועוד אחת לפני כל ארוחה">${U.esc(f.desc)}</textarea></label>

        ${f.id ? `<button class="btn btn-ghost danger-text" data-act="gf-delete">מחק יעד</button>` : ''}
      </div>`;
  }

  /* ---------- פעולות ---------- */
  function registerActions(on) {
    on('goal-new', () => openForm(null));
    on('goal-edit', el => openForm(el.dataset.id));
    on('goal-detail', el => openDetail(el.dataset.id));
    on('goal-tap', el => {
      const g = byId(el.dataset.id); if (!g) return;
      const key = el.dataset.k;
      if (U.parse(key) > U.today()) return App.toast('אי אפשר לסמן יום עתידי');
      const n = count(g, key), t = perDay(g);
      const next = n >= t ? n - 1 : n + 1;
      setCount(g, key, next);
      App.haptic();
      App.refresh();
      if (next >= t && n < t) {
        const btn = document.querySelector(`.check[data-id="${g.id}"][data-k="${key}"]`);
        btn && btn.classList.add('pop');
      }
    });
    on('goal-dec', el => {
      const g = byId(el.dataset.id); if (!g) return;
      const n = count(g, el.dataset.k);
      if (n > 0) { setCount(g, el.dataset.k, n - 1); App.haptic(); App.refresh(); App.toast('בוטל ביצוע אחד'); }
    });
    on('pick-date', el => { S().date = U.parse(el.dataset.k); App.render(); });
    on('week-shift', el => {
      let d = U.addDays(S().date, +el.dataset.d);
      if (d > U.today()) d = U.today();
      S().date = d; App.render();
    });
    on('cal-filter', el => { S().calFilter = el.dataset.id; App.render(); });
    on('cal-month', el => { const m = S().calMonth; S().calMonth = new Date(m.getFullYear(), m.getMonth() + (+el.dataset.d), 1); App.render(); });
    on('cal-day', el => {
      const fid = S().calFilter;
      if (fid !== 'all') { toggleDay(byId(fid), el.dataset.k); return; }
      openDay(el.dataset.k);
    });
    on('detail-month', el => { detailMonth = new Date(detailMonth.getFullYear(), detailMonth.getMonth() + (+el.dataset.d), 1); Sheet.top().refresh(); });
    on('detail-day', el => toggleDay(byId(el.dataset.id), el.dataset.k));

    // טופס
    on('gf-icon', el => { form.icon = el.dataset.v; Sheet.top().refresh(); });
    on('gf-color', el => { form.color = el.dataset.v; Sheet.top().refresh(); });
    on('gf-type', el => { form.schedule.type = el.dataset.v; Sheet.top().refresh(); });
    on('gf-day', el => {
      const d = +el.dataset.v, a = form.schedule.days;
      const i = a.indexOf(d);
      if (i >= 0) { if (a.length > 1) a.splice(i, 1); } else a.push(d);
      Sheet.top().refresh();
    });
    on('gf-step', el => {
      const k = el.dataset.k, max = k === 'perWeek' ? 7 : 30;
      form.schedule[k] = Math.max(1, Math.min(max, form.schedule[k] + (+el.dataset.d)));
      Sheet.top().refresh();
    });
    on('gf-save', () => {
      const f = form;
      f.title = (f.title || '').trim();
      if (!f.title) { App.toast('צריך לתת ליעד כותרת'); document.getElementById('gf-title')?.focus(); return; }
      if (f.id) {
        const i = D().goals.findIndex(g => g.id === f.id);
        if (i >= 0) D().goals[i] = f;
      } else {
        f.id = U.uid(); f.created = Date.now();
        D().goals.push(f);
      }
      Store.save();
      Sheet.close();
      App.refresh();
      App.toast(f.created && Date.now() - f.created < 2000 ? 'היעד נוצר' : 'נשמר');
    });
    on('gf-delete', async () => {
      const ok = await App.confirm(`למחוק את "${form.title}" ואת כל ההיסטוריה שלו?`, 'מחק', true);
      if (!ok) return;
      D().goals = D().goals.filter(g => g.id !== form.id);
      delete D().logs[form.id];
      if (S().calFilter === form.id) S().calFilter = 'all';
      Store.save();
      Sheet.closeAll();
      App.refresh();
      App.toast('היעד נמחק');
    });
  }
  function toggleDay(g, key) {
    if (!g) return;
    const n = count(g, key), t = perDay(g);
    setCount(g, key, n >= t ? 0 : n + 1);
    App.haptic();
    App.refresh();
  }

  return { renderToday, renderCalendar, registerActions, ring, stats };
})();
