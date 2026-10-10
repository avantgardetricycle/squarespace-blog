import { useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';

/* Wireframe helpers + data ported from the approved landing-page design.
   Markup is static and author-authored; no user input reaches these strings. */
const L = (n: number, a?: boolean) => Array.from({length:n},(_,i)=>`<div class="wl${a&&i===0?' a':''}" style="width:${[92,78,85,64][i%4]}%"></div>`).join('');
// shared: a sidebar column (violet dot + lines) and a centered header (dot + title)
// unified sidebar parts — no background, accent heading + content rows
const SBH = (w = 64) => `<div class="wl a" style="width:${w}%;height:2px;flex-shrink:0"></div>`;
const SBROW = () => `<div style="display:flex;gap:3px;align-items:center;flex-shrink:0"><div class="wi" style="width:9px;height:8px"></div><div style="flex:1;display:flex;flex-direction:column;gap:1px"><div class="wl" style="width:92%;height:2px;background:#dcdce4"></div><div class="wl" style="width:56%;height:2px"></div></div></div>`;
const SBAV = () => `<div style="display:flex;gap:3px;align-items:center;flex-shrink:0"><div class="wi" style="width:8px;height:8px;border-radius:50%"></div><div class="wl" style="width:52%;height:2px"></div></div>`;
const SB = (n = 2) => `<div class="wsb" style="flex:1;gap:2px">${SBH(62)}${SBAV()}${SBH(54)}${Array.from({length:n},SBROW).join('')}</div>`;
const OV = (w1 = 70, w2 = 42) => `<div class="wl w" style="width:${w1}%;height:4px"></div><div class="wl w" style="width:${w2}%"></div>`;
const T: Record<string, string> = {
  // ── Collection ──
  showcase:`<div style="display:flex;gap:6px;flex:1"><div class="wi" style="flex:1.5"></div><div style="flex:1;display:flex;flex-direction:column;gap:3px;justify-content:center"><div class="wl a" style="width:35%"></div><div class="wt"></div><div class="wt" style="width:75%"></div>${L(2)}</div></div>
    <div style="display:flex;gap:6px;flex:1;min-height:0"><div style="flex:1;display:flex;flex-direction:column;gap:3px;justify-content:center"><div class="wl a" style="width:35%"></div><div class="wt"></div><div class="wt" style="width:75%"></div>${L(1)}</div><div class="wi" style="flex:1.5"></div></div>`,
  newsroom:`<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-shrink:0"><div class="wt" style="width:28%;height:4px"></div><div class="w" style="width:36%;height:9px;border:1px solid #d8d6cf;display:flex;align-items:center;padding:0 3px;gap:2px"><div class="wl" style="width:3px;height:3px;border-radius:50%"></div><div class="wl" style="width:55%;height:2px"></div></div></div>
    ${[0,1,2,3].map(()=>`<div style="display:flex;gap:5px;flex:1;align-items:center;border-top:1px solid #e6e4de;padding-top:3px"><div class="wi" style="height:100%;aspect-ratio:1"></div><div style="flex:1;display:flex;flex-direction:column;gap:2px"><div style="display:flex;align-items:center;gap:3px"><div class="wo" style="width:3px;height:3px"></div><div class="wl a" style="width:22%;height:2px"></div></div><div class="wt" style="height:3px;width:85%"></div><div class="wl" style="width:60%;height:2px"></div></div></div>`).join('')}`,
  masthead:`<div class="wov" style="flex:2.6;min-height:0;padding:5px 6px;gap:2px"><div style="width:14%;height:4px;border-radius:3px;background:var(--violet)"></div><div class="wl" style="width:20%;height:2px;background:rgba(255,255,255,.6)"></div><div class="wl" style="width:74%;height:4px;background:#fff"></div><div class="wl" style="width:30%;height:2px;background:rgba(255,255,255,.45)"></div></div>
    <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;padding:1px 0"><div class="wt" style="width:8%;height:3px"></div>${[0,1,2,3].map(()=>`<div class="wl" style="width:10%;height:3px"></div>`).join('')}<div class="w" style="margin-left:auto;width:20%;height:7px;border:1px solid #d8d6cf"></div><div class="w" style="width:11%;height:7px;border:1px solid #d8d6cf"></div></div>
    <div style="display:flex;gap:5px;flex:1.4;min-height:0">${[0,1,2].map(()=>`<div style="flex:1;display:flex;flex-direction:column;gap:2px;min-height:0"><div class="wi" style="flex:1;min-height:0"></div><div class="wl a" style="width:38%;height:2px;flex-shrink:0"></div><div class="wt" style="height:3px;flex-shrink:0"></div><div class="wl" style="width:55%;height:2px;flex-shrink:0"></div></div>`).join('')}</div>`,
  editorial:`<div style="display:flex;gap:4px;flex:1"><div class="wov" style="flex:1.7">${OV(72,44)}</div><div style="flex:1;display:flex;flex-direction:column;gap:4px"><div class="wov" style="flex:1;padding:3px">${OV(80,0)}</div><div class="wov" style="flex:1;padding:3px">${OV(80,0)}</div></div></div>
    <div style="display:flex;gap:4px;flex:1"><div style="flex:1;display:flex;flex-direction:column;gap:4px"><div class="wov" style="flex:1;padding:3px">${OV(80,0)}</div><div class="wov" style="flex:1;padding:3px">${OV(80,0)}</div></div><div class="wov" style="flex:1.7">${OV(72,44)}</div></div>`,
  digest:`<div style="display:flex;align-items:center;gap:3px;flex-shrink:0;padding-bottom:2px;border-bottom:1px solid #e6e4de"><div class="wt" style="width:9%;height:3px"></div>${[0,1,2].map(()=>`<div class="wl" style="width:11%;height:3px"></div>`).join('')}<div class="w" style="margin-left:auto;width:22%;height:7px;border:1px solid #d8d6cf"></div><div class="w" style="width:12%;height:7px;border:1px solid #d8d6cf"></div></div>
    <div style="display:flex;gap:6px;flex:1"><div style="flex:2.3;display:flex;flex-direction:column;gap:3px">
      <div class="wi" style="height:26px;flex-shrink:0"></div>
      <div style="display:flex;align-items:center;gap:3px"><div class="wl a" style="width:16%;height:4px;opacity:1"></div><div class="wl a" style="width:18%;height:2px"></div></div>
      <div class="wt"></div><div class="wt" style="width:62%"></div><div class="wl" style="width:44%"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:4px;flex:1.5;min-height:0;margin-top:1px">${[0,1,2,3].map(()=>`<div style="display:flex;flex-direction:column;gap:1px;min-height:0"><div class="wi" style="flex:1;min-height:0"></div><div class="wl a" style="width:38%;height:2px;flex-shrink:0"></div><div class="wl" style="width:86%;height:2px;background:#e4e4ea;flex-shrink:0"></div></div>`).join('')}</div></div>
    <div class="wsb" style="flex:1;gap:2px">
      ${SBH(58)}${SBAV()}${SBAV()}
      ${SBH(64)}
      <div class="w" style="height:6px;border:1px solid #d8d6cf"></div><div style="height:6px;background:var(--violet);opacity:.75;border-radius:2px"></div>
      ${SBH(50)}${SBROW()}${SBROW()}
    </div></div>`,
  // ── Post ──
  reporter:`<div style="display:flex;gap:6px;flex:1"><div style="flex:1;display:flex;flex-direction:column;gap:3px;justify-content:center"><div style="display:flex;align-items:center;gap:3px"><div class="wo"></div><div class="wl a" style="width:40%"></div></div><div class="wt"></div><div class="wt" style="width:78%"></div><div class="wl" style="width:55%"></div></div><div class="wi" style="flex:1.35"></div></div>
    <div style="display:flex;gap:6px;flex:1.25;min-height:0"><div style="flex:2.3;display:flex;flex-direction:column;gap:3px">${L(5)}</div>${SB(2)}</div>`,
  feature:`<div style="display:flex;flex-direction:column;gap:2px;align-items:center;flex-shrink:0;padding:1px 0 3px"><div class="wl" style="width:34%;height:2px"></div><div class="wl a" style="width:12%;height:2px;margin-top:1px"></div><div class="wt" style="width:64%;height:5px"></div><div class="wl" style="width:44%;height:2px"></div><div class="wl" style="width:30%;height:2px"></div><div class="wl" style="width:22%;height:2px;margin-top:1px"></div><div style="display:flex;gap:2px;margin-top:1px">${[0,1,2,3].map(()=>'<div class="wl" style="width:3px;height:3px;border-radius:50%;background:#bbb"></div>').join('')}</div></div>
    <div class="wi" style="flex:2.4;min-height:0;margin:0 -11px;border-radius:0"></div>
    <div style="display:flex;gap:5px;flex:2;min-height:0;padding-top:2px"><div class="wsb" style="flex:.8;gap:2px">${SBH(70)}<div class="wl" style="width:92%;height:2px"></div><div class="wl" style="width:62%;height:2px"></div></div><div style="flex:2.3;display:flex;flex-direction:column;gap:3px">${L(5)}</div>${SB(2)}</div>`,
  writer:`<div style="display:flex;flex-direction:column;gap:3px;align-items:center;padding:7px 0 6px;flex-shrink:0"><div class="wo"></div><div class="wt" style="width:66%"></div><div class="wt" style="width:44%;height:4px"></div><div class="wl" style="width:26%;margin-top:1px"></div></div><div style="display:flex;flex-direction:column;gap:3px;padding:0 15%;flex:1;min-height:0">${L(6)}</div>`,
  story:`<div style="flex:2.1;min-height:0;display:flex;margin:-11px -11px 0;background:#0b0b0f;padding:8px 10px;gap:8px"><div style="flex:1;display:flex;align-items:center"><div class="wi" style="width:100%;height:82%"></div></div><div style="flex:1.15;display:flex;flex-direction:column;justify-content:center;gap:2px"><div class="wl" style="width:70%;height:2px;background:rgba(255,255,255,.3)"></div><div class="wl" style="width:22%;height:2px;background:var(--violet-lt);margin-top:1px"></div><div class="wl" style="width:92%;height:4px;background:#fff"></div><div class="wl" style="width:64%;height:4px;background:#fff"></div><div class="wl" style="width:88%;height:2px;background:rgba(255,255,255,.55);margin-top:1px"></div><div class="wl" style="width:50%;height:2px;background:rgba(255,255,255,.55)"></div><div style="height:1px;background:rgba(255,255,255,.18);margin:2px 0 1px"></div><div class="wl" style="width:48%;height:2px;background:rgba(255,255,255,.4)"></div><div style="display:flex;gap:2px;margin-top:1px">${[0,1,2,3].map(()=>'<div style="width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.45)"></div>').join('')}</div></div></div>
    <div style="display:flex;flex-direction:column;gap:3px;padding:6px 20% 0;flex:1.6;min-height:0;justify-content:flex-start">${L(5)}</div>`,
  publisher:`<div style="flex:2.3;min-height:0;margin:-11px -11px 0;padding:0 8px 6px;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;background:linear-gradient(to top,rgba(10,10,25,.92),rgba(10,10,25,.35) 55%,rgba(10,10,25,.1)),linear-gradient(135deg,#7f76d8,#3b3170 70%,#1d1840)"><div style="width:22%;height:5px;border-radius:3px;background:var(--violet)"></div><div class="wl" style="width:84%;height:4px;background:#fff;margin-top:1px"></div><div class="wl" style="width:42%;height:2px;background:rgba(255,255,255,.5)"></div></div>
    <div style="display:flex;gap:6px;flex:2.4;min-height:0;padding-top:4px"><div style="flex:2.1;display:flex;flex-direction:column;gap:3px">${L(6)}</div>
    <div class="wsb" style="flex:1;gap:2px;min-height:0">
      ${SBH(62)}${SBROW()}${SBROW()}
      ${SBH(55)}${SBROW()}${SBROW()}
      ${SBH(48)}
      <div style="display:flex;flex-wrap:wrap;gap:2px">${[34,26,30,22,28].map(w=>`<div class="w" style="width:${w}%;height:5px;border:1px solid #dcdad4"></div>`).join('')}</div>
    </div></div>`
};
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
const B: Record<string, string> = {
  author:`<div style="display:flex;gap:8px;align-items:center"><div class="wi" style="width:26px;height:26px;border-radius:50%;flex-shrink:0"></div>
    <div style="flex:1;display:flex;flex-direction:column;gap:3px"><div class="wl a" style="width:28%;height:2px"></div><div class="wt" style="width:46%;height:4px"></div><div class="wl" style="width:92%"></div><div class="wl" style="width:64%"></div>
    <div style="display:flex;gap:3px;margin-top:2px">${[0,1,2].map(()=>'<div style="width:5px;height:5px;border-radius:50%;background:#c9c7c0"></div>').join('')}</div></div></div>`,
  related:`<div style="display:flex;flex-direction:column;gap:6px"><div class="wt" style="width:30%;height:5px"></div>
    <div style="display:flex;gap:6px">${[0,1,2].map(()=>`<div style="flex:1;display:flex;flex-direction:column;gap:3px"><div class="wi" style="height:22px;border-radius:3px"></div><div class="wl a" style="width:52%;height:2px"></div><div class="wt" style="width:96%;height:4px"></div><div class="wt" style="width:62%;height:4px"></div></div>`).join('')}</div></div>`,
  popular:`<div style="display:flex;flex-direction:column;gap:5px"><div class="wl a" style="width:34%;height:3px"></div>
    ${[0,1,2].map(()=>`<div style="display:flex;gap:5px;align-items:center"><div class="wi" style="width:18px;height:14px;flex-shrink:0"></div><div style="flex:1;display:flex;flex-direction:column;gap:2px"><div class="wl" style="width:86%;height:3px;background:#dcdce4"></div><div class="wl" style="width:50%"></div></div></div>`).join('')}</div>`,
  email:`<div style="display:flex;gap:10px;align-items:center"><div class="wt" style="flex:1;width:auto;height:5px"></div>
    <div style="display:flex;gap:5px;flex:1.25;align-items:center"><div class="w" style="flex:1;height:12px;border:1px solid #d8d6cf;border-radius:3px"></div><div style="width:38%;height:12px;background:var(--violet);border-radius:100px"></div></div></div>`,
  magnet:`<div style="display:flex;flex-direction:column;gap:4px"><div class="wt" style="width:34%;height:5px"></div><div class="wl" style="width:60%"></div>
    <div style="display:flex;gap:5px;align-items:center;margin-top:4px"><div class="w" style="flex:1;height:12px;border:1px solid #d8d6cf;border-radius:3px"></div><div style="width:26%;height:12px;background:var(--violet);border-radius:100px"></div></div></div>`,
  prevnext:`<div style="display:flex;align-items:center"><div style="flex:1;display:flex;flex-direction:column;gap:4px;padding-right:12px"><div class="wl" style="width:30%;height:2px"></div><div class="wl a" style="width:38%;height:2px"></div><div class="wt" style="width:86%;height:4px"></div></div>
    <div style="width:1px;align-self:stretch;background:#dcdad4"></div>
    <div style="flex:1;display:flex;flex-direction:column;gap:4px;padding-left:12px;align-items:flex-end"><div class="wl" style="width:22%;height:2px"></div><div class="wl a" style="width:30%;height:2px"></div><div class="wt" style="width:92%;height:4px"></div></div></div>`
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

const GROUPS: { key: GroupKey; label: string; hint: string; items: [string, string, string][]; thumbs: Record<string, string>; blk?: boolean }[] = [
  { key: 'collection', label: 'Blog index', hint: 'How the page listing your posts looks', items: TPL.collection, thumbs: T },
  { key: 'post', label: 'Post page', hint: 'How each article looks', items: TPL.post, thumbs: T },
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
  .bb-templates .tp-panel{gap:28px;margin-top:28px}
}

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

function Thumb({ html, blk }: { html: string; blk?: boolean }) {
  return <div className={blk ? 'tp-thumb blk' : 'tp-thumb'} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;
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
    <section id="templates" className="bb-templates bg-white py-12 md:py-[100px] overflow-hidden">
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
                  className={group.blk ? 'tp-big blk' : 'tp-big'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <Thumb html={group.thumbs[key]} blk={group.blk} />
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

          <div className="tp-list">
            <div className="tp-hint">{group.hint}</div>
            {group.items.map(([k, n, d], i) => (
              <button
                key={k}
                type="button"
                className="tp-opt"
                aria-pressed={i === idx}
                onClick={() => setSel((s) => ({ ...s, [tab]: i }))}
              >
                <span className={group.blk ? 'tp-mini blk' : 'tp-mini'}>
                  <Thumb html={group.thumbs[k]} blk={group.blk} />
                </span>
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
