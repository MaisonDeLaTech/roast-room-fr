import { downloadVerdictPdf } from "./pdf.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const SAMPLES = [
  ["Augmenter mes prix ?", "Je gère une activité de coaching à 30 000 € par mois, avec 15 clients à 2 000 € chacun. Je veux passer à 3 500 €. Options : augmenter pour tout le monde maintenant, seulement pour les nouveaux clients, ou garder 2 000 €. Je signe environ un appel de vente sur deux. Je penche pour tout le monde, car je me sous-paye."],
  ["Premier commercial ?", "Je suis seul à la tête d'un logiciel B2B à 25 000 € de revenu mensuel, en croissance de 5 % par mois. Je fais tous les appels de vente, environ 20 h par semaine, et je m'épuise. Dois-je embaucher un commercial à 60 000 € fixes, prendre un closer à la commission, ou continuer six mois ? J'ai 150 000 € en banque."],
  ["Deuxième produit ?", "Mon agence fait 80 000 € par mois en automatisations IA pour les dentistes. Des clients demandent un standard téléphonique IA. Dois-je en faire un logiciel séparé, le proposer seulement aux clients actuels, ou rester concentré sur l'agence ? Équipe de 6, environ 200 000 € de trésorerie."],
  ["Quitter mon emploi ?", "Je gagne 60 000 € par an dans une entreprise tech. Ma newsletter payante rapporte 6 000 € par mois et a grandi de 8 % par mois cette année. J'ai 9 mois de dépenses de côté. Dois-je partir maintenant, dans 6 mois, ou garder les deux et embaucher un rédacteur ?"],
];

const EXAMPLE = "Je gère une activité de coaching à 30 000 € par mois, avec 15 clients à 2 000 € chacun. Dois-je passer à 3 500 € pour tout le monde, seulement pour les nouveaux clients, ou garder 2 000 € ? Je signe environ un appel de vente sur deux et j'ai 40 000 € en banque. La réussite, c'est 45 000 € par mois en mars. Je penche pour tout le monde, car je me sous-paye.";

// The how-to, shown in the side panel while the room is empty and in "How it works".
const GUIDE = `
  <div class="guide">
    <div class="guide-sec">
      <h4>Comment utiliser la Roast Room</h4>
      <ol>
        <li><span>Ouvre Claude Code dans ce dossier.</span></li>
        <li><span>Tape <code>/roast-room</code> suivi de ta décision.</span></li>
        <li><span>Choisis tes conseillers (le président te recommande un groupe) et réponds à ses questions. Regarde ensuite le conseil débattre ici.</span></li>
        <li><span>Quand le verdict arrive, télécharge-le en PDF.</span></li>
      </ol>
    </div>
    <div class="guide-sec">
      <h4>Que mettre dans ta question</h4>
      <ul>
        <li><span><b>La décision</b> en une ligne.</span></li>
        <li><span><b>Tes options.</b> Deux ou trois. « Continuer comme maintenant » compte aussi.</span></li>
        <li><span><b>Tes chiffres.</b> Revenus, trésorerie et taille de l'équipe.</span></li>
        <li><span><b>Tes limites.</b> Date limite, heures et budget.</span></li>
        <li><span><b>Ce qu'est la réussite</b> pour toi, et à quelle date.</span></li>
        <li><span><b>Ce vers quoi tu penches</b>, et pourquoi. Le conseil le met à l'épreuve.</span></li>
      </ul>
      <p class="note" style="margin-top:8px">Tu as oublié quelque chose ? Le président te le demande avant de commencer.</p>
    </div>
    <div class="guide-sec">
      <h4>Exemple</h4>
      <div class="example">
        <p><code>/roast-room</code> ${EXAMPLE.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>
        <button class="ghost" type="button" data-copy-example>Copier cet exemple</button>
      </div>
    </div>
    <div class="guide-sec">
      <h4>Bon à savoir</h4>
      <ul>
        <li><span><b>Choisis ton conseil :</b> le président recommande les conseillers adaptés à ta question et te demande de confirmer. Tu peux en ajouter ou en retirer.</span></li>
        <li><span><b>Conseil complet :</b> 5 à 7 conseillers, 3 tours. Pour les grandes décisions difficiles à défaire.</span></li>
        <li><span><b>Rapide :</b> ajoute <code>--quick</code> pour 4 conseillers et 2 tours. Consomme beaucoup moins de ton forfait.</span></li>
        <li><span><b>Chaque conseil est gardé.</b> Ouvre Conseils passés pour le revoir ou télécharger son PDF.</span></li>
        <li><span><b>Ajouter un conseiller :</b> tape <code>/newroaster</code> et un nom. Change ton groupe par défaut avec <code>/roast-room board</code>.</span></li>
      </ul>
    </div>
  </div>`;

const SHAPES = ["base", "open", "mid", "blink"];
// A seat's cartoon frames live in /portraits/<key>-<shape>.webp (or .png, .jpg). A seat added with /newroaster
// may have only a base frame, or none: missing frames fall back to the base frame, then to a
// drawn bust in the seat's color whose mouth and eyes still move.
const portrait = (key, shape = "base") => {
  const have = state.byKey[key]?.portraits || {};
  return have[shape] || have.base || drawnBust(key, shape);
};
const bustCache = new Map();
function drawnBust(key, shape) {
  const id = `${key}-${shape}`;
  if (bustCache.has(id)) return bustCache.get(id);
  const s = state.byKey[key] || {};
  const c = /^#[0-9a-f]{6}$/i.test(s.color || "") ? s.color : "#37bdf8";
  const initials = esc((s.initials || s.short || key).slice(0, 3).toUpperCase());
  const eyes = shape === "blink"
    ? `<path d="M226 250h30M304 250h30" stroke="#1d2733" stroke-width="7" stroke-linecap="round"/>`
    : `<circle cx="241" cy="250" r="11" fill="#1d2733"/><circle cx="319" cy="250" r="11" fill="#1d2733"/><circle cx="245" cy="246" r="3.5" fill="#fff"/><circle cx="323" cy="246" r="3.5" fill="#fff"/>`;
  const mouth = shape === "open" ? `<ellipse cx="280" cy="318" rx="24" ry="17" fill="#5a2430"/>`
    : shape === "mid" ? `<ellipse cx="280" cy="316" rx="20" ry="8" fill="#5a2430"/>`
    : `<path d="M256 312q24 16 48 0" fill="none" stroke="#5a2430" stroke-width="7" stroke-linecap="round"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 560"><g transform="translate(-14 -64) scale(1.05)">
    <path d="M70 640c0-160 86-250 210-250s210 90 210 250z" fill="${c}"/>
    <path d="M232 384h96l-48 58z" fill="#e9eef3"/>
    <rect x="248" y="330" width="64" height="70" rx="22" fill="#d9b49a"/>
    <ellipse cx="280" cy="250" rx="112" ry="128" fill="#e8c4a8"/>
    <path d="M168 236c0-90 50-122 112-122s112 32 112 122c-20-46-60-64-112-64s-92 18-112 64z" fill="#3a4654"/>
    ${eyes}${mouth}
    <text x="280" y="540" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="54" fill="rgba(255,255,255,.92)">${initials}</text>
  </g></svg>`;
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  bustCache.set(id, url);
  return url;
}
const ROUND_NAME = ["", "Position", "Débat", "Vote"];
const VOTE_FR = { endorse: "pour", amend: "avec modification", dissent: "contre" };
const voteFr = (v) => VOTE_FR[v] || v;
const VERDICT_FR = { GO: "GO", "GO WITH CONDITIONS": "GO SOUS CONDITIONS", RESHAPE: "À REVOIR", WAIT: "ATTENDRE", "DON'T DO IT": "NE PAS LE FAIRE" };
const verdictFr = (l) => VERDICT_FR[l] || l;
const SEAT_FR = {
  bezos: ["Stratégie et décisions", "Est-ce le bon pari, et peut-on revenir en arrière ?"],
  graham: ["Produit et startups", "Les gens veulent-ils vraiment ça, et est-ce que ça grandit ?"],
  hormozi: ["Offres, prix et vente", "Les gens vont-ils payer, combien, et comment conclure ?"],
  garyvee: ["Marketing et attention", "D'où vient l'attention, et coûte-t-elle moins que sa vraie valeur ?"],
  martell: ["Équipe, embauche et temps", "Qui fait ça, et combien de temps ça te coûte ?"],
  wickman: ["Opérations et croissance", "L'entreprise peut-elle tenir ça sans que tu portes tout ?"],
  buffett: ["Argent et capital", "Quel effet sur la trésorerie, le risque et la valeur à long terme ?"],
  naval: ["Levier et richesse", "Est-ce que ça construit un levier et un patrimoine à toi, ou tu loues juste ton temps ?"],
  sanchez: ["Acheter et posséder de petites entreprises", "Faut-il construire ça, ou acheter quelque chose qui marche déjà ?"],
  blakely: ["Produit grand public et marque", "Les clients vont-ils l'aimer assez pour le vendre à ta place, sans argent extérieur ?"],
  leila: ["Leadership et équipes", "Ton équipe et ton leadership peuvent-ils porter ça, et qui doit changer ?"],
  musk: ["Premiers principes et rapidité", "Quelle est la vraie contrainte, et peut-on supprimer des étapes pour aller plus vite ?"],
};

