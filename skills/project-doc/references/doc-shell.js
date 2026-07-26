/* project-doc shell — LOCKED.
   Loaded AFTER daily-brief/references/shell.js. Runs in its own IIFE, shares no globals.
   Owns: the floating section dial (hover + click + keyboard), hash-routed panels,
   glossary search and letter rail, timeline filters and month clusters, the state
   tile filters, the architecture pipeline inspector, the citation-icon tilts, the
   citation preview cards, the Ask tally, the synthesised interaction sounds, and
   href allowlist enforcement.
   Disclosures are native <details> — no JS.

   Rules this file never breaks:
   - No innerHTML. Text is set with textContent only.
   - No localStorage / sessionStorage. In-memory only; tab state lives in location.hash.
   - Every anchor href is parsed and checked against the allowlist in
     <script type="application/json" id="doc-allowlist"> before the page is usable.
   - Nothing moves and nothing sounds when prefers-reduced-motion is set.
*/
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var quiet = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // {SOUND}
  // Same Web Audio vocabulary as the daily brief — synthesised, no assets, no
  // files, one lazily created context. Clicks and key presses are user
  // gestures; the proximity open is not, so its blip may be silently skipped
  // while the context is still suspended. Audio is decoration; that is fine.
  var actx = null;
  function tone(from, to, dur, level, type) {
    if (quiet) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime;
      var osc = actx.createOscillator();
      var gain = actx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(from, t);
      osc.frequency.exponentialRampToValueAtTime(to, t + dur);
      gain.gain.setValueAtTime(level, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.01);
      osc.connect(gain); gain.connect(actx.destination);
      osc.start(t); osc.stop(t + dur + 0.02);
    } catch (e) { /* audio is decoration; never let it break the page */ }
  }
  var sndOpen = function () { tone(420, 690, 0.05, 0.05); };
  var sndClose = function () { tone(560, 330, 0.045, 0.035); };
  var sndSwitch = function () { tone(520, 810, 0.045, 0.06); tone(300, 300, 0.02, 0.02, 'triangle'); };
  var sndTick = function () { tone(700, 520, 0.03, 0.025); };

  // {LINK ALLOWLIST}
  // Same-document fragment links are always allowed. Everything else must parse as
  // http/https/mailto AND match an allowlisted host suffix, or the anchor is
  // downgraded to plain text with a note.
  function readJson(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }

  var allowlist = readJson('doc-allowlist') || [];

  function hostAllowed(host) {
    for (var i = 0; i < allowlist.length; i++) {
      var h = String(allowlist[i]).toLowerCase();
      if (host === h || host.endsWith('.' + h)) return true;
    }
    return false;
  }

  function isSafeHref(raw) {
    if (!raw) return false;
    if (raw.charAt(0) === '#') return true;
    // a relative href (the compaction archive, a sibling file) is a local fact,
    // not a network destination — always allowed, like a fragment
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) && raw.indexOf('//') !== 0) return true;
    var url;
    try { url = new URL(raw, location.href); } catch (e) { return false; }
    if (url.protocol === 'mailto:') return true;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return hostAllowed(url.hostname.toLowerCase());
  }

  function neutralize(a) {
    var span = document.createElement('span');
    span.className = ('blocked-link ' + (a.className || '')).trim();
    // the URL itself is kept where the reader can still get at it — removing
    // the affordance must never remove the fact
    span.title = 'Link removed — host not on the allowlist: ' + (a.getAttribute('href') || '');
    // the icon chip, if any, survives; only the anchor affordance is removed
    while (a.firstChild) span.appendChild(a.firstChild);
    a.replaceWith(span);
  }

  for (var _a = 0, _as = Array.from(document.querySelectorAll('a[href]')); _a < _as.length; _a++) {
    var anchor = _as[_a];
    if (isSafeHref(anchor.getAttribute('href'))) continue;
    neutralize(anchor);
  }

  // {DIAL}
  // A floating trigger, bottom right, whose popover holds the section tabs
  // vertically. Hover is the headline interaction, but it is never the only one:
  // click, Enter/Space, focus, arrows, Home/End and Escape all work, and the
  // closed trigger always names the section you are in.
  var dial = document.querySelector('.dial');
  var dialBtn = dial && dial.querySelector('.dial-btn');
  var dialPop = dial && dial.querySelector('.dial-pop');
  var tabs = dialPop ? Array.from(dialPop.querySelectorAll('[role="tab"]')) : [];
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  var dialCur = dial && dial.querySelector('.dial-cur');
  var dialIcon = dial && dial.querySelector('.dial-btn .ic use');

  tabs.forEach(function (tab, i) { tab.style.setProperty('--i', String(i)); });

  var isOpen = false;
  var pinned = false;
  // focus() dispatches focusin synchronously, and focusin opens the dial — so a
  // deliberate close-then-return-focus would immediately reopen it. This flag is
  // the one-statement window that stops that.
  var refocusing = false;

  function refocusTrigger() {
    refocusing = true;
    dialBtn.focus();
    refocusing = false;
  }

  function openDial(silent) {
    if (isOpen || !dialPop) return;
    isOpen = true;
    dialPop.hidden = false;
    dialBtn.setAttribute('aria-expanded', 'true');
    // one frame so the transition runs from the closed state
    requestAnimationFrame(function () { dialPop.setAttribute('data-open', 'true'); });
    if (!silent) sndOpen();
  }

  function closeDial(silent) {
    if (!isOpen || !dialPop) return;
    isOpen = false;
    pinned = false;
    dialPop.setAttribute('data-open', 'false');
    dialBtn.setAttribute('aria-expanded', 'false');
    if (!silent) sndClose();
    var hide = function () { if (!isOpen) dialPop.hidden = true; };
    // 240 > the 220ms spring, so the close transition is never cut short
    if (quiet) hide(); else setTimeout(hide, 240);
  }

  function syncTrigger(index) {
    var tab = tabs[index];
    if (!tab) return;
    if (dialCur) dialCur.textContent = tab.dataset.short || tab.textContent.trim();
    var src = tab.querySelector('use');
    if (dialIcon && src) dialIcon.setAttribute('href', src.getAttribute('href'));
  }

  function activate(index, options) {
    var opts = options || {};
    tabs.forEach(function (tab, i) {
      var on = i === index;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      if (panels[i]) panels[i].hidden = !on;
    });
    syncTrigger(index);
    if (opts.focus && tabs[index]) tabs[index].focus();
    if (opts.sound) sndSwitch();
  }

  // section id -> tab index, so #timeline activates its panel and then scrolls
  var sectionTab = new Map();
  panels.forEach(function (panel, i) {
    if (!panel) return;
    sectionTab.set(panel.id, i);
    for (var _s = 0, _ss = Array.from(panel.querySelectorAll('[id]')); _s < _ss.length; _s++) {
      sectionTab.set(_ss[_s].id, i);
    }
  });

  // Every programmatic jump in the document goes through here, so "smooth unless
  // the reader asked for stillness" is decided in exactly one place.
  function scrollToEl(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'start', behavior: quiet ? 'auto' : 'smooth' });
  }

  function routeFromHash() {
    var id = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!id) { activate(0); return; }
    var index = sectionTab.has(id) ? sectionTab.get(id) : 0;
    activate(index);
    var target = document.getElementById(id);
    if (!target || panels[index] === target) return;
    // the panel became visible only just now, so scroll after layout settles
    requestAnimationFrame(function () { scrollToEl(target); });
  }

  // In-document links (the spark strip, .goto chips, the no-JS jump list) must
  // switch tab first and then glide, not jump. Anything leaving the document is
  // untouched.
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    if (location.hash === '#' + id) routeFromHash();
    else location.hash = '#' + id;
  });

  if (dial && tabs.length) {
    dialBtn.addEventListener('click', function () {
      if (isOpen && pinned) { closeDial(); return; }
      pinned = true;
      if (!isOpen) openDial();
    });

    if (canHover) {
      // Proximity, not hover: the dial answers when the pointer comes near it, so
      // you never have to land on a 40px target. Measured against the whole dial
      // (button + open popover) so an open menu keeps its own generous margin.
      // A distance test rather than an invisible padded hit area — padding would
      // put a dead zone over the page's bottom-right corner and swallow clicks.
      var NEAR = 132;
      var farEnough = NEAR + 90; // hysteresis: closes later than it opens, so the
                                 // dial can't flicker while you hover its edge
      var raf = 0, px = 0, py = 0, inside = false;

      // The dial's own box is the button alone — .dial-pop is absolutely
      // positioned, so it never contributes to the parent's rect. Union it in
      // while it is open, or the open menu sits outside its own close radius.
      function reach() {
        var r = dialBtn.getBoundingClientRect();
        if (!isOpen) return r;
        var p = dialPop.getBoundingClientRect();
        if (!p.width && !p.height) return r;
        return {
          left: Math.min(r.left, p.left), right: Math.max(r.right, p.right),
          top: Math.min(r.top, p.top), bottom: Math.max(r.bottom, p.bottom)
        };
      }

      function measure() {
        raf = 0;
        // pointer is literally on the dial or inside the menu — always near,
        // whatever the geometry says
        if (inside) { if (!isOpen) openDial(); return; }
        var r = reach();
        var dx = Math.max(r.left - px, 0, px - r.right);
        var dy = Math.max(r.top - py, 0, py - r.bottom);
        var dist = Math.hypot(dx, dy);
        if (dist <= NEAR) { if (!isOpen) openDial(); return; }
        if (dist > farEnough && isOpen && !pinned) closeDial(true);
      }

      document.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        px = e.clientX; py = e.clientY;
        inside = !!(e.target && e.target.nodeType === 1 && dial.contains(e.target));
        if (!raf) raf = requestAnimationFrame(measure);
      }, { passive: true });

      // pointer left the window entirely — nothing is near anything
      document.addEventListener('pointerleave', function () {
        if (!pinned) closeDial(true);
      });
    }

    dial.addEventListener('focusin', function () { if (!refocusing) openDial(true); });
    dial.addEventListener('focusout', function (e) {
      if (e.relatedTarget && dial.contains(e.relatedTarget)) return;
      closeDial(true);
    });

    dial.addEventListener('keydown', function (e) {
      // only claim Escape while actually open — otherwise it belongs to
      // whatever else is showing (a hover card, most likely)
      if (e.key !== 'Escape' || !isOpen) return;
      e.stopPropagation();
      closeDial();
      refocusTrigger();
    });

    document.addEventListener('pointerdown', function (e) {
      if (!isOpen || dial.contains(e.target)) return;
      closeDial(true);
    });

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        // activate first so the switch is synchronous; the hash write is for deep-linking
        activate(i, { sound: true });
        if (panels[i]) location.hash = '#' + panels[i].id;
        closeDial(true);
        refocusTrigger();
      });
      tab.addEventListener('keydown', function (e) {
        var delta = 0;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') delta = 1;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') delta = -1;
        else if (e.key === 'Home') delta = -tabs.length;
        else if (e.key === 'End') delta = tabs.length;
        else return;
        e.preventDefault();
        var next = Math.min(tabs.length - 1, Math.max(0, i + delta));
        if (next === i) return;
        activate(next, { focus: true, sound: true });
        if (panels[next]) history.replaceState(null, '', '#' + panels[next].id);
      });
    });

    window.addEventListener('hashchange', routeFromHash);
    routeFromHash();
    dialPop.hidden = true;
  }

  // {TIMELINE FILTERS}
  // Items live inside month clusters; a cluster with nothing left disappears too.
  // Both queries are scoped to the event <li> itself — a bare [data-type] would
  // also match anything nested that happens to carry the attribute, and a month
  // would then look non-empty because of a descendant that is not an event.
  //
  // The reason this used to look "broken for milestone and decision" was not
  // here: `li.hidden` was being set correctly, but the timeline's own
  // `display: grid` rule outranked `[hidden]`'s `display: none`, so hidden
  // events kept rendering and only the fully-empty month clusters vanished.
  // doc-components.css now states `[hidden] { display: none !important }` once,
  // as an invariant, because every interaction in this document is `.hidden`.
  var filters = document.getElementById('tl-filters');
  var timelineList = document.getElementById('timeline-list');
  var timelineItems = Array.from(document.querySelectorAll('#timeline-list .tl-month > ol > li[data-type]'));
  var months = Array.from(document.querySelectorAll('#timeline-list > .tl-month'));
  if (filters && timelineItems.length) {
    // Multi-select: each kind chip is an independent toggle so a reader can ask
    // for "decisions AND incidents" at once. An empty selection means All. The
    // All chip is the clear-all. Every kind present on the rail gets its own
    // chip — pivot is not folded under decision — so the filtering is as granular
    // as the dot vocabulary.
    var active = Object.create(null);
    var activeCount = 0;
    var filterBtns = Array.from(filters.querySelectorAll('button[data-filter]'));

    function syncFilters() {
      for (var _b = 0; _b < filterBtns.length; _b++) {
        var f = filterBtns[_b].dataset.filter;
        var on = f === 'all' ? activeCount === 0 : !!active[f];
        filterBtns[_b].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
      for (var _i = 0; _i < timelineItems.length; _i++) {
        var li = timelineItems[_i];
        li.hidden = activeCount > 0 && !active[li.dataset.type];
      }
      for (var _m = 0; _m < months.length; _m++) {
        months[_m].hidden = !months[_m].querySelector('ol > li[data-type]:not([hidden])');
      }
    }

    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      var kind = btn.dataset.filter;
      if (kind === 'all') {
        active = Object.create(null);
        activeCount = 0;
      } else if (active[kind]) {
        delete active[kind];
        activeCount--;
      } else {
        active[kind] = true;
        activeCount++;
      }
      syncFilters();
      // filtering re-lays out everything below the buttons; bring the list back
      // under them rather than leaving the reader mid-page
      if (timelineList && timelineList.getBoundingClientRect().top < 0) scrollToEl(filters);
      sndTick();
    });
  }

  // {SPARK}
  // Bar heights and counts are recomputed from the month clusters each bar
  // links to — the same rule as the Ask tally, so the strip can never drift
  // from the rail. The build still ships real --h integers for the no-JS path.
  var sparkBars = Array.from(document.querySelectorAll('.tl-spark > li'));
  if (sparkBars.length) {
    var sparkCounts = sparkBars.map(function (li) {
      var a = li.querySelector('a[href^="#"]');
      var m = a && document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      return m ? m.querySelectorAll('ol > li[data-type]').length : 0;
    });
    var sparkMax = Math.max.apply(null, sparkCounts.concat(1));
    sparkBars.forEach(function (li, i) {
      li.style.setProperty('--h', String(Math.max(1, Math.round(sparkCounts[i] / sparkMax * 100))));
      var a = li.querySelector('a[aria-label]');
      if (a) a.setAttribute('aria-label', a.getAttribute('aria-label')
        .replace(/\d+\s+events?/, sparkCounts[i] + (sparkCounts[i] === 1 ? ' event' : ' events')));
    });
  }

  // {STATE TILES}
  // The counts are the anchor, so they are also the control: pressing one shows
  // only that group. Pressing it again shows everything.
  var stateTiles = Array.from(document.querySelectorAll('button.tile[data-state]'));
  var stateGroups = Array.from(document.querySelectorAll('.state-group[data-state]'));
  if (stateTiles.length && stateGroups.length) {
    // each tile's number is read off its group, never trusted from the markup —
    // the same rule as the Ask tally, so a tile can never disagree with its
    // rows. The build still ships real counts for the no-JS path. A tile whose
    // group has nothing is disabled: a button that filters to blankness is a
    // promise the page cannot keep.
    stateTiles.forEach(function (tile) {
      var group = null;
      for (var _g = 0; _g < stateGroups.length; _g++) {
        if (stateGroups[_g].dataset.state === tile.dataset.state) group = stateGroups[_g];
      }
      var n = group ? group.querySelectorAll('.rows > .row, .rows > .disc').length : 0;
      var nEl = tile.querySelector('.tile-n');
      if (nEl) nEl.textContent = String(n);
      if (!n) tile.disabled = true;
    });
    stateTiles.forEach(function (tile) {
      tile.addEventListener('click', function () {
        var on = tile.getAttribute('aria-pressed') !== 'true';
        stateTiles.forEach(function (t) {
          t.setAttribute('aria-pressed', on && t === tile ? 'true' : 'false');
        });
        stateGroups.forEach(function (g) {
          g.hidden = on && g.dataset.state !== tile.dataset.state;
        });
        sndTick();
      });
    });
  }

  // {GANTT TODAY}
  // The today line is computed from the chart's own window — data-start is the
  // ISO date column 1 begins on, data-unit is week|month — never from a baked
  // column. A document refreshed with no lane activity would otherwise carry a
  // today line frozen at its last edit. The build still ships a .g-today with
  // a real --c1 as the no-JS fallback; this repositions or removes it.
  var gantt = document.querySelector('.gantt[data-start]');
  if (gantt) {
    var gRows = gantt.querySelector('.g-rows');
    var gStart = Date.parse(gantt.getAttribute('data-start') + 'T00:00:00');
    var gCols = parseInt(getComputedStyle(gantt).getPropertyValue('--cols'), 10) || 12;
    // a month column is approximated at 30.44 days — close enough to land the
    // line in the right column of a 12–16 column window
    var gUnit = gantt.getAttribute('data-unit') === 'month' ? 30.44 : 7;
    var gLine = gRows && gRows.querySelector('.g-today');
    if (gRows && !isNaN(gStart)) {
      var gCol = Math.floor((Date.now() - gStart) / (gUnit * 864e5)) + 1;
      if (gCol < 1 || gCol > gCols) {
        if (gLine) gLine.remove();
      } else {
        if (!gLine) {
          gLine = document.createElement('span');
          gLine.className = 'g-today';
          gRows.insertBefore(gLine, gRows.firstChild);
        }
        gLine.style.setProperty('--c1', String(gCol));
      }
    }
  }

  // {PIPELINE}
  // One stage's depth at a time. Buttons carry aria-expanded and aria-controls;
  // the panel is a [hidden] div in the inspector below, so without JS every
  // stage's depth reads open, in order.
  var stageButtons = Array.from(document.querySelectorAll('.stage-btn[aria-controls]'));
  var stagePanels = stageButtons.map(function (btn) {
    return document.getElementById(btn.getAttribute('aria-controls'));
  });

  function setStage(index) {
    for (var i = 0; i < stageButtons.length; i++) {
      var on = i === index;
      stageButtons[i].setAttribute('aria-expanded', on ? 'true' : 'false');
      if (stagePanels[i]) stagePanels[i].hidden = !on;
    }
  }

  if (stageButtons.length) {
    setStage(-1);
    stageButtons.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        setStage(btn.getAttribute('aria-expanded') === 'true' ? -1 : i);
        sndTick();
      });
    });
  }

  // {GLOSSARY}
  // Free-text filter and a letter rail, ANDed. Letters with no term are disabled
  // rather than hidden, so the rail never reflows under the cursor.
  var gsearch = document.getElementById('gsearch');
  var galpha = document.getElementById('galpha');
  var gterms = Array.from(document.querySelectorAll('.gterm'));
  var gcats = Array.from(document.querySelectorAll('.gcat'));
  var gempty = document.getElementById('gempty');

  if (gterms.length && (gsearch || galpha)) {
    // one lowercased haystack per term, built once — filtering never re-reads the DOM
    var haystacks = gterms.map(function (t) { return t.textContent.toLowerCase(); });
    var initials = gterms.map(function (t) {
      var dt = t.querySelector('dt');
      var s = (dt ? dt.textContent : t.textContent).trim().toUpperCase();
      return s ? s.charAt(0) : '';
    });
    var letter = '';

    function applyFilter() {
      var q = gsearch ? gsearch.value.trim().toLowerCase() : '';
      var anyHit = false;
      for (var i = 0; i < gterms.length; i++) {
        var hit = (q === '' || haystacks[i].indexOf(q) !== -1) &&
                  (letter === '' || initials[i] === letter);
        gterms[i].hidden = !hit;
        if (hit) anyHit = true;
      }
      for (var c = 0; c < gcats.length; c++) {
        gcats[c].hidden = !gcats[c].querySelector('.gterm:not([hidden])');
      }
      if (gempty) gempty.hidden = anyHit;
    }

    if (gsearch) gsearch.addEventListener('input', applyFilter);

    if (galpha) {
      var present = new Set(initials);
      for (var _l = 0, _ls = Array.from(galpha.querySelectorAll('button[data-letter]')); _l < _ls.length; _l++) {
        var lb = _ls[_l];
        if (!present.has(lb.dataset.letter)) lb.disabled = true;
      }
      galpha.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-letter]');
        if (!btn || btn.disabled) return;
        letter = letter === btn.dataset.letter ? '' : btn.dataset.letter;
        for (var _p = 0, _ps = Array.from(galpha.querySelectorAll('button[data-letter]')); _p < _ps.length; _p++) {
          _ps[_p].setAttribute('aria-pressed', _ps[_p].dataset.letter === letter ? 'true' : 'false');
        }
        applyFilter();
        sndTick();
      });
    }
  }

  // {ASK TALLY}
  // The number of open questions is read off the list, never typed into the
  // markup, so the headline count cannot drift from the rows under it. The
  // strokes beside it are a hand tally — four uprights and a cross for every
  // five — which is the whole point: it is a count of what is still owed.
  var askOpen = document.getElementById('ask-open');
  if (askOpen) {
    var openCount = askOpen.querySelectorAll(':scope > .ask-q').length;
    var doneList = document.getElementById('ask-done');
    var doneCount = doneList ? doneList.querySelectorAll(':scope > .ask-q').length : 0;
    var doneEl = document.getElementById('ask-done-n');
    if (doneEl) doneEl.textContent = String(doneCount);

    var countEl = document.getElementById('ask-count');
    if (countEl) {
      if (quiet || openCount < 2) {
        countEl.textContent = String(openCount);
      } else {
        var shown = 0;
        countEl.textContent = '0';
        var step = setInterval(function () {
          shown++;
          countEl.textContent = String(shown);
          if (shown >= openCount) clearInterval(step);
        }, Math.max(40, Math.round(420 / openCount)));
      }
    }

    var strokeBox = document.getElementById('ask-strokes');
    if (strokeBox) {
      var drawn = 0;
      while (drawn < openCount) {
        var size = Math.min(5, openCount - drawn);
        var grp = document.createElement('span');
        grp.className = 'ask-grp';
        for (var _q = 0; _q < Math.min(size, 4); _q++) {
          var mark = document.createElement('span');
          mark.className = 'ask-stroke';
          mark.style.setProperty('--i', String(drawn + _q));
          grp.appendChild(mark);
        }
        if (size === 5) {
          var cross = document.createElement('span');
          cross.className = 'ask-stroke is-cross';
          cross.style.setProperty('--i', String(drawn + 4));
          grp.appendChild(cross);
        }
        strokeBox.appendChild(grp);
        drawn += size;
      }
    }
  }

  // {CITE PREVIEW}
  // A GitHub-style hover card for every citation chip that has a preview baked
  // into <script type="application/json" id="doc-previews">. Nothing is fetched
  // when a card opens — the payload is already in the document, which is what
  // makes this work offline and under a strict CSP. Every node is built with
  // createElement and every string lands via textContent; no markup is ever
  // assembled from a source-fetched string.
  // accepts either the keyed object the build writes, or citations.json's own
  // { "citations": [...] } shape, so the two can never fall out of step
  var previewRaw = readJson('doc-previews');
  var previews = Object.create(null);
  if (previewRaw && Array.isArray(previewRaw.citations)) {
    for (var _p = 0; _p < previewRaw.citations.length; _p++) {
      var _c = previewRaw.citations[_p];
      if (_c && _c.key && _c.preview) previews[_c.key] = _c;
    }
  } else if (previewRaw && typeof previewRaw === 'object') {
    for (var _k in previewRaw) {
      if (Object.prototype.hasOwnProperty.call(previewRaw, _k)) previews[_k] = previewRaw[_k];
    }
  }

  var cards = Array.from(document.querySelectorAll('.cite[data-cite]'))
    .filter(function (c) { return !!previews[c.dataset.cite]; });

  if (cards.length) {
    var CARD_IN = 350;   // intent delay: brushing past must not flash a card
    var CARD_OUT = 120;  // grace on the way out, so the pointer can cross the gap
    var card = document.createElement('div');
    card.className = 'cprev';
    card.id = 'doc-cprev';
    card.setAttribute('role', 'tooltip');
    card.setAttribute('aria-hidden', 'true');
    card.hidden = true;
    document.body.appendChild(card);

    var inTimer = 0, outTimer = 0, hideTimer = 0, activeChip = null;

    function node(tag, cls, text) {
      var el = document.createElement(tag);
      if (cls) el.className = cls;
      if (text != null && text !== '') el.textContent = String(text);
      return el;
    }

    // `brand` picks the sprite symbols that carry their own fills (the source
    // marks) over the stroked currentColor set
    function icon(id, brand) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', brand ? 'ic ic-b' : 'ic ic-s');
      svg.setAttribute('aria-hidden', 'true');
      var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#' + id);
      svg.appendChild(use);
      return svg;
    }

    function pill(cls, iconId, word) {
      var p = node('span', 'pill ' + cls);
      if (iconId) p.appendChild(icon(iconId));
      p.appendChild(document.createTextNode(word));
      return p;
    }

    var UNITS = [['y', 31536e6], ['mo', 2592e6], ['d', 864e5], ['h', 36e5], ['m', 6e4]];
    // Slack stamps a message with epoch seconds and a fractional part
    // ("1782231991.073999"), which Date.parse cannot read — every Slack card
    // used to show a blank age because of it.
    var EPOCH_S = /^\d{9,11}(\.\d+)?$/;
    function ago(iso) {
      if (!iso) return '';
      var t = EPOCH_S.test(String(iso)) ? parseFloat(iso) * 1000 : Date.parse(iso);
      if (isNaN(t)) return '';
      var diff = Date.now() - t;
      var future = diff < 0;
      diff = Math.abs(diff);
      for (var i = 0; i < UNITS.length; i++) {
        var n = Math.floor(diff / UNITS[i][1]);
        if (n >= 1) return (future ? 'in ' : '') + n + UNITS[i][0] + (future ? '' : ' ago');
      }
      return 'just now';
    }

    // An avatar is the one image a card may carry. It is either bytes already in
    // the document (a base64 data URI baked into the payload — no request, no
    // host, nothing to allowlist) or a URL whose host is allowlisted. Anything
    // else, and any load error, is a monogram, so a blocked or dead CDN can
    // never leave a hole in the card.
    var DATA_IMG = /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/]+=*$/;
    function avatarImg(url, initial, remote) {
      var img = document.createElement('img');
      img.className = 'cprev-av';
      img.alt = '';
      if (remote) {
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
      }
      img.addEventListener('error', function () { img.replaceWith(node('span', 'cprev-av mono', initial)); });
      img.src = url;
      return img;
    }
    function avatar(url, name) {
      var initial = (name || '?').trim().charAt(0) || '?';
      if (url && DATA_IMG.test(url)) return avatarImg(url, initial, false);
      if (url && isSafeHref(url)) return avatarImg(url, initial, true);
      return node('span', 'cprev-av mono', initial);
    }

    var PR_STATE = {
      merged: ['merged', 'i-merge', 'Merged'],
      closed: ['closed', 'i-x', 'Closed'],
      draft: ['draft', 'i-doc', 'Draft'],
      open: ['open', 'i-fork', 'Open']
    };

    // In Drive these four are four different colours, and that mark is the
    // fastest thing on the card — so the mimeType picks a brand symbol, not one
    // grey page. [symbol, label, isBrandMark]; anything unrecognised falls back
    // to the stroked generic page, which is a designed state, not a hole.
    var DRIVE_TYPE = {
      'application/vnd.google-apps.document': ['i-gdoc', 'Google Docs', true],
      'application/vnd.google-apps.spreadsheet': ['i-gsheet', 'Google Sheets', true],
      'application/vnd.google-apps.presentation': ['i-gslide', 'Google Slides', true],
      'application/pdf': ['i-gpdf', 'PDF', true]
    };
    var DRIVE_FALLBACK = ['i-file', 'File', false];

    // The document states its own timezone and locale in the doc-config block;
    // a modified date read in the reader's zone would disagree with every other
    // date on the page.
    var DOC_CFG = readJson('doc-config') || {};
    var DOC_TZ = DOC_CFG.timezone || undefined;
    var DOC_LOCALE = DOC_CFG.locale || 'en-GB';
    function onDay(iso) {
      var t = Date.parse(iso);
      if (isNaN(t)) return '';
      try {
        return new Intl.DateTimeFormat(DOC_LOCALE, {
          day: 'numeric', month: 'short', year: 'numeric', timeZone: DOC_TZ
        }).format(new Date(t));
      } catch (e) { return ''; }
    }

    function lasts(startIso, endIso) {
      var a = Date.parse(startIso), b = Date.parse(endIso);
      if (isNaN(a) || isNaN(b) || b <= a) return '';
      var mins = Math.round((b - a) / 6e4);
      if (mins < 60) return mins + ' min';
      var h = Math.floor(mins / 60), m = mins % 60;
      return h + ' hr' + (m ? ' ' + m + ' min' : '');
    }

    function sep() { return node('span', 'cprev-dot', '·'); }

    function who(name, url) {
      var w = node('span', 'cprev-who');
      w.appendChild(avatar(url, name));
      w.appendChild(document.createTextNode(name || 'unknown'));
      return w;
    }

    // Every kind renders the same three bands — a top line that identifies it, a
    // title line, and a foot of who/how-much — so a bead card and a PR card feel
    // like the same object seen from two sides. Slack is the one kind that folds
    // its title and its who into a single message block, because a message read
    // out of its author and its time is not a Slack message any more.
    function build(entry) {
      var p = entry.preview || {};
      var top = node('div', 'cprev-top');
      var title = node('div', 'cprev-t');
      var foot = node('div', 'cprev-foot');
      // a kind may put its title inside a richer block instead of on its own —
      // Slack does, because a message is an author and a time and a body
      var block = null;

      if (entry.kind === 'pr') {
        var st = PR_STATE[p.state] || PR_STATE.open;
        top.appendChild(pill(st[0], st[1], st[2]));
        top.appendChild(node('span', 'cprev-id tok', p.repo ? p.repo + '#' + p.number : '#' + p.number));
        // the age names the PR's terminal event — merge, close, or creation —
        // so a closed PR never wears its creation date as if it were fresh
        top.appendChild(node('span', 'cprev-age', ago(p.mergedAt || p.closedAt || p.createdAt)));
        title.textContent = p.title || '';
        foot.appendChild(who(p.author, p.authorAvatarUrl));
        var stat = node('span', 'cprev-stat');
        if (p.additions != null) stat.appendChild(node('span', 'cprev-add', '+' + p.additions));
        if (p.deletions != null) stat.appendChild(node('span', 'cprev-del', '−' + p.deletions));
        if (p.changedFiles != null) {
          var f = node('span', 'cprev-files');
          f.appendChild(icon('i-file'));
          f.appendChild(document.createTextNode(p.changedFiles + (p.changedFiles === 1 ? ' file' : ' files')));
          stat.appendChild(f);
        }
        foot.appendChild(stat);
      } else if (entry.kind === 'slack') {
        // laid out as Slack lays a message out: mark and #channel on the band,
        // then avatar / bold author / time / body under a quote rule
        var src = node('span', 'cprev-src');
        src.appendChild(icon('i-slack', true));
        var ch = node('span', 'cprev-ch');
        ch.appendChild(icon('i-hash'));
        ch.appendChild(document.createTextNode(String(p.channel || '').replace(/^#/, '')));
        src.appendChild(ch);
        top.appendChild(src);
        title.className = 'cprev-t is-quote';
        title.textContent = p.text || '';

        block = node('div', 'cprev-msg');
        block.appendChild(avatar(p.authorAvatarUrl, p.author));
        var body = node('div', 'cprev-body');
        var line = node('div', 'cprev-line');
        line.appendChild(node('span', 'cprev-name', p.author || 'unknown'));
        var when = ago(p.ts);
        if (when) line.appendChild(node('span', 'cprev-when', when));
        body.appendChild(line);
        if (title.textContent) body.appendChild(title);
        block.appendChild(body);
      } else if (entry.kind === 'bead') {
        top.appendChild(pill('milestone', 'i-bead', p.status || 'bead'));
        top.appendChild(node('span', 'cprev-id tok', p.id || entry.raw));
        if (p.due) top.appendChild(node('span', 'cprev-age', 'due ' + p.due));
        title.textContent = p.title || '';
        if (p.assignee) foot.appendChild(who(p.assignee, null));
      } else if (entry.kind === 'cal') {
        // laid out as an event: the Calendar mark on the band, then a tear-off
        // date tile beside the title, the when, and where it happens
        var csrc = node('span', 'cprev-src');
        csrc.appendChild(icon('i-cal', true));
        csrc.appendChild(node('span', 'cprev-ch', 'Calendar'));
        top.appendChild(csrc);
        top.appendChild(node('span', 'cprev-age', ago(p.start)));

        var started = Date.parse(p.start);
        var isPast = !isNaN(started) && started < Date.now();
        block = node('div', 'cprev-cal' + (isPast ? ' is-past' : ''));

        var tile = node('div', 'cprev-tile');
        tile.appendChild(node('span', 'cprev-tile-m', p.month || ''));
        tile.appendChild(node('span', 'cprev-tile-d', p.dateNum || ''));
        block.appendChild(tile);

        var ev = node('div', 'cprev-ev');
        title.textContent = p.title || '';
        if (title.textContent) ev.appendChild(title);

        var when = node('div', 'cprev-when-l');
        if (p.day) when.appendChild(document.createTextNode(p.day));
        if (p.time) {
          if (when.childNodes.length) when.appendChild(sep());
          when.appendChild(document.createTextNode(p.time));
        }
        var howLong = lasts(p.start, p.end);
        if (howLong) {
          if (when.childNodes.length) when.appendChild(sep());
          when.appendChild(document.createTextNode(howLong));
        }
        if (when.childNodes.length) ev.appendChild(when);

        // a conferencing link is a fact about the event, shown as text — the
        // card is a tooltip and nothing inside it is clickable
        var joinAt = p.conferenceUrl || p.location;
        if (joinAt) {
          var conf = node('div', 'cprev-conf');
          if (p.conferenceUrl) conf.appendChild(icon('i-meet', true));
          conf.appendChild(node('span', null,
            String(joinAt).replace(/^https?:\/\//, '')));
          ev.appendChild(conf);
        }
        block.appendChild(ev);

        // faces for the ones we have a face for, a count for everyone
        var guests = Array.isArray(p.attendees) ? p.attendees : [];
        var FACES = 5;
        if (guests.length) {
          var stack = node('span', 'cprev-faces');
          for (var _g = 0; _g < guests.length && _g < FACES; _g++) {
            stack.appendChild(avatar(guests[_g].avatarUrl, guests[_g].name));
          }
          foot.appendChild(stack);
        }
        var total = p.attendeeCount != null ? p.attendeeCount : guests.length;
        if (total) {
          var gwrap = node('span', 'cprev-guests');
          gwrap.appendChild(icon('i-user'));
          gwrap.appendChild(document.createTextNode(
            total + (total === 1 ? ' guest' : ' guests')));
          foot.appendChild(gwrap);
        }
      } else if (entry.kind === 'drive') {
        // laid out as a file: the Drive mark on the band, then the file-type
        // mark beside the title and the product it opens in
        var dsrc = node('span', 'cprev-src');
        dsrc.appendChild(icon('i-drive', true));
        dsrc.appendChild(node('span', 'cprev-ch', 'Drive'));
        top.appendChild(dsrc);
        top.appendChild(node('span', 'cprev-age', ago(p.modified)));

        var ft = DRIVE_TYPE[p.mimeType] || DRIVE_FALLBACK;
        block = node('div', 'cprev-file');
        var mark = node('span', 'cprev-fmark');
        mark.appendChild(icon(ft[0], ft[2]));
        block.appendChild(mark);

        var fbody = node('div', 'cprev-fbody');
        title.textContent = p.title || '';
        if (title.textContent) fbody.appendChild(title);
        fbody.appendChild(node('div', 'cprev-ftype', ft[1]));
        block.appendChild(fbody);

        if (p.owner) foot.appendChild(who(p.owner, p.ownerAvatarUrl));
        var modOn = onDay(p.modified);
        if (modOn) foot.appendChild(node('span', 'cprev-mod', 'Modified ' + modOn));
      } else if (entry.kind === 'path') {
        var where = node('span', 'cprev-id');
        where.appendChild(icon('i-file'));
        where.appendChild(document.createTextNode('in the repo'));
        top.appendChild(where);
        top.appendChild(p.exists === false
          ? pill('closed', 'i-x', 'gone')
          : pill('milestone', 'i-check', 'present'));
        title.className = 'cprev-t tok';
        title.textContent = p.path || entry.raw || '';
        if (p.lines != null) foot.appendChild(node('span', 'cprev-files', p.lines + ' lines'));
      } else {
        // generic link — a Tier-2 source with no first-class card. The source
        // name on the band, whatever title we have, nothing fabricated. This is
        // the fallback for kind "link" and for any unrecognised kind, so a
        // custom source can never render as the wrong card.
        var lsrc = node('span', 'cprev-id');
        lsrc.appendChild(icon('i-link'));
        lsrc.appendChild(document.createTextNode(p.source || p.host || 'link'));
        top.appendChild(lsrc);
        var lage = p.modified || p.createdAt || p.updatedAt;
        if (lage) top.appendChild(node('span', 'cprev-age', ago(lage)));
        title.textContent = p.title || entry.raw || '';
        if (p.author) foot.appendChild(who(p.author, p.authorAvatarUrl));
      }

      var frag = document.createDocumentFragment();
      frag.appendChild(top);
      if (block) frag.appendChild(block);
      else if (title.textContent) frag.appendChild(title);
      if (foot.childNodes.length) frag.appendChild(foot);
      return frag;
    }

    // Collision handling: prefer above the chip, fall back to below, clamp into
    // the viewport either way, and move the transform origin to sit under the
    // chip so the card still scales out of its trigger after a flip.
    var EDGE = 12, GAP = 8;
    function place(chip) {
      var r = chip.getBoundingClientRect();
      // offsetWidth/Height, not the rect: the rect is mid-transform while the
      // open transition runs, and would give a scaled-down box
      var w = card.offsetWidth, h = card.offsetHeight;
      var above = r.top - h - GAP;
      var below = r.bottom + GAP;
      var top, oy;
      if (above >= EDGE) { top = above; oy = '100%'; }
      else if (below + h <= window.innerHeight - EDGE) { top = below; oy = '0%'; }
      else { top = Math.max(EDGE, window.innerHeight - h - EDGE); oy = '100%'; }
      var left = r.left + r.width / 2 - w / 2;
      left = Math.max(EDGE, Math.min(left, window.innerWidth - w - EDGE));
      var ox = Math.max(0, Math.min(100, ((r.left + r.width / 2) - left) / w * 100));
      card.style.setProperty('--cprev-origin', ox.toFixed(1) + '% ' + oy);
      card.style.left = left + 'px';
      card.style.top = top + 'px';
    }

    function showCard(chip) {
      var entry = previews[chip.dataset.cite];
      if (!entry) return;
      clearTimeout(hideTimer);
      activeChip = chip;
      card.textContent = '';
      card.appendChild(build(entry));
      card.hidden = false;
      place(chip);
      chip.setAttribute('aria-describedby', 'doc-cprev');
      requestAnimationFrame(function () { card.setAttribute('aria-hidden', 'false'); });
    }

    function hideCard() {
      if (!activeChip) return;
      activeChip.removeAttribute('aria-describedby');
      activeChip = null;
      card.setAttribute('aria-hidden', 'true');
      var drop = function () { if (!activeChip) card.hidden = true; };
      // 240 > the 220ms spring, so the fade is never cut short
      if (quiet) drop(); else hideTimer = setTimeout(drop, 240);
    }

    function wantShow(chip) {
      clearTimeout(outTimer);
      clearTimeout(inTimer);
      if (activeChip === chip) return;
      inTimer = setTimeout(function () { showCard(chip); }, CARD_IN);
    }

    function wantHide() {
      clearTimeout(inTimer);
      clearTimeout(outTimer);
      outTimer = setTimeout(hideCard, CARD_OUT);
    }

    cards.forEach(function (chip) {
      // an unlinked chip is not focusable on its own, and the card has to be
      // reachable without a pointer
      if (chip.tagName !== 'A' && !chip.hasAttribute('tabindex')) chip.tabIndex = 0;
      chip.addEventListener('pointerenter', function () { wantShow(chip); });
      chip.addEventListener('pointerleave', wantHide);
      chip.addEventListener('focus', function () { wantShow(chip); });
      chip.addEventListener('blur', wantHide);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !activeChip) return;
      clearTimeout(inTimer);
      hideCard();
    });
    window.addEventListener('scroll', function () {
      clearTimeout(inTimer);
      hideCard();
    }, { passive: true, capture: true });
  }

  // {CITATION TILTS}
  // The same hand-pinned wobble the brief gives its source icons, so a citation
  // chip in Timeline feels like a source chip in Today.
  if (!quiet) {
    for (var _c = 0, _cs = Array.from(document.querySelectorAll('.cite')); _c < _cs.length; _c++) {
      var chip = _cs[_c];
      chip.style.setProperty('--tilt', (Math.random() * 3 - 1.5).toFixed(2) + 'deg');
      chip.style.setProperty('--htilt', (Math.random() * 20 - 10).toFixed(1) + 'deg');
    }
  }
})();
