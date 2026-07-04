// Doch v4: scrollytelling, stitched dataset reveal + "the mirror and its setting".
// One continuous scroll: the canvas animates the project's process behind
// the text (gathering → method → problems → ethics → tracing), ending with
// the pattern chalk-traced on the cloth, which the visitor then sews.

const canvas = document.getElementById('cloth');
const ctx = canvas.getContext('2d');
const sewnEl = document.getElementById('sewn');
const hintEl = document.getElementById('hint');
const finishBtn = document.getElementById('finish');
const legendEl = document.getElementById('legend');
const zoomHint = document.getElementById('zoomhint');
const tip = document.getElementById('tip');
const tipName = tip.querySelector('.n');
const tipGenre = tip.querySelector('.g');
const tipSim = tip.querySelector('.s');
const revealGate = document.getElementById('reveal-gate');
const revealSeam = revealGate.querySelector('.reveal-seam');
const mastheadEl = document.querySelector('.masthead');
const counterEl = document.querySelector('.counter');
const mastheadDismissBtn = document.getElementById('masthead-dismiss');
const mastheadTabBtn = document.getElementById('masthead-tab');
const legendToggleBtn = document.getElementById('legend-toggle');
const legendScrimEl = document.getElementById('legend-scrim');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const hasHover = window.matchMedia('(hover: hover)').matches;
let tapTipTimer = null;
// On mobile a drag only "counts" as pulling the thread once it's shown
// real sideways intent — this gates the needle so it doesn't appear
// during the first ambiguous pixels of what turns out to be a scroll.
let sewGestureActive = false;

// ── Mobile "tapestry" scroll space ───────────────────────────────────
// On mobile the finished cloth is taller than one screen — mirrors get a
// real, comfortable, fixed size and the page scrolls natively to explore
// it, the same way the intro story already scrolls. Desktop is untouched:
// canvasContentH stays equal to H and scrollY stays 0 there always.
const MOBILE_CELL = 56; // px per mirror cell in the scrollable mobile tapestry
let canvasContentH = 0;
let scrollY = 0;
let mobileClothMode = false;
const toContentY = (viewportY) => viewportY + scrollY;
const toScreenY = (contentY) => contentY - scrollY;

const K = 6;
const STITCH_LEN = 14;
const MIRRORS_PER_STITCH = 0.5;

let W = 0, H = 0, DPR = 1;
let base = null, baseCtx = null, bgBase = null;
let mirrors = [];
let queue = [];
let sewnCount = 0;
let pathStitches = [];
let glints = [];
let pointer = { x: -100, y: -100, down: false, ang: -0.8 };
let downAt = { x: 0, y: 0, moved: 0 };
let lastStitch = null;
let carry = 0, mirrorCarry = 0;
let autoTimer = null;
let done = false;
let hovered = null;
let closestOverall = null;
let focusGenre = null;
let zoom = null;
let introActive = true;
let revealActive = false;
let revealProgress = 0;
let revealDragging = false;
let revealLastPoint = null;
let storyDone = false;
let storyTime = 0;
let clothTime = 0;
let defaultHint = '';
let ambientPointer = { x: 0, y: 0, tx: 0, ty: 0 };
let datasetArtists = [];
let storySections = [];
let activeStoryIndex = 0;
let storyDim = null;

function hash(str) {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
	return ((h >>> 0) % 10000) / 10000;
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => v * v * (3 - 2 * v);
const lerp = (a, b, v) => a + (b - a) * v;

// ── Threads: 14 distinct dye lots ───────────────────────────────────
const THREADS = {
	punjabi_folk: '#c33b2e',
	bollywood: '#e0705c',
	latin: '#c96f2d',
	afrobeats: '#da9a2b',
	pakistani_pop: '#b3a135',
	arabic: '#e8d9a4',
	english_pop: '#efe6d1',
	qawwali: '#93673c',
	pashto: '#7f8b43',
	turkish: '#3d8a67',
	electronic: '#58a1a0',
	blues: '#5b80b8',
	jazz: '#7059a8',
	iranian: '#a04a7c'
};
const GENRE_NAMES = {
	afrobeats: 'Afrobeats', arabic: 'Arabic', blues: 'Blues', bollywood: 'Bollywood',
	electronic: 'Electronic', english_pop: 'English pop', iranian: 'Iranian', jazz: 'Jazz',
	latin: 'Latin', pakistani_pop: 'Pakistani pop', pashto: 'Pashto',
	punjabi_folk: 'Punjabi folk', qawwali: 'Qawwali', turkish: 'Turkish'
};

// ── Story sections ──────────────────────────────────────────────────
const PANELS = [
	{
		kicker: 'دوچ · doch · balochi embroidery',
		title: 'Stitch the sound of home',
		lines: ['Stitch the sound', 'of home'],
		urdu: 'دوچ، گھر کی آواز',
		body: 'This is a small embroidery made from Balochi music and data. Like doch, it reveals itself one stitch at a time. Scroll slowly and watch the cloth take shape.'
	},
	{
		kicker: '01 · the gathering',
		title: 'Two hundred and thirteen songs of home.',
		lines: ['Two hundred and thirteen', 'songs of home.'],
		body: 'I gathered these 213 Balochi songs by hand, from family playlists, from friends, from music I grew up hearing, and from the small trace of Balochistan available on Spotify. I placed them beside 2,269 songs from 14 genres to ask where the sound of home sits in the wider world.'
	},
	{
		kicker: '02 · the method',
		title: 'Similarity becomes distance.',
		lines: ['Similarity becomes', 'distance.'],
		body: 'Each song is described through its energy, acousticness, mood and tempo. Songs with a similar character settle close together. Here, one Balochi song draws in the six songs from the wider dataset that sound nearest to it. They become the stitches that hold its mirror.'
	},
	{
		kicker: '03 · the problems',
		title: 'The archive was never built for us.',
		lines: ['The archive was never', 'built for us.'],
		body: 'Balochi music is almost invisible in global music databases. Artist names are misspelled, credits are missing and many songs seem to belong to no one. Even the audio features speak a vocabulary shaped by western pop. These 213 songs cannot carry an entire tradition. This cloth is one small sample, not a census.'
	},
	{
		kicker: '04 · the ethics',
		title: 'Visible, without being flattened.',
		lines: ['Visible, without', 'being flattened.'],
		body: 'Making Balochi music visible inside the same platforms that overlook it is complicated. These songs are heritage, not content. Nothing here is ranked, and no Balochi mirror is judged against another. “Closest” only describes a resemblance in sound. It does not decide meaning, value or belonging.'
	},
	{
		kicker: '05 · the tracing',
		title: 'The pattern is traced. The needle is yours.',
		lines: ['The pattern is traced.', 'The needle is yours.'],
		body: 'Before sewing, an embroiderer traces the pattern in chalk. This one holds 213 mirrors, each waiting for its six closest sounds. Follow the seam to the end. Then press the cloth, pull the thread and begin stitching the sound of home.'
	}
];

const ETHICS_BEATS = [
	'heritage, not content.',
	'closest means resemblance, not meaning.',
	'no mirror is compared to another.',
	'visible, without being flattened.'
];

// The canvas stage can remain still while a full-screen thought occupies its
// own scroll space. That makes the interludes feel intentional, not attached
// to whichever chapter happens to be closest to the viewport.
const STORY_SEQUENCE = [
	{ kind: 'panel', panel: 0, stage: 0, step: 1 },
	{ kind: 'panel', panel: 1, stage: 1, step: 2 },
	{ kind: 'panel', panel: 2, stage: 2, step: 3 },
	{ kind: 'panel', panel: 3, stage: 3, step: 4 },
	{ kind: 'artists', stage: 3, step: 4, beats: 5 },
	{ kind: 'panel', panel: 4, stage: 4, step: 5 },
	{ kind: 'ethics', stage: 4, step: 5, beats: ETHICS_BEATS.length },
	{ kind: 'panel', panel: 5, stage: 5, step: 6 }
];

// ── Story helpers ───────────────────────────────────────────────────
function heapPos(m) {
	const r = H * (W < 720 ? 0.3 : 0.28) * Math.sqrt(hash(m.n + 'h'));
	const a = hash(m.n + 'a') * Math.PI * 2;
	return { x: W * (W < 720 ? 0.62 : 0.72) + Math.cos(a) * r, y: H * 0.5 + Math.sin(a) * r * 0.85 };
}
function edgePos(m) {
	const a = m.u * Math.PI * 2;
	return { x: W * 0.5 + Math.cos(a) * Math.max(W, H) * 0.78, y: H * 0.5 + Math.sin(a) * Math.max(W, H) * 0.78 };
}

function drawMini(g, x, y, r, alpha, dashed) {
	g.save();
	g.globalAlpha = alpha * stageAlpha;
	g.strokeStyle = dashed ? '#c9bfae' : '#e9dfc7';
	g.lineWidth = 1.4;
	if (dashed) g.setLineDash([3, 4]);
	g.beginPath();
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * Math.PI * 2;
		i ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + r, y);
	}
	g.closePath(); g.stroke();
	g.restore();
}

