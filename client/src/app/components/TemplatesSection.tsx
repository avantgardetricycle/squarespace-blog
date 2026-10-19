import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { TEMPLATE_PICKER_ART } from '@/app/components/template-picker-art';

/* Blog index and post previews reuse the product's template-picker art, so the
   landing page and the in-app picker always show the same thing. Footer blocks
   are wireframes. All markup is static and author-authored; no user input
   reaches these strings. */
const TPL: { collection: [string,string,string][]; post: [string,string,string][] } = {
  collection:[
    ['showcase','The Showcase','Large alternating images'],
    ['newsroom','The Newsroom','Compact list with search'],
    ['masthead','The Masthead','Hero plus image grid'],
    ['editorial','The Editorial','Alternating mosaic, text on images'],
    ['digest','The Digest','Main column with sidebar']],
  post:[
    ['reporter','The Reporter','Title beside image, right sidebar'],
    ['feature','The Feature','Centered header, full-bleed hero'],
    ['writer','The Writer','Centered header, no image'],
    ['story','The Story','Dark split hero, narrow column'],
    ['publisher','The Publisher','Hero overlay, right sidebar']]
};

/* ── Footer blocks ── */
/* Footer blocks, drawn like the template previews (same fonts, colors and
   photos) at a post column's real width (760px), using the renderer's layout:
   "More to Read" is a 3-column grid of 16:10 cards; Popular Posts is a list
   with square thumbnails; Previous / Next has no images. */
