import { useCallback, useEffect, useRef, useState } from 'react';

/* Feature strip + live preview. Ported from the approved landing-page design.
   All preview markup is static and author-authored; no user input reaches it. */

const IC: Record<string, string> = {
  sidebars:'<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>',
  header:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 15l4-4 3 3 4-5 4 6"/><circle cx="8.5" cy="9.5" r="1.5"/>',
  template:'<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="16" width="8" height="5" rx="1.5"/>',
  collection:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  search:'<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>',
  toc:'<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  filters:'<path d="M3 6h18M7 12h10M11 18h2"/>',
  recent:'<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>',
  related:'<circle cx="7" cy="12" r="3"/><circle cx="17" cy="6" r="3"/><circle cx="17" cy="18" r="3"/><line x1="10" y1="10.5" x2="14" y2="7.5"/><line x1="10" y1="13.5" x2="14" y2="16.5"/>',
  social:'<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>',
  crumbs:'<polyline points="9 18 15 12 9 6"/><line x1="3" y1="12" x2="6" y2="12"/>',
  page:'<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M3 13h18"/><line x1="8.5" y1="9" x2="8.5" y2="6"/><line x1="15.5" y1="9" x2="15.5" y2="6"/>',
  progress:'<line x1="3" y1="20" x2="21" y2="20"/><rect x="3" y="14" width="9" height="6" rx="1"/><line x1="3" y1="10" x2="21" y2="10" stroke-dasharray="2 2" opacity=".5"/>',
  time:'<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>',
  authors:'<circle cx="8" cy="8" r="3.5"/><circle cx="16" cy="8" r="3.5"/><path d="M2 20c0-3.3 2.7-6 6-6h8c3.3 0 6 2.7 6 6"/>',
  profiles:'<circle cx="9" cy="7" r="3"/><path d="M3 20c0-3 2.7-5 6-5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><line x1="13" y1="17" x2="21" y2="17"/><line x1="17" y1="13" x2="17" y2="21"/>',
  footer:'<rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="16" x2="20" y2="16"/><line x1="8" y1="19" x2="16" y2="19"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="11" x2="13" y2="11"/>',
  featured:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  sorting:'<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/><polyline points="17 15 21 19 17 23"/><line x1="21" y1="19" x2="13" y2="19"/>',
  prevnext:'<polyline points="11 17 6 12 11 7"/><polyline points="13 7 18 12 13 17"/><line x1="6" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="18" y2="12"/>',
  analytics:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/>',
  comments:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/>',
  paywall:'<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1.2"/>',
  email:'<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2.5 6 12 13 21.5 6"/>',
  magnet:'<path d="M6 3v9a6 6 0 0 0 12 0V3"/><line x1="3" y1="3" x2="9" y2="3"/><line x1="15" y1="3" x2="21" y2="3"/><line x1="6" y1="10" x2="9" y2="10"/><line x1="15" y1="10" x2="18" y2="10"/>',
  popular:'<path d="M12 2s4 4.5 4 8a4 4 0 0 1-8 0c0-1.4.6-2.8 1.3-4"/><path d="M12 22a7 7 0 0 1-7-7c0-2 1-3.6 2.2-5A6.9 6.9 0 0 0 12 22a6.9 6.9 0 0 0 4.8-12c1.2 1.4 2.2 3 2.2 5a7 7 0 0 1-7 7z"/>'
};

const CATS: Record<string, { label: string; tag: string; badge: string }> = {
  layout:{label:'Layout & Design',tag:'Layout',badge:'b-layout'},
  nav:{label:'Navigation & Discovery',tag:'Navigation',badge:'b-nav2'},
  reader:{label:'Reader Experience',tag:'Reader',badge:'b-reader'},
  pub:{label:'Publishing & Management',tag:'Publishing',badge:'b-pub'},
  growth:{label:'Growth & Monetization',tag:'Growth',badge:'b-growth'},
  analytics:{label:'Insights & Analytics',tag:'Analytics',badge:'b-analytics'}
};

interface Feat { id: string; c: string; n: string; i: string; d: string; s?: string }
const F: Feat[] = [
  {id:'sidebars',c:'layout',n:'Sidebars',i:'sidebars',d:'Sidebars are built into certain templates. Fill them with recent posts, categories, a newsletter signup, your author bio, or anything else you need. Configured from your dashboard, no code required.',s:'Sidebars'},
  {id:'header',c:'layout',n:'Post Headers',i:'header',d:'Your header treatment comes with the template you pick: full-bleed, overlay, beside-the-title, or text-only. From there, choose what appears in it — breadcrumbs, byline, share icons, a caption.',s:'Post Headers'},
  {id:'collection',c:'layout',n:'Multiple Blogs',i:'collection',d:"Run several blogs on one site and style each one separately — its own template, its own sidebars, its own settings. "+"A recipe archive and a travel journal don't have to look alike.",s:'Multiple Blogs'},
  {id:'search',c:'nav',n:'Post Search',i:'search',d:"Full-text search across all your posts with live results and keyword highlights. So nothing you've ever written gets lost in your archive.",s:'Search'},
  {id:'toc',c:'nav',n:'Table of Contents',i:'toc',d:'Auto-generated from your post headings, and it follows the reader down the page. Three styles to choose from — numbered, connected dots, or bookmark.',s:'Table of Contents'},
  {id:'filters',c:'nav',n:'Tags & Category Filters',i:'filters',d:"Filter by category or tag — as a row above your post grid, as a chip cloud in the sidebar, or both. "+"Readers narrow a long archive down to exactly what they came for.",s:'Tags & Filters'},
  {id:'related',c:'nav',n:'Related Posts',i:'related',d:'Automatically show readers what to read next, based on tags and categories. More time on site, less work for you.',s:'Related'},
  {id:'popular',c:'nav',n:'Popular Posts',i:'popular',d:'Surface your best-performing posts automatically, ranked by real reader data. Your strongest work keeps working.',s:'Popular'},
  {id:'social',c:'nav',n:'Social Sharing',i:'social',d:'One-click share buttons for X, Facebook, Pinterest, Reddit, WhatsApp, LinkedIn and more — right on every post. The platforms your readers actually asked for.',s:'Sharing'},
  {id:'crumbs',c:'nav',n:'Breadcrumbs',i:'crumbs',d:'Show readers exactly where they are and give them an easy path back. A small detail that makes a real difference to navigation and SEO.',s:'Breadcrumbs'},
  {id:'prevnext',c:'nav',n:'Previous / Next Post',i:'prevnext',d:'End every post with a link to the one before and the one after. Readers keep moving through your archive instead of stopping at the bottom.',s:'Prev / Next'},
  {id:'page',c:'nav',n:'Pagination',i:'page',d:"Replace Squarespace's bare arrows with real pagination — numbered pages, or a load-more button that keeps readers on the page. Either way they see how much archive is left.",s:'Pagination'},
  {id:'progress',c:'reader',n:'Scroll Progress Bar',i:'progress',d:'A thin bar across the top of every post that fills as readers scroll. Subtle, satisfying, and a quiet nudge to keep going.',s:'Progress Bar'},
  {id:'time',c:'reader',n:'Reading Time',i:'time',d:'Auto-calculate and display estimated reading time. Sets expectations before readers click in.',s:'Reading Time'},
  {id:'comments',c:'reader',n:'Comments',i:'comments',d:'A real comment system on your Squarespace blog — threaded replies, likes, and a full moderation dashboard. Approve, hide, or mark spam, and tell verified subscribers from anonymous readers at a glance.',s:'Comments'},
  {id:'authors',c:'pub',n:'Multiple Authors',i:'authors',d:'Publish posts under any author name. Add multiple authors to a single post, or assign different contributors across your blog — no workarounds needed.',s:'Multi-Author'},
  {id:'profiles',c:'pub',n:'Author Profiles',i:'profiles',d:'Display a rich author profile in the sidebar of every post — name, photo, bio, and social links. Builds trust with readers.',s:'Author Profiles'},
  {id:'featured',c:'pub',n:'Featured Posts',i:'featured',d:"Mark any post as Featured and it'll appear at the top of your blog as a hero, no matter when it was published.",s:'Featured'},
  {id:'sorting',c:'pub',n:'Advanced Post Sorting',i:'sorting',d:'Let readers reorder your archive themselves — by date, A–Z, or by what other readers are actually reading. One control, instant results.',s:'Sorting'},
  {id:'paywall',c:'growth',n:'Paywall & Memberships',i:'paywall',d:"Put posts behind your Squarespace membership with a proper paywall overlay for logged-out readers. It stays in sync with Squarespace's own membership settings. BetterBlog takes no cut; Squarespace's own fees apply.",s:'Paywall'},
  {id:'email',c:'growth',n:'Email Capture',i:'email',d:'Drop a newsletter signup anywhere on your blog — sidebar, post footer, or collection page. Every subscriber lands in your dashboard, exportable as CSV.',s:'Email Capture'},
  {id:'magnet',c:'growth',n:'Lead Magnet',i:'magnet',d:'Offer a freebie in exchange for an email. Guides, checklists, templates — delivered automatically, tracked alongside your newsletter signups.',s:'Lead Magnet'},
  {id:'analytics',c:'analytics',n:'Analytics Dashboard',i:'analytics',d:'Page views, unique visitors, time on page and read-percent — plus read-depth breakdowns, per-post and per-author tables, click tracking with CTR, search analytics, and an exportable leads list. Connect Google Analytics and your blog events forward straight into GA4, so traffic sources, top referrers and new vs. returning show up in your GA reports.',s:'Analytics'}
];

const shell = (inner: string) => `<div class="stage-mb">
  <div class="mb-top" style="height:30px"><span class="d r"></span><span class="d y"></span><span class="d g"></span>
    <div class="mb-url" style="height:16px;font-size:.55rem">yoursite.squarespace.com/blog</div></div>
  ${inner}</div>`;
const blogNav = `<div class="bnav" style="padding:11px 18px"><div class="bsite" style="font-size:1rem">Sarah Clarke</div>
  <div class="blinks"><span>About</span><span>Blog</span><span>Contact</span></div></div>`;
const lines = (n: number) => Array.from({length:n},(_,i)=>`<div class="ln ${i%3===1?'m':i%3===2?'s':''}" style="height:8px;margin-bottom:8px"></div>`).join('');