function drawStoryStitch(g, x, y, ang, col, alpha, len = 6) {
	g.save();
	g.globalAlpha = alpha * stageAlpha;
	g.translate(x, y);
	g.rotate(ang);
	g.lineCap = 'round';
	g.strokeStyle = 'rgba(0,0,0,0.38)';
	g.lineWidth = 3;
	g.beginPath(); g.moveTo(-len, 1); g.lineTo(len, 1); g.stroke();
	g.strokeStyle = col;
	g.lineWidth = 2;
	g.beginPath(); g.moveTo(-len, 0); g.lineTo(len, 0); g.stroke();
	g.restore();
}

// ── Story stages ────────────────────────────────────────────────────
function drawStory(p) {
	ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
	ambientPointer.x += (ambientPointer.tx - ambientPointer.x) * 0.035;
	ambientPointer.y += (ambientPointer.ty - ambientPointer.y) * 0.035;
	const driftX = Math.sin(p * 0.78) * W * 0.018 + Math.sin(clothTime * 0.24) * 3 + ambientPointer.x * 18;
	const driftY = Math.cos(p * 0.62) * H * 0.018 + Math.cos(clothTime * 0.19) * 2 + ambientPointer.y * 14;
	const clothScale = 1.045 + Math.sin(p * 0.7) * 0.012 + Math.sin(clothTime * 0.16) * 0.0025;
	ctx.save();
	ctx.translate(W * 0.5 + driftX, H * 0.5 + driftY);
	ctx.rotate(Math.sin(p * 0.45) * 0.008);
	ctx.scale(clothScale, clothScale);
	ctx.drawImage(bgBase, -W * 0.5, -H * 0.5, W, H);
	ctx.restore();
	const s = Math.min(Math.floor(p), 5);
	const t = clamp01(p - s);
	storyTime += 1 / 60;

	// stages cross-fade into each other instead of cutting
	const fns = [storyWelcome, storyGather, storyMethod, storyProblems, storyEthics, storyTrace];
	const FADE = 0.22;
	ctx.save();
	ctx.translate(driftX * 0.34, driftY * 0.34);
	ctx.rotate(Math.sin(p * 0.5) * -0.003);
	if (s > 0 && t < FADE) {
		stageAlpha = 1 - t / FADE;
		ctx.globalAlpha = stageAlpha;
		fns[s - 1](1);
		ctx.globalAlpha = 1;
	}
	stageAlpha = s === 0 ? 1 : clamp01(t / FADE);
	ctx.globalAlpha = stageAlpha;
	fns[s](t);
	ctx.globalAlpha = 1;
	stageAlpha = 1;
	ctx.restore();
}
let stageAlpha = 1;

// 0 · a running stitch sews itself across the screen
function storyWelcome(t) {
	const x0 = W * 0.06, x1 = W * 0.94;
	const path = (x) => H * 0.66 + Math.sin(x * 0.005) * 26;
	const total = 52;
	const shown = ease(t) * total;
	for (let i = 0; i < shown; i++) {
		const x = lerp(x0, x1, i / total);
		const x2 = lerp(x0, x1, (i + 0.45) / total);
		const y = path(x), y2 = path(x2);
		const ang = Math.atan2(y2 - y, x2 - x);
		drawStoryStitch(ctx, (x + x2) / 2, (y + y2) / 2, ang, 'rgba(213,174,90,0.9)', 0.9, 7);
	}
	// the needle at the head of the seam
	const hx = lerp(x0, x1, shown / total), hy = path(hx);
	ctx.save();
	ctx.translate(hx + 14, hy - 6);
	ctx.rotate(0.5);
	ctx.lineCap = 'round';
	ctx.strokeStyle = '#d9d2c4';
	ctx.lineWidth = 2.2;
	ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(4, 0); ctx.stroke();
	ctx.strokeStyle = '#8f887b';
	ctx.lineWidth = 1;
	ctx.beginPath(); ctx.arc(-17, 0, 1.8, 0, Math.PI * 2); ctx.stroke();
	ctx.restore();
}

// 1 · the 213 mirrors drift in from the edges and gather
function storyGather(t) {
	let count = 0;
	for (const m of mirrors) {
		const tt = ease(clamp01(t * 1.5 - m.u * 0.5));
		if (tt <= 0) continue;
		count++;
		const e = edgePos(m), h = heapPos(m);
		drawMini(ctx, lerp(e.x, h.x, tt), lerp(e.y, h.y, tt), 4 + tt * 3.5, tt, false);
	}
	ctx.fillStyle = '#c9a24b';
	ctx.font = '18px "Beth Ellen", cursive';
	ctx.textAlign = 'center';
	ctx.fillText(`${count} / 213 songs of home`, W * 0.62, H * 0.5 - H * 0.3 - 26);
	ctx.textAlign = 'left';
}

// 2 · one mirror is measured: its six closest sounds pull in tight
function storyMethod(t) {
	for (const m of mirrors) {
		const h = heapPos(m);
		drawMini(ctx, h.x, h.y, 6, 0.32, false);
	}
	const hero = mirrors[57];
	const hp = heapPos(hero);
	// pulsing highlight
	ctx.strokeStyle = 'rgba(213,174,90,0.9)';
	ctx.lineWidth = 1.4;
	ctx.beginPath(); ctx.arc(hp.x, hp.y, 12 + Math.sin(storyTime * 3) * 2, 0, Math.PI * 2); ctx.stroke();
	drawMini(ctx, hp.x, hp.y, 8, 1, false);

	hero.holders.forEach((hh, k) => {
		const tt = ease(clamp01(t * 1.6 - k * 0.12));
		if (tt <= 0) return;
		const a0 = hash(hh.w.n + 'm') * Math.PI * 2;
		const startR = H * 0.38, endR = 26 + k * 8;
		const r = lerp(startR, endR, tt);
		const x = hp.x + Math.cos(a0) * r, y = hp.y + Math.sin(a0) * r;
		// the measuring thread
		ctx.strokeStyle = `rgba(213,174,90,${0.65 * tt})`;
		ctx.lineWidth = 1;
		ctx.beginPath(); ctx.moveTo(hp.x, hp.y); ctx.lineTo(x, y); ctx.stroke();
		drawStoryStitch(ctx, x, y, a0 + Math.PI / 2, hh.w.col, Math.max(tt, 0.3));
		if (tt > 0.95) {
			ctx.fillStyle = '#c9bfae';
			ctx.font = '15px "Beth Ellen", cursive';
			ctx.fillText(String(k + 1), x + Math.cos(a0) * 15 - 3, y + Math.sin(a0) * 15 + 4);
		}
	});
}

// 3 · the archive breaks: mirrors flicker, names lose themselves
function storyProblems(t) {
	for (const m of mirrors) {
		const h = heapPos(m);
		const isBroken = hash(m.n + 'b') < 0.25;
		if (isBroken) {
			const fl = 0.16 + 0.4 * Math.abs(Math.sin(storyTime * 5 + m.u * 9));
			drawMini(ctx, h.x, h.y, 6, fl, true);
		} else {
			drawMini(ctx, h.x, h.y, 6, 0.5, false);
		}
	}
}

// 4 · a comparison between two mirrors is drawn, then unpicked
function storyEthics(t) {
	for (const m of mirrors) {
		const h = heapPos(m);
		const glint = 0.45 + 0.25 * Math.sin(storyTime * 1.6 + m.u * 12);
		drawMini(ctx, h.x, h.y, 6, glint, false);
	}
	const A = heapPos(mirrors[30]), B = heapPos(mirrors[150]);
	const tri = t < 0.45 ? ease(t / 0.45) : Math.max(0, 1 - ease((t - 0.45) / 0.4));
	if (tri > 0.01) {
		const ex = lerp(A.x, B.x, tri), ey = lerp(A.y, B.y, tri);
		ctx.setLineDash([5, 5]);
		ctx.strokeStyle = 'rgba(195,59,46,0.75)';
		ctx.lineWidth = 1.4;
		ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(ex, ey); ctx.stroke();
		ctx.setLineDash([]);
	}
}