const PH = (n: string) => `background:#E9E5DF url(/template-photos/${n}.webp) center / cover no-repeat`;
const HEAD = (t: string) => `<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;padding-bottom:8px;border-bottom:1px solid #ECE8E2;margin-bottom:16px">${t}</div>`;
const CAT = (t: string) => `<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#A0522D">${t}</div>`;
const SERIF = "font-family:'DM Serif Display',serif";
const BLOCK = (inner: string) => `<div style="width:760px;box-sizing:border-box;padding:28px 32px;background:#fff;font-family:'DM Sans',sans-serif;color:#2B2723">${inner}</div>`;
const B: Record<string, string> = {
  author: BLOCK(`${HEAD('About the author')}
    <div style="display:flex;gap:20px;align-items:flex-start">
      <div style="width:84px;height:84px;border-radius:50%;flex-shrink:0;${PH('bride-window')}"></div>
      <div><div style="${SERIF};font-size:24px;line-height:1.2;margin-bottom:6px">Maya Okonkwo</div>
        <div style="font-size:15px;line-height:1.55;color:#5A534C;margin-bottom:12px">Bay Area wedding and portrait photographer. I write about light, planning, and the parts of the day nobody warns you about.</div>
        <div style="display:flex;gap:14px;font-size:13px;color:#766D64">${['Instagram', 'Pinterest', 'Website'].map((x) => `<span style="border-bottom:1px solid #DCD6CE">${x}</span>`).join('')}</div></div>
    </div>`),
  related: BLOCK(`${HEAD('More to read')}
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px">
      ${[['venue-barn', 'Venues', 'Small Oakland Venues That Feel Like a Dinner Party', 'Six spaces under 100 guests where nobody has to shout.'],
         ['couple-walking', 'Engagements', 'What to Wear to Your Engagement Session', 'Texture over pattern, every time.'],
         ['reception-table', 'Planning', 'A Shot List Your Photographer Will Actually Use', 'Keep it to the people only you know about.']]
        .map(([ph, c, t, d]) => `<div style="display:flex;flex-direction:column;gap:10px;min-width:0">
          <div style="aspect-ratio:16/10;border-radius:4px;${PH(ph)}"></div>${CAT(c)}
          <div style="${SERIF};font-size:21px;line-height:1.3;margin-top:-4px">${t}</div>
          <div style="font-size:13.6px;color:#555;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d}</div></div>`).join('')}
    </div>`),
  popular: BLOCK(`${HEAD('Popular posts')}
    ${[['forest-sunbeams', 'Elopements: Small Days, Big Feelings', 'Aug 9, 2026 · 5 min read'],
       ['wedding-arch-dusk', 'Ana &amp; Theo: A Rainy Day at the Redwood Grange', 'Sep 3, 2026 · 4 min read'],
       ['golden-hour-ceremony', 'How to Plan a Golden-Hour Ceremony', 'Oct 2, 2026 · 6 min read']]
      .map(([ph, t, m]) => `<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px">
        <div style="width:80px;height:80px;flex-shrink:0;border-radius:4px;${PH(ph)}"></div>
        <div><div style="${SERIF};font-size:18px;line-height:1.2;margin-bottom:5px">${t}</div>
          <div style="font-size:12px;color:#888">${m}</div></div></div>`).join('')}`),
  email: BLOCK(`<div style="display:flex;gap:28px;align-items:center">
      <div style="flex:1"><div style="${SERIF};font-size:26px;line-height:1.2;margin-bottom:6px">Get the planning notes</div>
        <div style="font-size:15px;line-height:1.5;color:#5A534C">One planning email a month: light, timelines, and venues worth seeing.</div></div>
      <div style="flex:0 0 300px"><div style="height:44px;box-sizing:border-box;border:1px solid #DCD6CE;border-radius:4px;display:flex;align-items:center;padding:0 14px;font-size:15px;color:#766D64;margin-bottom:8px">you@email.com</div>
        <div style="height:44px;background:#A0522D;color:#fff;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600">Subscribe</div></div>
    </div>`),
  magnet: BLOCK(`<div style="display:flex;gap:24px;align-items:center">
      <div style="flex:0 0 150px;aspect-ratio:3/4;border-radius:4px;box-shadow:0 8px 22px rgba(43,39,35,.18);${PH('golden-hour-ceremony')};position:relative">
        <div style="position:absolute;left:0;right:0;bottom:0;padding:10px;background:linear-gradient(to top,rgba(20,14,8,.75),rgba(20,14,8,0));border-radius:0 0 4px 4px;${SERIF};color:#fff;font-size:15px;line-height:1.15">The Golden-Hour Timeline</div></div>
      <div style="flex:1">${CAT('Free download')}
        <div style="${SERIF};font-size:26px;line-height:1.2;margin:6px 0">The golden-hour timeline</div>
        <div style="font-size:15px;line-height:1.5;color:#5A534C;margin-bottom:14px">One page. Work back from sunset to plan your ceremony and portraits.</div>
        <div style="display:flex;gap:8px"><div style="flex:1;height:44px;box-sizing:border-box;border:1px solid #DCD6CE;border-radius:4px;display:flex;align-items:center;padding:0 14px;font-size:15px;color:#766D64">you@email.com</div>
          <div style="height:44px;padding:0 20px;background:#A0522D;color:#fff;border-radius:4px;display:flex;align-items:center;font-size:15px;font-weight:600">Send it to me</div></div></div>
    </div>`),
  prevnext: BLOCK(`<div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #ECE8E2;border-bottom:1px solid #ECE8E2">
      <div style="padding:22px 24px 22px 0;border-right:1px solid #ECE8E2">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#766D64;margin-bottom:8px">&larr; Previous</div>${CAT('Venues')}
        <div style="${SERIF};font-size:22px;line-height:1.25;margin-top:6px">Small Oakland Venues That Feel Like a Dinner Party</div></div>
      <div style="padding:22px 0 22px 24px;text-align:right">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#766D64;margin-bottom:8px">Next &rarr;</div>${CAT('Engagements')}
        <div style="${SERIF};font-size:22px;line-height:1.25;margin-top:6px">What to Wear to Your Engagement Session</div></div>
    </div>`),
};

const BLK: [string,string,string][] = [
  ['author','Author Profile','Photo, bio, and social links'],
  ['related','Related Posts','What to read next, by tag'],
  ['popular','Popular Posts','Ranked by real reader data'],
  ['email','Newsletter Signup','Grow your list on every post'],
  ['magnet','Lead Magnet','Trade a freebie for an email'],
  ['prevnext','Previous / Next','Keep readers moving through the archive']
];

type GroupKey = 'collection' | 'post' | 'footer';

const GROUPS: { key: GroupKey; label: string; hint: string; items: [string, string, string][]; thumbs: Record<string, string>; blk?: boolean; art?: boolean }[] = [
  { key: 'collection', label: 'Blog index', hint: 'How the page listing your posts looks', items: TPL.collection, thumbs: TEMPLATE_PICKER_ART, art: true },
  { key: 'post', label: 'Post page', hint: 'How each article looks', items: TPL.post, thumbs: TEMPLATE_PICKER_ART, art: true },
  { key: 'footer', label: 'Footer blocks', hint: 'Stack any of these under a post or collection', items: BLK, thumbs: B, blk: true },
];

const STYLES = `.bb-templates{
  --violet:#5B4FE8; --violet-lt:#8F86F0; --line:#e4e3de; --mid:#5f5f5f;
  --black:#0a0a0a; --serif:"DM Serif Display",serif;
}
.bb-templates .tp-wrap{max-width:1160px;margin:0 auto;padding:0 16px}
.bb-templates .tp-eyebrow{display:flex;align-items:center;justify-content:center;gap:10px;font-size:.6rem;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--violet);margin-bottom:18px}
.bb-templates .tp-eyebrow i{display:block;width:28px;height:1.5px;background:var(--violet);opacity:.35;border-radius:2px}
.bb-templates .tp-h2{font-family:var(--serif);font-size:clamp(2.2rem,4vw,3.2rem);font-weight:400;letter-spacing:-.02em;color:var(--black);line-height:1.1}
.bb-templates .tp-h2 em{font-style:italic;color:var(--violet)}
.bb-templates .tp-head{text-align:center;margin-bottom:36px}
.bb-templates .tp-head p{font-size:.98rem;color:var(--mid);font-weight:300;max-width:560px;margin:16px auto 0;line-height:1.7}

/* tabs */
.bb-templates .tp-tabs{display:flex;flex-wrap:wrap;justify-content:center;gap:4px;padding:4px;background:#f4f3f0;border-radius:999px;width:fit-content;margin:0 auto}
.bb-templates .tp-tab{border:0;cursor:pointer;font:inherit;font-size:.95rem;font-weight:600;padding:12px 22px;min-height:44px;border-radius:999px;background:transparent;color:var(--mid);transition:background .15s,color .15s,box-shadow .15s}
.bb-templates .tp-tab:hover{color:var(--black)}
.bb-templates .tp-tab[aria-selected="true"]{background:#fff;color:var(--black);box-shadow:0 1px 4px rgba(0,0,0,.08)}
.bb-templates .tp-tab span{opacity:.6;font-weight:400;margin-left:4px}
.bb-templates .tp-tab:focus-visible,.bb-templates .tp-opt:focus-visible{outline:2px solid var(--violet);outline-offset:2px}

/* panel */
.bb-templates .tp-panel{display:flex;flex-wrap:wrap;gap:48px;align-items:flex-start;margin-top:40px}
.bb-templates .tp-stage{flex:999 1 560px;min-width:0;display:flex;flex-direction:column;gap:18px}
.bb-templates .tp-frame{background:#fbfaf8;border:1px solid #ecebe6;border-radius:16px;padding:32px;display:flex;justify-content:center;align-items:center;min-height:420px;box-sizing:border-box}
.bb-templates .tp-big{width:300px;zoom:2}
.bb-templates .tp-big.blk{width:330px;zoom:1.8}
.bb-templates .tp-cap{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}
.bb-templates .tp-cap-name{font-family:var(--serif);font-size:1.6rem;letter-spacing:-.01em;color:var(--black)}
.bb-templates .tp-cap-desc{font-size:.95rem;color:var(--mid);font-weight:300;margin-top:2px}
.bb-templates .tp-cap-pos{font-size:.8rem;color:#6b6b6b}
.bb-templates .tp-list{flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:6px}
.bb-templates .tp-hint{font-size:.8rem;color:#6b6b6b;padding:0 4px 8px}
.bb-templates .tp-opt{display:flex;align-items:center;gap:14px;width:100%;padding:10px;min-height:64px;border-radius:12px;cursor:pointer;font:inherit;text-align:left;background:#fff;border:1.5px solid transparent;transition:background .15s,border-color .15s}
.bb-templates .tp-opt:hover{background:#faf9fe}
.bb-templates .tp-opt[aria-pressed="true"]{background:#f3f1fe;border-color:var(--violet)}
.bb-templates .tp-mini{width:200px;zoom:.32;flex-shrink:0;pointer-events:none}
.bb-templates .tp-mini.blk{zoom:.32}
.bb-templates .tp-opt-name{display:block;font-family:var(--serif);font-size:1.05rem;color:var(--black)}
.bb-templates .tp-opt-desc{display:block;font-size:.8rem;color:#6b6b6b;font-weight:300;margin-top:2px}
.bb-templates .tp-mix{margin-top:48px;text-align:center;font-size:.85rem;color:var(--mid);font-weight:300}
.bb-templates .tp-mix b{font-weight:600;color:var(--black)}
@media (max-width:640px){
  .bb-templates .tp-tabs{flex-wrap:nowrap}
  .bb-templates .tp-tab{font-size:.85rem;padding:10px 12px;white-space:nowrap}
  .bb-templates .tp-frame{padding:16px;min-height:0}
  .bb-templates .tp-big{zoom:1}
  .bb-templates .tp-big.blk{zoom:1}
  .bb-templates .tp-panel{gap:14px;margin-top:20px}
  /* Phones: the chooser becomes a swipeable strip right above the preview, so
     picking a template and seeing it happen stay on one screen. */
  .bb-templates .tp-list{order:-1;flex:1 1 100%;flex-direction:row;gap:8px;overflow-x:auto;scroll-snap-type:x proximity;
    -webkit-overflow-scrolling:touch;position:relative;padding:2px 2px 6px;margin:0 -16px;padding-left:16px;padding-right:16px;scrollbar-width:none}
  .bb-templates .tp-list::-webkit-scrollbar{display:none}
  .bb-templates .tp-hint{display:none}
  .bb-templates .tp-opt{flex:0 0 auto;width:104px;min-height:0;flex-direction:column;align-items:stretch;gap:6px;padding:6px;scroll-snap-align:center}
  .bb-templates .tp-opt .tp-art-mini{width:100%}
  .bb-templates .tp-mini{width:280px;zoom:.32}
  .bb-templates .tp-opt-name{font-size:.82rem;line-height:1.2}
  .bb-templates .tp-opt-desc{display:none}
  .bb-templates .tp-stage{flex-basis:100%;gap:10px}
  .bb-templates .tp-cap-name{font-size:1.25rem}
  .bb-templates .tp-cap-desc{font-size:.85rem}
}

/* footer blocks: a 760px block scaled to fit */
.bb-templates .tp-block{position:relative;overflow:hidden;border:1px solid #e6e4de;border-radius:10px;background:#fff;box-shadow:0 8px 26px rgba(20,18,16,.08)}
.bb-templates .tp-art-mini .tp-block{border-radius:6px;box-shadow:none}
.bb-templates .tp-block-scale{position:absolute;top:0;left:0;transform-origin:top left;pointer-events:none;user-select:none}
/* product preview art (same as the in-app template picker) */
.bb-templates .tp-art-big{width:100%;max-width:640px}
.bb-templates .tp-art-mini{width:84px;flex-shrink:0;pointer-events:none}
.bb-templates .tp-art{background:#fff;border:1px solid #e6e4de;border-radius:10px;overflow:hidden;box-shadow:0 8px 26px rgba(20,18,16,.08)}
.bb-templates .tp-art-mini .tp-art{border-radius:6px;box-shadow:none}
.bb-templates .tp-art-bar{display:flex;align-items:center;gap:4px;height:22px;padding:0 10px;background:#f1efeb;border-bottom:1px solid #e4e2dc}
.bb-templates .tp-art-bar i{width:6px;height:6px;border-radius:50%;background:#d6d2cb}
.bb-templates .tp-art-bar span{margin-left:8px;font-size:10px;color:#6b6b6b}
.bb-templates .tp-art-page{position:relative;aspect-ratio:1280/1000;overflow:hidden;background:#fff}
.bb-templates .tp-art-scale{position:absolute;top:0;left:0;width:1280px;height:1000px;transform-origin:top left;pointer-events:none;user-select:none}

/* wireframe thumbnail shell */
.bb-templates .tp-thumb{aspect-ratio:4/3;background:#fff;border:1px solid #e6e6ec;border-radius:9px;padding:11px;overflow:hidden;box-sizing:border-box;
  box-shadow:0 8px 26px rgba(91,79,232,.09);display:flex;flex-direction:column;gap:5px}
.bb-templates .tp-thumb div{border-color:#eeeef3!important}
.bb-templates .tp-thumb.blk{aspect-ratio:3/1;justify-content:center;gap:0;padding:14px 16px}
.bb-templates .tp-mini .tp-thumb{box-shadow:none}
/* wireframe primitives */
.bb-templates .w{background:#f8f8fb;border-radius:2px}
.bb-templates .wi{background:linear-gradient(135deg,#ded8f8,#b9afee);border-radius:2px}
.bb-templates .wd{background:#2b2940;border-radius:2px}
.bb-templates .wl{height:3px;background:#f0f0f4;border-radius:2px}
.bb-templates .wl.a{background:var(--violet);opacity:.6}
.bb-templates .wl.w{background:rgba(255,255,255,.7)}
.bb-templates .wt{height:5px;background:#e0e0e8;border-radius:2px}
.bb-templates .wo{width:5px;height:5px;border-radius:50%;background:var(--violet);flex-shrink:0}
.bb-templates .wsb{display:flex;flex-direction:column;gap:3px}
.bb-templates .wov{background:linear-gradient(to top,rgba(18,14,48,.78),rgba(18,14,48,0) 62%),linear-gradient(135deg,#ded8f8,#9b90ec);border-radius:2px;display:flex;flex-direction:column;justify-content:flex-end;padding:4px;gap:2px}`;

/** A product template preview (1280x1000 page) scaled to the box's width. */
function Art({ html, show, url }: { html: string; show: boolean; url?: boolean }) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / 1280);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="tp-art" aria-hidden="true">
      {url && (
        <div className="tp-art-bar">
          <i /><i /><i />
          <span>mayaokonkwo.com/journal</span>
        </div>
      )}
      <div className="tp-art-page" ref={pageRef}>
        {show && scale > 0 && (
          <div className="tp-art-scale" style={{ transform: `scale(${scale})` }} dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  );
}

/** A footer block (760px wide) scaled to the box width; height follows. */
function BlockArt({ html, show }: { html: string; show: boolean }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState({ scale: 0, height: 0 });
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const s = box.clientWidth / 760;
      const h = innerRef.current ? innerRef.current.offsetHeight : 0;
      setFit({ scale: s, height: Math.ceil(h * s) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [html, show]);
  return (
    <div className="tp-block" ref={boxRef} aria-hidden="true" style={{ height: fit.height || undefined }}>
      {show && (
        <div ref={innerRef} className="tp-block-scale" style={{ transform: `scale(${fit.scale || 0.0001})` }} dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}


/**
 * One template type at a time (tabs), one large preview, and a short list to
 * switch between them. Replaces the 16-card grid, which showed everything at
 * once and was hard to take in.
 */
export default function TemplatesSection() {
  const [tab, setTab] = useState<GroupKey>('collection');
  const [sel, setSel] = useState<Record<GroupKey, number>>({ collection: 0, post: 0, footer: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // The previews pull in photos; wait until the section is close to view.
  const sectionRef = useRef<HTMLElement | null>(null);
  const near = useInView(sectionRef, { once: true, margin: '600px 0px' });
  const listRef = useRef<HTMLDivElement | null>(null);

  // Switching tabs: bring that tab's picked item into view in the strip.
  useEffect(() => {
    const strip = listRef.current;
    if (!strip || strip.scrollWidth <= strip.clientWidth) return;
    const btn = strip.querySelectorAll<HTMLButtonElement>('.tp-opt')[sel[tab]];
    strip.scrollLeft = btn ? Math.max(0, btn.offsetLeft - (strip.clientWidth - btn.clientWidth) / 2) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // When the list is a horizontal strip (phones), keep the picked item in view
  // without moving the page vertically.
  const pick = (i: number, btn: HTMLButtonElement) => {
    setSel((s) => ({ ...s, [tab]: i }));
    const strip = listRef.current;
    if (strip && strip.scrollWidth > strip.clientWidth) {
      strip.scrollTo({ left: btn.offsetLeft - (strip.clientWidth - btn.clientWidth) / 2, behavior: 'smooth' });
    }
  };

  const groupIndex = GROUPS.findIndex((g) => g.key === tab);
  const group = GROUPS[groupIndex];
  const idx = sel[tab];
  const [key, name, desc] = group.items[idx];

  // Left/Right/Home/End move between tabs (WAI-ARIA tabs pattern).
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (groupIndex + 1) % GROUPS.length;
    else if (e.key === 'ArrowLeft') next = (groupIndex - 1 + GROUPS.length) % GROUPS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = GROUPS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setTab(GROUPS[next].key);
    tabRefs.current[next]?.focus();
  };

  return (
    <section ref={sectionRef} id="templates" className="bb-templates bg-white py-12 md:py-[100px] overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="tp-wrap">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="tp-head"
        >
          <div className="tp-eyebrow">
            <i />
            Designed templates
            <i />
          </div>
          <h2 className="tp-h2">
            Ten templates. <em>Pick one, customize it.</em>
          </h2>
          <p>
            Five templates for your blog index, five for the post itself, and a set of blocks you can stack
            underneath either one. All designed by a designer who builds Squarespace sites for a living, all built to inherit your site&apos;s fonts and
            colors.
          </p>
        </motion.div>

        <div role="tablist" aria-label="Template type" className="tp-tabs" onKeyDown={onTabKey}>
          {GROUPS.map((g, i) => (
            <button
              key={g.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tp-tab-${g.key}`}
              aria-selected={g.key === tab}
              aria-controls="tp-panel"
              tabIndex={g.key === tab ? 0 : -1}
              className="tp-tab"
              onClick={() => setTab(g.key)}
            >
              {g.label}
              <span>{g.items.length}</span>
            </button>
          ))}
        </div>

        <div id="tp-panel" role="tabpanel" aria-labelledby={`tp-tab-${tab}`} className="tp-panel">
          <div className="tp-stage">
            <div className="tp-frame">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${tab}-${key}`}
                  className={group.art ? 'tp-art-big' : 'tp-art-big tp-block-big'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  {group.art ? (
                    <Art html={group.thumbs[key]} show={near} url />
                  ) : (
                    <BlockArt html={group.thumbs[key]} show={near} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="tp-cap" aria-live="polite">
              <div>
                <div className="tp-cap-name">{name}</div>
                <div className="tp-cap-desc">{desc}</div>
              </div>
              <div className="tp-cap-pos">
                {idx + 1} of {group.items.length}
              </div>
            </div>
          </div>

          <div className="tp-list" ref={listRef}>
            <div className="tp-hint">{group.hint}</div>
            {group.items.map(([k, n, d], i) => (
              <button
                key={k}
                type="button"
                className="tp-opt"
                aria-pressed={i === idx}
                onClick={(e) => pick(i, e.currentTarget)}
              >
                {group.art ? (
                  <span className="tp-art-mini">
                    <Art html={group.thumbs[k]} show={near} />
                  </span>
                ) : (
                  <span className="tp-art-mini">
                    <BlockArt html={group.thumbs[k]} show={near} />
                  </span>
                )}
                <span>
                  <span className="tp-opt-name">{n}</span>
                  <span className="tp-opt-desc">{d}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="tp-mix">
          <b>Any of the five collections with any of the five posts.</b> Change your mind anytime &mdash; switching
          templates takes one click.
        </p>
      </div>
    </section>
  );
}