const state = {
  seats: [], byKey: {}, board: [], table: [], session: null, options: [], weights: {}, active: [], round: 0,
  cards: { 1: {}, 2: {}, 3: {} }, replaying: false, verdict: null, links: [], geo: {}, setup: null, wait: null,
};

// ------------------------------------------------------------- boot
async function boot() {
  const r = await refreshSeats();
  state.runner = r.runner;
  if (r.runner === "api" && !r.hasKey) toast("Aucune clé ANTHROPIC_API_KEY dans .env. Ajoute-la et relance le serveur.");
  renderSeats(state.board);
  renderSamples();
  bindUI();
  new ResizeObserver(() => { layoutStage(); drawLinks(); }).observe($("#stage"));
  startBlinking();
  reset();
  typeIn($("#composer h2"));
  typeIn($("#waiting h2"));
  const ss = await fetch("/api/sessions").then((x) => x.json());
  if (ss.running) attach(ss.running);
  else if (ss.live) attach(ss.live);
  refreshUsage();
  setInterval(watchForLive, 2500);
  setInterval(tickWait, 1000);
}

// The roster (every seat, plus the default board) comes from the skill's roster.json.
async function refreshSeats() {
  const r = await fetch("/api/seats").then((x) => x.json());
  state.seats = r.seats.map((s) => (SEAT_FR[s.key] ? { ...s, pillar: SEAT_FR[s.key][0], question: SEAT_FR[s.key][1] } : s));
  state.byKey = Object.fromEntries(state.seats.map((s) => [s.key, s]));
  state.board = (r.board?.default || []).filter((k) => state.byKey[k]);
  if (!state.board.length) state.board = state.seats.slice(0, 7).map((s) => s.key);
  bustCache.clear();
  return r;
}

// a council started in Claude Code shows up here on its own
const seenLive = new Set();
async function watchForLive() {
  const ss = await fetch("/api/sessions").then((x) => x.json()).catch(() => null);
  const id = ss?.live || ss?.running;
  if (!id || seenLive.has(id) || id === state.session) return;
  seenLive.add(id);
  attach(id);
}

// Arrival: a heading types in a character at a time, blur to sharp
function typeIn(el) {
  if (!el) return;
  const text = el.textContent;
  el.classList.add("typein");
  // characters sit inside a nowrap span per word, so lines only break between words
  let i = 0;
  el.innerHTML = text.split(" ").map((word) => `<span class="wd">${[...word].map((c) => `<span class="ch" style="animation-delay:${i++ * 22}ms">${esc(c)}</span>`).join("")}</span>`).join(" ");
  el.setAttribute("aria-label", text);
}

function renderSamples() {
  $("#samples").innerHTML = SAMPLES.map(([t], i) => `<button type="button" data-i="${i}">${esc(t)}</button>`).join("");
  $("#samples").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $("#prompt").value = SAMPLES[b.dataset.i][1];
    $("#prompt").focus();
  });
}

const MAX_TABLE = 9; // the most busts the table can seat and still read

/** Seat these keys at the table (roster order). Does nothing when they are already seated. */
function renderSeats(keys) {
  const order = state.seats.map((s) => s.key);
  const want = order.filter((k) => keys.includes(k)).slice(0, MAX_TABLE);
  if (want.join() === state.table.join() && $("#seats").children.length) return;
  state.table = want;
  const seats = want.map((k) => state.byKey[k]);
  $("#seats").innerHTML = seats.map((s, i) => `
    <div class="seat" id="seat-${s.key}" data-seat="${s.key}" style="--d:-${(i * 1.7) % 6}s" tabindex="0" role="button" aria-label="${esc(s.name)}, ${esc(s.pillar)}. Ouvrir la carte.">
      <div class="think" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="bust" data-shape="base">${SHAPES.map((sh) => `<img class="${sh}" src="${portrait(s.key, sh)}" alt="" draggable="false">`).join("")}</div>
    </div>`).join("");
  $("#plates").innerHTML = seats.map((s) => `
    <div class="nameplate" id="plate-${s.key}" data-seat="${s.key}">
      <b>${esc(s.short === "Gary V" ? "Gary V" : s.name)}</b>
      <small>${esc(s.pillar)}</small>
      <div class="meta"><span class="pips" title="Poids sur cette décision"></span><span class="chip" hidden></span><span class="score" hidden></span></div>
    </div>`).join("");
  layoutStage();
  startBlinking();
}

// The table is an ellipse seen from the front. Seats sit along its far edge: the
// middle seat is farthest (higher, smaller), the end seats nearest (lower, bigger).
function layoutStage() {
  const stage = $("#stage");
  const W = stage.clientWidth;
  const narrow = matchMedia("(max-width: 820px)").matches;
  const H = narrow ? Math.round(W * 0.62) : stage.clientHeight;
  const cx = W / 2, cy = H * (narrow ? 0.98 : 0.9), rx = W * 0.48, ry = H * (narrow ? 0.46 : 0.42);
  const t = $("#table");
  Object.assign(t.style, { left: `${cx - rx}px`, top: `${cy - ry}px`, width: `${rx * 2}px`, height: `${ry * 2}px` });
  const edge = (x) => cy - ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
  // seats spread evenly along the far edge; past seven they shrink to fit
  const n = state.table.length;
  const xs = n === 1 ? [0.5] : state.table.map((_, i) => 0.085 + (0.83 * i) / (n - 1));
  const fit = Math.min(1, 6 / Math.max(1, n - 1));
  state.geo = {};
  state.table.forEach((k, i) => {
    const s = state.byKey[k];
    const x = W * xs[i];
    const d = ((x - cx) / rx) ** 2;
    const size = H * (narrow ? 0.5 + 0.08 * d : 0.37 + 0.07 * d) * fit;
    const bottom = edge(x) + size * 0.2;
    const el = $(`#seat-${s.key}`);
    Object.assign(el.style, { left: `${x - size / 2}px`, top: `${bottom - size}px`, width: `${size}px`, height: `${size}px`, zIndex: 10 + Math.round(d * 10) });
    const pl = $(`#plate-${s.key}`);
    pl.style.left = `${x}px`;
    pl.style.top = `${edge(x) + H * 0.01}px`; // straddles the table edge, over the chest
    state.geo[s.key] = { x, head: bottom - size * 0.72, top: bottom - size * 0.9, size };
  });
  const c = $("#center");
  if (narrow) {
    stage.style.paddingTop = `${H}px`; // the scene sits on top; captions flow below it
  } else {
    stage.style.paddingTop = "";
    // the captions start below the lowest nameplate they could collide with
    const inner = (n > 2 ? state.table.slice(1, -1) : state.table).map((k) => $(`#plate-${k}`));
    const top = Math.max(...inner.map((p) => p.offsetTop + p.offsetHeight / 2)) + H * 0.035;
    Object.assign(c.style, { left: `${W * 0.2}px`, width: `${W * 0.6}px`, top: `${top}px`, height: `${H - top - H * 0.09}px` });
  }
  const sp = state.speaking ? state.geo[state.speaking] : null;
  if (sp) moveSpot(state.speaking);
}