// 5 · the heap glides into the grid as a chalk tracing
function storyTrace(t) {
	for (const m of mirrors) {
		const tt = ease(clamp01((t * 1.5 - m.u * 0.5)));
		const h = heapPos(m);
		const x = lerp(h.x, m.x, tt), y = lerp(h.y, m.y, tt);
		drawMini(ctx, x, y, lerp(6, m.r, tt), lerp(0.5, 0.34, tt), tt > 0.6);
		if (tt > 0.92) {
			for (const hh of m.holders) {
				ctx.fillStyle = 'rgba(201,191,174,0.16)';
				ctx.beginPath(); ctx.arc(hh.x, hh.y, 1.6, 0, Math.PI * 2); ctx.fill();
			}
		}
	}
}

// ── Story engine ────────────────────────────────────────────────────
function escapeMarkup(value) {
	return String(value).replace(/[&<>"']/g, (ch) => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
	})[ch]);
}

function setupStory() {
	const story = document.getElementById('story');
	const artistNames = datasetArtists.length ? datasetArtists : ['the artists in the archive'];
	story.innerHTML = STORY_SEQUENCE.map((item) => {
		if (item.kind === 'panel') {
			const p = PANELS[item.panel];
			const urdu = p.urdu ? `<span class="urdu-inline" lang="ur">${escapeMarkup(p.urdu)}</span>` : '';
			return `<section class="story-panel" data-kind="panel" data-stage="${item.stage}" data-step="${item.step}"><div class="txt"><p class="ikicker">${escapeMarkup(p.kicker)}</p><h2 class="ititle">${escapeMarkup(p.title)}${urdu}</h2><p class="ibody">${escapeMarkup(p.body)}</p></div></section>`;
		}
		const values = item.kind === 'artists'
			? artistNames.slice(0, item.beats)
			: ETHICS_BEATS;
		const kicker = item.kind === 'artists' ? 'who made this?' : 'what must remain true?';
		const instruction = item.kind === 'artists' ? 'keep scrolling to meet another artist' : 'keep scrolling and hold the thought';
		return `<section class="story-interlude" data-kind="${item.kind}" data-stage="${item.stage}" data-step="${item.step}" data-values="${escapeMarkup(JSON.stringify(values))}"><div class="interlude-sticky"><p class="interlude-kicker">${kicker}</p><p class="interlude-primary">${escapeMarkup(values[0])}</p><div class="interlude-ticks" aria-hidden="true">${values.map(() => '<i></i>').join('')}</div><p class="interlude-instruction">${instruction}</p></div></section>`;
	}).join('');
	storySections = [...story.querySelectorAll('section')];
	for (const section of storySections) {
		if (section.dataset.kind === 'panel') {
			section._storyEls = {
				txt: section.firstElementChild,
				kicker: section.querySelector('.ikicker'),
				title: section.querySelector('.ititle'),
				body: section.querySelector('.ibody')
			};
		} else {
			section._values = JSON.parse(section.dataset.values);
			section._beat = 0;
			section._storyEls = {
				sticky: section.firstElementChild,
				primary: section.querySelector('.interlude-primary'),
				ticks: [...section.querySelectorAll('.interlude-ticks i')]
			};
		}
	}
	storyDim = document.getElementById('story-dim');
	document.getElementById('iskip').addEventListener('click', finishStory);
}

function storyProgress() {
	if (!storySections.length) return 0;
	const viewportCenter = window.scrollY + H * 0.5;
	const centers = storySections.map((section) => section.offsetTop + section.offsetHeight * 0.5);
	activeStoryIndex = centers.reduce((best, center, index) =>
		Math.abs(viewportCenter - center) < Math.abs(viewportCenter - centers[best]) ? index : best
	, 0);
	if (viewportCenter <= centers[0]) return 0;
	for (let i = 0; i < centers.length - 1; i++) {
		if (viewportCenter <= centers[i + 1]) {
			const from = Number(storySections[i].dataset.stage);
			const to = Number(storySections[i + 1].dataset.stage);
			return lerp(from, to, clamp01((viewportCenter - centers[i]) / Math.max(1, centers[i + 1] - centers[i])));
		}
	}
	const maxScroll = Math.max(1, document.body.scrollHeight - H);
	const lastCenteredScroll = centers[centers.length - 1] - H * 0.5;
	return 5 + clamp01((window.scrollY - lastCenteredScroll) / Math.max(1, maxScroll - lastCenteredScroll));
}

function updateStoryDom(p) {
	document.querySelector('#storyseam i').style.width = (p / 6) * 100 + '%';
	const activeStep = storySections[activeStoryIndex]?.dataset.step || 1;
	document.getElementById('storystep').textContent =
		`${String(activeStep).padStart(2, '0')} / 06`;
	document.getElementById('storyhint').textContent = p > 5.6 ? 'the pattern is ready' : 'scroll';
	let dimOpacity = 0;
	for (const sec of storySections) {
		const r = sec.getBoundingClientRect();
		if (sec.dataset.kind !== 'panel') {
			const { sticky, primary, ticks } = sec._storyEls;
			const travel = Math.max(1, r.height - H);
			const local = clamp01(-r.top / travel);
			const enter = clamp01((H * 0.72 - r.top) / (H * 0.72));
			const exit = clamp01(r.bottom / (H * 0.72));
			const vis = ease(Math.min(enter, exit));
			const nextBeat = Math.min(sec._values.length - 1, Math.floor(local * sec._values.length));
			if (nextBeat !== sec._beat) {
				sec._beat = nextBeat;
				primary.textContent = sec._values[nextBeat];
				primary.animate([
					{ opacity: 0, filter: 'blur(11px)', transform: 'translate3d(0, 30px, 0) scale(.94)' },
					{ opacity: 1, filter: 'blur(0)', transform: 'translate3d(0, 0, 0) scale(1)' }
				], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
			}
			ticks.forEach((tick, i) => tick.classList.toggle('active', i === nextBeat));
			sticky.style.opacity = vis.toFixed(3);
			sticky.style.visibility = vis > 0.01 ? 'visible' : 'hidden';
			sticky.style.filter = `blur(${((1 - vis) * 9).toFixed(2)}px)`;
			sticky.style.transform = `translate3d(0, ${((1 - vis) * 46).toFixed(1)}px, 0) scale(${(0.94 + vis * 0.06).toFixed(3)})`;
			dimOpacity = Math.max(dimOpacity, vis * 0.82);
			continue;
		}
		const { txt, kicker, title, body } = sec._storyEls;
		const d = (r.top + Math.min(r.height, H) / 2 - H / 2) / H; // signed distance
		const vis = clamp01(1.25 - Math.abs(d) * 1.9);
		const bodyVis = clamp01((vis - 0.12) / 0.88);
		const direction = d < 0 ? -1 : 1;
		const drift = direction * (1 - vis) * 70;
		txt.style.opacity = vis;
		txt.style.setProperty('--vis', vis.toFixed(3));
		txt.style.filter = `blur(${((1 - vis) * 7).toFixed(2)}px) brightness(${(0.72 + vis * 0.28).toFixed(2)})`;
		txt.style.transform = `translate3d(${drift.toFixed(1)}px, ${(d * -76).toFixed(1)}px, 0) scale(${(0.92 + vis * 0.08).toFixed(3)}) rotate(${(direction * (1 - vis) * -1.4).toFixed(2)}deg)`;
		kicker.style.transform = `translate3d(${((1 - vis) * -16).toFixed(1)}px, 0, 0)`;
		title.style.transform = `translate3d(${((1 - vis) * -28).toFixed(1)}px, ${((1 - vis) * 12).toFixed(1)}px, 0)`;
		body.style.opacity = bodyVis;
		body.style.transform = `translate3d(${((1 - bodyVis) * 20).toFixed(1)}px, ${((1 - bodyVis) * 34).toFixed(1)}px, 0)`;
	}
	if (storyDim) storyDim.style.opacity = dimOpacity.toFixed(3);
}

function finishStory() {
	if (storyDone) return;
	storyDone = true;
	const story = document.getElementById('story');
	const bar = document.getElementById('storybar');
	if (storyDim) storyDim.style.opacity = '0';
	// the story exhales: text and seam blur away while the tracing settles
	story.style.transition = 'opacity 1s ease, filter 1s ease';
	bar.style.transition = 'opacity 1s ease';
	story.style.filter = 'blur(10px)';
	story.style.opacity = '0';
	bar.style.opacity = '0';
	setTimeout(() => {
		introActive = false;
		revealActive = true;
		story.remove();
		storyDim?.remove();
		bar.remove();
		document.body.classList.remove('intro-mode');
		document.body.classList.add('reveal-mode');
		window.scrollTo(0, 0);
		rebuildBase();
		revealGate.classList.add('active');
		revealGate.setAttribute('aria-hidden', 'false');
		revealSeam.focus({ preventScroll: true });
	}, 1050);
}

function setRevealProgress(next) {
	revealProgress = Math.min(100, Math.max(revealProgress, next));
	revealGate.style.setProperty('--progress', revealProgress.toFixed(2));
	if (revealProgress >= 100) openDataset();
}

function openDataset() {
	if (!revealActive || revealGate.classList.contains('opening')) return;
	revealDragging = false;
	revealGate.classList.add('complete');
	document.body.classList.add('reveal-opening');
	setTimeout(() => revealGate.classList.add('opening'), 360);
	setTimeout(() => {
		revealActive = false;
		revealGate.classList.remove('active', 'opening', 'complete');
		revealGate.setAttribute('aria-hidden', 'true');
		document.body.classList.remove('reveal-mode', 'reveal-opening');
		// Masthead/legend are now untransformed and at their true resting
		// size — re-measure the grid band against their real position.
		resize();
		// The first mirror catches the light as the now-interactive cloth
		// settles. On mobile, one lone mirror against 213 chalk outlines
		// read as sparse/unfinished rather than a deliberate beginning —
		// start with a small worked patch instead.
		setTimeout(() => {
			const firstBatch = mobileClothMode ? 14 : 1;
			for (let i = 0; i < firstBatch && queue.length; i++) sewMirror(queue.shift(), true);
		}, 420);
	}, 1700);
}

revealSeam.addEventListener('pointerdown', (e) => {
	if (!revealActive) return;
	revealDragging = true;
	revealLastPoint = { x: e.clientX, y: e.clientY };
	revealSeam.setPointerCapture(e.pointerId);
});
revealSeam.addEventListener('pointermove', (e) => {
	if (!revealDragging || !revealActive) return;
	const distance = Math.hypot(e.clientX - revealLastPoint.x, e.clientY - revealLastPoint.y);
	revealLastPoint = { x: e.clientX, y: e.clientY };
	setRevealProgress(revealProgress + distance / Math.max(revealSeam.clientWidth, 1) * 125);
});
revealSeam.addEventListener('pointerup', () => { revealDragging = false; });
revealSeam.addEventListener('pointercancel', () => { revealDragging = false; });
revealSeam.addEventListener('keydown', (e) => {
	if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRevealProgress(100); }
});

