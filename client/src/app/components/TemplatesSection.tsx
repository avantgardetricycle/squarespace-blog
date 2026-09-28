import { motion } from 'motion/react';

/* Wireframe helpers + data ported from the approved landing-page design.
   Markup is static and author-authored; no user input reaches these strings. */
const L = (n: number, a?: boolean) => Array.from({length:n},(_,i)=>`<div class="wl${a&&i===0?' a':''}" style="width:${[92,78,85,64][i%4]}%"></div>`).join('');
const R = (h,cls='wi') => `<div class="${cls}" style="height:${h}px;flex-shrink:0"></div>`;
// shared: a sidebar column (violet dot + lines) and a centered header (dot + title)
// unified sidebar parts — no background, accent heading + content rows
const SBH = (w = 64) => `<div class="wl a" style="width:${w}%;height:2px;flex-shrink:0"></div>`;
const SBROW = () => `<div style="display:flex;gap:3px;align-items:center;flex-shrink:0"><div class="wi" style="width:9px;height:8px"></div><div style="flex:1;display:flex;flex-direction:column;gap:1px"><div class="wl" style="width:92%;height:2px;background:#dcdce4"></div><div class="wl" style="width:56%;height:2px"></div></div></div>`;
const SBAV = () => `<div style="display:flex;gap:3px;align-items:center;flex-shrink:0"><div class="wi" style="width:8px;height:8px;border-radius:50%"></div><div class="wl" style="width:52%;height:2px"></div></div>`;
const SB = (n = 2) => `<div class="wsb" style="flex:1;gap:2px">${SBH(62)}${SBAV()}${SBH(54)}${Array.from({length:n},SBROW).join('')}</div>`;
// footer zone — modules that sit below the article
const FT = {
  author:`<div style="display:flex;gap:5px;align-items:center"><div class="wi" style="width:13px;height:13px;border-radius:50%;flex-shrink:0"></div><div style="flex:1;display:flex;flex-direction:column;gap:2px"><div class="wl" style="width:34%;height:2px;background:#dcdce4"></div><div class="wl" style="width:76%;height:2px"></div></div></div>`,
  related:`<div style="display:flex;flex-direction:column;gap:3px"><div class="wl a" style="width:26%;height:2px"></div><div style="display:flex;gap:4px">${[0,1,2].map(()=>`<div style="flex:1;display:flex;flex-direction:column;gap:2px"><div class="wi" style="height:10px"></div><div class="wl" style="width:84%;height:2px;background:#dcdce4"></div></div>`).join('')}</div></div>`,
  email:`<div style="display:flex;flex-direction:column;gap:3px;align-items:center"><div class="wl" style="width:42%;height:2px;background:#dcdce4"></div><div style="display:flex;gap:3px;width:82%"><div class="w" style="flex:1;height:8px;border:1px solid #dcdad4"></div><div style="width:32%;height:8px;background:var(--violet);opacity:.8;border-radius:2px"></div></div></div>`,
  prevnext:`<div style="display:flex;gap:6px">${[0,1].map(()=>`<div style="flex:1;display:flex;flex-direction:column;gap:2px"><div class="wl a" style="width:32%;height:2px"></div><div class="wl" style="width:82%;height:2px;background:#dcdce4"></div></div>`).join('')}</div>`
};
const FTR = (...ks) => `<div style="flex-shrink:0;border-top:1px solid #dcdad4;margin-top:auto;padding-top:6px;display:flex;flex-direction:column;gap:6px">${ks.map(k=>FT[k]).join('')}</div>`;
const CH = (w1=60,w2=38) => `<div style="display:flex;flex-direction:column;gap:3px;align-items:center;padding:3px 0 4px"><div class="wo"></div><div class="wt" style="width:${w1}%"></div><div class="wt" style="width:${w2}%;height:4px"></div><div class="wl" style="width:22%"></div></div>`;
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
const tpCard = ([k,n,d]) => `<div class="tp-card"><div class="tp-thumb">${T[k]}</div><div class="tp-name">${n}</div><div class="tp-desc">${d}</div></div>`;

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