function moveSpot(key) {
  const g = state.geo[key]; const spot = $("#spot");
  if (!g) { spot.classList.remove("on"); return; }
  spot.style.left = `${g.x}px`;
  spot.style.top = `${g.head}px`;
  spot.style.width = spot.style.height = `${g.size * 1.9}px`;
  spot.classList.add("on");
}

function bindUI() {
  $("#composer").addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = $("#prompt").value.trim();
    if (prompt.length < 10) return toast("Donne au conseil une vraie décision, au moins une phrase.");
    const mode = $('input[name="mode"]:checked').value;
    $("#convene").disabled = true;
    const r = await fetch("/api/council", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, mode }) });
    const j = await r.json();
    $("#convene").disabled = false;
    if (!r.ok) return toast(j.error || "Impossible de lancer le conseil.");
    attach(j.id);
  });
  const openFrom = (e) => { const b = e.target.closest("[data-seat]"); if (b) openCard(b.dataset.seat); };
  $("#seats").addEventListener("click", openFrom);
  $("#plates").addEventListener("click", openFrom);
  $("#seats").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFrom(e); } });
  $("#feed").addEventListener("click", (e) => { const c = e.target.closest(".feed-card"); if (c) openCard(c.dataset.seat, Number(c.dataset.round)); });
  $("#waitHistory").addEventListener("click", openHistory);
  $("#waitGuide").addEventListener("click", openGuide);
  $("#guideBtn").addEventListener("click", openGuide);
  document.addEventListener("click", async (e) => {
    if (e.target.closest("[data-copy-example]")) {
      try { await navigator.clipboard.writeText("/roast-room " + EXAMPLE); toast("Copié. Colle-le dans Claude Code."); }
      catch { toast("La copie n'a pas marché ici. Sélectionne le texte et copie-le."); }
    }
    if (e.target.closest("[data-pdf]")) savePdf(e.target.closest("[data-pdf]"));
  });
  $("#historyBtn").addEventListener("click", openHistory);
  $("#newBtn").addEventListener("click", reset);
  $("#verdictSheet").addEventListener("click", (e) => { if (e.target.id === "verdictSheet" || e.target.closest("[data-close]")) $("#verdictSheet").hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("#verdictSheet").hidden = true; });
  // Clicking the dimmed backdrop around a card, the guide, or past sessions closes it (Escape already does).
  // Both press and release must land outside the box, so a text selection dragged out of it never closes it.
  $$("dialog.card-dialog").forEach((d) => {
    const outside = (e) => {
      const r = d.getBoundingClientRect();
      return e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom);
    };
    let pressedOutside = false;
    d.addEventListener("pointerdown", (e) => { pressedOutside = outside(e); });
    d.addEventListener("click", (e) => { if (pressedOutside && outside(e)) d.close(); pressedOutside = false; });
  });
  $$(".speed button").forEach((b) => b.addEventListener("click", () => {
    player.speed = Number(b.dataset.speed);
    $$(".speed button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  }));
  $("#skipBtn").addEventListener("click", () => player.skip());
  $("#pauseBtn").addEventListener("click", () => player.togglePause());
  $("#voiceBtn").addEventListener("click", () => voice.toggle());
  voice.load();
  window.speechSynthesis?.addEventListener("voiceschanged", () => voice.load());
  $("#voiceBtn").setAttribute("aria-pressed", String(voice.on));
}

// ------------------------------------------------------------- the player
// Every event goes through one ordered queue. Seats speak one at a time, at a
// readable pace, even though the API answers them in parallel. Skip ahead drains
// whatever is queued instantly; new events after that animate again.
const player = {
  q: [], busy: false, epoch: 0, speed: 1, fast: false, paused: false, timers: new Set(),
  push(ev) { this.q.push(ev); this.info(); this.pump(); },
  async pump() {
    if (this.busy) return;
    this.busy = true;
    const my = this.epoch;
    while (this.q.length && my === this.epoch) {
      const ev = this.q.shift();
      this.info();
      hideWait();
      try { await handle(ev); await voice.done; } catch (e) { console.error(e); }
    }
    if (my === this.epoch) { this.busy = false; this.fast = false; this.info(); }
  },
  sleep(ms) {
    if (this.fast || ms <= 0) return Promise.resolve();
    return new Promise((res) => { const o = { res, left: ms / this.speed }; this.timers.add(o); if (!this.paused) this.arm(o); });
  },
  arm(o) { o.at = Date.now(); o.t = setTimeout(() => { this.timers.delete(o); o.res(); }, o.left); },
  flushTimers() { for (const o of this.timers) { clearTimeout(o.t); o.res(); } this.timers.clear(); },
  setPaused(on) {
    if (on === this.paused) return;
    this.paused = on;
    $("#pauseBtn").textContent = on ? "Reprendre" : "Pause";
    $("#pauseBtn").setAttribute("aria-pressed", String(on));
    if (on) {
      window.speechSynthesis?.pause();
      for (const o of this.timers) { clearTimeout(o.t); o.left -= Date.now() - o.at; }
    } else {
      window.speechSynthesis?.resume();
      for (const o of this.timers) this.arm(o);
    }
  },
  togglePause() { this.setPaused(!this.paused); },
  skip() { this.setPaused(false); this.fast = true; voice.cancel(); this.flushTimers(); },
  reset() { this.setPaused(false); this.epoch++; this.q.length = 0; this.fast = true; voice.cancel(); this.flushTimers(); this.busy = false; this.fast = false; this.info(); },
  info() {
    const waiting = this.q.filter((e) => e.type === "seat_done").length;
    $("#queueInfo").textContent = waiting ? `${waiting} lines up next` : "";
  },
};

// ------------------------------------------------------------- the voice
// The browser's own speech voices read each line aloud. Free, no API call, and off until
// the viewer turns it on. Speaks sentence by sentence, because long utterances can stall.
const voice = {
  on: (() => { try { return localStorage.getItem("rr-voice") === "1"; } catch { return false; } })(),
  all: [], run: 0, done: Promise.resolve(), stop: null,
  get ready() { return this.on && this.all.length > 0; },
  load() { this.all = window.speechSynthesis?.getVoices() || []; },
  toggle() {
    this.load();
    if (!this.on && !this.all.length) return toast("Ce navigateur n'a aucune voix. Ouvre la salle dans Chrome ou Edge.");
    this.on = !this.on;
    if (!this.on) this.cancel();
    $("#voiceBtn").setAttribute("aria-pressed", String(this.on));
    try { localStorage.setItem("rr-voice", this.on ? "1" : "0"); } catch {}
    if (this.on) this.say("Voix activée."); // said right away, so the viewer knows it works
  },
  pick(text, key) {
    const lang = /[éèêàçù]|\b(le|la|les|des|une|tu|ton|ta)\b/i.test(text) ? "fr" : "en";
    const local = this.all.filter((v) => v.localService); // online voices can fail without a sound
    const usable = local.length ? local : this.all;
    const pool = usable.filter((v) => v.lang.toLowerCase().startsWith(lang));
    const list = pool.length ? pool : usable;
    const i = Math.max(0, state.table.indexOf(key));
    return { v: list[i % list.length], pitch: 0.85 + (i % 4) * 0.1 };
  },
  fail(why) { console.warn("voice:", why); toast(`La voix n'a pas pu démarrer (${why}). Essaie dans Chrome ou Edge.`); },
  cancel() { this.run++; window.speechSynthesis?.cancel(); window.speechSynthesis?.resume(); this.stop?.(); this.stop = null; },
  say(text, { key, onChar } = {}) {
    if (!this.ready || player.fast) return Promise.resolve();
    this.cancel();
    const run = this.run;
    const { v, pitch } = this.pick(text, key);
    const parts = text.match(/[^.!?…]+[.!?…]*\s*/g) || [text];
    return (this.done = (async () => {
      let offset = 0;
      for (const part of parts) {
        if (run !== this.run) return;
        const base = offset;
        await new Promise((res) => {
          const u = new SpeechSynthesisUtterance(part.replace(/\(?\bS\d+\)?/g, (m) => " ".repeat(m.length)));
          u.voice = v; u.lang = v.lang; u.pitch = pitch; u.rate = Math.min(2, player.speed);
          let last = Date.now(), started = false;
          const guard = setInterval(() => { // a voice that never starts or ends must not freeze the room
            if (player.paused) last = Date.now();
            else if (!started && Date.now() - last > 4000) { this.fail("no start"); finish(); }
            else if (Date.now() - last > part.length * 200 + 5000) finish();
          }, 1000);
          const finish = () => { clearInterval(guard); res(); };
          this.stop = finish;
          u.onstart = () => { started = true; last = Date.now(); };
          u.onboundary = (e) => onChar?.(base + e.charIndex);
          u.onend = finish;
          u.onerror = (e) => { if (!/interrupted|canceled/.test(e.error)) this.fail(e.error); finish(); };
          window.speechSynthesis.speak(u);
        });
        offset += part.length;
        if (run === this.run) onChar?.(offset);
      }
    })());
  },
};

// ------------------------------------------------------------- session wiring
function reset() {
  state.es?.close();
  player.reset();
  Object.assign(state, { session: null, options: [], weights: {}, active: [], round: 0, cards: { 1: {}, 2: {}, 3: {} }, replaying: false, verdict: null, links: [], speaking: null, setup: null, wait: null });
  hideWait();
  $("#stage").classList.remove("live");
  $("#topic").hidden = true;
  $("#composer").hidden = state.runner !== "api";
  $("#waiting").hidden = state.runner === "api";
  $("#caption").hidden = true;
  $("#cruxes").hidden = true;
  $("#plate").hidden = true;
  $("#playbar").hidden = true;
  $("#newBtn").hidden = true;
  $("#verdictSheet").hidden = true;
  $("#panelHead").textContent = "Pour commencer";
  $("#feed").innerHTML = GUIDE;
  $$(".vote").forEach((b) => b.remove());
  renderSeats(state.board);
  $$(".seat").forEach((el) => { el.classList.remove("absent", "speaking", "thinking", "addressed"); $(".bust", el).dataset.shape = "base"; });
  $$(".nameplate").forEach((el) => { el.classList.remove("absent", "speaking"); $(".chip", el).hidden = true; $(".score", el).hidden = true; $(".pips", el).innerHTML = ""; });
  $("#spot").classList.remove("on");
  $$(".stepper li").forEach((li) => li.classList.remove("active", "done"));
  drawLinks();
}

function begin(id) {
  reset();
  state.session = id;
  $("#composer").hidden = true;
  $("#waiting").hidden = true;
  $("#newBtn").hidden = false;
  $("#playbar").hidden = false;
  $("#panelHead").textContent = "Points clés";
  $("#feed").innerHTML = '<div class="empty">Une ligne par conseiller pendant le débat. Clique sur un conseiller pour lire sa carte complète.</div>';
  $("#stage").classList.add("live");
  chairSays("Le conseil prend place", { dots: true });
}

function attach(id) {
  begin(id);
  const es = new EventSource(`/api/stream/${id}`);
  state.es = es;
  es.onmessage = (m) => {
    const ev = JSON.parse(m.data);
    if (ev.type === "end") { es.close(); refreshUsage(); return; }
    if (ev.type === "delta") return; // seats speak from their finished cards
    if (ev.type === "usage") return refreshUsage();
    if (ev.type === "seat_error") return toast(`${state.byKey[ev.seat].short} a rencontré une erreur : ${ev.error}`);
    player.push(ev);
  };
  es.onerror = () => { /* the browser retries; the server replays from the start */ };
}

// ------------------------------------------------------------- event handling
const STEP_OF = { setup: "setup", round1: "round1", cruxes: "cruxes", round2: "round2", draft: "round3", round3: "round3", skip3: "round3", verdict: "verdict" };
const ORDER = ["setup", "round1", "cruxes", "round2", "round3", "verdict"];

function setStep(step) {
  const idx = ORDER.indexOf(step);
  $$(".stepper li").forEach((li) => {
    const i = ORDER.indexOf(li.dataset.step);
    li.classList.toggle("done", i < idx);
    li.classList.toggle("active", i === idx);
  });
}

async function handle(ev) {
  switch (ev.type) {
    case "phase": {
      state.wait = { phase: ev.phase, at: ev.at || Date.now() };
      setStep(STEP_OF[ev.phase] || "setup");
      feedPhase(ev.label);
      const thinking = ["setup", "cruxes", "draft", "verdict"].includes(ev.phase);
      if (thinking || ev.phase === "skip3") {
        chairSays(ev.label.replace(/^Le président /, "").replace(/^./, (c) => c.toUpperCase()), { dots: thinking });
        await player.sleep(1400);
      }
      break;
    }
    case "setup": state.setup = ev; await onSetup(ev); await player.sleep(1800); break;
    case "round_start": onRoundStart(ev.round); break;
    case "seat_start": $(`#seat-${ev.seat}`)?.classList.add("thinking"); break;
    case "seat_done": await onSeatDone(ev); break;
    case "round_done": state.wait = null; updateOptions(ev.scores); break;
    case "cruxes": await onCruxes(ev); break;
    case "draft": await onDraft(ev.draft); break;
    case "verdict": state.wait = null; onVerdict(ev); break;
    case "error": state.wait = null; toast(`Le conseil s'est arrêté : ${ev.error}`); chairSays(`Le conseil s'est arrêté : ${ev.error}`); break;
  }
}

async function onSetup(ev) {
  if (ev.seats.some((k) => !state.byKey[k])) await refreshSeats(); // a seat added since the page loaded
  // seat the default board plus anyone this council called in; past the table's limit, only this council
  const both = [...new Set([...state.board, ...ev.seats])];
  renderSeats(both.length <= MAX_TABLE ? both : ev.seats);
  state.options = ev.options;
  state.weights = ev.weights;
  state.active = ev.seats;
  $("#topic").hidden = false;
  $("#topicTitle").textContent = ev.title;
  typeIn($("#topicTitle"));
  $("#options").innerHTML = ev.options.map((o) => `
    <div class="opt" data-opt="${o.id}"><span class="id">${o.id}</span><span class="label">${esc(o.label)}</span><span class="val">-</span><span class="bar"><i></i></span></div>`).join("");
  for (const s of state.table.map((k) => state.byKey[k])) {
    const absent = !ev.seats.includes(s.key);
    $(`#seat-${s.key}`).classList.toggle("absent", absent);
    const pl = $(`#plate-${s.key}`);
    pl.classList.toggle("absent", absent);
    const w = ev.weights[s.key]?.weight || 1;
    pl.title = `Poids ${w} sur 3 : ${ev.weights[s.key]?.reason || ""}`;
  }
  chairSays(ev.title, { tag: ev.mode === "quick" ? "Conseil rapide" : "Conseil complet" });
}

function updateOptions(scores) {
  const best = Object.entries(scores).sort((a, b) => (b[1].score ?? 0) - (a[1].score ?? 0))[0]?.[0];
  for (const [id, v] of Object.entries(scores)) {
    const el = $(`.opt[data-opt="${id}"]`); if (!el) continue;
    $(".val", el).textContent = v.score ?? "-";
    $(".bar i", el).style.width = `${(v.score || 0) * 10}%`;
    el.classList.toggle("lead", id === best);
    el.title = v.math;
  }
}

function onRoundStart(round) {
  state.round = round;
  state.links = [];
  drawLinks();
  $("#cruxes").hidden = true;
  chairSays(`${["", "Tour 1 : les positions", "Tour 2 : le débat", "Tour 3 : le vote"][round]}`, { dots: true, tag: "La parole est ouverte" });
}

// ------------------------------------------------------------- talking
const clean = (t) => String(t || "").replace(/\s*\((?:S\d+|source[^)]*)[^)]*\)/gi, "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();

function firstSentences(t, max) {
  const parts = t.match(/[^.!?]+[.!?]+["”)]?\s*|[^.!?]+$/g) || [t];
  let out = "";
  for (const p of parts) { if (out && (out + p).length > max) break; out += p; }
  return shorten(out.trim(), max + 40);
}

/** The line a seat says out loud: the headline of its card, not the whole card. */
function lineFor(round, p, max = 170) {
  if (round === 1) return firstSentences(clean(p.call || p.stance), max);
  if (round === 2) {
    let t = clean(p.disagreeLine || p.stance);
    // "Graham. His argument..." reads as talking to him: "Graham, his argument..."
    t = t.replace(/^([A-Za-z][\w.' ]{0,24})[.:,]\s+(\S+)/, (m, name, next) => !seatKey(name) ? m : `${state.byKey[seatKey(name)].short}, ${/^I('|$)/.test(next) ? next : next[0].toLowerCase() + next.slice(1)}`);
    return firstSentences(t, max);
  }
  return firstSentences(clean(p.oneLine || p.amendment), max);
}

function shapesFor(word) {
  const out = [];
  for (const ch of word.toLowerCase()) {
    const s = "aei".includes(ch) ? "open" : "ouwy".includes(ch) ? "mid" : "mbpf".includes(ch) ? "base" : null;
    if (s && s !== out[out.length - 1]) out.push(s);
  }
  return out.length ? out : ["mid"];
}

function setShape(key, shape) { const b = $(`#seat-${key} .bust`); if (b) b.dataset.shape = shape; }

function setSpeaker(key, target) {
  state.speaking = key;
  $$(".seat").forEach((el) => { el.classList.toggle("speaking", el.dataset.seat === key); el.classList.toggle("addressed", el.dataset.seat === target); });
  $$(".nameplate").forEach((el) => el.classList.toggle("speaking", el.dataset.seat === key));
  const el = key && $(`#seat-${key}`);
  if (el) {
    el.classList.remove("thinking");
    // lean toward whoever they're answering
    const g = state.geo[key], tg = target && state.geo[target];
    el.style.transform = tg ? `translateX(${Math.sign(tg.x - g.x) * g.size * 0.04}px) rotate(${Math.sign(tg.x - g.x) * 2.5}deg) scale(1.05)` : "scale(1.05)";
    moveSpot(key);
  } else $("#spot").classList.remove("on");
  $$(".seat").forEach((s) => { if (s.dataset.seat !== key) s.style.transform = ""; });
}

function captionFor(who) {
  $("#cruxes").hidden = true;
  $("#plate").hidden = true;
  const c = $("#caption");
  c.hidden = false;
  c.style.animation = "none"; void c.offsetWidth; c.style.animation = "";
  const s = state.byKey[who];
  $("#capAv").className = `cap-av${s ? "" : " chair"}`;
  $("#capAv").innerHTML = `<img src="${s ? portrait(who) : "/brand/flamme.svg"}" alt="">`;
  $("#capWho").textContent = s ? s.name : "Le président";
}

function chairSays(text, { dots = false, tag = "" } = {}) {
  setSpeaker(null);
  captionFor(null);
  $("#capTag").textContent = tag;
  const p = $("#capText");
  p.className = "cap-text chair";
  p.innerHTML = esc(text) + (dots ? '<span class="dots"><i></i><i></i><i></i></span>' : "");
  $("#capSub").textContent = "";
}

async function speak(key, text, { tag = "", target = null, sub = "" } = {}) {
  setSpeaker(key, target);
  captionFor(key);
  $("#capTag").textContent = tag;
  $("#capSub").textContent = "";
  const p = $("#capText");
  p.className = "cap-text";
  const words = text.split(" ").filter(Boolean);
  p.innerHTML = words.map((w) => `<span class="w">${esc(w)}</span> `).join("");
  const spans = $$(".w", p);
  if (voice.ready) {
    // the voice sets the pace: words light up as it reaches them
    let n = 0, cur = -1, ended = false;
    const starts = words.map((w) => { const at = n; n += w.length + 1; return at; });
    voice.say(words.join(" "), { key, onChar: (c) => { while (cur + 1 < words.length && starts[cur + 1] <= c) spans[++cur].classList.add("on"); } }).then(() => { ended = true; });
    while (!ended && !player.fast) {
      for (const sh of shapesFor((words[Math.max(cur, 0)] || "").replace(/[^a-z]/gi, ""))) { setShape(key, sh); await player.sleep(90); }
      setShape(key, "base");
      await player.sleep(90);
    }
  } else for (let i = 0; i < words.length; i++) {
    if (player.fast) break;
    const w = words[i];
    spans[i].classList.add("on");
    const shapes = shapesFor(w.replace(/[^a-z]/gi, ""));
    const dur = Math.max(170, w.length * 52);
    const per = dur / (shapes.length + 1);
    for (const sh of shapes) { setShape(key, sh); await player.sleep(per); }
    setShape(key, "base");
    await player.sleep(per + (/[.!?]["”)]?$/.test(w) ? 340 : /[,;:]$/.test(w) ? 170 : 25));
  }
  spans.forEach((s) => s.classList.add("on"));
  setShape(key, "base");
  $("#capSub").innerHTML = sub;
  await player.sleep(1300);
}

// idle blinking for everyone, so the room feels alive between lines
const blinking = new Set();
function startBlinking() {
  const blink = (key) => {
    const b = $(`#seat-${key} .bust`);
    if (b && b.dataset.shape === "base") {
      b.dataset.shape = "blink";
      setTimeout(() => { if (b.dataset.shape === "blink") b.dataset.shape = "base"; }, 130);
    }
    setTimeout(() => blink(key), 2400 + Math.random() * 4200);
  };
  state.table.filter((k) => !blinking.has(k)).forEach((k, i) => { blinking.add(k); setTimeout(() => blink(k), 600 + i * 530); });
}

async function onSeatDone(ev) {
  const { round, seat, text, parsed, quotes } = ev;
  state.cards[round][seat] = { text, parsed, quotes };
  const s = state.byKey[seat];
  const top = topOption(parsed.optionScores);
  const line = lineFor(round, parsed);
  let tag = ROUND_NAME[round], sub = "", target = null;
  if (round === 1) {
    tag = `${stanceWord(parsed.stance)}${top ? ` · soutient ${top.id} (${top.v}/10)` : ""}`;
  } else if (round === 2) {
    const tgt = parsed.disagreeWith ? state.byKey[parsed.disagreeWith] : null;
    if (tgt) {
      target = tgt.key;
      tag = `Répond à ${tgt.short}`;
      state.links = state.links.filter((l) => l.from !== seat);
      state.links.push({ from: seat, to: tgt.key });
      drawLinks();
    }
    sub = /^yes/i.test(parsed.moved) ? "A changé d'avis" : "";
  } else {
    const v = parsed.vote || "endorse";
    tag = `Vote : ${voteFr(v)}`;

  }
  feedCard(round, seat, parsed);
  await speak(seat, line || "Je le mets dans ma carte.", { tag, target, sub });

  const pl = $(`#plate-${seat}`);
  const chip = $(".chip", pl);
  chip.hidden = round === 3; // the vote stamp says it
  chip.className = "chip";
  if (round === 3) {
    const v = parsed.vote || "endorse";
    chip.textContent = voteFr(v);
    chip.classList.add(v);
    $(`#seat-${seat} .vote`)?.remove();
    const stamp = document.createElement("div");
    stamp.className = `vote ${v}`;
    stamp.textContent = (v === "amend" ? "modif" : voteFr(v)).toUpperCase(); // the full words don't fit the stamp
    $(`#seat-${seat}`).appendChild(stamp);
  } else chip.textContent = stanceWord(parsed.stance);
  if (top) { const sc = $(".score", pl); sc.hidden = false; sc.textContent = `${top.id} ${top.v}`; sc.title = `Meilleure note : option ${top.id}`; }
  setSpeaker(null);
  void s;
}

function stanceWord(t = "") {
  const m = t.match(/strong yes|conditional yes|strong no|yes|no/i);
  if (!m) return "A parlé";
  const w = m[0].toLowerCase();
  return { "strong yes": "Oui franc", "conditional yes": "Oui, si", "strong no": "Non ferme", yes: "Oui", no: "Non" }[w];
}

function topOption(scores = {}) {
  const e = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return e ? { id: e[0], v: e[1] } : null;
}
const shorten = (t, n) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t);
const face = (k) => `<img src="${portrait(k)}" alt="${esc(state.byKey[k]?.short || k)}" title="${esc(state.byKey[k]?.short || k)}">`;

async function onCruxes(ev) {
  setSpeaker(null);
  $("#caption").hidden = true;
  const c = $("#cruxes");
  c.hidden = false;
  c.innerHTML = `<div class="head">${ev.unanimous ? "Trop d'accord. Le président les relance." : "Sur quoi ils ne sont pas d'accord"}</div>` +
    ev.cruxes.map((x, i) => `<div class="crux" style="animation-delay:${i * 0.18}s"><b>${esc(x.question)}</b><div class="sides">${x.sides.map((sd) => `<span class="side"><span class="faces">${sd.seats.filter((k) => state.byKey[k]).map(face).join("")}</span>${esc(shorten(sd.position, 48))}</span>`).join("")}</div></div>`).join("");
  const f = document.createElement("div");
  f.className = "feed-note";
  f.innerHTML = `<b>Le désaccord :</b> ${ev.cruxes.map((x) => esc(x.question)).join(" ")}`;
  feedAppend(f);
  voice.say(ev.cruxes.map((x) => x.question).join(" "));
  await player.sleep(3500 + 1800 * ev.cruxes.length);
}

async function onDraft(d) {
  chairSays(`Proposition : ${verdictFr(d.label)} sur l'option ${d.option}. ${firstSentences(clean(d.recommendation), 140)}`, { tag: "Soumis au vote" });
  const f = document.createElement("div");
  f.className = "feed-note";
  f.innerHTML = `<b>Soumis au vote :</b> ${esc(verdictFr(d.label))} sur l'option ${esc(d.option)}.`;
  feedAppend(f);
  voice.say(firstSentences(clean(d.recommendation), 140));
  await player.sleep(4200);
}

// ------------------------------------------------------------- rebuttal arcs
function drawLinks() {
  const svg = $("#links");
  const stage = $("#stage");
  const w = stage.clientWidth, h = stage.clientHeight;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const links = state.links || [];
  const col = "#38bdf8";
  svg.innerHTML = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker></defs>` +
    links.map(({ from, to }, i) => {
      const a = state.geo[from], b = state.geo[to];
      if (!a || !b) return "";
      const y1 = a.top - 6, y2 = b.top - 6;
      const mx = (a.x + b.x) / 2, my = Math.min(y1, y2) - Math.min(90, Math.abs(a.x - b.x) * 0.22) - 10;
      return `<path class="${i < links.length - 1 ? "old" : ""}" d="M${a.x},${y1} Q${mx},${my} ${b.x},${y2}" stroke="${col}" marker-end="url(#arrow)"/>`;
    }).join("");
}

// ------------------------------------------------------------- feed + cards
function feedAppend(node) {
  const feed = $("#feed");
  $(".empty", feed)?.remove();
  feed.appendChild(node);
  feed.scrollTop = feed.scrollHeight;
}
function feedPhase(label) {
  const d = document.createElement("div");
  d.className = "feed-phase";
  d.textContent = label.replace(/^Le président /, "Président : ");
  feedAppend(d);
}
function feedCard(round, seat, parsed) {
  const s = state.byKey[seat];
  const d = document.createElement("div");
  d.className = "feed-card";
  d.dataset.seat = seat;
  d.dataset.round = round;
  const top = topOption(parsed.optionScores);
  const tgt = parsed.disagreeWith ? state.byKey[parsed.disagreeWith]?.short : "";
  const what = round === 1 ? `${stanceWord(parsed.stance)}${top ? `, soutient ${top.id}` : ""}` : round === 2 ? (tgt ? `répond à ${tgt}` : "Débat") : `Vote : ${voteFr(parsed.vote || "endorse")}`;
  d.innerHTML = `<img class="av" src="${portrait(seat)}" alt=""><div><div class="h">${esc(s.short)}<span class="r">${esc(what)}</span></div><p>${esc(lineFor(round, parsed, 105))}</p></div>`;
  feedAppend(d);
}

function openCard(seat, round) {
  const s = state.byKey[seat];
  const rounds = [3, 2, 1].filter((r) => state.cards[r][seat]);
  const r = round || rounds[0];
  const c = state.cards[r]?.[seat];
  $("#cardBody").innerHTML = `
    <div class="card-head"><img src="${portrait(seat)}" alt=""><div><div class="label">${esc(s.pillar)}</div><h3>${esc(s.name)}</h3><p class="muted" style="margin:0">Sa question : ${esc(s.question)}</p></div></div>
    ${rounds.length > 1 ? `<p style="margin:0 0 6px">${rounds.slice().reverse().map((x) => `<button class="ghost" data-r="${x}" style="margin-right:6px">${ROUND_NAME[x]}</button>`).join("")}</p>` : ""}
    ${c ? `<pre>${esc(c.text)}</pre>${c.quotes.length ? `<ul class="qcheck">${c.quotes.map((q) => `<li class="${q.verified ? "" : "bad"}">"${esc(shorten(q.quote, 110))}" (${q.source}) ${q.verified ? "vérifiée dans les sources" : "introuvable dans les sources"}</li>`).join("")}</ul>` : ""}` : `<p class="muted">Ce conseiller n'a pas encore parlé.</p>`}
    <p class="muted" style="font-size:12px">Conseiller simulé à partir du travail public de ${esc(s.name)}. Ce n'est pas la vraie personne.</p>`;
  $$("#cardBody [data-r]").forEach((b) => b.addEventListener("click", () => openCard(seat, Number(b.dataset.r))));
  const dlg = $("#cardDialog");
  if (!dlg.open) dlg.showModal();
}

// ------------------------------------------------------------- verdict
// the Chair should write display names; map any raw seat key just in case
const seatKey = (x) => { const k = String(x).toLowerCase().replace(/\s+/g, ""); return state.byKey[k] ? k : state.seats.find((s) => s.short.toLowerCase() === String(x).toLowerCase() || s.name.toLowerCase() === String(x).toLowerCase())?.key; };
const seatName = (x) => state.byKey[seatKey(x)]?.short || x;

function labelClass(l) { return /DON'T/.test(l) ? "dont" : /RESHAPE/.test(l) ? "reshape" : /WAIT/.test(l) ? "wait" : "go"; }

function onVerdict(ev) {
  const v = ev.verdict;
  state.verdict = ev;
  setStep("verdict");
  setSpeaker(null);
  $("#caption").hidden = true;
  $("#cruxes").hidden = true;
  state.links = [];
  drawLinks();
  $("#stage").classList.remove("live");
  updateOptions(v.scores);
  voice.say(v.call);
  const opt = (id) => state.options.find((o) => o.id === id)?.label || id;
  const seats = ev.seats;
  const mk = seatKey(v.minority.seat);
  const short = (t, n) => esc(shorten(clean(t || ""), n));
  const html = `
    <div class="v-top">
      <div><div class="label">Le verdict du conseil</div><span class="v-label ${labelClass(v.label)}">${esc(verdictFr(v.label))}</span></div>
      <div class="actions"><button class="pill" type="button" data-pdf>Télécharger le PDF</button><button class="ghost" data-close>Retour à la table</button></div>
    </div>
    <p class="v-call">${esc(v.call)}</p>
    <div class="v-grid">
      <div class="v-sec"><h3>Notes</h3><div class="v-opts">${state.options.map((o) => `
        <div class="opt ${o.id === v.recommended ? "lead" : ""}"><span class="id">${o.id}</span><span class="label">${esc(o.label)}</span><span class="val">${v.scores[o.id]?.score ?? "-"}</span><span class="bar"><i style="width:${(v.scores[o.id]?.score || 0) * 10}%"></i></span></div>`).join("")}</div>
        <p class="v-meta">Confiance ${v.confidence ?? "-"}/10${v.votes ? ` · ${v.votes.endorse || 0} pour, ${v.votes.amend || 0} avec modification, ${v.votes.dissent || 0} contre` : ""}</p>
      </div>
      <div class="v-sec"><h3>Pourquoi</h3><ul class="v-why">${v.why.slice(0, 3).map((w) => { const k = seatKey(w.seat); return `<li>${k ? `<img class="av" src="${portrait(k)}" alt="">` : ""}<span>${short(w.point, 150)}</span></li>`; }).join("")}</ul></div>
      <div class="v-sec"><h3>Attention</h3><div class="minority"><div class="who">${mk ? `<img class="av" src="${portrait(mk)}" alt="">` : ""}${esc(seatName(v.minority.seat))}</div><q>${short(v.minority.quote, 170)}</q></div></div>
      <div class="v-sec"><h3>Prochaines étapes</h3><ul class="v-steps">${v.next_steps.slice(0, 3).map((n) => `<li><b>${esc(n.when)}</b> ${short(n.action, 120)}</li>`).join("")}</ul>
        <p class="v-meta"><b>Arrête si :</b> ${short(v.kill_criteria, 140)}</p></div>
    </div>
    <details class="v-more"><summary>Tous les détails</summary>
      <div class="v-grid">
        ${(v.sections || []).map((s) => `<div class="v-sec v-wide"><h3>${esc(s.title)}</h3><ul>${(s.items || []).map((i) => `<li>${i.label ? `<b>${esc(i.label)}</b> ` : ""}${esc(i.text)}</li>`).join("")}</ul></div>`).join("")}
        <div class="v-sec"><h3>Où ils se sont opposés</h3><ul>${v.fights.map((f) => `<li><b>${esc(f.crux)}</b> ${esc(f.story)}</li>`).join("")}</ul></div>
        <div class="v-sec"><h3>Conditions</h3><ol>${v.conditions.map((c) => `<li>${esc(c)}</li>`).join("")}</ol></div>
        <div class="v-sec v-wide"><h3>Tableau des notes</h3>
          <table class="scorecard"><thead><tr><th>Conseiller</th><th>Poids</th>${state.options.map((o) => `<th>${o.id}</th>`).join("")}<th>Sa phrase</th></tr></thead><tbody>
          ${seats.map((x) => { const s = state.byKey[x.key]; return `<tr><td><span class="who"><img class="av" src="${portrait(x.key)}" alt="">${esc(s.short)}</span></td><td class="n">${x.weight}</td>${state.options.map((o) => `<td class="n">${x.optionScores?.[o.id] ?? "-"}</td>`).join("")}<td class="line">${short(x.oneLine, 150)}</td></tr>`; }).join("")}
          </tbody></table>
          <p class="muted" style="font-size:11.5px;margin-top:8px">Pondéré selon l'importance de chaque domaine ici. ${state.options.map((o) => `${o.id}: ${esc(v.scores[o.id]?.math || "")}`).join(" · ")}</p></div>
        <div class="v-sec"><h3>Le test le moins cher</h3><p>${esc(v.cheapest_test)}</p><h3>À revoir</h3><p>${esc(v.revisit)}</p></div>
        <div class="v-sec"><h3>L'objection la plus forte</h3><p>${esc(v.minority.quote)}</p><p class="muted">Pour que ce soit vrai : ${esc(v.minority.would_have_to_be_true)}</p></div>
        ${v.amendments?.length ? `<div class="v-sec v-wide"><h3>Modifications</h3><ul>${v.amendments.map((a) => `<li><b>${esc(seatName(a.seat))}:</b> ${esc(a.amendment)} <span class="tag">${a.adopted ? "Adoptée" : "Non adoptée"}: ${esc(a.reason)}</span></li>`).join("")}</ul></div>` : ""}
      </div>
    </details>
    <div class="v-foot"><span class="muted">${esc(v.disclaimer)}</span><button class="ghost" data-close>Retour à la table</button></div>`;
  $("#verdictBody").innerHTML = html;
  const plate = $("#plate");
  plate.hidden = false;
  plate.innerHTML = `<div class="label">Le verdict du conseil</div><span class="v-label ${labelClass(v.label)}">${esc(verdictFr(v.label))}</span><p>${esc(firstSentences(clean(v.call), 150))}</p><div class="row"><button type="button" id="plateOpen">Lire le verdict</button><button type="button" data-pdf>Télécharger le PDF</button><button type="button" class="alt" id="plateReplay">Revoir ce conseil</button></div>`;
  $("#plateOpen").addEventListener("click", () => ($("#verdictSheet").hidden = false));
  $("#plateReplay").addEventListener("click", () => replay(state.session));
  $("#playbar").hidden = true;
  const f = document.createElement("div");
  f.className = "feed-note";
  f.innerHTML = `<b>Verdict : ${esc(verdictFr(v.label))}.</b> ${esc(firstSentences(clean(v.call), 160))}`;
  feedAppend(f);
  setTimeout(() => { if (state.verdict === ev) $("#verdictSheet").hidden = false; }, 1600);
}

// ------------------------------------------------------------- history + replay
async function openHistory() {
  const { sessions } = await fetch("/api/sessions").then((x) => x.json());
  $("#historyList").innerHTML = sessions.length
    ? sessions.map((s) => `<li><button data-id="${esc(s.id)}"><b>${esc(s.title)}</b><small>${esc(s.id.slice(0, 10))} · ${s.mode === "quick" ? "rapide" : "complet"} · ${s.status === "done" ? "terminé" : "en cours"}</small></button>${s.status === "done" ? `<button class="pdf" type="button" data-pdf="${esc(s.id)}" title="Télécharger le verdict en PDF">PDF</button>` : ""}</li>`).join("")
    : '<li class="muted">Aucun conseil pour le moment. Réunis le conseil une fois et il apparaîtra ici.</li>';
  $$("#historyList button[data-id]").forEach((b) => b.addEventListener("click", () => { $("#historyDialog").close(); replay(b.dataset.id); }));
  $("#historyDialog").showModal();
}

async function replay(id) {
  const j = await fetch(`/api/sessions/${encodeURIComponent(id)}`).then((x) => x.json());
  begin(id);
  state.replaying = true;
  for (const ev of j.events) {
    if (["delta", "usage", "seat_error", "end"].includes(ev.type)) continue;
    player.push(ev);
  }
}

// ------------------------------------------------------------- waiting on Claude Code
// A live council goes quiet for minutes while the seats write in parallel. Instead of a
// frozen table, say what is happening, how long it has been, and what each seat is weighing.
const SAME_TIME = "Les conseillers écrivent tous en même temps dans Claude Code. Leurs phrases arrivent ici dès que le tour est fini.";
function waitCopy(phase) {
  const n = state.setup?.mode === "quick" ? 2 : 3;
  return {
    setup: ["On prépare la table", "Le président installe le conseil.", ""],
    round1: ["Tour 1 sur " + n, "Les conseillers écrivent leur position.", SAME_TIME],
    round2: ["Tour 2 sur " + n, "Les conseillers lisent les positions des autres et répondent.", SAME_TIME],
    round3: ["Tour 3 sur " + n, "Les conseillers votent sur la proposition du président.", SAME_TIME],
    cruxes: ["Entre deux tours", "Le président lit les positions et cherche les désaccords.", "Les désaccords s'affichent ici, puis le débat commence."],
    draft: ["Entre deux tours", "Le président transforme le débat en proposition.", "Ensuite, chaque conseiller vote."],
    skip3: ["Dernière étape", "Le président calcule les notes et écrit le verdict.", "Tu pourras ensuite le télécharger en PDF."],
    verdict: ["Dernière étape", "Le président calcule les notes et écrit le verdict.", "Tu pourras ensuite le télécharger en PDF."],
  }[phase] || ["En cours", "Le conseil travaille.", ""];
}
const clock = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

function hideWait() {
  const w = $("#waitcard");
  if (w.hidden) return;
  w.hidden = true;
  $$(".seat.musing").forEach((e) => e.classList.remove("musing"));
  if (state.capWasShown) $("#caption").hidden = false;
  if (state.playbarWasShown) $("#playbar").hidden = false;
}

function tickWait() {
  const w = state.wait;
  const idle = !player.busy && !player.q.length;
  if (!w || !idle || state.replaying || !state.session || state.verdict) return hideWait();
  const card = $("#waitcard");
  if (card.hidden) {
    state.capWasShown = !$("#caption").hidden;
    $("#caption").hidden = true;
    $("#cruxes").hidden = true;
    // speed controls do nothing while the room waits, and they would cover the card
    state.playbarWasShown = !$("#playbar").hidden;
    $("#playbar").hidden = true;
    card.hidden = false;
    state.museAt = 0;
  }
  const [step, head, sub] = waitCopy(w.phase);
  const elapsed = Date.now() - w.at;
  $("#wcStep").textContent = step;
  $("#wcTime").textContent = clock(elapsed);
  $("#wcHead").textContent = head;
  $("#wcSub").textContent = sub;
  $("#wcNudge").hidden = elapsed < 4 * 60 * 1000;
  const round = Number((w.phase.match(/^round(\d)$/) || [])[1]) || 0;
  const bar = $("#wcBar").parentElement;
  const muse = $("#wcMuse");
  if (round) {
    const seats = state.active.length ? state.active : state.table;
    const done = seats.filter((k) => state.cards[round][k]).length;
    bar.classList.toggle("indeterminate", done === 0);
    $("#wcBar").style.width = done ? Math.round((done / seats.length) * 100) + "%" : "";
    // every few seconds, show what one of the still-thinking seats is weighing
    const pending = seats.filter((k) => !state.cards[round][k]);
    if (pending.length && Date.now() - (state.museAt || 0) > 5200) {
      state.museAt = Date.now();
      state.museIdx = ((state.museIdx ?? -1) + 1) % pending.length;
      const s = state.byKey[pending[state.museIdx]];
      muse.classList.add("fade");
      setTimeout(() => {
        muse.innerHTML = "<b>" + esc(s.short) + "</b> réfléchit : " + esc(s.question.replace(/^./, (c) => c.toLowerCase())) + (done ? " · " + done + " sur " + seats.length + " ont répondu" : "");
        muse.classList.remove("fade");
        $$(".seat").forEach((el) => el.classList.toggle("musing", el.dataset.seat === s.key));
      }, 300);
    }
  } else {
    bar.classList.add("indeterminate");
    $("#wcBar").style.width = "";
    muse.textContent = "";
    $$(".seat.musing").forEach((e) => e.classList.remove("musing"));
  }
}

function openGuide() {
  $("#guideBody").innerHTML = GUIDE;
  const d = $("#guideDialog");
  if (!d.open) d.showModal();
}

// ------------------------------------------------------------- PDF
async function savePdf(btn) {
  const id = btn.dataset.pdf;
  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = "Création du PDF...";
  try {
    let setup = state.setup, verdict = state.verdict;
    if (id) { // a past session from the history list
      const j = await fetch("/api/sessions/" + encodeURIComponent(id)).then((x) => x.json());
      setup = j.events.find((e) => e.type === "setup");
      verdict = [...j.events].reverse().find((e) => e.type === "verdict");
    }
    if (!setup || !verdict) throw new Error("Ce conseil n'a pas encore de verdict.");
    await downloadVerdictPdf({ setup, verdict, byKey: state.byKey, id: id || state.session });
  } catch (e) {
    console.error(e);
    toast("Impossible de créer le PDF : " + (e.message || e));
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}

// ------------------------------------------------------------- misc
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 6000);
}
async function refreshUsage() {
  const u = await fetch("/api/usage").then((x) => x.json()).catch(() => null);
  if (!u || !u.calls) { $("#usage").textContent = ""; return; }
  const k = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1000)}k`);
  $("#usage").textContent = `${u.calls} calls · ${k(u.input + u.cacheRead + u.cacheWrite)} in · ${k(u.output)} out`;
}

boot();