// ── Data preparation ────────────────────────────────────────────────
// Each mirror's six holders are its closest sounds by cosine similarity on
// the notebook's 9 standardised audio features (similarity.json, precomputed
// from balochi_tracks.csv + comparison_genres.csv — see project1). This
// matches the actual recommender from the analysis, not a shortcut based on
// the 2D plot position, which only carries ~44% of the audio variance.
function prepare(data, simData) {
	const pts = data.points;
	const bal = pts.filter((p) => p.g === 'balochi_folk');
	const world = pts.filter((p) => p.g !== 'balochi_folk');
	datasetArtists = [...new Set(bal.map((p) => {
		const parts = p.n.split(' - ');
		return parts.length > 1 ? parts[parts.length - 1].trim() : '';
	}).filter((name) => name && name.length > 1 && name.length < 45))]
		.sort((a, b) => hash(a + 'artist') - hash(b + 'artist'));

	const worldSongs = world.map((p) => ({
		n: p.n, g: p.g,
		col: THREADS[p.g] || '#d8c9a4',
		px: p.x, py: p.y,
		placements: []
	}));

	const simOk = simData && simData.balochi && simData.balochi.length === bal.length;
	if (!simOk) console.error('similarity.json missing or out of sync with data.json — falling back to plot-distance neighbours');
	closestOverall = simOk ? worldSongs[simData.closestOverall.j] : worldSongs[0];

	mirrors = bal.map((p, idx) => {
		let holders;
		if (simOk) {
			holders = simData.balochi[idx].holders.map((h, rank) => ({
				w: worldSongs[h.j], rank, score: h.score, x: 0, y: 0, ang: 0, sewn: false
			}));
		} else {
			// fallback: nearest by plot position only, used if similarity.json can't be trusted
			const best = [];
			for (const w of worldSongs) {
				const d = (w.px - p.x) ** 2 + (w.py - p.y) ** 2;
				if (best.length < K) { best.push({ w, d }); best.sort((a, b) => a.d - b.d); }
				else if (d < best[K - 1].d) { best[K - 1] = { w, d }; best.sort((a, b) => a.d - b.d); }
			}
			holders = best.map((b, rank) => ({ w: b.w, rank, score: null, x: 0, y: 0, ang: 0, sewn: false }));
		}
		return {
			n: p.n, g: p.g, px: p.x, py: p.y,
			mir: p.mir ?? 0.87,
			u: hash(p.n),
			sewn: false,
			holders
		};
	});
	mirrors.sort((a, b) => a.px - b.px || a.py - b.py);
	for (const m of mirrors) for (const h of m.holders) { h.m = m; h.w.placements.push(h); }
}

// ── Layout ──────────────────────────────────────────────────────────
function layoutGrid() {
	const mobile = W < 720;
	// Once the cloth is truly interactive, mobile gets its own fixed-size,
	// scrollable "tapestry" layout instead of a shrunk-to-fit grid — 213
	// legible, comfortably tappable mirrors need more height than any one
	// phone screen has, so the page scrolls to it natively, the same way
	// the intro story already does. During the intro/reveal preview (or on
	// desktop, always) the grid still fits within a single viewport band.
	mobileClothMode = mobile && !introActive && !revealActive;

	if (mobileClothMode) {
		const TOP_MARGIN = 96, BOTTOM_MARGIN = 120;
		const fx0 = W * 0.07, fx1 = W * 0.93;
		const fw = fx1 - fx0;
		const n = mirrors.length;
		const cell = MOBILE_CELL;
		const cols = Math.max(1, Math.floor(fw / cell));
		const rows = Math.ceil(n / cols);
		const ox = fx0 + (fw - cols * cell) / 2;
		canvasContentH = TOP_MARGIN + rows * cell + BOTTOM_MARGIN;

		mirrors.forEach((m, i) => {
			const row = Math.floor(i / cols);
			let col = i % cols;
			if (row % 2) col = cols - 1 - col;
			const shift = (row % 2) * cell * 0.28;
			m.x = ox + col * cell + cell / 2 + shift + (m.u - 0.5) * 3;
			m.y = TOP_MARGIN + row * cell + cell / 2 + (hash(m.n + 'y') - 0.5) * 3;
			// A mirror that's small relative to its cell reads as sparse no
			// matter how sharp the render is — sized to fill more of the
			// cell, with the setting's fan-out pulled in to compensate so
			// neighbours still don't overlap.
			m.r = cell * 0.22 + ((m.mir - 0.749) / 0.251) * cell * 0.05;
			const hasScore = m.holders[0].score != null;
			const sMax = hasScore ? m.holders[0].score : 0;
			const sMin = hasScore ? m.holders[K - 1].score : 0;
			m.holders.forEach((h, k) => {
				const a = (k / K) * Math.PI * 2 + m.u * Math.PI + (hash(h.w.n + m.n) - 0.5) * 0.5;
				const closeness = hasScore
					? (sMax - h.score) / Math.max(sMax - sMin, 1e-9)
					: k / (K - 1);
				const rad = m.r + 3 + closeness * cell * 0.1;
				h.x = m.x + Math.cos(a) * rad;
				h.y = m.y + Math.sin(a) * rad;
				h.ang = a + Math.PI / 2 + (hash(m.n + h.w.n) - 0.5) * 0.4;
			});
		});
		return;
	}

	canvasContentH = H;
	const fx0 = mobile ? W * 0.07 : W * 0.34;
	const fx1 = mobile ? W * 0.93 : W * 0.965;
	let fy0 = mobile ? H * 0.43 : H * 0.09;
	let fy1 = mobile ? H * 0.79 : H * 0.93;
	if (mobile) {
		// This preview band (intro/reveal only, before scrolling exists)
		// still needs to dodge the masthead/footer chrome by measurement.
		const PAD = 18;
		const mastheadBottom = mastheadEl?.getBoundingClientRect().bottom;
		const legendTop = legendEl?.getBoundingClientRect().top;
		const counterTop = counterEl?.getBoundingClientRect().top;
		if (mastheadBottom > 0 && mastheadBottom < H) fy0 = mastheadBottom + PAD;
		const footerTop = Math.min(
			legendTop > 0 ? legendTop : H,
			counterTop > 0 ? counterTop : H
		);
		if (footerTop < H) fy1 = footerTop - PAD;
		if (fy1 - fy0 < H * 0.22) {
			const mid = (fy0 + fy1) / 2;
			fy0 = mid - H * 0.11;
			fy1 = mid + H * 0.11;
		}
	}
	const fw = fx1 - fx0, fh = fy1 - fy0;
	const n = mirrors.length;
	const cols = Math.ceil(Math.sqrt((n * fw) / fh));
	const rows = Math.ceil(n / cols);
	const cw = fw / cols, ch = fh / rows;
	const ox = fx0 + (fw - cols * cw) / 2;

	mirrors.forEach((m, i) => {
		const row = Math.floor(i / cols);
		let col = i % cols;
		if (row % 2) col = cols - 1 - col;
		const shift = (row % 2) * cw * 0.28;
		m.x = ox + col * cw + cw / 2 + shift + (m.u - 0.5) * 3;
		m.y = fy0 + row * ch + ch / 2 + (hash(m.n + 'y') - 0.5) * 3;
		m.r = Math.min(cw, ch) * 0.155 + ((m.mir - 0.749) / 0.251) * Math.min(cw, ch) * 0.05;
		// holders are pre-sorted most-similar first; invert score so the
		// closest sound sits tightest against the mirror
		const hasScore = m.holders[0].score != null;
		const sMax = hasScore ? m.holders[0].score : 0;
		const sMin = hasScore ? m.holders[K - 1].score : 0;
		m.holders.forEach((h, k) => {
			const a = (k / K) * Math.PI * 2 + m.u * Math.PI + (hash(h.w.n + m.n) - 0.5) * 0.5;
			const closeness = hasScore
				? (sMax - h.score) / Math.max(sMax - sMin, 1e-9)
				: k / (K - 1);
			const rad = m.r + 3.5 + closeness * Math.min(cw, ch) * 0.14;
			h.x = m.x + Math.cos(a) * rad;
			h.y = m.y + Math.sin(a) * rad;
			h.ang = a + Math.PI / 2 + (hash(m.n + h.w.n) - 0.5) * 0.4;
		});
	});
}