const STYLES = `.bb-templates{
  --violet:#5B4FE8; --violet-lt:#8F86F0; --line:#e4e3de; --mid:#6b6b6b;
  --black:#0a0a0a; --serif:"DM Serif Display",serif;
}
.bb-templates .tp-wrap{max-width:1160px;margin:0 auto;padding:0 16px}
.bb-templates .tp-eyebrow{display:flex;align-items:center;justify-content:center;gap:10px;font-size:.6rem;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--violet);margin-bottom:18px}
.bb-templates .tp-eyebrow i{display:block;width:28px;height:1.5px;background:var(--violet);opacity:.35;border-radius:2px}
.bb-templates .tp-h2{font-family:var(--serif);font-size:clamp(2.2rem,4vw,3.2rem);font-weight:400;letter-spacing:-.02em;color:var(--black);line-height:1.1}
.bb-templates .tp-h2 em{font-style:italic;color:var(--violet)}
@media (max-width:760px){
  .bb-templates .tp-row{grid-template-columns:repeat(2,1fr)}
  .bb-templates .tp-row.blocks{grid-template-columns:1fr}
}
.bb-templates .tp-head{text-align:center;margin-bottom:54px}
.bb-templates .tp-head p{font-size:.98rem;color:var(--mid);font-weight:300;max-width:560px;margin:16px auto 0;line-height:1.7}
.bb-templates .tp-group{margin-bottom:40px}
.bb-templates .tp-group:last-of-type{margin-bottom:0}
.bb-templates .tp-gl{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.bb-templates .tp-gl span{font-size:.95rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--violet);white-space:nowrap}
.bb-templates .tp-gl em{font-style:normal;font-size:.85rem;color:var(--mid);font-weight:300}
.bb-templates .tp-gl::after{content:'';flex:1;height:1px;background:var(--line)}
.bb-templates .tp-row{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
.bb-templates .tp-card{display:flex;flex-direction:column;gap:10px;cursor:default}
.bb-templates .tp-thumb{aspect-ratio:4/3;background:#fff;border:1px solid #e6e6ec;border-radius:9px;padding:11px;overflow:hidden;
  box-shadow:0 8px 26px rgba(91,79,232,.09);
  display:flex;flex-direction:column;gap:5px;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.bb-templates .tp-card:hover .tp-thumb{transform:translateY(-4px);box-shadow:0 14px 34px rgba(91,79,232,.16);border-color:rgba(91,79,232,.3)}
.bb-templates .tp-thumb div{border-color:#eeeef3!important}
.bb-templates .tp-thumb .w{background:#f8f8fb}
.bb-templates .tp-name{font-family:var(--serif);font-size:1rem;color:var(--black);letter-spacing:-.01em;line-height:1.2}
.bb-templates .tp-desc{font-size:.74rem;color:var(--mid);font-weight:300;line-height:1.45;margin-top:-5px}
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
.bb-templates .wov{background:linear-gradient(to top,rgba(18,14,48,.78),rgba(18,14,48,0) 62%),linear-gradient(135deg,#ded8f8,#9b90ec);border-radius:2px;display:flex;flex-direction:column;justify-content:flex-end;padding:4px;gap:2px}
.bb-templates .tp-row.blocks{grid-template-columns:repeat(3,1fr);gap:16px}
.bb-templates .tp-thumb.blk{aspect-ratio:3/1;justify-content:center;gap:0;padding:14px 16px}
.bb-templates .tp-mix{margin-top:40px;text-align:center;font-size:.8rem;color:var(--mid);font-weight:300}`;

function TemplateCard({ thumb, name, desc, blk }: { thumb: string; name: string; desc: string; blk?: boolean }) {
  return (
    <div className="tp-card">
      <div className={blk ? 'tp-thumb blk' : 'tp-thumb'} dangerouslySetInnerHTML={{ __html: thumb }} />
      <div className="tp-name">{name}</div>
      <div className="tp-desc">{desc}</div>
    </div>
  );
}

export default function TemplatesSection() {
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
            underneath either one. All designed by a Squarespace pro, all built to inherit your site&apos;s fonts and
            colors.
          </p>
        </motion.div>

        <div className="tp-group">
          <div className="tp-gl">
            <span>Collection templates</span>
            <em>Your blog&apos;s index page</em>
          </div>
          <div className="tp-row">
            {TPL.collection.map(([k, n, d]) => (
              <TemplateCard key={k} thumb={T[k]} name={n} desc={d} />
            ))}
          </div>
        </div>

        <div className="tp-group">
          <div className="tp-gl">
            <span>Post templates</span>
            <em>The article itself</em>
          </div>
          <div className="tp-row">
            {TPL.post.map(([k, n, d]) => (
              <TemplateCard key={k} thumb={T[k]} name={n} desc={d} />
            ))}
          </div>
        </div>

        <div className="tp-group">
          <div className="tp-gl">
            <span>Footer blocks</span>
            <em>Stack any of these below a post or collection</em>
          </div>
          <div className="tp-row blocks">
            {BLK.map(([k, n, d]) => (
              <TemplateCard key={k} thumb={B[k]} name={n} desc={d} blk />
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
