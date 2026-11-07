'use strict';
/* כלי עזר: תאריכים, פורמט, אסקייפ */
const U = (() => {
  const pad = n => String(n).padStart(2, '0');
  const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const weekStart = (d, ws = 0) => addDays(d, -((d.getDay() - ws + 7) % 7));
  const monthStart = d => new Date(d.getFullYear(), d.getMonth(), 1);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const fmtDate = d => `יום ${DAYS[d.getDay()]}, ${d.getDate()} ב${MONTHS[d.getMonth()]}`;
  const fmtDateShort = d => `${d.getDate()} ב${MONTHS[d.getMonth()]}`;
  const fmtDM = d => `${d.getDate()}.${d.getMonth() + 1}`;
  const fmtTimer = sec => {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };
  const fmtDur = sec => {
    const m = Math.max(0, Math.round(sec / 60));
    if (m < 60) return `${m} דק׳`;
    return `${Math.floor(m / 60)} ש׳ ${m % 60 ? (m % 60) + ' דק׳' : ''}`.trim();
  };
  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const fmtNum = n => {
    const r = Math.round(n * 10) / 10;
    return r.toLocaleString('he-IL', { maximumFractionDigits: 1 });
  };
  const firstGrapheme = s => {
    s = (s || '').trim();
    if (!s) return '';
    if (window.Intl && Intl.Segmenter) {
      for (const seg of new Intl.Segmenter('he', { granularity: 'grapheme' }).segment(s)) return seg.segment;
    }
    return Array.from(s)[0];
  };

  return { pad, dkey, parse, addDays, today, sameDay, weekStart, monthStart, uid, esc,
    DAYS_SHORT, DAYS, MONTHS, fmtDate, fmtDateShort, fmtDM, fmtTimer, fmtDur, num, fmtNum, firstGrapheme };
})();