// ── Cloth ground ────────────────────────────────────────────────────
function drawCloth(g, targetH = H, includeVignette = true) {
	g.fillStyle = '#1b1115';
	g.fillRect(0, 0, W, targetH);
	g.strokeStyle = '#d8c2a8';
	g.lineWidth = 1;
	for (let y = 0.5; y < targetH; y += 3) {
		g.globalAlpha = 0.028 + hash('h' + y) * 0.03;
		g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
	}
	for (let x = 0.5; x < W; x += 3) {
		g.globalAlpha = 0.02 + hash('v' + x) * 0.026;
		g.beginPath(); g.moveTo(x, 0); g.lineTo(x, targetH); g.stroke();
	}
	g.globalAlpha = 1;
	const speckCount = Math.round(900 * (targetH / H));
	for (let i = 0; i < speckCount; i++) {
		const x = hash('sx' + i) * W, y = hash('sy' + i) * targetH;
		g.fillStyle = i % 3 ? 'rgba(0,0,0,0.2)' : 'rgba(220,195,160,0.05)';
		g.fillRect(x, y, 1 + hash('sw' + i) * 2, 1);
	}
	// A single centred vignette only reads correctly when the canvas is
	// one screen tall. On the taller, scrollable mobile grid it's drawn
	// live instead, framing whatever's actually in view (see frame()).
	if (!includeVignette) return;
	const vig = g.createRadialGradient(W * 0.55, targetH * 0.5, targetH * 0.34, W * 0.5, targetH * 0.5, W * 0.62);
	vig.addColorStop(0, 'rgba(0,0,0,0)');
	vig.addColorStop(1, 'rgba(6,2,4,0.42)');
	g.fillStyle = vig;
	g.fillRect(0, 0, W, targetH);
}

// ── Marks ───────────────────────────────────────────────────────────
function drawMirror(g, m, alpha = 1) {
	// Cells grew for mobile legibility, but a fixed-width rim on a bigger
	// circle reads as a thinner wireframe, not a sturdier object — scale
	// the stroke with it so bigger mirrors read as more solid, not thinner.
	const weight = mobileClothMode ? 1.55 : 1;
	g.save();
	g.globalAlpha = alpha;
	g.translate(m.x, m.y);
	g.rotate(m.u * Math.PI);
	const glass = g.createRadialGradient(-m.r * 0.3, -m.r * 0.3, 0.5, 0, 0, m.r);
	glass.addColorStop(0, 'rgba(216,228,232,0.26)');
	glass.addColorStop(1, 'rgba(216,228,232,0.05)');
	g.fillStyle = glass;
	g.beginPath(); g.arc(0, 0, m.r - 0.5, 0, Math.PI * 2); g.fill();
	g.strokeStyle = '#e9dfc7';
	g.lineWidth = 1.6 * weight;
	g.beginPath();
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * Math.PI * 2;
		i ? g.lineTo(Math.cos(a) * m.r, Math.sin(a) * m.r) : g.moveTo(m.r, 0);
	}
	g.closePath(); g.stroke();

	// Real shisha work has no bare glass edge — the mirror is held by
	// thread wound tightly around its own rim before the setting even
	// begins. That wrapped bezel is what actually reads as "detailed" up
	// close, not a thicker single outline.
	const wraps = Math.max(10, Math.round(m.r * 1.15));
	g.lineCap = 'round';
	for (let i = 0; i < wraps; i++) {
		const a = (i / wraps) * Math.PI * 2;
		const a2 = a + (Math.PI * 2) / wraps * 0.62;
		const rIn = m.r + 0.5, rOut = m.r + 2.1 * weight;
		g.strokeStyle = i % 2 ? 'rgba(233,196,90,0.85)' : 'rgba(168,124,50,0.8)';
		g.lineWidth = 1.15 * weight;
		g.beginPath();
		g.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
		g.lineTo(Math.cos(a2) * rOut, Math.sin(a2) * rOut);
		g.stroke();
	}
	g.restore();
}

function drawHolder(g, h, alpha = 1) {
	const weight = mobileClothMode ? 1.4 : 1;
	const len = (4.5 + hash(h.w.n) * 2.5) * (mobileClothMode ? 1.2 : 1);
	g.save();
	g.globalAlpha = alpha;
	g.translate(h.x, h.y);
	g.rotate(h.ang);
	g.lineCap = 'round';
	g.strokeStyle = 'rgba(0,0,0,0.38)';
	g.lineWidth = 3 * weight;
	g.beginPath(); g.moveTo(-len, 1); g.lineTo(len, 1); g.stroke();
	g.strokeStyle = h.w.col;
	g.lineWidth = 2 * weight;
	g.beginPath(); g.moveTo(-len, 0); g.lineTo(len, 0); g.stroke();
	g.restore();
	if (h.w === closestOverall && alpha > 0.5) {
		g.strokeStyle = 'rgba(213,174,90,0.9)';
		g.lineWidth = 1.1 * weight;
		g.beginPath(); g.arc(h.x, h.y, 7.5, 0, Math.PI * 2); g.stroke();
		g.beginPath(); g.arc(h.x, h.y, 10, 0, Math.PI * 2); g.stroke();
	}
}

function drawPathStitch(g, ps) {
	const x = ps.u * W, y = ps.v * canvasContentH;
	g.save();
	g.translate(x, y);
	g.rotate(ps.ang);
	g.lineCap = 'round';
	g.strokeStyle = 'rgba(0,0,0,0.3)';
	g.lineWidth = 2.2;
	g.beginPath(); g.moveTo(-5, 1); g.lineTo(5, 1); g.stroke();
	g.strokeStyle = 'rgba(201,162,75,0.4)';
	g.lineWidth = 1.5;
	g.beginPath(); g.moveTo(-5, 0); g.lineTo(5, 0); g.stroke();
	g.restore();
}

function rebuildBase() {
	base = document.createElement('canvas');
	base.width = W * DPR;
	base.height = canvasContentH * DPR;
	const g = base.getContext('2d');
	g.setTransform(DPR, 0, 0, DPR, 0, 0);
	drawCloth(g, canvasContentH, !mobileClothMode);
	for (const ps of pathStitches) drawPathStitch(g, ps);
	for (const m of mirrors) {
		if (!m.sewn) {
			// the chalk tracing, waiting for thread
			drawMini(g, m.x, m.y, m.r, 0.15, true);
			continue;
		}
		drawMirror(g, m, 1);
		for (const h of m.holders) {
			if (!h.sewn) continue;
			const dim = focusGenre && h.w.g !== focusGenre;
			drawHolder(g, h, dim ? 0.12 : 1);
		}
	}
	baseCtx = g;
}