function stage(f: Feat): string {
  const imgIcon = (o = 0.34) => `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" style="width:46px;height:46px;opacity:${o}"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.6" cy="8.6" r="1.7"/><path d="M21 15.5l-5.2-5.2L5 21"/></svg>`;
  const body = {
    collection:`<div style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:stretch">
      ${[
        ['Recipe archive','Kitchen Notes',`
          ${[0,1,2,3].map(()=>`<div style="display:flex;gap:9px;align-items:center;padding:6px 0;border-bottom:1px solid #f4f4f4">
            <div style="width:36px;height:28px;border-radius:4px;background:linear-gradient(135deg,#ded8f8,#b9afee);flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="height:6px;width:84%;background:#ececec;border-radius:3px;margin-bottom:4px"></div>
              <div style="height:5px;width:52%;background:#f3f3f3;border-radius:3px"></div>
            </div></div>`).join('')}`],
        ['Travel journal','Far Afield',`
          <div style="flex:1;min-height:58px;border-radius:5px;background:linear-gradient(135deg,#cfc7f5,#9b90ec);margin-bottom:9px"></div>
          <div style="height:7px;width:76%;background:#ececec;border-radius:3px;margin-bottom:5px"></div>
          <div style="height:5px;width:48%;background:#f3f3f3;border-radius:3px;margin-bottom:12px"></div>
          <div style="display:flex;gap:9px">
            ${[0,1].map(()=>`<div style="flex:1">
              <div style="height:34px;border-radius:4px;background:linear-gradient(135deg,#ded8f8,#bdb3f0);margin-bottom:5px"></div>
              <div style="height:5px;width:86%;background:#ececec;border-radius:3px"></div></div>`).join('')}
          </div>`]
      ].map(([label,site,inner])=>`
        <div style="display:flex;flex-direction:column">
          <div style="display:flex;align-items:baseline;gap:7px;margin-bottom:9px">
            <span style="width:6px;height:6px;border-radius:50%;background:var(--violet);flex-shrink:0;transform:translateY(-1px)"></span>
            <span style="font-family:'DM Serif Display',serif;font-size:.92rem;color:#1a1a1a">${label}</span>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;background:#fff;border:1px solid #dde;border-radius:9px;overflow:hidden;box-shadow:0 8px 26px rgba(91,79,232,.09)">
            <div style="background:#f0f0f4;height:24px;display:flex;align-items:center;gap:5px;padding:0 10px;border-bottom:1px solid #e6e6ec">
              <span style="width:6px;height:6px;border-radius:50%;background:#ff5f57"></span>
              <span style="width:6px;height:6px;border-radius:50%;background:#ffbd2e"></span>
              <span style="width:6px;height:6px;border-radius:50%;background:#28c940"></span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 13px;border-bottom:1px solid #f2f2f2">
              <span style="font-family:'DM Serif Display',serif;font-size:.8rem;color:#1a1a1a;line-height:1">${site}</span>
              <span style="display:flex;gap:9px">
                <span style="font-size:.5rem;color:#bbb;letter-spacing:.06em;text-transform:uppercase">About</span>
                <span style="font-size:.5rem;color:#bbb;letter-spacing:.06em;text-transform:uppercase">Blog</span>
              </span>
            </div>
            <div style="flex:1;display:flex;flex-direction:column;padding:11px 13px 13px">${inner}</div>
          </div>
        </div>`).join('')}
      <div style="grid-column:1/-1;text-align:center;font-size:.68rem;color:var(--mid);font-weight:300;margin-top:4px">
        Same site. Same account. Two completely different blogs.
      </div>
    </div>`,
    search:`<div style="width:100%;max-width:700px;margin:0 auto">
      <div style="height:38px;border-radius:7px 7px 0 0;background:linear-gradient(to top,rgba(30,22,90,.45),rgba(30,22,90,.05)),linear-gradient(135deg,#cfc7f5,#9b90ec)"></div>
      <div style="background:#fff;border:1px solid #e6e6ec;border-top:none;border-radius:0 0 7px 7px;padding:15px 16px 16px;
        box-shadow:0 10px 30px rgba(91,79,232,.1)">
        <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:13px">
          <span style="font-size:.68rem;font-weight:700;color:#1a1a1a">All 24</span>
          ${['Lifestyle 14','Creativity 9','Travel 7','Wellness 5'].map(c=>{
            const [n,k]=c.split(' ');
            return `<span style="font-size:.62rem;color:#999">${n} <span style="color:#ccc">${k}</span></span>`;}).join('')}
          <span style="font-size:.62rem;color:#ccc">›</span>
        </div>
        <div style="display:flex;align-items:center;gap:9px">
          <div style="flex:1;display:flex;align-items:center;gap:9px;background:#faf9ff;border:1.5px solid var(--violet);
            border-radius:7px;padding:10px 13px;box-shadow:0 0 0 4px rgba(91,79,232,.09)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>
            <span style="font-size:.72rem;color:var(--violet);font-weight:500;flex:1">slow mornings</span>
            <span style="width:1px;height:13px;background:#e0dcf5"></span>
            <span style="font-size:.6rem;color:#b3accf">24 posts</span>
          </div>
          <div style="display:flex;align-items:center;gap:7px;border:1px solid #e0dee6;border-radius:7px;padding:10px 12px">
            <span style="font-size:.66rem;color:#777">By Date</span>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin:14px 0 11px">
          <span style="font-size:.6rem;color:#999">3 results</span>
          <span style="flex:1;height:1px;background:#f0f0f0"></span>
        </div>
        ${[['#ded8f8','#b9afee'],['#d4ece2','#a8d8c4'],['#f0e6d4','#dcc8a8']].map(([a,b])=>`
          <div style="display:flex;gap:11px;align-items:center;padding:8px 0;border-bottom:1px solid #f6f6f6">
            <div style="width:44px;height:34px;border-radius:4px;background:linear-gradient(135deg,${a},${b});flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="height:6px;width:70%;background:#ececec;border-radius:3px;margin-bottom:5px"></div>
              <div style="font-size:.58rem;color:#aaa">…embracing <mark style="background:rgba(91,79,232,.16);color:var(--violet);padding:0 3px;border-radius:2px">slow mornings</mark> as a ritual…</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`,
    header:`${blogNav}
      <div style="position:relative;height:150px;margin:0;display:flex;align-items:center;justify-content:center;
        background:linear-gradient(to top,rgba(30,22,90,.55),rgba(30,22,90,.06) 65%),linear-gradient(135deg,#c9c1f3,#8F86F0)">
        ${imgIcon()}
        <div style="position:absolute;left:18px;right:18px;bottom:12px">
          <div style="display:inline-flex;font-size:.5rem;font-weight:700;letter-spacing:.12em;color:#fff;background:rgba(255,255,255,.22);padding:3px 9px;border-radius:100px;margin-bottom:6px">LIFESTYLE</div>
          <div style="font-family:'DM Serif Display',serif;font-size:1.05rem;color:#fff;line-height:1.15;">Finding balance in a busy creative life</div>
        </div>
        <div style="position:absolute;top:10px;left:18px;font-size:.5rem;color:rgba(255,255,255,.75);display:flex;gap:5px">Home <span>/</span> Blog <span>/</span> <span style="color:#fff">This post</span></div>
      </div>
      <div style="padding:8px 18px 0;display:flex;align-items:center;gap:8px">
        <div style="font-size:.5rem;color:#aaa;font-style:italic;flex:1">Photo by Sarah Clarke</div>
        
      </div>
      <div style="padding:6px 18px 16px">
        <div style="display:flex;align-items:center;gap:7px;padding-bottom:10px;border-bottom:1px solid #f0f0f0;margin-bottom:10px">
          <div style="width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#a89cf2,#7c6ef0)"></div>
          <span style="font-size:.6rem;color:#444">Sarah Clarke</span><span style="color:#ddd">·</span>
          <span style="font-size:.56rem;color:#999">Mar 12, 2026</span>
          <div style="margin-left:auto;display:flex;gap:4px">${[0,1,2,3].map(()=>'<div style="width:13px;height:13px;border-radius:3px;background:#f0f0f0"></div>').join('')}</div>
        </div>
        ${lines(4)}
      </div>`,
    sidebars:`${blogNav}<div style="padding:16px 18px;display:grid;grid-template-columns:150px 1fr 150px;gap:14px">
      <div><div class="sb-h">About Me</div><div class="sb-av"></div><div class="sb-nm">Sarah Clarke</div>
        <div class="sb-bio">Writer &amp; creative in Portland.</div>
        <div class="sb-h">Newsletter</div><div style="background:var(--violet);color:#fff;font-size:.55rem;text-align:center;padding:6px;border-radius:4px">Subscribe</div></div>
      <div><div class="af-hero" style="height:88px"><span style="font-size:.9rem">Finding balance in a busy creative life</span></div>${lines(6)}
        <div class="tags"><span class="tag">Lifestyle</span><span class="tag">Creativity</span></div></div>
      <div><div class="sb-h">Popular</div>
        <div class="sb-row"><div class="sb-th" style="width:26px;height:20px;background:linear-gradient(135deg,#e8e4f8,#c8c0f0)"></div><div class="sb-tt">My morning ritual</div></div>
        <div class="sb-row"><div class="sb-th" style="width:26px;height:20px;background:linear-gradient(135deg,#d4f0e8,#a8d8c4)"></div><div class="sb-tt">On slow living</div></div>
        <div class="sb-h">Categories</div><div class="sb-cat">Lifestyle <i>14</i></div><div class="sb-cat">Travel <i>7</i></div></div></div>`,
    filters:`<div style="width:100%;max-width:730px;margin:0 auto">
      <div style="font-size:.66rem;color:var(--mid);font-weight:300;margin-bottom:12px">Put them above the grid, in the sidebar, or both</div>
      <div style="display:grid;grid-template-columns:1fr 168px;gap:14px;align-items:start">

        <div>
          <div style="font-size:.56rem;font-weight:600;color:var(--violet);margin-bottom:6px">Above the grid</div>
          <div style="background:#fff;border:1px solid #e6e6ec;border-radius:7px;padding:11px 13px;box-shadow:0 5px 18px rgba(91,79,232,.07)">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-bottom:10px;border-bottom:1px solid #f2f2f2;margin-bottom:11px">
              <span style="font-size:.64rem;font-weight:700;color:#1a1a1a">All 24</span>
              ${[['Lifestyle','14'],['Creativity','9'],['Travel','7'],['Wellness','5']].map(([n,k],i)=>
                `<span style="font-size:.6rem;color:${i===2?'var(--violet)':'#999'};font-weight:${i===2?600:400}">${n} <span style="color:${i===2?'#b3accf':'#ccc'}">${k}</span></span>`).join('')}
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px">
              ${[['#ded8f8','#b9afee'],['#d4ece2','#a8d8c4'],['#f0e6d4','#dcc8a8']].map(([a,b])=>`
                <div><div style="height:38px;border-radius:4px;background:linear-gradient(135deg,${a},${b});margin-bottom:5px"></div>
                <div style="height:5px;width:88%;background:#ececec;border-radius:3px;margin-bottom:4px"></div>
                <div style="height:4px;width:56%;background:#f4f4f4;border-radius:3px"></div></div>`).join('')}
            </div>
          </div>
        </div>

        <div>
          <div style="font-size:.56rem;font-weight:600;color:var(--violet);margin-bottom:6px">In the sidebar</div>
          <div style="background:#fff;border:1px solid #e6e6ec;border-radius:7px;padding:11px 12px;box-shadow:0 5px 18px rgba(91,79,232,.07)">
            <div style="font-size:.5rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#aaa;margin-bottom:7px">Categories</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">
              ${['Lifestyle','Creativity','Travel','Wellness'].map((c,i)=>
                `<span style="font-size:.54rem;padding:3px 8px;border-radius:100px;border:1px solid ${i===2?'rgba(91,79,232,.3)':'#e8e6ef'};background:${i===2?'var(--violet-f2)':'#fbfbfc'};color:${i===2?'var(--violet)':'#888'};font-weight:${i===2?600:400}">${c}</span>`).join('')}
            </div>
            <div style="font-size:.5rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#aaa;margin-bottom:7px">Tags</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${['mornings','routines','slow living','focus','rest'].map(c=>
                `<span style="font-size:.54rem;padding:3px 8px;border-radius:100px;border:1px solid #e8e6ef;background:#fbfbfc;color:#888">${c}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`,
    toc:`<div style="width:100%;max-width:720px;margin:0 auto">
      <div style="font-size:.66rem;color:var(--mid);font-weight:300;margin-bottom:12px">Three styles, same auto-generated headings</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        ${['Numbered','Connected dots','Bookmark'].map((label,idx)=>`
          <div>
            <div style="font-size:.6rem;font-weight:600;color:var(--violet);margin-bottom:7px">${label}</div>
            <div style="background:#fff;border:1px solid #e6e6ec;border-radius:7px;padding:12px;
              box-shadow:0 5px 18px rgba(91,79,232,.07);position:relative">
              ${idx===1?'<div style="position:absolute;left:15.5px;top:20px;bottom:20px;width:1.5px;background:#eceaf4"></div>':''}
              ${['Introduction','Finding your rhythm','The tools that help','Final thoughts'].map((t,i)=>{
                const on = i===1;
                const txt = `<span style="font-size:.6rem;color:${on?'var(--violet)':'#888'};font-weight:${on?600:400};line-height:1.3">${t}</span>`;
                if(idx===0) return `<div style="display:flex;gap:8px;align-items:baseline;padding:4px 0">
                  <span style="font-size:.52rem;font-weight:700;color:${on?'var(--violet)':'#ccc'};flex-shrink:0">0${i+1}</span>${txt}</div>`;
                if(idx===1) return `<div style="display:flex;gap:9px;align-items:center;padding:4px 0;position:relative">
                  <span style="width:7px;height:7px;border-radius:50%;background:${on?'var(--violet)':'#fff'};
                    border:1.5px solid ${on?'var(--violet)':'#dcd9e8'};flex-shrink:0;position:relative;z-index:1"></span>${txt}</div>`;
                return `<div style="padding:4px 0 4px 9px;border-left:2px solid ${on?'var(--violet)':'#eee'};margin-left:1px">${txt}</div>`;
              }).join('')}
            </div>
          </div>`).join('')}
      </div>
      <div style="text-align:center;font-size:.66rem;color:var(--mid);font-weight:300;margin-top:13px">
        Sits in a sidebar or above the post, and highlights the section being read.
      </div>
    </div>`,
    progress:`<div style="height:4px;background:#f0f0f0;position:relative"><div style="width:62%;height:100%;background:var(--violet)"></div></div>
      <div style="padding:6px 18px;background:#faf9ff;border-bottom:1px solid rgba(91,79,232,.08);display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:.65rem;color:var(--violet);font-weight:700">62% read</span></div>
      ${blogNav}<div style="padding:16px 18px"><div class="af-hero" style="height:84px"><span style="font-size:.9rem">Finding balance in a busy creative life</span></div>${lines(8)}</div>`,
    time:`<div style="width:100%;max-width:740px;margin:0 auto">
      <div style="font-size:.66rem;color:var(--mid);font-weight:300;margin-bottom:12px">On the post itself, and on every card in the grid</div>
      <div style="display:grid;grid-template-columns:1fr 236px;gap:16px;align-items:start">
        <div style="background:#fff;border:1px solid #e6e6ec;border-radius:8px;padding:18px 20px 16px;box-shadow:0 8px 26px rgba(91,79,232,.09)">
          <div style="text-align:center">
            <div style="font-size:.5rem;font-weight:700;letter-spacing:.13em;color:var(--violet);margin-bottom:8px">LIFESTYLE</div>
            <div style="font-family:'DM Serif Display',serif;font-size:1.06rem;color:#1a1a1a;line-height:1.2;margin-bottom:8px">Finding balance in a busy creative life</div>
            <div style="font-size:.6rem;font-style:italic;color:#8a8a8a;line-height:1.45;margin-bottom:11px">What changed when I stopped trying to do everything at once.</div>
            <div style="width:26px;height:1px;background:#d8d8de;margin:0 auto 11px"></div>
            <div style="font-size:.56rem;color:#9e9ea8;margin-bottom:14px">Sarah Clarke <span style="color:#cbcbd4">&middot;</span> Mar 12, 2026
              <span style="color:#cbcbd4">&middot;</span> <span style="color:var(--violet);font-weight:700">5 min read</span></div>
          </div>
          ${lines(4)}
        </div>
        <div style="background:#fff;border:1px solid #e6e6ec;border-radius:8px;padding:12px;box-shadow:0 8px 26px rgba(91,79,232,.09)">
          <div style="height:96px;border-radius:5px;background:linear-gradient(135deg,#ded8f8,#b9afee);margin-bottom:11px"></div>
          <div style="font-size:.48rem;font-weight:700;letter-spacing:.13em;color:var(--violet);margin-bottom:7px">CREATIVITY</div>
          <div style="font-family:'DM Serif Display',serif;font-size:.84rem;color:#1a1a1a;line-height:1.25;margin-bottom:9px">The case for slow living</div>
          <div style="font-size:.5rem;color:#a5a5ae">Mar 12, 2026 <span style="color:#d2d2d8">&middot;</span> Sarah Clarke
            <span style="color:#d2d2d8">&middot;</span> <span style="color:var(--violet);font-weight:700">4 min read</span></div>
        </div>
      </div>
    </div>`,
    social:`${blogNav}
      <div style="position:relative;height:138px;display:flex;flex-direction:column;justify-content:flex-end;padding:0 18px 13px;
        background:linear-gradient(to top,rgba(18,14,48,.86),rgba(18,14,48,.3) 60%,rgba(18,14,48,.08)),linear-gradient(135deg,#8f86f0,#3b3170)">
        <div style="display:inline-flex;align-self:flex-start;font-size:.5rem;font-weight:700;letter-spacing:.11em;color:#fff;
          background:var(--violet);padding:4px 10px;border-radius:100px;margin-bottom:8px">LIFESTYLE</div>
        <div style="font-family:'DM Serif Display',serif;font-size:1.05rem;color:#fff;line-height:1.18;margin-bottom:7px">Finding balance in a busy creative life</div>
        <div style="font-size:.55rem;color:rgba(255,255,255,.7);margin-bottom:9px">Sarah Clarke · Mar 12, 2026 · 5 min read</div>
        <div style="display:flex;gap:9px;align-items:center">
          ${[
            '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
            '<path d="M18.2 2.2h3.3l-7.2 8.3 8.5 11.2h-6.6l-4.7-6.2-5.4 6.2H2.7l7.7-8.8L1.3 2.2h6.8l4.2 5.6zM17 19.8h1.8L7.1 4.1H5.1z"/>',
            '<path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5zM3.8 6l8.2 6 8.2-6z"/>',
            '<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5 4.7c.7 0 1.3.6 1.3 1.3a1.25 1.25 0 01-2.5.05l-2.6-.55-.8 3.75c1.8.07 3.5.63 4.7 1.49.3-.31.73-.49 1.2-.49.97 0 1.76.79 1.76 1.75 0 .72-.44 1.34-1.01 1.62.03.17.04.35.04.52 0 2.7-3.13 4.87-7 4.87S5.7 17.3 5.7 14.6c0-.18.02-.37.04-.53A1.75 1.75 0 014 12c0-.97.79-1.76 1.76-1.76.46 0 .9.2 1.2.49 1.21-.88 2.88-1.43 4.75-1.49l.88-4.18a.34.34 0 01.38-.24l2.9.62a1.2 1.2 0 011.11-.7zM9.25 12c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25S9.94 12 9.25 12zm5.5 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25S16 13.94 16 13.25 15.44 12 14.75 12zm-5.47 4a.33.33 0 00-.23.56c.84.84 2.48.91 2.96.91.48 0 2.1-.06 2.96-.91a.33.33 0 00-.46-.47c-.55.54-1.69.73-2.52.73s-1.98-.19-2.51-.73a.33.33 0 00-.2-.09z"/>',
            '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>',
            '<path d="M12 2C6.5 2 2 6.5 2 12c0 4.2 2.6 7.9 6.4 9.3-.1-.8-.2-2 0-2.9.2-.8 1.2-5 1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.5 2.1-.8 3.3-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4-4.2-4-2.8 0-4.5 2.1-4.5 4.3 0 .9.3 1.8.7 2.3.1.1.1.2.1.3l-.3 1.1c0 .2-.1.2-.3.1-1.2-.6-2-2.4-2-3.9 0-3.2 2.3-6.1 6.6-6.1 3.5 0 6.2 2.5 6.2 5.8 0 3.4-2.2 6.2-5.2 6.2-1 0-2-.5-2.3-1.1l-.6 2.4c-.2.9-.8 2-1.2 2.6.9.3 1.9.4 3 .4 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>',
            '<path d="M12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.1 1.5 5.8L.1 23.5a.5.5 0 0 0 .6.6l5.6-1.5A11.9 11.9 0 0 0 12 24c6.6 0 12-5.4 12-12S18.6 0 12 0zm5.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1-1.3-.5-2.4-1.5c-.9-.8-1.5-1.8-1.7-2.1s0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5s0-.4 0-.5-.7-1.6-.9-2.2-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1.1 2.9 1.2 3.1 2.1 3.2 5.1 4.5c.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4s.2-1.3.2-1.4-.3-.2-.6-.3z"/>'
          ].map(d=>`<svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,.82)">${d}</svg>`).join('')}
        </div>
      </div>
      <div style="padding:14px 18px 16px">${lines(6)}</div>`,
    authors:`<div style="width:100%;max-width:640px;margin:0 auto">
      <div style="font-size:.66rem;color:var(--mid);font-weight:300;margin-bottom:12px">Assign as many authors to a post as you need &mdash; every name shows in the byline</div>
      <div style="background:#fff;border:1px solid #e6e6ec;border-radius:8px;padding:0 0 18px;box-shadow:0 8px 26px rgba(91,79,232,.09);overflow:hidden">
        <div style="height:74px;background:linear-gradient(135deg,#cfc7f5,#9b90ec)"></div>
        <div style="padding:16px 22px 0">
          <div style="font-size:.5rem;font-weight:700;letter-spacing:.13em;color:var(--violet);margin-bottom:8px">LIFESTYLE</div>
          <div style="font-family:'DM Serif Display',serif;font-size:1.22rem;color:#1a1a1a;line-height:1.18;margin-bottom:11px">Finding balance in a busy creative life</div>
          <div style="font-size:.58rem;color:#9e9ea8;font-weight:500;margin-bottom:15px">
            <span style="color:var(--violet);font-weight:700">Sarah Clarke, Marcus Webb</span>
            <span style="color:#cbcbd4;margin:0 2px">&middot;</span> Mar 12, 2026
            <span style="color:#cbcbd4;margin:0 2px">&middot;</span> 5 min read</div>
          ${lines(3)}
        </div>
      </div>
    </div>`,
    profiles:`<div style="width:100%;max-width:730px;margin:0 auto">
      <div style="font-size:.66rem;color:var(--mid);font-weight:300;margin-bottom:12px">A full profile block at the foot of the post, or a compact one in the sidebar</div>
      <div style="display:grid;grid-template-columns:1fr 194px;gap:15px;align-items:start">
      <div style="background:#fff;border:1px solid #e6e6ec;border-radius:8px;padding:15px 17px 17px;box-shadow:0 8px 26px rgba(91,79,232,.09)">
        <div style="font-size:.46rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#b4b4be;margin-bottom:11px">In the post footer</div>
        <div style="font-size:.5rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#8a8a8a;
          padding-bottom:8px;border-bottom:1px solid #f0f0f0;margin-bottom:13px">About the Authors</div>
        ${([['#b9afee,#7c6ef0','Sarah Clarke','Writes about creative work, slow living, and the systems that make both possible. Based in Portland.',[0,1,2,5]],
           ['#ded8f8,#a79aef','Marcus Webb','Former magazine editor turned independent publisher. Covers design, typography, and the business of writing.',[0,3,4]]] as [string,string,string,number[]][])
          .map(([g,name,bio,socials],i)=>`
          <div style="display:flex;gap:13px;align-items:flex-start;border:1px solid #eceae4;border-radius:8px;padding:13px 14px;${i===0?'margin-bottom:11px':''}">
            <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${g});flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:.74rem;font-weight:700;color:#1a1a1a;margin-bottom:6px">${name}</div>
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:7px">
                ${socials.map(s=>`<svg width="11" height="11" viewBox="0 0 24 24" fill="#9a9aa8">${[
                  '<path d="M12 2.2c3.2 0 3.6 0 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.26.07 1.64.07 4.85s-.01 3.58-.07 4.85c-.15 3.22-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.62 2.16 15.2 2.16 12s.01-3.58.07-4.85c.15-3.23 1.66-4.77 4.92-4.92C8.42 2.17 8.8 2.16 12 2.16zm0 3.64A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/>',
                  '<path d="M18.2 2.2h3.3l-7.2 8.3 8.5 11.2h-6.6l-4.7-6.2-5.4 6.2H2.7l7.7-8.8L1.3 2.2h6.8l4.2 5.6zM17 19.8h1.8L7.1 4.1H5.1z"/>',
                  '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>',
                  '<path d="M24 12.07C24 5.44 18.63.07 12 .07S0 5.44 0 12.07c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.38C19.61 23.02 24 18.06 24 12.07z"/>',
                  '<path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5zM3.8 6l8.2 6 8.2-6z"/>',
                  '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 1.8c1.6 1.7 2.6 4.6 2.7 7.3H9.3c.1-2.7 1.1-5.6 2.7-7.3zM7.5 11.1H4a8.2 8.2 0 0 1 4.3-6.5 15.6 15.6 0 0 0-.8 6.5zm0 1.8c.1 2.3.4 4.5.8 6.5A8.2 8.2 0 0 1 4 12.9zm1.8 0h5.4c-.1 2.7-1.1 5.6-2.7 7.3-1.6-1.7-2.6-4.6-2.7-7.3zm7.2 0H20a8.2 8.2 0 0 1-4.3 6.5c.4-2 .7-4.2.8-6.5zm0-1.8c-.1-2.3-.4-4.5-.8-6.5A8.2 8.2 0 0 1 20 11.1z"/>'
                ][s]}</svg>`).join('')}
              </div>
              <div style="font-size:.6rem;color:#7a7a84;line-height:1.5">${bio}</div>
            </div>
          </div>`).join('')}
      </div>
      <div style="background:#fff;border:1px solid #e6e6ec;border-radius:8px;padding:15px 15px 17px;box-shadow:0 8px 26px rgba(91,79,232,.09)">
        <div style="font-size:.46rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#b4b4be;margin-bottom:11px">In the sidebar</div>
        <div style="font-size:.46rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#8a8a8a;
          padding-bottom:7px;border-bottom:1px solid #f0f0f0;margin-bottom:12px">About the Authors</div>
        ${[['#b9afee,#7c6ef0','Sarah Clarke','Writes about creative work and slow living.'],
           ['#ded8f8,#a79aef','Marcus Webb','Former magazine editor turned publisher.']]
          .map(([g,name,bio],i)=>`
          <div style="${i===0?'margin-bottom:13px':''}">
            <div style="display:flex;gap:9px;align-items:center;margin-bottom:6px">
              <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,${g});flex-shrink:0"></div>
              <div style="font-size:.62rem;font-weight:700;color:#1a1a1a;line-height:1.25">${name}</div>
            </div>
            <div style="font-size:.53rem;color:#8a8a94;line-height:1.5">${bio}</div>
          </div>`).join('')}
      </div>
      </div>
    </div>`,
    sorting:`<div style="width:100%;max-width:700px;margin:0 auto">
      <div style="font-size:.66rem;color:var(--mid);font-weight:300;margin-bottom:12px">Readers reorder the archive themselves, right above the post grid</div>
      <div style="background:#fff;border:1px solid #e6e6ec;border-radius:8px;padding:14px 16px 16px;box-shadow:0 8px 26px rgba(91,79,232,.09)">
        <div style="position:relative;display:flex;justify-content:flex-end;margin-bottom:10px;z-index:2">
          <div>
            <div style="display:flex;align-items:center;gap:22px;border:1px solid var(--violet);border-radius:5px;padding:6px 10px;
              font-size:.58rem;color:#1a1a1a;background:#fff">A&ndash;Z
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#8a8a94" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></div>
            <div style="position:absolute;right:0;margin-top:5px;min-width:132px;background:#fff;border:1px solid #e2e0ea;
              border-radius:6px;box-shadow:0 10px 26px rgba(24,20,60,.16);padding:5px 0">
              ${[['By Date',0],['A&ndash;Z',1],['By Popularity',0]].map(([t,on])=>`
                <div style="display:flex;align-items:center;gap:7px;padding:5px 11px;font-size:.58rem;color:${on?'#1a1a1a':'#55555f'};font-weight:${on?600:400}">
                  <span style="width:8px;display:inline-flex;color:var(--violet)">${on?'&#10003;':''}</span>${t}</div>`).join('')}
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:11px">
          ${[['#ded8f8,#b9afee','LIFESTYLE','Finding balance in a busy creative life'],
             ['#f0e6d4,#dcc8a8','LIFESTYLE','My morning ritual and why it works'],
             ['#d4ece2,#a8d8c4','CREATIVITY','The case for slow living']]
            .map(([g,cat,title])=>`
            <div>
              <div style="height:58px;border-radius:5px;background:linear-gradient(135deg,${g});margin-bottom:8px"></div>
              <div style="font-size:.44rem;font-weight:700;letter-spacing:.12em;color:var(--violet);margin-bottom:5px">${cat}</div>
              <div style="font-family:'DM Serif Display',serif;font-size:.7rem;color:#1a1a1a;line-height:1.25">${title}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`,
    featured:`<div style="width:100%;max-width:720px;margin:0 auto">
      <div style="font-size:.66rem;color:var(--mid);font-weight:300;margin-bottom:12px">Mark any post Featured and it's pulled to the top of the blog as a hero</div>
      <div style="background:#fff;border:1px solid #e6e6ec;border-radius:8px;padding:12px;box-shadow:0 8px 26px rgba(91,79,232,.09)">
        <div style="position:relative;height:148px;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:0 16px 14px;margin-bottom:14px;
          background:linear-gradient(to top,rgba(16,12,42,.9),rgba(16,12,42,.45) 55%,rgba(16,12,42,.12)),linear-gradient(135deg,#8f86f0,#2e2660)">
          <div style="display:inline-flex;align-self:flex-start;font-size:.46rem;font-weight:700;letter-spacing:.12em;color:#fff;
            background:var(--violet);padding:4px 10px;border-radius:4px;margin-bottom:9px">FEATURED</div>
          <div style="font-size:.46rem;font-weight:700;letter-spacing:.13em;color:rgba(255,255,255,.72);margin-bottom:6px">LIFESTYLE</div>
          <div style="font-family:'DM Serif Display',serif;font-size:1.1rem;color:#fff;line-height:1.16;margin-bottom:7px">Finding balance in a busy creative life</div>
          <div style="font-size:.5rem;color:rgba(255,255,255,.6)">Mar 12, 2026 <span style="opacity:.5">&middot;</span> By Sarah Clarke <span style="opacity:.5">&middot;</span> 5 min read</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:11px">
          ${[['#ded8f8,#b9afee','CREATIVITY','The case for slow living','4 min read'],
             ['#d4ece2,#a8d8c4','WELLNESS','The edit method, start to finish','6 min read'],
             ['#f0e6d4,#dcc8a8','LIFESTYLE','My morning ritual and why it works','5 min read']]
            .map(([g,cat,title,t])=>`
            <div>
              <div style="height:62px;border-radius:5px;background:linear-gradient(135deg,${g});margin-bottom:8px"></div>
              <div style="font-size:.44rem;font-weight:700;letter-spacing:.12em;color:var(--violet);margin-bottom:5px">${cat}</div>
              <div style="font-family:'DM Serif Display',serif;font-size:.7rem;color:#1a1a1a;line-height:1.25;margin-bottom:5px">${title}</div>
              <div style="font-size:.44rem;color:#b5b5be">Mar 12, 2026 <span style="color:#dcdce2">&middot;</span> Sarah Clarke <span style="color:#dcdce2">&middot;</span> ${t}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`,
    crumbs:`<div style="width:100%;max-width:720px;margin:0 auto">
      <div style="font-size:.66rem;color:var(--mid);font-weight:300;margin-bottom:12px">Blog name → category → post title, linked the whole way back</div>
      <div style="background:#fff;border:1px solid #e6e6ec;border-radius:8px;padding:20px 22px 0;box-shadow:0 8px 26px rgba(91,79,232,.09);overflow:hidden">
        <div style="text-align:center;font-size:.62rem;color:#8e8e98;line-height:1.4;margin-bottom:16px">
          <span>Sarah Clarke</span>
          <span style="margin:0 4px;color:#c2c2cc">&rsaquo;</span>
          <span>Lifestyle</span>
          <span style="margin:0 4px;color:#c2c2cc">&rsaquo;</span>
          <span>Finding balance in a busy creative life</span>
        </div>
        <div style="text-align:center">
          <div style="font-size:.5rem;font-weight:700;letter-spacing:.13em;color:var(--violet);margin-bottom:8px">LIFESTYLE</div>
          <div style="font-family:'DM Serif Display',serif;font-size:1.22rem;color:#1a1a1a;line-height:1.18;margin-bottom:7px">Finding balance in a busy creative life</div>
          <div style="font-size:.62rem;color:#8a8a8a;margin-bottom:10px">What changed when I stopped trying to do everything at once.</div>
          <div style="font-size:.55rem;color:#aaa;margin-bottom:9px">Sarah Clarke &middot; Mar 12, 2026 &middot; 5 min read</div>
          <div style="display:flex;gap:9px;align-items:center;justify-content:center;margin-bottom:16px">
            ${['<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
               '<path d="M18.2 2.2h3.3l-7.2 8.3 8.5 11.2h-6.6l-4.7-6.2-5.4 6.2H2.7l7.7-8.8L1.3 2.2h6.8l4.2 5.6zM17 19.8h1.8L7.1 4.1H5.1z"/>',
               '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>',
               '<path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5zM3.8 6l8.2 6 8.2-6z"/>']
              .map(d=>`<svg width="11" height="11" viewBox="0 0 24 24" fill="#9a9aa8">${d}</svg>`).join('')}
          </div>
        </div>
        <div style="height:62px;margin:0 -22px;background:linear-gradient(135deg,#8f86f0,#3b3170)"></div>
      </div>
    </div>`,
    prevnext:`<div style="width:100%;max-width:700px;margin:0 auto">
      <div style="font-size:.66rem;color:var(--mid);font-weight:300;margin-bottom:12px">Sits at the bottom of every post, pulling the real titles on either side of it</div>
      <div style="background:#fff;border:1px solid #e6e6ec;border-radius:8px;padding:17px 18px 18px;box-shadow:0 8px 26px rgba(91,79,232,.09)">
        <div style="opacity:.5;margin-bottom:15px">${lines(2)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #e6e4df;border-radius:8px;overflow:hidden">
          <div style="padding:15px 16px">
            <div style="font-size:.5rem;font-weight:700;letter-spacing:.1em;color:#9a9a9a;margin-bottom:7px">PREVIOUS</div>
            <div style="font-size:.5rem;font-weight:700;letter-spacing:.1em;color:var(--violet);margin-bottom:5px">CREATIVITY</div>
            <div style="font-family:'DM Serif Display',serif;font-size:.82rem;color:#1a1a1a;line-height:1.3">The case for slow living</div>
          </div>
          <div style="padding:15px 16px;border-left:1px solid #edebe6;text-align:right">
            <div style="font-size:.5rem;font-weight:700;letter-spacing:.1em;color:#9a9a9a;margin-bottom:7px">NEXT</div>
            <div style="font-size:.5rem;font-weight:700;letter-spacing:.1em;color:var(--violet);margin-bottom:5px">WELLNESS</div>
            <div style="font-family:'DM Serif Display',serif;font-size:.82rem;color:#1a1a1a;line-height:1.3">The edit method, start to finish</div>
          </div>
        </div>
      </div>
    </div>`,
    page:`<div style="width:100%;max-width:720px;margin:0 auto">
      <div style="font-size:.66rem;color:var(--mid);font-weight:300;margin-bottom:12px">Two modes, set per blog &mdash; numbered pages or load more</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        ${[['Numbered pages',`
            <div style="display:flex;gap:5px;align-items:center;justify-content:center;margin-bottom:9px">
              ${['&lsaquo;','1','2','3','4','&rsaquo;'].map((t,i)=>`<span style="min-width:18px;text-align:center;font-size:.58rem;padding:5px 6px;border-radius:5px;
                border:1px solid ${i===2?'var(--violet)':'#e2e0da'};background:${i===2?'var(--violet)':'transparent'};
                color:${i===2?'#fff':'#666'};font-weight:${i===2?600:500}">${t}</span>`).join('')}
            </div>
            <div style="text-align:center;font-size:.55rem;color:#a5a5a5">Page 2 of 4</div>`],
          ['Load more',`
            <div style="display:flex;justify-content:center;margin-bottom:9px">
              <span style="font-size:.58rem;font-weight:600;letter-spacing:.06em;padding:8px 22px;border-radius:100px;
                background:var(--violet);color:#fff">Load more</span>
            </div>
            <div style="text-align:center;font-size:.55rem;color:#a5a5a5">Showing 10 posts of 20</div>`]]
          .map(([label,ctrl])=>`
          <div style="background:#fff;border:1px solid #e6e6ec;border-radius:8px;padding:15px 16px 17px;box-shadow:0 8px 26px rgba(91,79,232,.09)">
            <div style="font-size:.5rem;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:#8a8a8a;
              padding-bottom:7px;border-bottom:1px solid #f0f0f0;margin-bottom:12px">${label}</div>
            ${[0,1].map(()=>`<div style="display:flex;gap:9px;align-items:center;padding:5px 0">
              <div style="width:40px;height:30px;border-radius:4px;background:linear-gradient(135deg,#ded8f8,#b9afee);flex-shrink:0"></div>
              <div style="flex:1;min-width:0"><div style="height:5px;background:#ededed;border-radius:3px;margin-bottom:5px"></div>
              <div style="height:4px;width:58%;background:#f5f5f5;border-radius:3px"></div></div></div>`).join('')}
            <div style="height:20px;margin:0 -16px 10px;background:linear-gradient(to bottom,rgba(255,255,255,0),#fff)"></div>
            ${ctrl}
          </div>`).join('')}
      </div>
    </div>`,
    comments:`${blogNav}<div style="padding:16px 18px">
      <div class="af-hero" style="height:64px"><span style="font-size:.8rem">Finding balance in a busy creative life</span></div>
      <div style="margin:10px 0 14px">${lines(2)}</div>
      <div style="border-top:1px solid #f0f0f0;padding-top:13px">
        <div style="display:flex;align-items:center;gap:9px;margin-bottom:11px">
          <span style="font-size:.72rem;font-weight:600">3 Comments</span></div>
        ${[['J','Jenna R.','Verified','#5B4FE8',"This landed at exactly the right time for me. The bit about protecting mornings especially.",'4'],
           ['M','Marcus','','#1a7a5e','Saving this one. Thanks for writing it.','2']]
          .map(([ini,nm,vb,c,tx,lk])=>`<div style="display:flex;gap:9px;margin-bottom:11px">
            <div style="width:24px;height:24px;border-radius:50%;background:${c};color:#fff;display:flex;align-items:center;justify-content:center;font-size:.55rem;font-weight:700;flex-shrink:0">${ini}</div>
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                <span style="font-size:.6rem;font-weight:600">${nm}</span>
                ${vb?`<span style="font-size:.44rem;background:rgba(91,79,232,.1);color:var(--violet);padding:1px 6px;border-radius:100px;font-weight:600">${vb}</span>`:''}
                <span style="font-size:.5rem;color:#bbb">2d ago</span></div>
              <div style="font-size:.58rem;color:#555;line-height:1.5">${tx}</div>
              <div style="display:flex;gap:11px;margin-top:5px">
                <span style="font-size:.5rem;color:var(--violet)">♥ ${lk}</span>
                <span style="font-size:.5rem;color:#999">Reply</span></div></div></div>`).join('')}
        <div style="margin-left:33px;padding-left:11px;border-left:2px solid #f0f0f0;display:flex;gap:9px">
          <div style="width:20px;height:20px;border-radius:50%;background:#9a1a3e;color:#fff;display:flex;align-items:center;justify-content:center;font-size:.48rem;font-weight:700;flex-shrink:0">S</div>
          <div><div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="font-size:.56rem;font-weight:600">Sarah Clarke</span>
            <span style="font-size:.44rem;background:rgba(154,26,62,.1);color:#9a1a3e;padding:1px 6px;border-radius:100px;font-weight:600">Author</span></div>
            <div style="font-size:.56rem;color:#555;line-height:1.5">Thank you Marcus — glad it resonated.</div></div></div>
        <div style="margin-top:12px;border:1px solid #e8e8ee;border-radius:6px;padding:9px 11px;font-size:.56rem;color:#bbb">Join the conversation…</div>
      </div></div>`,
    paywall:`${blogNav}<div style="padding:16px 18px;position:relative">
      <div class="af-hero" style="height:70px"><span style="font-size:.82rem">The complete guide to slow mornings</span></div>
      <div style="margin-top:11px">${lines(2)}</div>
      <div style="position:relative;margin-top:4px">
        <div style="filter:blur(2.5px);opacity:.45">${lines(4)}</div>
        <div style="position:absolute;inset:-6px;background:linear-gradient(to bottom,rgba(255,255,255,0),rgba(255,255,255,.95) 45%)"></div>
      </div>
      <div style="border:1px solid rgba(122,45,94,.2);background:#fdf8fb;border-radius:9px;padding:15px;text-align:center;margin-top:-18px;position:relative">
        <div style="display:inline-flex;align-items:center;gap:5px;font-size:.5rem;font-weight:600;color:var(--plum);background:var(--plum-f);padding:3px 9px;border-radius:100px;margin-bottom:8px">✦ Members only</div>
        <div style="font-family:var(--serif);font-size:.85rem;color:#1a1a1a;margin-bottom:5px">Keep reading with a membership</div>
        <div style="font-size:.56rem;color:var(--mid);margin-bottom:11px;max-width:260px;margin-inline:auto;line-height:1.5">Members get every post in full, plus the archive. Powered by your own Squarespace membership.</div>
        <div style="display:flex;gap:6px;justify-content:center">
          <span style="background:var(--plum);color:#fff;font-size:.56rem;font-weight:600;padding:7px 15px;border-radius:5px">Become a member</span>
          <span style="border:1px solid #e0d5dd;color:var(--mid);font-size:.56rem;padding:7px 15px;border-radius:5px">Log in</span></div>
      </div></div>`,
    email:`${blogNav}<div style="padding:16px 18px;display:grid;grid-template-columns:1fr 160px;gap:14px">
      <div><div class="af-hero" style="height:76px"><span style="font-size:.85rem">Finding balance in a busy creative life</span></div>
        <div style="margin-top:11px">${lines(5)}</div></div>
      <div>
        <div style="border:1px solid rgba(122,45,94,.2);background:#fdf8fb;border-radius:8px;padding:12px;text-align:center">
          <div style="font-family:var(--serif);font-size:.72rem;color:#1a1a1a;margin-bottom:5px">The weekly letter</div>
          <div style="font-size:.5rem;color:var(--mid);line-height:1.5;margin-bottom:9px">One honest note about slow work, every Sunday.</div>
          <div style="background:#fff;border:1px solid #e4dae2;border-radius:4px;padding:5px 8px;font-size:.5rem;color:#bbb;text-align:left;margin-bottom:5px">you@example.com</div>
          <div style="background:var(--plum);color:#fff;font-size:.54rem;font-weight:600;padding:6px;border-radius:4px">Subscribe</div>
          <div style="font-size:.44rem;color:#bbb;margin-top:6px">1,240 readers · No spam</div></div></div></div>`,
    magnet:`${blogNav}<div style="padding:16px 18px">
      <div class="af-hero" style="height:64px"><span style="font-size:.8rem">My morning ritual and why it works</span></div>
      <div style="margin:11px 0">${lines(4)}</div>
      <div style="border:1px solid rgba(122,45,94,.22);background:linear-gradient(135deg,#fdf6fa,#f8eef5);border-radius:10px;padding:16px 17px">
        <div style="font-size:.46rem;font-weight:700;letter-spacing:.13em;color:var(--plum);opacity:.75;margin-bottom:7px">FREE DOWNLOAD</div>
        <div style="font-family:var(--serif);font-size:.85rem;color:#1a1a1a;margin-bottom:4px">The weekly reset worksheet</div>
        <div style="font-size:.56rem;color:var(--mid);line-height:1.5;margin-bottom:11px">One page. The five questions I answer every Sunday before the week starts.</div>
        <div style="display:flex;gap:6px;max-width:330px">
          <div style="flex:1;background:#fff;border:1px solid #e4dae2;border-radius:4px;padding:6px 9px;font-size:.52rem;color:#bbb">you@example.com</div>
          <div style="background:var(--plum);color:#fff;font-size:.54rem;font-weight:600;padding:6px 13px;border-radius:4px;white-space:nowrap">Send it to me</div></div></div></div>`,
    related:`<div style="width:100%;max-width:700px;margin:0 auto">
      <div style="font-size:.66rem;color:var(--mid);font-weight:300;margin-bottom:12px">Appears at the end of a post, picked from your tags and categories</div>
      <div style="background:#fff;border:1px solid #e6e6ec;border-radius:8px;padding:16px 17px 17px;box-shadow:0 8px 26px rgba(91,79,232,.09)">
        <div style="height:6px;width:26%;background:#ececec;border-radius:3px;margin-bottom:4px"></div>
        <div style="height:4px;width:40%;background:#f5f5f5;border-radius:3px;margin-bottom:16px"></div>
        <div style="font-family:'DM Serif Display',serif;font-size:.86rem;color:#1a1a1a;margin-bottom:12px">Related Posts</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
          ${[['#ded8f8','#b9afee','LIFESTYLE','My morning ritual and why it works','5 min'],
             ['#d4ece2','#a8d8c4','CREATIVITY','The case for slow living','4 min'],
             ['#f0e6d4','#dcc8a8','WELLNESS','The edit method','6 min']]
            .map(([a,b,cat,title,t])=>`
            <div>
              <div style="height:52px;border-radius:5px;background:linear-gradient(135deg,${a},${b});margin-bottom:7px"></div>
              <div style="font-size:.5rem;font-weight:700;letter-spacing:.1em;color:var(--violet);margin-bottom:4px">${cat}</div>
              <div style="font-size:.64rem;color:#333;line-height:1.35;font-weight:500;margin-bottom:4px">${title}</div>
              <div style="font-size:.54rem;color:#bbb">Sarah Clarke · ${t} read</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`,
    popular:`${blogNav}
      <div style="height:74px;background:linear-gradient(135deg,#cfc7f5,#9b90ec)"></div>
      <div style="padding:14px 18px 16px">
        <div style="font-family:'DM Serif Display',serif;font-size:1rem;color:#1a1a1a;line-height:1.2;margin-bottom:5px">Finding balance in a busy creative life</div>
        <div style="font-size:.55rem;color:#aaa;margin-bottom:14px">Sarah Clarke · Mar 12, 2026 · 5 min read</div>
        <div style="display:grid;grid-template-columns:1fr 218px;gap:20px;align-items:start">
          <div>${lines(9)}</div>
          <div>
            <div style="font-size:.52rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#8a8a8a;
              padding-bottom:7px;border-bottom:1px solid #ececec;margin-bottom:11px">Popular Posts</div>
            ${[['#ded8f8','#b9afee','My morning ritual and why it works','5 min read'],
               ['#d4ece2','#a8d8c4','The case for slow living','4 min read'],
               ['#f0e6d4','#dcc8a8','The edit method, start to finish','6 min read']]
              .map(([a,b,title,t],i)=>`
              <div style="display:flex;gap:9px;align-items:flex-start;${i<2?'margin-bottom:11px':''}">
                <div style="width:44px;height:40px;border-radius:4px;background:linear-gradient(135deg,${a},${b});flex-shrink:0"></div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:.58rem;color:#1a1a1a;font-weight:600;line-height:1.35;margin-bottom:4px">${title}</div>
                  <div style="font-size:.46rem;color:#b5b5b5">Mar 12, 2026 · ${t}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>`,
    analytics:`<div style="padding:12px 16px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-family:var(--serif);font-size:.92rem;line-height:1.1">Analytics</div>
          <div style="font-size:.48rem;color:#a4a4ae;margin-top:3px">Track your blog's performance and reader engagement</div>
        </div>
        <div style="display:flex;gap:4px">${['Last 7 days','Last 30 days','Last 90 days','Last 12 months'].map((t,i)=>`<span style="font-size:.5rem;padding:4px 8px;border-radius:5px;background:${i===1?'var(--violet)':'#f2f2f5'};color:${i===1?'#fff':'#6a6a74'};font-weight:${i===1?600:500};white-space:nowrap">${t}</span>`).join('')}</div></div>
      <div style="padding:12px 16px">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:11px">
          ${[['Total Page Views','24,831','&uarr; 12%'],['Unique Visitors','8,204',''],['Avg. Time on Page','3:42',''],['Avg. Read Percent','68%','']]
            .map(([l,v,d])=>`<div style="background:#faf9ff;border:1px solid rgba(91,79,232,.1);border-radius:7px;padding:9px 10px">
              <div style="font-size:.44rem;color:#9a9aa4;font-weight:500;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px">${l}</div>
              <div style="font-family:var(--serif);font-size:1.12rem;line-height:1">${v}</div>
              <div style="font-size:.44rem;color:#1a7a5e;font-weight:600;margin-top:3px;min-height:9px">${d?d+' vs prev':''}</div></div>`).join('')}</div>

        <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:9px;margin-bottom:9px">
          <div style="background:#fff;border:1px solid #f0f0f0;border-radius:7px;padding:10px 11px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div style="font-size:.56rem;font-weight:600">Page Views &amp; Visitors</div>
              <div style="display:flex;gap:9px">
                <span style="font-size:.42rem;color:#8a8a94;display:flex;align-items:center;gap:3px"><span style="width:6px;height:6px;border-radius:2px;background:#5B4FE8"></span>Page Views</span>
                <span style="font-size:.42rem;color:#8a8a94;display:flex;align-items:center;gap:3px"><span style="width:6px;height:6px;border-radius:2px;background:#10B981"></span>Unique Visitors</span></div></div>
            ${(()=>{const pv=[44,57,49,64,58,74,66,80,71,88,80,96],uv=[21,29,25,35,31,41,37,45,39,51,46,57],W=300,H=62;
              const pt=(a: number[])=>a.map((v: number,i: number)=>`${(i*(W/(a.length-1))).toFixed(1)},${(H-v/100*H).toFixed(1)}`).join(' ');
              return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:62px;display:block">
                <polygon points="0,${H} ${pt(pv)} ${W},${H}" fill="rgba(91,79,232,.15)"/>
                <polyline points="${pt(pv)}" fill="none" stroke="#5B4FE8" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
                <polygon points="0,${H} ${pt(uv)} ${W},${H}" fill="rgba(16,185,129,.14)"/>
                <polyline points="${pt(uv)}" fill="none" stroke="#10B981" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;})()}
          </div>
          <div style="background:#fff;border:1px solid #f0f0f0;border-radius:7px;padding:10px 11px">
            <div style="font-size:.56rem;font-weight:600;margin-bottom:8px">Read Percent Distribution</div>
            <div style="display:flex;gap:10px;align-items:center">
              <div style="width:58px;height:58px;border-radius:50%;flex-shrink:0;
                background:conic-gradient(#EF4444 0 12%,#F59E0B 12% 30%,#10B981 30% 58%,#5B4FE8 58% 100%)"></div>
              <div style="flex:1;min-width:0;max-width:128px">
                ${[['0-25%','#EF4444','12%'],['26-50%','#F59E0B','18%'],['51-75%','#10B981','28%'],['76-100%','#5B4FE8','42%']]
                  .map(([l,c,p])=>`<div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
                    <span style="width:6px;height:6px;border-radius:2px;background:${c};flex-shrink:0"></span>
                    <span style="font-size:.44rem;color:#6a6a74;flex:1">${l}</span>
                    <span style="font-size:.44rem;font-weight:600;color:#1a1a1a">${p}</span></div>`).join('')}</div></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1.25fr 1fr;gap:9px;margin-bottom:9px">
          <div style="background:#fff;border:1px solid #f0f0f0;border-radius:7px;padding:10px 11px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px">
              <div style="font-size:.56rem;font-weight:600">Per-Post Analytics</div>
              <span style="font-size:.42rem;color:#8a8a94;border:1px solid #eaeaef;border-radius:4px;padding:2px 6px">Views (high &rarr; low)</span></div>
            ${[['Finding balance in a busy creative life','4,218','82'],['My morning ritual and why it works','3,067','74'],['The case for slow living','2,540','61']]
              .map(([t,v,r],i)=>`<div style="display:flex;gap:8px;align-items:center;${i<2?'margin-bottom:8px':''}">
                <span style="font-size:.5rem;color:#c2c2ca;font-weight:600;width:8px;flex-shrink:0">${i+1}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:.5rem;color:#1a1a1a;font-weight:500;line-height:1.3;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t}</div>
                  <div style="font-size:.42rem;color:#aeaeb8">Sarah Clarke <span style="color:#dcdce2">&middot;</span> ${v} views <span style="color:#dcdce2">&middot;</span> 3:12 avg. time</div></div>
                <div style="width:52px;flex-shrink:0;text-align:right">
                  <div style="font-size:.5rem;font-weight:700;color:#1a1a1a">${r}%</div>
                  <div style="height:3px;background:#f0f0f0;border-radius:100px;margin-top:3px"><div style="width:${r}%;height:100%;background:var(--violet);border-radius:100px"></div></div></div></div>`).join('')}
          </div>
          <div style="background:#fff;border:1px solid #f0f0f0;border-radius:7px;padding:10px 11px">
            <div style="font-size:.56rem;font-weight:600;margin-bottom:9px">Search Analytics</div>
            <div style="display:flex;font-size:.4rem;color:#aeaeb8;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding-bottom:5px;border-bottom:1px solid #f4f4f6;margin-bottom:6px">
              <span style="flex:1">Search Term</span><span style="width:32px;text-align:right">Clicks</span><span style="width:30px;text-align:right">CTR</span></div>
            ${[['morning routine','61','42%'],['slow living','44','31%'],['newsletter','28','18%']]
              .map(([t,c,r],i)=>`<div style="display:flex;align-items:center;font-size:.46rem;color:#55555f;${i<2?'margin-bottom:6px':''}">
                <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t}</span>
                <span style="width:32px;text-align:right;color:#8a8a94">${c}</span>
                <span style="width:30px;text-align:right"><span style="background:rgba(91,79,232,.1);color:var(--violet);font-weight:700;border-radius:100px;padding:1px 5px;font-size:.42rem">${r}</span></span></div>`).join('')}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1.25fr;gap:9px">
          <div style="background:#fff;border:1px solid #f0f0f0;border-radius:7px;padding:10px 11px">
            <div style="font-size:.56rem;font-weight:600;margin-bottom:9px">Click Tracking</div>
            ${([['TOC Links',38],['Breadcrumb Navigation',24],['Related Posts Widget',17]] as [string,number][])
              .map(([l,v],i)=>`<div style="${i<2?'margin-bottom:7px':''}">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                  <span style="font-size:.46rem;color:#55555f">${l}</span><span style="font-size:.44rem;font-weight:600;color:#1a1a1a">${v}%</span></div>
                <div style="height:4px;background:#f2f2f5;border-radius:100px"><div style="width:${v*2}%;height:100%;background:var(--violet);border-radius:100px"></div></div></div>`).join('')}
          </div>
          <div style="background:#fff;border:1px solid #f0f0f0;border-radius:7px;padding:10px 11px">
            <div style="font-size:.56rem;font-weight:600;margin-bottom:9px">Per-Author Analytics</div>
            <div style="display:flex;font-size:.4rem;color:#aeaeb8;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding-bottom:5px;border-bottom:1px solid #f4f4f6;margin-bottom:6px">
              <span style="flex:1">Author</span><span style="width:26px;text-align:right">Posts</span><span style="width:38px;text-align:right">Views</span><span style="width:40px;text-align:right">Read %</span></div>
            ${[['#b9afee,#7c6ef0','Sarah Clarke','14','16.2k','74'],['#ded8f8,#a79aef','Marcus Webb','6','5.9k','68']]
              .map(([g,n,p,v,r],i)=>`<div style="display:flex;align-items:center;font-size:.46rem;${i<1?'margin-bottom:7px':''}">
                <span style="flex:1;min-width:0;display:flex;align-items:center;gap:5px">
                  <span style="width:15px;height:15px;border-radius:50%;background:linear-gradient(135deg,${g});flex-shrink:0"></span>
                  <span style="color:#1a1a1a;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n}</span></span>
                <span style="width:26px;text-align:right;color:#8a8a94">${p}</span>
                <span style="width:38px;text-align:right;color:#8a8a94">${v}</span>
                <span style="width:40px;text-align:right"><span style="background:rgba(16,185,129,.12);color:#0f7a58;font-weight:700;border-radius:100px;padding:1px 5px;font-size:.42rem">${r}%</span></span></div>`).join('')}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #f0f0f0;border-radius:7px;padding:9px 11px;margin-top:9px">
          <span style="width:6px;height:6px;border-radius:50%;background:#10B981;flex-shrink:0"></span>
          <span style="font-size:.54rem;font-weight:600;color:#1a1a1a">Google Analytics</span>
          <span style="font-size:.44rem;color:#0f7a58;font-weight:700;background:rgba(16,185,129,.12);border-radius:100px;padding:2px 7px">Connected</span>
          <span style="font-size:.44rem;color:#9a9aa4;font-family:ui-monospace,Menlo,monospace">G-XXXXXXXXXX</span>
          <span style="margin-left:auto;font-size:.44rem;color:#9a9aa4">Tracking: Traffic Sources <span style="color:#dcdce2">&middot;</span> Top Referrers <span style="color:#dcdce2">&middot;</span> New vs. Returning</span>
        </div>
      </div>`
  }[f.id] as string | undefined;

  if(['collection','search','toc','filters','related','crumbs','prevnext','page','time','authors','profiles','featured','sorting'].includes(f.id)) return body as string;
  if(body) return shell(body);
  // generic fallback
  return shell(`${blogNav}<div style="padding:16px 18px">
    <div class="af-hero" style="height:84px"><span style="font-size:.9rem">Finding balance in a busy creative life</span></div>
    <div style="margin-top:12px">${lines(6)}</div>
    <div class="tags"><span class="tag">Lifestyle</span><span class="tag">Creativity</span><span class="tag">Wellness</span></div></div>`);
}

const STYLES = `.bb-features{
  --violet:#5B4FE8; --violet-dk:#4a3fd4; --violet-lt:#8F86F0;
  --violet-f:rgba(91,79,232,.07); --violet-f2:rgba(91,79,232,.12);
  --black:#0a0a0a; --dark:#1a1a1a; --mid:#6b6b6b; --line:#e4e3de; --off:#f7f6f3;
  --teal:#1a7a5e; --teal-f:rgba(26,122,94,.08); --teal-lt:#3aaa86;
  --rose:#9a1a3e; --rose-f:rgba(154,26,62,.07); --rose-lt:#c44a6e;
  --amber:#7a4a1a; --amber-f:rgba(122,74,26,.07); --amber-lt:#b07040;
  --slate:#1a4a7a; --slate-f:rgba(26,74,122,.08); --slate-lt:#2a6aaa;
  --plum:#7a2d5e; --plum-f:rgba(122,45,94,.08); --plum-lt:#b0608e;
  --serif:"DM Serif Display",Georgia,serif;
}
.bb-features .fg-wrap{max-width:1160px;margin:0 auto;padding:0 16px}
.bb-features .fg-eyebrow{font-size:.6rem;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--violet);margin-bottom:14px}
.bb-features .fg-h2{font-family:var(--serif);font-size:clamp(2.2rem,4vw,3.2rem);font-weight:400;letter-spacing:-.02em;color:var(--black);line-height:1.1}
.bb-features .fg-h2 em{font-style:italic;color:var(--violet)}
@media (max-width:760px){
  .bb-features .ex-stage{padding:12px}
  .bb-features .chev.l{left:-6px}
  .bb-features .chev.r{right:-6px}
}
.bb-features .mb{border:1px solid #e6e6ec;border-radius:9px;overflow:hidden;background:#fff}
.bb-features .mb-top{background:#f0f0f4;height:26px;display:flex;align-items:center;gap:5px;padding:0 10px;border-bottom:1px solid #e6e6ec}
.bb-features .d{width:7px;height:7px;border-radius:50%}
.bb-features .d.r{background:#ff5f57}.d.y{background:#ffbd2e}.d.g{background:#28c940}
.bb-features .mb-url{flex:1;margin:0 8px;background:#e4e4ea;border-radius:3px;height:14px;display:flex;align-items:center;padding:0 7px;font-size:.5rem;color:#999}
.bb-features .bnav{display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid #f0f0f0}
.bb-features .bsite{font-family:var(--serif);font-size:.86rem;color:#1a1a1a}
.bb-features .blinks{display:flex;gap:10px}
.bb-features .blinks span{font-size:.5rem;color:#aaa;letter-spacing:.06em;text-transform:uppercase}
.bb-features .bbody{padding:14px}
.bb-features .ln{height:6px;background:#f0f0f0;border-radius:3px;margin-bottom:6px}
.bb-features .ln.m{width:82%}.ln.s{width:58%}
.bb-features .plain-img{height:62px;background:#eee;border-radius:4px;margin-bottom:12px;display:flex;align-items:center;justify-content:center}
.bb-features .plain-img::after{content:'';width:20px;height:20px;border-radius:50%;background:#ddd}
.bb-features .plain-title{font-family:var(--serif);font-size:.86rem;color:#1a1a1a;margin-bottom:10px}
.bb-features .plain-meta{font-size:.48rem;color:#aaa;letter-spacing:.09em;text-transform:uppercase;margin-bottom:8px}
.bb-features .missing{border:1px dashed #e0e0e0;border-radius:6px;padding:11px;margin-top:14px;display:flex;flex-direction:column;gap:7px}
.bb-features .missing div{font-size:.55rem;color:#c2c2c2;display:flex;align-items:center;gap:6px}
.bb-features .missing div::before{content:'';width:8px;height:8px;border:1px solid #ddd;border-radius:2px}
.bb-features .ba-badge{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);background:#fff;border:1px solid var(--line);
  border-radius:100px;padding:6px 14px;font-size:.55rem;letter-spacing:.14em;text-transform:uppercase;color:var(--mid);
  box-shadow:0 4px 14px rgba(0,0,0,.08);z-index:3;white-space:nowrap}
.bb-features .af-hero{height:56px;border-radius:5px;background:linear-gradient(135deg,#b9aef4,#8F86F0);display:flex;align-items:flex-end;padding:8px;margin-bottom:9px}
.bb-features .af-hero span{font-family:var(--serif);font-size:.62rem;color:#fff;line-height:1.2}
.bb-features .af-crumb{font-size:.46rem;color:var(--mid);padding:5px 14px;border-bottom:1px solid #f6f6f6;background:#fafafa;display:flex;gap:4px}
.bb-features .af-crumb b{color:var(--violet);font-weight:400}
.bb-features .af-prog{position:absolute;right:12px;top:5px;font-size:.46rem;color:var(--violet);font-weight:700}
.bb-features .af-grid{display:grid;grid-template-columns:1fr 92px;gap:10px}
.bb-features .toc{background:#f7f5ff;border-left:2px solid var(--violet);border-radius:4px;padding:8px;margin-bottom:9px}
.bb-features .toc-h{font-size:.46rem;font-weight:700;letter-spacing:.1em;color:var(--violet);margin-bottom:5px}
.bb-features .toc div{font-size:.5rem;color:#777;margin-bottom:3px}
.bb-features .toc div.act{color:var(--violet);font-weight:500}
.bb-features .sb-h{font-size:.44rem;font-weight:700;letter-spacing:.11em;color:#999;margin:9px 0 5px;text-transform:uppercase}
.bb-features .sb-av{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#a89cf2,#7c6ef0);margin:0 auto 5px}
.bb-features .sb-nm{font-size:.52rem;font-weight:600;text-align:center;color:#333}
.bb-features .sb-bio{font-size:.44rem;color:#999;text-align:center;line-height:1.4;margin-top:3px}
.bb-features .sb-fol{font-size:.46rem;color:var(--violet);text-align:center;margin-top:5px}
.bb-features .sb-row{display:flex;gap:5px;align-items:center;margin-bottom:5px}
.bb-features .sb-th{width:16px;height:12px;border-radius:2px;flex-shrink:0}
.bb-features .sb-tt{font-size:.44rem;color:#777;line-height:1.2}
.bb-features .sb-cat{display:flex;justify-content:space-between;font-size:.46rem;color:#888;padding:2px 0}
.bb-features .sb-cat i{font-style:normal;color:#ccc}
.bb-features .tags{display:flex;gap:4px;margin-top:8px}
.bb-features .tag{font-size:.46rem;background:var(--violet-f);color:var(--violet);padding:2px 7px;border-radius:100px}
.bb-features .rel{border-top:1px solid #f0f0f0;padding:10px 14px}
.bb-features .rel-h{font-size:.44rem;font-weight:700;letter-spacing:.11em;color:#999;text-transform:uppercase;margin-bottom:6px}
.bb-features .rel-g{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.bb-features .rel-c{border:1px solid #f2f2f2;border-radius:4px;overflow:hidden}
.bb-features .rel-i{height:18px;background:linear-gradient(135deg,#ddd6f8,#c6bcf2)}
.bb-features .rel-t{font-size:.46rem;color:#555;padding:4px;line-height:1.3}
/* ─── FEATURE GRID ─── */
.bb-features .fg{background:var(--off);padding:92px 0 100px}
.bb-features .fg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:40px;margin-bottom:56px;flex-wrap:wrap}
.bb-features .stamp{flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;width:112px;height:112px;
  border-radius:50%;background:var(--violet);color:#fff;box-shadow:0 0 0 11px rgba(91,79,232,.1),0 0 0 22px rgba(91,79,232,.05)}
.bb-features .stamp b{font-family:var(--serif);font-size:2.6rem;font-weight:400;line-height:1;letter-spacing:-.04em}
.bb-features .stamp i{font-style:normal;font-size:.5rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;opacity:.7;margin-top:2px}
.bb-features .fg-strip{position:relative;margin-top:4px}
.bb-features .fg-grid{display:flex;gap:6px;overflow-x:auto;scroll-behavior:smooth;padding:6px 2px 10px;
  scrollbar-width:none;-ms-overflow-style:none;scroll-snap-type:x proximity}
.bb-features .fg-grid::-webkit-scrollbar{display:none}
.bb-features .chev{position:absolute;top:calc(50% - 6px);transform:translateY(-50%);width:32px;height:32px;border-radius:50%;
  background:#fff;border:1px solid var(--line);box-shadow:0 3px 12px rgba(0,0,0,.12);display:flex;align-items:center;
  justify-content:center;cursor:pointer;z-index:3;padding:0;transition:opacity .18s ease,background .15s}
.bb-features .chev:hover{background:var(--off)}
.bb-features .chev svg{width:15px;height:15px;stroke:var(--dark);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.bb-features .chev.l{left:-14px}.chev.r{right:-14px}
.bb-features .chev[hidden]{display:none!important}
.bb-features .fc{flex:0 0 106px;scroll-snap-align:center;display:flex;flex-direction:column;align-items:center;gap:9px;text-align:center;
  border:1px solid transparent;border-radius:11px;background:none;cursor:pointer;font-family:inherit;padding:13px 6px 11px;
  transition:transform .15s ease,background .15s ease,border-color .15s ease,box-shadow .15s ease}
.bb-features .fc:hover{transform:translateY(-2px);background:#fdfcff}
.bb-features .fc.on{background:#fff;border-color:rgba(91,79,232,.32);box-shadow:0 3px 14px rgba(91,79,232,.14)}
.bb-features .fc.on .fc-nm{color:var(--violet);font-weight:600}
.bb-features .fc:focus-visible{outline:2px solid var(--violet);outline-offset:2px}
.bb-features .fg-hint{text-align:center;font-size:.72rem;color:#b5b3ac;font-weight:300;margin:14px 0 14px}
.bb-features .ex-pane.preview{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff;
  box-shadow:0 8px 40px rgba(0,0,0,.07)}
.bb-features .fc-ic{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s}
.bb-features .fc:hover .fc-ic,.bb-features .fc.on .fc-ic{transform:scale(1.08)}
.bb-features .fc-ic svg{width:19px;height:19px;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.bb-features .fc-nm{font-size:.62rem;font-weight:500;color:var(--dark);letter-spacing:-.005em;line-height:1.25;hyphens:auto}
.bb-features .c-layout .fc-ic{background:var(--violet-f2)} .c-layout .fc-ic svg{stroke:var(--violet)}
.bb-features .c-nav .fc-ic{background:var(--teal-f)} .c-nav .fc-ic svg{stroke:var(--teal)}
.bb-features .c-reader .fc-ic{background:var(--rose-f)} .c-reader .fc-ic svg{stroke:var(--rose)}
.bb-features .c-pub .fc-ic{background:var(--amber-f)} .c-pub .fc-ic svg{stroke:var(--amber)}
.bb-features .c-analytics .fc-ic{background:var(--slate-f)} .c-analytics .fc-ic svg{stroke:var(--slate)}
.bb-features .c-growth .fc-ic{background:var(--plum-f)} .c-growth .fc-ic svg{stroke:var(--plum)}
.bb-features .fg-foot{margin-top:40px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}
.bb-features .fg-foot p{font-size:.84rem;color:var(--mid);font-weight:300}
.bb-features .fg-foot p b{color:var(--dark);font-weight:500}
.bb-features .fg-foot a{flex-shrink:0;display:inline-flex;align-items:center;gap:8px;background:var(--violet);color:#fff;
  font-size:.82rem;font-weight:600;padding:12px 24px;border-radius:100px;text-decoration:none}
.bb-features .fg-foot a:hover{background:var(--violet-dk)}

/* ─── EXPLORER ─── */
.bb-features .ex{background:#fff;padding:92px 0}
.bb-features .ex-head{text-align:center;margin-bottom:50px}
.bb-features .ex-head p{font-size:.98rem;color:var(--mid);font-weight:300;max-width:500px;margin:14px auto 0;line-height:1.7}
.bb-features .ex-box{display:grid;grid-template-columns:270px 1fr;border:1px solid var(--line);border-radius:14px;overflow:hidden;
  box-shadow:0 8px 40px rgba(0,0,0,.07)}
.bb-features .ex-list{background:var(--off);border-right:1px solid var(--line);max-height:660px;overflow-y:auto}
.bb-features .ex-cat{padding:15px 18px 6px;font-size:.55rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#bbb;
  border-bottom:1px solid var(--line);background:var(--off)}
.bb-features .ex-item{display:flex;align-items:center;gap:11px;padding:11px 18px;cursor:pointer;border-bottom:1px solid rgba(228,227,222,.6);
  border:none;width:100%;text-align:left;background:transparent;font-family:inherit;border-bottom:1px solid rgba(228,227,222,.6)}
.bb-features .ex-item:hover{background:rgba(91,79,232,.04)}
.bb-features .ex-item.on{background:#fff;box-shadow:inset 3px 0 0 var(--violet)}
.bb-features .ex-item.on .ex-nm{color:var(--violet);font-weight:500}
.bb-features .ex-ic{width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.bb-features .ex-ic svg{width:12px;height:12px;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.bb-features .ex-tx{display:flex;flex-direction:column;gap:1px}
.bb-features .ex-tg{font-size:.48rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase}
.bb-features .ex-nm{font-size:.76rem;color:var(--dark);line-height:1.25}
.bb-features .k-layout .ex-ic{background:var(--violet-f)} .k-layout .ex-ic svg{stroke:var(--violet)} .k-layout .ex-tg{color:var(--violet-lt)}
.bb-features .k-nav .ex-ic{background:var(--teal-f)} .k-nav .ex-ic svg{stroke:var(--teal)} .k-nav .ex-tg{color:var(--teal-lt)}
.bb-features .k-reader .ex-ic{background:var(--rose-f)} .k-reader .ex-ic svg{stroke:var(--rose)} .k-reader .ex-tg{color:var(--rose-lt)}
.bb-features .k-pub .ex-ic{background:var(--amber-f)} .k-pub .ex-ic svg{stroke:var(--amber)} .k-pub .ex-tg{color:var(--amber-lt)}
.bb-features .k-analytics .ex-ic{background:var(--slate-f)} .k-analytics .ex-ic svg{stroke:var(--slate)} .k-analytics .ex-tg{color:var(--slate-lt)}
.bb-features .k-growth .ex-ic{background:var(--plum-f)} .k-growth .ex-ic svg{stroke:var(--plum)} .k-growth .ex-tg{color:var(--plum-lt)}
.bb-features .ex-pane{background:#fff;display:flex;flex-direction:column}
.bb-features .ex-ph{padding:20px 26px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:20px;align-items:flex-start}
.bb-features .ex-pn{font-family:var(--serif);font-size:1.22rem;letter-spacing:-.015em;color:var(--black);margin-bottom:5px}
.bb-features .ex-pd{font-size:.77rem;color:var(--mid);font-weight:300;line-height:1.65;max-width:460px}
.bb-features .ex-bd{flex-shrink:0;font-size:.55rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:4px 11px;border-radius:100px;white-space:nowrap}
.bb-features .b-layout{background:var(--violet-f);color:var(--violet)}
.bb-features .b-nav2{background:var(--teal-f);color:var(--teal)}
.bb-features .b-reader{background:var(--rose-f);color:var(--rose)}
.bb-features .b-pub{background:var(--amber-f);color:var(--amber)}
.bb-features .b-analytics{background:var(--slate-f);color:var(--slate)}
.bb-features .b-growth{background:var(--plum-f);color:var(--plum)}
.bb-features .ex-stage{flex:1;padding:22px;background:#f5f5f7;min-height:380px}
.bb-features .stage-mb{border:1px solid #dde;border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 10px 36px rgba(91,79,232,.11)}
.bb-features .hl{outline:2px solid var(--violet);outline-offset:2px;border-radius:5px}
.bb-features .cal{display:inline-flex;align-items:center;gap:5px;font-size:.5rem;font-weight:600;color:var(--violet);
  background:var(--violet-f);padding:3px 9px;border-radius:100px;margin-bottom:7px}`;

export function FeatureGrid() {
  const [active, setActive] = useState<string>('sidebars');
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const feature = F.find((f) => f.id === active) ?? F[0];
  const cat = CATS[feature.c];

  const sync = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= max - 4);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [sync]);

  const nudge = (dir: number) => {
    const el = stripRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(220, el.clientWidth * 0.6), behavior: 'smooth' });
  };

  const pick = (id: string, node: HTMLButtonElement) => {
    setActive(id);
    node.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  };

  const maskImage =
    !atStart && !atEnd
      ? 'linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)'
      : !atStart
        ? 'linear-gradient(90deg,transparent,#000 5%)'
        : !atEnd
          ? 'linear-gradient(90deg,#000 95%,transparent)'
          : 'none';

  return (
    <section className="bb-features fg">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="fg-wrap">
        <div className="fg-head">
          <div>
            <div className="fg-eyebrow">Under the hood</div>
            <h2 className="fg-h2">
              {numberWord(F.length)} features.
              <br />
              <em>One extension.</em>
            </h2>
          </div>
          <div className="stamp">
            <b>{F.length}</b>
            <i>Features</i>
          </div>
        </div>

        <div className="fg-strip">
          <button
            className="chev l"
            aria-label="Scroll features left"
            hidden={atStart}
            onClick={() => nudge(-1)}
          >
            <svg viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div
            className="fg-grid"
            ref={stripRef}
            onScroll={sync}
            style={{ maskImage, WebkitMaskImage: maskImage }}
          >
            {F.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`fc c-${f.c}${f.id === active ? ' on' : ''}`}
                aria-pressed={f.id === active}
                onClick={(e) => pick(f.id, e.currentTarget)}
              >
                <span className="fc-ic">
                  <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: IC[f.i] }} />
                </span>
                <span className="fc-nm">{f.s || f.n}</span>
              </button>
            ))}
          </div>
          <button
            className="chev r"
            aria-label="Scroll features right"
            hidden={atEnd}
            onClick={() => nudge(1)}
          >
            <svg viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
        <p className="fg-hint">Click any feature to see it on a real blog</p>

        <div className="ex-pane preview">
          <div className="ex-ph">
            <div>
              <div className="ex-pn">{feature.n}</div>
              <div className="ex-pd">{feature.d}</div>
            </div>
            <div className={`ex-bd ${cat.badge}`}>{cat.label}</div>
          </div>
          <div className="ex-stage" dangerouslySetInnerHTML={{ __html: stage(feature) }} />
        </div>

        <div className="fg-foot">
          <p>
            <b>Each template includes a curated set of these features.</b> Pick the template, then switch on what
            you need from your dashboard.
          </p>
          <a href="#pricing">
            See pricing
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

const WORDS: Record<number, string> = {
  20: 'Twenty', 21: 'Twenty-one', 22: 'Twenty-two', 23: 'Twenty-three',
  24: 'Twenty-four', 25: 'Twenty-five', 26: 'Twenty-six',
};
function numberWord(n: number) {
  return WORDS[n] ?? String(n);
}

export default FeatureGrid;
