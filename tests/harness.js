// Shared harness. The fake DOM is derived from the REAL index.html (ids,
// classes, attributes, element order and containment), so tests exercise the
// markup that actually ships instead of a hand-written imitation of it.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE = process.env.APP_DIR || path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');

function camel(s){ return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }

function parseTags(html){
  const tags = [];
  const tagRe = /<([a-zA-Z][\w-]*)((?:\s+[^<>]*?)?)\/?>/g;
  let m;
  while((m = tagRe.exec(html))){
    const attrs = {};
    const attrRe = /([\w:.-]+)(?:="([^"]*)"|='([^']*)')?/g;
    let a;
    while((a = attrRe.exec(m[2]))){
      if(!a[1]) continue;
      attrs[a[1]] = a[2] !== undefined ? a[2] : (a[3] !== undefined ? a[3] : '');
    }
    tags.push({ tag: m[1], attrs, pos: m.index });
  }
  return tags;
}

function divEnd(html, startPos){
  const re = /<div\b|<\/div>/g;
  re.lastIndex = startPos;
  let depth = 0, m;
  while((m = re.exec(html))){
    if(m[0] === '</div>'){ depth--; if(depth === 0) return m.index + 6; }
    else depth++;
  }
  return html.length;
}

function createApp(opts = {}){
  const o = Object.assign({
    seed: {},               // localStorage seed
    userAgent: 'Mozilla/5.0 (Linux; Android 13) Chrome/120',
    standalone: false,
    onLine: true,
    share: false,           // expose navigator.share?
    clipboard: true,
    serviceWorker: false,
    confirmValue: true,
    promptValue: 'Test Plan',
  }, opts);

  const sb = {};                       // sandbox / window
  const anchorsClicked = [];
  const blobs = new Map();
  let blobCounter = 0;
  const listeners = {};
  const state = { printed: 0, opened: [], activeElement: null };

  const all = [];                      // every parsed element, document order
  const byId = {};
  let doc;

  function makeElement(tag, attrs = {}, pos = -1){
    const el = {
      tagName: tag.toUpperCase(), id: attrs.id || '', pos,
      _attrs: Object.assign({}, attrs), _classes: new Set((attrs.class || '').split(/\s+/).filter(Boolean)),
      _listeners: {}, dataset: {}, children: [],
      value: attrs.value || '', checked: false, textContent: '', innerHTML: '', placeholder: attrs.placeholder || '',
      style: {}, offsetHeight: 64, offsetParent: {}, href: attrs.href || '', download: '',
      addEventListener(e, f){ (this._listeners[e] = this._listeners[e] || []).push(f); },
      removeEventListener(e, f){ if(this._listeners[e]) this._listeners[e] = this._listeners[e].filter(x => x !== f); },
      dispatch(e, extra){ (this._listeners[e] || []).slice().forEach(f => f(Object.assign({ target: this, currentTarget: this, preventDefault(){} }, extra || {}))); },
      appendChild(c){ this.children.push(c); return c; },
      removeChild(c){ this.children = this.children.filter(x => x !== c); },
      remove(){},
      click(){
        if(this.tagName === 'A' && this.download){ anchorsClicked.push({ download: this.download, href: this.href }); }
        this.dispatch('click');
      },
      focus(){ state.activeElement = this; doc.activeElement = this; },
      select(){}, scrollIntoView(){},
      setAttribute(n, v){ this._attrs[n] = String(v); if(n.startsWith('data-')) this.dataset[camel(n.slice(5))] = String(v); },
      getAttribute(n){ return n in this._attrs ? this._attrs[n] : null; },
      hasAttribute(n){ return n in this._attrs; },
      removeAttribute(n){ delete this._attrs[n]; },
      querySelector(sel){ return (this._fake && this._fake[sel]) || null; },
      querySelectorAll(sel){
        if(this._fakeRows && sel === '.meal-row') return this._fakeRows;
        return queryWithin(this, sel);
      },
    };
    el.classList = {
      add: (...c) => c.forEach(x => el._classes.add(x)),
      remove: (...c) => c.forEach(x => el._classes.delete(x)),
      toggle: (c, force) => { const on = force === undefined ? !el._classes.has(c) : !!force; on ? el._classes.add(c) : el._classes.delete(c); return on; },
      contains: c => el._classes.has(c),
    };
    for(const [k, v] of Object.entries(attrs)){ if(k.startsWith('data-')) el.dataset[camel(k.slice(5))] = v; }
    if(attrs.role === undefined) delete el._attrs.role;
    return el;
  }

  // Build elements from the real HTML.
  for(const t of parseTags(HTML)){
    if(['meta','link','script','html','head','body','title'].includes(t.tag)) continue;
    const el = makeElement(t.tag, t.attrs, t.pos);
    if(['div','section','aside','main','header','footer'].includes(t.tag) || t.tag === 'label'){
      el._range = [t.pos, t.tag === 'div' ? divEnd(HTML, t.pos) : HTML.indexOf('</' + t.tag + '>', t.pos) + 10];
    }
    all.push(el);
    if(el.id) byId[el.id] = el;
  }

  // Browser behaviour: a <select>'s value is the value of its selected <option>.
  for(const sel of all.filter(e => e.tagName === 'SELECT')){
    const end = HTML.indexOf('</select>', sel.pos);
    const opts = all.filter(e => e.tagName === 'OPTION' && e.pos > sel.pos && e.pos < end);
    const chosen = opts.find(e => e.hasAttribute('selected')) || opts[0];
    if(chosen) sel.value = chosen.getAttribute('value') || '';
  }

  function within(el, other){ return el._range && other.pos > el._range[0] && other.pos < el._range[1]; }
  function matchSimple(el, sel){
    sel = sel.trim();
    if(sel.startsWith('.')) return el._classes.has(sel.slice(1));
    if(sel.startsWith('[') && sel.endsWith(']')) return el.hasAttribute(sel.slice(1, -1));
    return false;
  }
  function queryWithin(container, sel){
    if(/button|\[href\]|input/.test(sel)){            // focusable query (modal focus trap)
      return all.filter(e => within(container, e) &&
        (['BUTTON','INPUT','SELECT','TEXTAREA'].includes(e.tagName) || (e.tagName === 'A' && e.hasAttribute('href')) ||
         (e.hasAttribute('tabindex') && e.getAttribute('tabindex') !== '-1')) && !e.hasAttribute('disabled'));
    }
    return all.filter(e => within(container, e) && matchSimple(e, sel));
  }

  const htmlRoot = {
    lang: 'en', _attrs: {}, _style: {},
    setAttribute(n, v){ this._attrs[n] = v; }, removeAttribute(n){ delete this._attrs[n]; }, getAttribute(n){ return this._attrs[n]; },
    style: { setProperty(n, v){ htmlRoot._style[n] = v; }, removeProperty(n){ delete htmlRoot._style[n]; } },
  };

  doc = {
    documentElement: htmlRoot, activeElement: null,
    getElementById(id){ if(!byId[id]) throw new Error(`getElementById('${id}') -> null (no such id in index.html)`); return byId[id]; },
    querySelector(){ return null; },
    querySelectorAll(sel){
      const m = sel.match(/^#([\w-]+) (\.[\w-]+)$/);
      if(m) return queryWithin(byId[m[1]], m[2]);
      return all.filter(e => matchSimple(e, sel));
    },
    createElement(tag){ return makeElement(tag, {}, -1); },
    body: makeElement('body'),
    execCommand: () => true,
  };

  const store = new Map(Object.entries(o.seed).map(([k, v]) => [k, JSON.stringify(v)]));
  const nav = {
    userAgent: o.userAgent, onLine: o.onLine, standalone: false,
    clipboard: o.clipboard ? { writeText: () => Promise.resolve() } : undefined,
  };
  if(o.share) nav.share = () => Promise.resolve();
  if(o.serviceWorker) nav.serviceWorker = { register: () => Promise.resolve({ waiting: null, installing: null, addEventListener(){} }), addEventListener(){}, controller: {} };

  Object.assign(sb, {
    document: doc, localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    navigator: nav, location: { href: 'https://kingcloud.is-a.dev/', reload(){} },
    matchMedia: q => ({ matches: q.includes('standalone') ? o.standalone : false }), MSStream: undefined,
    URL: { createObjectURL: b => { const u = 'blob:' + (++blobCounter); blobs.set(u, b); return u; }, revokeObjectURL(){} },
    Blob: function(parts, opts){ this.parts = parts; this.opts = opts; },
    FileReader: function(){ this.readAsText = (file) => setTimeout(() => { this.result = file._content; this.onload && this.onload(); }, 0); },
    confirm: () => o.confirmValue, prompt: () => o.promptValue,
    open: (url) => { state.opened.push(url); return {}; },
    print: () => { state.printed++; },
    requestAnimationFrame: f => setTimeout(f, 0),
    setTimeout: (f, m) => { const t = setTimeout(f, m); t.unref && t.unref(); return t; },
    setInterval: (f, m) => { const t = setInterval(f, m); t.unref && t.unref(); return t; },
    clearTimeout, clearInterval, console, Date, Math, JSON, encodeURIComponent, decodeURIComponent, Object, Array, Set, Map, String, Number, Promise, Intl,
    addEventListener: (e, f) => { (listeners[e] = listeners[e] || []).push(f); },
    removeEventListener(){},
  });
  sb.window = sb;
  const ctx = vm.createContext(sb);
  const run = (file) => vm.runInContext(fs.readFileSync(path.join(BASE, file), 'utf8'), ctx, { filename: file });
  const evalIn = (code) => vm.runInContext(code, ctx);

  run('js/i18n.js'); run('js/data.js'); run('js/app.js');

  return {
    el: byId, all, doc, ctx, sb, evalIn, store, listeners, anchorsClicked, blobs, state, htmlRoot,
    pills: (groupId) => queryWithin(byId[groupId], '.pill'),
    swatches: () => all.filter(e => e._classes.has('swatch')),
    langBtns: () => all.filter(e => e._classes.has('lang-btn')),
    fire: (evt, arg) => (listeners[evt] || []).forEach(f => f(arg)),
    json: (key) => { const v = store.get(key); return v === undefined ? null : JSON.parse(v); },
    HTML, BASE,
  };
}

function makeChecker(){
  let fails = 0, passes = 0;
  const check = (label, cond) => { console.log((cond ? '✔' : '✘'), label); cond ? passes++ : fails++; };
  check.summary = () => ({ passes, fails });
  return check;
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, timeout = 6000){
  const end = Date.now() + timeout;
  while(Date.now() < end){ if(fn()) return true; await sleep(30); }
  return false;
}

module.exports = { createApp, makeChecker, sleep, waitFor, HTML, BASE };