// ── Sewing ──────────────────────────────────────────────────────────
function sewMirror(m, staggered) {
	m.sewn = true;
	sewnCount++;
	drawMirror(baseCtx, m);
	glints.push({ x: m.x, y: m.y, ttl: 1.4, max: 1.4, big: true });
	m.holders.forEach((h, k) => {
		const place = () => {
			h.sewn = true;
			if (baseCtx) drawHolder(baseCtx, h, focusGenre && h.w.g !== focusGenre ? 0.12 : 1);
			glints.push({ x: h.x, y: h.y, ttl: 0.6, max: 0.6, big: false });
		};
		staggered ? setTimeout(place, 90 + k * 70) : place();
	});
	sewnEl.textContent = sewnCount;
	if (sewnCount >= 24 && queue.length && !autoTimer) finishBtn.style.display = 'block';
	if (!queue.length && !done) {
		done = true;
		finishBtn.style.display = 'none';
		if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
		defaultHint = 'Every mirror is now held. Rest on a stitch to see what it carries, or click a mirror to look closer. The gold rings mark the world song that sounds closest to the Balochi collection.';
		hintEl.textContent = defaultHint;
	}
}

function layStitch(x, y, ang) {
	// x/y arrive viewport-relative from the pointer; stitches bake into the
	// base canvas in content space so they stay put under later scrolling.
	const cy = toContentY(y);
	pathStitches.push({ u: x / W, v: cy / canvasContentH, ang });
	drawPathStitch(baseCtx, pathStitches[pathStitches.length - 1]);
	lastStitch = { x, y: cy };
	mirrorCarry += MIRRORS_PER_STITCH;
	while (mirrorCarry >= 1 && queue.length) {
		mirrorCarry -= 1;
		sewMirror(queue.shift(), true);
	}
}

// ── Pointer ─────────────────────────────────────────────────────────
canvas.addEventListener('pointerdown', (e) => {
	if (introActive || revealActive) return;
	if (zoom) { zoom.closing = true; return; }
	pointer.down = true;
	pointer.x = e.clientX; pointer.y = e.clientY;
	downAt = { x: e.clientX, y: e.clientY, moved: 0 };
	if (!lastStitch) lastStitch = { x: e.clientX, y: toContentY(e.clientY) };
	carry = 0;
	sewGestureActive = !mobileClothMode;
	hovered = null;
	tip.style.display = 'none';
});
window.addEventListener('pointermove', (e) => {
	ambientPointer.tx = (e.clientX / Math.max(W, 1) - 0.5) * 2;
	ambientPointer.ty = (e.clientY / Math.max(H, 1) - 0.5) * 2;
	if (introActive || revealActive) return;
	const nx = e.clientX, ny = e.clientY;
	const dx = nx - pointer.x, dy = ny - pointer.y;
	if (dx || dy) pointer.ang = Math.atan2(dy, dx);
	// touch-action: pan-y hands a vertical swipe to native scroll but still
	// lets JS see horizontal movement, so "pull the thread" survives on
	// mobile without fighting the scroll gesture: only sideways motion
	// feeds the stitch count there, so a vertical swipe (dx ≈ 0) never
	// sews by accident, and a real diagonal/horizontal pull still does.
	const sewDist = mobileClothMode ? Math.abs(dx) : Math.hypot(dx, dy);
	if (mobileClothMode && !sewGestureActive && downAt) {
		// commit to "this is a thread pull" only once sideways travel
		// from the touch start clearly outweighs vertical travel
		const totalDx = Math.abs(nx - downAt.x), totalDy = Math.abs(ny - downAt.y);
		if (totalDx > 10 && totalDx > totalDy * 1.4) sewGestureActive = true;
	}
	if (pointer.down && !done && !zoom && (!mobileClothMode || sewGestureActive)) {
		downAt.moved += Math.hypot(dx, dy);
		carry += sewDist;
		while (carry >= STITCH_LEN) {
			carry -= STITCH_LEN;
			layStitch(nx, ny, pointer.ang);
		}
	} else if (pointer.down) {
		downAt.moved += Math.hypot(dx, dy);
	}
	pointer.x = nx; pointer.y = ny;
	if (!pointer.down && !zoom) hover(nx, ny);
});
window.addEventListener('pointerup', (e) => {
	if (introActive || revealActive) { pointer.down = false; return; }
	const wasDown = pointer.down;
	pointer.down = false;
	if (!wasDown || zoom || downAt.moved > 6) return;
	const tapContentY = toContentY(e.clientY);
	for (const m of mirrors) {
		if (!m.sewn) continue;
		const d = (m.x - e.clientX) ** 2 + (m.y - tapContentY) ** 2;
		if (d < (m.r + 6) ** 2) {
			zoom = { m, t: 0, closing: false };
			document.body.classList.add('zoom-mode');
			zoomHint.style.display = 'block';
			tip.style.display = 'none';
			hovered = null;
			return;
		}
	}
	// On mobile, tapping bare cloth (not an existing mirror or stitch) sews
	// the next few mirrors in — the tap takes over from dragging, which is
	// reserved for scrolling the tapestry.
	if (mobileClothMode && !done && tapContentY > 0) {
		let sewn = 0;
		while (sewn < 3 && queue.length) { sewMirror(queue.shift(), true); sewn++; }
		if (sewn) return;
	}
	// On a touch device a tap never hovers, so a stitch's info would
	// otherwise be permanently unreachable — show it briefly on tap instead.
	if (!hasHover) {
		hover(e.clientX, e.clientY);
		clearTimeout(tapTipTimer);
		if (hovered) tapTipTimer = setTimeout(() => { hovered = null; tip.style.display = 'none'; }, 3800);
	}
});
window.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && zoom) zoom.closing = true;
});

function hover(x, y) {
	// x/y arrive viewport-relative; mirrors/holders live in content space.
	const cy = toContentY(y);
	let best = null, bd = 100;
	for (const m of mirrors) {
		if (!m.sewn) continue;
		for (const h of m.holders) {
			if (!h.sewn) continue;
			const d = (h.x - x) ** 2 + (h.y - cy) ** 2;
			if (d < bd) { bd = d; best = { kind: 'stitch', w: h.w, x: h.x, y: h.y }; }
		}
	}
	if (!best) {
		let bm = 400;
		for (const m of mirrors) {
			if (!m.sewn) continue;
			const d = (m.x - x) ** 2 + (m.y - cy) ** 2;
			if (d < Math.max((m.r + 4) ** 2, 1) && d < bm) { bm = d; best = { kind: 'mirror', m }; }
		}
	}
	hovered = best;
	if (!best) { tip.style.display = 'none'; return; }
	if (best.kind === 'mirror') {
		tipName.textContent = best.m.n;
		tipGenre.textContent = 'balochi folk · a mirror · click to look closer';
		tipSim.textContent = 'held by ' + best.m.holders.slice(0, 3)
			.map((h) => h.score != null ? `${h.w.n.split(' - ')[0]} (${Math.round(h.score * 100)}%)` : h.w.n.split(' - ')[0])
			.join(' · ');
	} else {
		tipName.textContent = best.w.n;
		tipGenre.textContent = (GENRE_NAMES[best.w.g] || best.w.g).toLowerCase();
		const held = best.w.placements.filter((p) => p.sewn).length;
		tipSim.textContent =
			(best.w === closestOverall ? 'the world’s closest sound to Balochistan · ' : '') +
			`holds ${held} mirror${held === 1 ? '' : 's'}`;
	}
	tip.style.display = 'block';
	// Position from the real rendered size, not the anchor point alone —
	// content wraps to a variable number of lines, so width/height aren't
	// known until after layout. Clamp fully in JS rather than leaning on a
	// CSS transform flip, which can just as easily push it off the other edge.
	const gap = 16, margin = 12;
	const tw = tip.offsetWidth, th = tip.offsetHeight;
	let left = x + gap;
	if (left + tw > W - margin) left = x - gap - tw;
	left = Math.max(margin, Math.min(W - tw - margin, left));
	tip.style.left = left + 'px';

	const half = th / 2;
	// Chrome is a small floating tab/pill now, not a flow-stacked block —
	// a fixed corner clearance is enough rather than measuring it directly.
	const minY = half + margin + (mobileClothMode ? 56 : 0);
	const maxY = H - half - margin;
	tip.style.top = Math.min(maxY, Math.max(minY, y)) + 'px';
}

finishBtn.addEventListener('click', () => {
	finishBtn.style.display = 'none';
	autoTimer = setInterval(() => {
		if (queue.length) sewMirror(queue.shift(), true);
	}, 110);
});

// ── Mobile chrome: intro card ↔ tab, legend ↔ bottom sheet ──────────
// The finished cloth gets the whole screen; the masthead is read once
// and collapses to a small tab, the legend opens as a sheet on demand,
// instead of either permanently eating into the grid's space.
mastheadDismissBtn?.addEventListener('click', () => {
	document.body.classList.add('masthead-closed');
});
mastheadTabBtn?.addEventListener('click', () => {
	document.body.classList.remove('masthead-closed');
});
legendToggleBtn?.addEventListener('click', () => {
	document.body.classList.add('legend-open');
});
legendScrimEl?.addEventListener('click', () => {
	document.body.classList.remove('legend-open');
});

// ── Legend ──────────────────────────────────────────────────────────
function buildLegend() {
	legendEl.innerHTML = Object.entries(THREADS)
		.map(([g, c]) => `<span class="li" data-g="${g}"><i style="background:${c}"></i>${GENRE_NAMES[g]}</span>`)
		.join('');
	legendEl.querySelectorAll('.li').forEach((el) => {
		el.addEventListener('click', () => {
			const g = el.dataset.g;
			focusGenre = focusGenre === g ? null : g;
			legendEl.querySelectorAll('.li').forEach((o) => o.classList.toggle('active', o.dataset.g === focusGenre));
			rebuildBase();
			if (focusGenre) {
				let stitches = 0;
				const held = new Set();
				for (const m of mirrors) for (const h of m.holders) {
					if (h.sewn && h.w.g === focusGenre) { stitches++; held.add(m); }
				}
				hintEl.textContent = `${GENRE_NAMES[focusGenre]} · ${stitches} stitches holding ${held.size} mirrors. Click the thread again to release it.`;
			} else {
				hintEl.textContent = defaultHint;
			}
		});
	});
}

// ── Zoom ────────────────────────────────────────────────────────────
function drawZoom() {
	const z = zoom;
	const mobile = W < 720;
	z.t += ((z.closing ? 0 : 1) - z.t) * 0.095;
	if (z.closing && z.t < 0.02) {
		zoom = null;
		zoomHint.style.display = 'none';
		document.body.classList.remove('zoom-mode');
		return;
	}
	const easeT = 1 - Math.pow(1 - z.t, 3);
	const S = 1 + easeT * (mobile ? 2.15 : 3.15);
	const tx = W * 0.5 - z.m.x * S;
	const ty = H * (mobile ? 0.34 : 0.47) - z.m.y * S;

	ctx.fillStyle = `rgba(9,4,6,${0.78 * easeT})`;
	ctx.fillRect(0, 0, W, H);
	ctx.save();
	ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * tx, DPR * ty);
	drawMirror(ctx, z.m, 1);
	for (const h of z.m.holders) if (h.sewn) drawHolder(ctx, h, 1);
	ctx.restore();
	ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
	if (easeT < 0.6) return;

	const la = (easeT - 0.6) / 0.4;
	const sx = (v) => v * S + tx;
	const sy = (v) => v * S + ty;
	ctx.globalAlpha = la;
	if (mobile) {
		let title = z.m.n;
		if (title.length > 38) title = title.slice(0, 37) + '…';
		ctx.fillStyle = '#e9dfc7';
		ctx.font = '600 22px "Alegreya Sans", sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(title, W * 0.5, H * 0.64);
		ctx.fillStyle = '#c9a24b';
		ctx.font = '500 13px "Alegreya Sans", sans-serif';
		ctx.fillText('balochi folk · held by its six closest sounds', W * 0.5, H * 0.68);
		ctx.font = '500 12px "Alegreya Sans", sans-serif';
		z.m.holders.forEach((h, index) => {
			if (!h.sewn) return;
			let name = h.w.n;
			if (name.length > 31) name = name.slice(0, 30) + '…';
			const y = H * 0.735 + index * 21;
			ctx.textAlign = 'left';
			ctx.fillStyle = '#e9dfc7';
			ctx.fillText(`${h.rank + 1} · ${name}`, 22, y);
			ctx.textAlign = 'right';
			ctx.fillStyle = h.w.col;
			const genreLabel = (GENRE_NAMES[h.w.g] || h.w.g).toLowerCase();
			const pctLabel = h.score != null ? ` · ${Math.round(h.score * 100)}%` : '';
			ctx.fillText(genreLabel + pctLabel, W - 22, y);
		});
		ctx.globalAlpha = 1;
		ctx.textAlign = 'left';
		return;
	}
	ctx.fillStyle = '#e9dfc7';
	ctx.font = '600 34px "Alegreya Sans", sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText(z.m.n, W * 0.5, H - 118);
	ctx.fillStyle = '#c9a24b';
	ctx.font = '500 16px "Alegreya Sans", sans-serif';
	ctx.fillText('balochi folk · held by its six closest sounds', W * 0.5, H - 92);
	ctx.font = '500 16px "Alegreya Sans", sans-serif';

	// Build each label's geometry first, then push overlapping labels apart
	// vertically before drawing — angle-only placement can put two holders'
	// text boxes on top of each other when they sit close together.
	const LINE_H = 18;
	const labels = z.m.holders.filter((h) => h.sewn).map((h) => {
		const a = Math.atan2(h.y - z.m.y, h.x - z.m.x);
		const anchorX = sx(h.x) + Math.cos(a) * 9;
		const anchorY = sy(h.y) + Math.sin(a) * 9;
		const lx = sx(h.x) + Math.cos(a) * 38;
		const ly = sy(h.y) + Math.sin(a) * 38;
		const right = Math.cos(a) >= 0;
		let name = h.w.n;
		if (name.length > 38) name = name.slice(0, 37) + '…';
		const nameLine = `${h.rank + 1} · ${name}`;
		const genreLabel = (GENRE_NAMES[h.w.g] || h.w.g).toLowerCase();
		const pctLabel = h.score != null ? ` · ${Math.round(h.score * 100)}% match` : '';
		const genreLine = genreLabel + pctLabel;
		const width = Math.max(ctx.measureText(nameLine).width, ctx.measureText(genreLine).width);
		return {
			h, anchorX, anchorY, right, nameLine, genreLine, col: h.w.col,
			ly,
			top: ly - LINE_H * 0.75,
			bottom: ly + LINE_H * 1.4,
			left: right ? lx : lx - width,
			right2: right ? lx + width : lx,
			lx
		};
	});

	for (let pass = 0; pass < 6; pass++) {
		let moved = false;
		for (let i = 0; i < labels.length; i++) {
			for (let j = i + 1; j < labels.length; j++) {
				const A = labels[i], B = labels[j];
				const xOverlap = A.left < B.right2 && B.left < A.right2;
				if (!xOverlap) continue;
				const yGap = LINE_H * 2.2;
				const dist = B.ly - A.ly;
				const overlap = yGap - Math.abs(dist);
				if (overlap > 0) {
					const push = overlap / 2 + 0.5;
					const dir = dist >= 0 ? 1 : -1;
					A.ly -= push * dir; A.top -= push * dir; A.bottom -= push * dir;
					B.ly += push * dir; B.top += push * dir; B.bottom += push * dir;
					moved = true;
				}
			}
		}
		if (!moved) break;
	}

	for (const l of labels) {
		ctx.textAlign = l.right ? 'left' : 'right';
		ctx.strokeStyle = 'rgba(233,223,199,0.35)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(l.anchorX, l.anchorY);
		ctx.lineTo(l.right ? l.lx - 6 : l.lx + 6, l.ly);
		ctx.stroke();
		ctx.fillStyle = '#e9dfc7';
		ctx.fillText(l.nameLine, l.lx, l.ly);
		ctx.fillStyle = l.col;
		ctx.fillText(l.genreLine, l.lx, l.ly + LINE_H);
	}
	ctx.globalAlpha = 1;
	ctx.textAlign = 'left';
}

function drawLivingBase(source) {
	if (mobileClothMode) {
		// The base is taller than one screen — sample the window that's
		// actually scrolled into view rather than squeezing the whole
		// tapestry to fit (that breathing drift doesn't apply here).
		const maxScroll = Math.max(0, canvasContentH - H);
		const sy = Math.max(0, Math.min(maxScroll, scrollY));
		ctx.drawImage(source, 0, sy * DPR, W * DPR, H * DPR, 0, 0, W, H);
		const vig = ctx.createRadialGradient(W * 0.5, H * 0.42, H * 0.28, W * 0.5, H * 0.5, W * 0.75);
		vig.addColorStop(0, 'rgba(0,0,0,0)');
		vig.addColorStop(1, 'rgba(6,2,4,0.4)');
		ctx.fillStyle = vig;
		ctx.fillRect(0, 0, W, H);
		return;
	}
	if (reducedMotion.matches) {
		ctx.drawImage(source, 0, 0, W, H);
		return;
	}
	const dx = Math.sin(clothTime * 0.22) * 1.8;
	const dy = Math.cos(clothTime * 0.17) * 1.4;
	const scale = 1.003 + Math.sin(clothTime * 0.13) * 0.0012;
	ctx.save();
	ctx.translate(W * 0.5 + dx, H * 0.5 + dy);
	ctx.rotate(Math.sin(clothTime * 0.11) * 0.0015);
	ctx.scale(scale, scale);
	ctx.drawImage(source, -W * 0.5, -H * 0.5, W, H);
	ctx.restore();
}

// ── Frame loop ──────────────────────────────────────────────────────
function frame() {
	clothTime += 1 / 60;
	if (introActive) {
		const p = storyProgress();
		drawStory(p);
		updateStoryDom(p);
		if (p >= 5.995) finishStory();
		requestAnimationFrame(frame);
		return;
	}
	if (revealActive) {
		ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
		drawLivingBase(base);
		requestAnimationFrame(frame);
		return;
	}

	if (mobileClothMode) scrollY = window.scrollY;
	ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
	// behind an open zoom, the cloth falls out of focus
	if (zoom) ctx.filter = `blur(${(zoom.t * 5).toFixed(1)}px)`;
	drawLivingBase(base);
	ctx.filter = 'none';

	// Everything below is drawn live each frame at content-space positions
	// (mirrors, holders, glints) — toScreenY re-anchors them under the
	// current scroll. It's a no-op (scrollY is always 0) outside the
	// mobile scrollable-tapestry mode.
	for (let i = glints.length - 1; i >= 0; i--) {
		const gl = glints[i];
		gl.ttl -= 1 / 60;
		if (gl.ttl <= 0) { glints.splice(i, 1); continue; }
		const k = gl.ttl / gl.max;
		const r = (gl.big ? 15 : 7) * (1 - k * 0.4);
		const gy = toScreenY(gl.y);
		const grad = ctx.createRadialGradient(gl.x, gy, 0, gl.x, gy, r);
		grad.addColorStop(0, `rgba(255,244,214,${0.45 * k})`);
		grad.addColorStop(1, 'rgba(255,244,214,0)');
		ctx.fillStyle = grad;
		ctx.beginPath(); ctx.arc(gl.x, gy, r, 0, Math.PI * 2); ctx.fill();
	}

	if (zoom) {
		drawZoom();
		requestAnimationFrame(frame);
		return;
	}

	if (hovered && !pointer.down) {
		ctx.lineCap = 'round';
		if (hovered.kind === 'mirror') {
			const m = hovered.m;
			const my0 = toScreenY(m.y);
			ctx.strokeStyle = 'rgba(213,174,90,0.95)';
			ctx.lineWidth = 1.4;
			ctx.beginPath(); ctx.arc(m.x, my0, m.r + 4, 0, Math.PI * 2); ctx.stroke();
			for (const h of m.holders) {
				if (!h.sewn) continue;
				ctx.strokeStyle = 'rgba(233,223,199,0.85)';
				ctx.lineWidth = 1.1;
				ctx.beginPath(); ctx.arc(h.x, toScreenY(h.y), 6.5, 0, Math.PI * 2); ctx.stroke();
			}
		} else {
			const w = hovered.w;
			const hx = hovered.x, hy = toScreenY(hovered.y);
			for (const p of w.placements) {
				if (!p.sewn || (p.x === hovered.x && p.y === hovered.y)) continue;
				const py = toScreenY(p.y);
				const mx = (hx + p.x) / 2, my = (hy + py) / 2;
				const sag = Math.min(24, Math.hypot(p.x - hx, py - hy) * 0.09);
				ctx.strokeStyle = 'rgba(0,0,0,0.4)';
				ctx.lineWidth = 2.4;
				ctx.beginPath(); ctx.moveTo(hx, hy);
				ctx.quadraticCurveTo(mx, my + sag, p.x, py); ctx.stroke();
				ctx.strokeStyle = 'rgba(213,174,90,0.85)';
				ctx.lineWidth = 1.3;
				ctx.beginPath(); ctx.moveTo(hx, hy);
				ctx.quadraticCurveTo(mx, my + sag, p.x, py); ctx.stroke();
				ctx.strokeStyle = 'rgba(233,223,199,0.8)';
				ctx.lineWidth = 1;
				ctx.beginPath(); ctx.arc(p.x, py, 6, 0, Math.PI * 2); ctx.stroke();
			}
			ctx.strokeStyle = 'rgba(213,174,90,0.95)';
			ctx.lineWidth = 1.4;
			ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.stroke();
		}
	}

	// Touch devices have no persistent hover — only draw the trailing thread
	// and needle while a finger (or mouse) is genuinely in contact, so they
	// never freeze at a stale last-touched point. On mobile a drag is a
	// scroll now, not a pulled thread, so the needle never appears there —
	// without this it stretched a thread across the whole screen on scroll.
	const showNeedle = pointer.x > 0 && (hasHover || (pointer.down && sewGestureActive));
	if (lastStitch && !done && showNeedle) {
		const lsy = toScreenY(lastStitch.y);
		const ex = pointer.x - Math.cos(pointer.ang) * 22;
		const ey = pointer.y - Math.sin(pointer.ang) * 22;
		const mx = (lastStitch.x + ex) / 2, my = (lsy + ey) / 2;
		const sag = Math.min(30, Math.hypot(ex - lastStitch.x, ey - lsy) * 0.12);
		ctx.strokeStyle = 'rgba(201,162,75,0.8)';
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.moveTo(lastStitch.x, lsy);
		ctx.quadraticCurveTo(mx, my + sag, ex, ey);
		ctx.stroke();
	}
	if (showNeedle) {
		ctx.save();
		ctx.translate(pointer.x, pointer.y);
		ctx.rotate(pointer.ang);
		ctx.lineCap = 'round';
		ctx.strokeStyle = 'rgba(0,0,0,0.45)';
		ctx.lineWidth = 3.4;
		ctx.beginPath(); ctx.moveTo(-22, 1.4); ctx.lineTo(4, 1.4); ctx.stroke();
		ctx.strokeStyle = '#d9d2c4';
		ctx.lineWidth = 2.2;
		ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(4, 0); ctx.stroke();
		ctx.strokeStyle = '#8f887b';
		ctx.lineWidth = 1;
		ctx.beginPath(); ctx.arc(-19, 0, 1.8, 0, Math.PI * 2); ctx.stroke();
		ctx.restore();
	}

	requestAnimationFrame(frame);
}

// ── Boot ────────────────────────────────────────────────────────────
function resize() {
	W = window.innerWidth; H = window.innerHeight;
	// Capping mobile DPR well below the device's real ratio was making
	// every mirror render soft/blurry on real 2x-3x phone screens — a 2D
	// canvas this simple is cheap enough to render at full density.
	DPR = Math.min(window.devicePixelRatio || 1, 3);
	canvas.width = W * DPR; canvas.height = H * DPR;
	canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
	layoutGrid();
	document.getElementById('cloth-spacer').style.height =
		mobileClothMode ? canvasContentH + 'px' : '0px';
	document.body.classList.toggle('mobile-cloth', mobileClothMode);
	if (mobileClothMode && !done && !defaultHint.startsWith('Tap the cloth')) {
		defaultHint = 'In shisha embroidery, a mirror is held in place by the stitches around it. Here, every mirror carries a Balochi song. Drag sideways to pull the thread, tap to sew a few in, scroll up and down to see the rest of the tapestry.';
		if (!focusGenre) hintEl.textContent = defaultHint;
	}
	bgBase = document.createElement('canvas');
	bgBase.width = W * DPR;
	bgBase.height = H * DPR;
	const g = bgBase.getContext('2d');
	g.setTransform(DPR, 0, 0, DPR, 0, 0);
	drawCloth(g);
	rebuildBase();
}

Promise.all([
	fetch('data.json').then((r) => {
		if (!r.ok) throw new Error(`data.json ${r.status}`);
		return r.json();
	}),
	fetch('similarity.json')
		.then((r) => {
			if (!r.ok) throw new Error(`similarity.json ${r.status}`);
			return r.json();
		})
		.catch((err) => {
			console.error('similarity.json unavailable — falling back to plot-distance neighbours', err);
			return null;
		})
])
	.then(([data, simData]) => {
		prepare(data, simData);
		queue = mirrors.slice();
		defaultHint = hintEl.textContent;
		resize();
		buildLegend();
		setupStory();
		window.addEventListener('resize', resize);
		requestAnimationFrame(frame);
	})
	.catch((err) => {
		console.error('failed to load the dataset', err);
		hintEl.textContent = 'Something went wrong loading the dataset. Please refresh the page.';
	});
