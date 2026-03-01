export function BeforeAfterComparison() {
    return (
      <div className="w-full bg-white">
        <style dangerouslySetInnerHTML={{ __html: `
          .ba-comparison-wrapper {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-top: 1px solid #e4e3de;
            position: relative;
            min-height: 580px;
            font-family: 'DM Sans', -apple-system, sans-serif;
          }
  
          .ba-split-divider {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            z-index: 10;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0;
          }
          .ba-divider-line {
            width: 1px;
            height: 80px;
            background: linear-gradient(to bottom, transparent, #e4e3de);
          }
          .ba-divider-line.bottom {
            background: linear-gradient(to bottom, #e4e3de, transparent);
          }
          .ba-divider-pill {
            background: white;
            border: 1px solid #e4e3de;
            border-radius: 100px;
            padding: 6px 14px;
            font-size: 0.6rem;
            font-weight: 600;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #6b6b6b;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          }
  
          .ba-side-before {
            background: #fafafa;
            padding: 32px 28px;
            display: flex;
            flex-direction: column;
            gap: 0;
            position: relative;
          }
          .ba-side-before-label {
            position: absolute;
            top: 16px;
            left: 20px;
            font-size: 0.6rem;
            font-weight: 600;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #bbb;
          }
  
          .ba-browser {
            border-radius: 8px 8px 0 0;
            overflow: hidden;
            border: 1px solid #e0e0e0;
            border-bottom: none;
            box-shadow: 0 4px 24px rgba(0,0,0,0.07);
            flex: 1;
            display: flex;
            flex-direction: column;
            margin-top: 28px;
          }
          .ba-browser-chrome {
            background: #f0f0f0;
            height: 34px;
            display: flex;
            align-items: center;
            padding: 0 12px;
            gap: 6px;
            border-bottom: 1px solid #e0e0e0;
            flex-shrink: 0;
          }
          .ba-chrome-dot { width: 9px; height: 9px; border-radius: 50%; }
          .ba-chrome-dot.red { background: #ff5f57; }
          .ba-chrome-dot.yellow { background: #ffbd2e; }
          .ba-chrome-dot.green { background: #28c940; }
          .ba-browser-url {
            flex: 1;
            margin: 0 10px;
            background: #e4e4e4;
            border-radius: 4px;
            height: 18px;
            display: flex;
            align-items: center;
            padding: 0 10px;
            font-size: 0.6rem;
            color: #999;
            letter-spacing: 0.02em;
          }
          .ba-browser-body {
            background: white;
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
  
          .ba-blog-before {
            padding: 24px 28px;
            flex: 1;
          }
          .ba-bb-nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 16px;
            border-bottom: 1px solid #f0f0f0;
            margin-bottom: 20px;
          }
          .ba-bb-site-name {
            font-family: 'DM Serif Display', serif;
            font-size: 0.9rem;
            color: #333;
          }
          .ba-bb-nav-links {
            display: flex;
            gap: 16px;
          }
          .ba-bb-nav-links span {
            font-size: 0.6rem;
            color: #aaa;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          }
          .ba-bb-hero-img {
            width: 100%;
            height: 90px;
            background: #e8e8e8;
            border-radius: 2px;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .ba-bb-hero-img-inner {
            width: 32px;
            height: 32px;
            background: #d0d0d0;
            border-radius: 50%;
          }
          .ba-bb-post-meta {
            font-size: 0.58rem;
            color: #bbb;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          .ba-bb-post-title {
            font-family: 'DM Serif Display', serif;
            font-size: 1rem;
            color: #1a1a1a;
            line-height: 1.3;
            margin-bottom: 10px;
          }
          .ba-bb-body-line {
            height: 7px;
            background: #f0f0f0;
            border-radius: 4px;
            margin-bottom: 6px;
          }
          .ba-bb-body-line.short { width: 65%; }
          .ba-bb-body-line.med { width: 82%; }
          .ba-bb-no-features {
            margin-top: 16px;
            padding: 10px 12px;
            background: #fafafa;
            border: 1px dashed #e0e0e0;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            gap: 5px;
          }
          .ba-bb-missing {
            font-size: 0.58rem;
            color: #ccc;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .ba-bb-missing-icon {
            width: 12px;
            height: 12px;
            border: 1px solid #ddd;
            border-radius: 2px;
            flex-shrink: 0;
          }
  
          .ba-side-after {
            background: white;
            padding: 32px 28px;
            display: flex;
            flex-direction: column;
            position: relative;
            border-left: 1px solid #e4e3de;
          }
          .ba-side-after-label {
            position: absolute;
            top: 16px;
            right: 20px;
            font-size: 0.6rem;
            font-weight: 600;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #5B4FE8;
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .ba-side-after-label::before {
            content: '✦';
            font-size: 0.5rem;
          }
  
          .ba-blog-after {
            padding: 0;
            flex: 1;
            display: flex;
            flex-direction: column;
          }
  
          .ba-ba-nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid #e4e3de;
            margin-bottom: 0;
          }
          .ba-ba-site-name {
            font-family: 'DM Serif Display', serif;
            font-size: 0.9rem;
            color: #0a0a0a;
          }
          .ba-ba-nav-links {
            display: flex;
            gap: 14px;
          }
          .ba-ba-nav-links span {
            font-size: 0.58rem;
            color: #6b6b6b;
            letter-spacing: 0.05em;
          }
  
          .ba-ba-progress {
            height: 2px;
            background: #e4e3de;
            position: relative;
          }
          .ba-ba-progress-fill {
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 38%;
            background: #5B4FE8;
            border-radius: 0 2px 2px 0;
          }
          .ba-ba-progress-label {
            position: absolute;
            right: 8px;
            top: 4px;
            font-size: 0.52rem;
            color: #5B4FE8;
            font-weight: 600;
          }
  
          .ba-ba-breadcrumb {
            padding: 6px 16px;
            font-size: 0.55rem;
            color: #6b6b6b;
            display: flex;
            gap: 5px;
            align-items: center;
            border-bottom: 1px solid #f7f6f3;
          }
          .ba-ba-breadcrumb-sep { color: #e4e3de; }
          .ba-ba-breadcrumb-active { color: #5B4FE8; }
  
          .ba-ba-layout {
            display: grid;
            grid-template-columns: 1fr 110px;
            gap: 0;
            flex: 1;
          }
  
          .ba-ba-main {
            padding: 14px 14px 14px 16px;
            border-right: 1px solid #f7f6f3;
          }
          .ba-ba-hero-img {
            width: 100%;
            height: 70px;
            background: linear-gradient(135deg, #e8e4f8 0%, #c8c0f0 100%);
            border-radius: 4px;
            margin-bottom: 10px;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: flex-end;
            padding: 8px 10px;
          }
          .ba-ba-hero-img::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(91,79,232,0.35), transparent);
          }
          .ba-ba-hero-img-title {
            position: relative;
            font-family: 'DM Serif Display', serif;
            font-size: 0.72rem;
            color: white;
            line-height: 1.2;
          }
  
          .ba-ba-author {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 8px;
          }
          .ba-ba-author-avatar {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: linear-gradient(135deg, #8F86F0, #5B4FE8);
            flex-shrink: 0;
          }
          .ba-ba-author-name {
            font-size: 0.56rem;
            color: #6b6b6b;
            font-weight: 500;
          }
          .ba-ba-author-sep {
            color: #e4e3de;
            font-size: 0.5rem;
          }
          .ba-ba-author-date {
            font-size: 0.54rem;
            color: #e4e3de;
          }
  
          .ba-ba-toc {
            background: rgba(91,79,232,0.07);
            border-left: 2px solid #5B4FE8;
            border-radius: 0 4px 4px 0;
            padding: 7px 10px;
            margin-bottom: 10px;
          }
          .ba-ba-toc-label {
            font-size: 0.52rem;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #5B4FE8;
            margin-bottom: 5px;
          }
          .ba-ba-toc-item {
            font-size: 0.55rem;
            color: #6b6b6b;
            padding: 2px 0;
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .ba-ba-toc-item.active {
            color: #5B4FE8;
            font-weight: 500;
          }
          .ba-ba-toc-dot {
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: currentColor;
            flex-shrink: 0;
          }
  
          .ba-ba-body-line {
            height: 6px;
            background: #f7f6f3;
            border-radius: 4px;
            margin-bottom: 5px;
          }
          .ba-ba-body-line.short { width: 62%; }
          .ba-ba-body-line.med { width: 80%; }
  
          .ba-ba-tags {
            display: flex;
            gap: 4px;
            margin-top: 10px;
            flex-wrap: wrap;
          }
          .ba-ba-tag {
            font-size: 0.5rem;
            font-weight: 500;
            color: #5B4FE8;
            background: rgba(91,79,232,0.07);
            border: 1px solid rgba(91,79,232,0.15);
            padding: 2px 7px;
            border-radius: 100px;
            letter-spacing: 0.06em;
          }
  
          .ba-ba-sidebar {
            padding: 14px 10px;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
  
          .ba-sb-widget {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }
          .ba-sb-widget-label {
            font-size: 0.5rem;
            font-weight: 600;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #0a0a0a;
            padding-bottom: 4px;
            border-bottom: 1px solid #e4e3de;
            margin-bottom: 2px;
          }
          .ba-sb-post-item {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .ba-sb-post-thumb {
            width: 22px;
            height: 18px;
            border-radius: 2px;
            background: #f7f6f3;
            flex-shrink: 0;
          }
          .ba-sb-post-title {
            font-size: 0.52rem;
            color: #1a1a1a;
            line-height: 1.3;
          }
  
          .ba-sb-cat {
            font-size: 0.52rem;
            color: #6b6b6b;
            padding: 2px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .ba-sb-cat-count {
            font-size: 0.48rem;
            color: #e4e3de;
            background: #f7f6f3;
            padding: 1px 5px;
            border-radius: 100px;
          }
  
          .ba-ba-related {
            padding: 10px 16px;
            border-top: 1px solid #f7f6f3;
          }
          .ba-ba-related-label {
            font-size: 0.52rem;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #0a0a0a;
            margin-bottom: 6px;
          }
          .ba-ba-related-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
          }
          .ba-ba-related-card {
            background: #f7f6f3;
            border-radius: 3px;
            padding: 6px 7px;
          }
          .ba-ba-related-thumb {
            width: 100%;
            height: 22px;
            background: #e8e4f8;
            border-radius: 2px;
            margin-bottom: 4px;
          }
          .ba-ba-related-title {
            font-size: 0.52rem;
            color: #1a1a1a;
            line-height: 1.3;
          }
          .ba-ba-related-meta {
            font-size: 0.48rem;
            color: #e4e3de;
            margin-top: 2px;
          }
  
          .ba-proof-strip {
            border-top: 1px solid #e4e3de;
            padding: 20px 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 48px;
            background: white;
          }
          .ba-proof-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
          }
          .ba-proof-num {
            font-family: 'DM Serif Display', serif;
            font-size: 1.4rem;
            font-weight: 400;
            color: #0a0a0a;
            letter-spacing: -0.02em;
          }
          .ba-proof-label {
            font-size: 0.62rem;
            color: #6b6b6b;
            font-weight: 300;
            letter-spacing: 0.04em;
          }
          .ba-proof-sep {
            width: 1px;
            height: 32px;
            background: #e4e3de;
          }
        `}} />
  
        <div className="ba-comparison-wrapper">
          {/* Divider */}
          <div className="ba-split-divider">
            <div className="ba-divider-line"></div>
            <div className="ba-divider-pill">Before / After</div>
            <div className="ba-divider-line bottom"></div>
          </div>
  
          {/* LEFT: Before */}
          <div className="ba-side-before">
            <div className="ba-side-before-label">Plain Squarespace</div>
            <div className="ba-browser">
              <div className="ba-browser-chrome">
                <div className="ba-chrome-dot red"></div>
                <div className="ba-chrome-dot yellow"></div>
                <div className="ba-chrome-dot green"></div>
                <div className="ba-browser-url">yoursite.squarespace.com/blog/post-title</div>
              </div>
              <div className="ba-browser-body">
                <div className="ba-blog-before">
                  <div className="ba-bb-nav">
                    <div className="ba-bb-site-name">Sarah Clarke</div>
                    <div className="ba-bb-nav-links">
                      <span>ABOUT</span><span>BLOG</span><span>CONTACT</span>
                    </div>
                  </div>
                  <div className="ba-bb-hero-img">
                    <div className="ba-bb-hero-img-inner"></div>
                  </div>
                  <div className="ba-bb-post-meta">Mar 12, 2026 &nbsp;·&nbsp; Sarah Clarke</div>
                  <div className="ba-bb-post-title">Finding balance in a busy creative life</div>
                  <div className="ba-bb-body-line"></div>
                  <div className="ba-bb-body-line med"></div>
                  <div className="ba-bb-body-line short"></div>
                  <div className="ba-bb-body-line"></div>
                  <div className="ba-bb-body-line med"></div>
  
                  <div className="ba-bb-no-features">
                    <div className="ba-bb-missing"><div className="ba-bb-missing-icon"></div>No sidebar</div>
                    <div className="ba-bb-missing"><div className="ba-bb-missing-icon"></div>No table of contents</div>
                    <div className="ba-bb-missing"><div className="ba-bb-missing-icon"></div>No reading progress</div>
                    <div className="ba-bb-missing"><div className="ba-bb-missing-icon"></div>No related posts</div>
                    <div className="ba-bb-missing"><div className="ba-bb-missing-icon"></div>No author profile</div>
                    <div className="ba-bb-missing"><div className="ba-bb-missing-icon"></div>No category filters</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          {/* RIGHT: After */}
          <div className="ba-side-after">
            <div className="ba-side-after-label">With BetterBlog</div>
            <div className="ba-browser">
              <div className="ba-browser-chrome">
                <div className="ba-chrome-dot red"></div>
                <div className="ba-chrome-dot yellow"></div>
                <div className="ba-chrome-dot green"></div>
                <div className="ba-browser-url">yoursite.squarespace.com/blog/post-title</div>
              </div>
              <div className="ba-browser-body">
                <div className="ba-blog-after">
                  <div className="ba-ba-nav">
                    <div className="ba-ba-site-name">Sarah Clarke</div>
                    <div className="ba-ba-nav-links">
                      <span>About</span><span>Blog</span><span>Contact</span>
                    </div>
                  </div>
  
                  <div className="ba-ba-progress">
                    <div className="ba-ba-progress-fill"></div>
                    <div className="ba-ba-progress-label">38%</div>
                  </div>
  
                  <div className="ba-ba-breadcrumb">
                    <span>Home</span>
                    <span className="ba-ba-breadcrumb-sep">›</span>
                    <span>Blog</span>
                    <span className="ba-ba-breadcrumb-sep">›</span>
                    <span className="ba-ba-breadcrumb-active">Finding balance in a busy creative life</span>
                  </div>
  
                  <div className="ba-ba-layout">
                    <div className="ba-ba-main">
                      <div className="ba-ba-hero-img">
                        <div className="ba-ba-hero-img-title">Finding balance in a<br />busy creative life</div>
                      </div>
  
                      <div className="ba-ba-author">
                        <div className="ba-ba-author-avatar"></div>
                        <span className="ba-ba-author-name">Sarah Clarke</span>
                        <span className="ba-ba-author-sep">·</span>
                        <span className="ba-ba-author-date">Mar 12, 2026</span>
                      </div>
  
                      <div className="ba-ba-toc">
                        <div className="ba-ba-toc-label">Contents</div>
                        <div className="ba-ba-toc-item"><div className="ba-ba-toc-dot"></div>Introduction</div>
                        <div className="ba-ba-toc-item active"><div className="ba-ba-toc-dot"></div>Finding your rhythm</div>
                        <div className="ba-ba-toc-item"><div className="ba-ba-toc-dot"></div>The tools that help</div>
                        <div className="ba-ba-toc-item"><div className="ba-ba-toc-dot"></div>Final thoughts</div>
                      </div>
  
                      <div className="ba-ba-body-line"></div>
                      <div className="ba-ba-body-line med"></div>
                      <div className="ba-ba-body-line short"></div>
                      <div className="ba-ba-body-line"></div>
  
                      <div className="ba-ba-tags">
                        <div className="ba-ba-tag">Lifestyle</div>
                        <div className="ba-ba-tag">Creativity</div>
                        <div className="ba-ba-tag">Wellness</div>
                      </div>
                    </div>
  
                    <div className="ba-ba-sidebar">
                      <div className="ba-sb-widget">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '5px', padding: '8px 4px 10px', borderBottom: '1px solid #e4e3de' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #8F86F0, #5B4FE8)', flexShrink: 0 }}></div>
                          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '0.62rem', color: '#0a0a0a', lineHeight: 1.2 }}>Sarah Clarke</div>
                          <div style={{ fontSize: '0.5rem', color: '#6b6b6b', lineHeight: 1.5, fontWeight: 300 }}>Writer & creative living in Portland. Sharing slow mornings, honest work & the art of paying attention.</div>
                          <div style={{ fontSize: '0.5rem', fontWeight: 600, color: '#5B4FE8', letterSpacing: '0.08em', marginTop: '2px' }}>Follow →</div>
                        </div>
                      </div>
                      <div className="ba-sb-widget">
                        <div className="ba-sb-widget-label">Recent</div>
                        <div className="ba-sb-post-item">
                          <div className="ba-sb-post-thumb"></div>
                          <div className="ba-sb-post-title">My morning ritual</div>
                        </div>
                        <div className="ba-sb-post-item">
                          <div className="ba-sb-post-thumb"></div>
                          <div className="ba-sb-post-title">On slow living</div>
                        </div>
                        <div className="ba-sb-post-item">
                          <div className="ba-sb-post-thumb"></div>
                          <div className="ba-sb-post-title">The edit method</div>
                        </div>
                      </div>
                      <div className="ba-sb-widget">
                        <div className="ba-sb-widget-label">Categories</div>
                        <div className="ba-sb-cat">Lifestyle <span className="ba-sb-cat-count">14</span></div>
                        <div className="ba-sb-cat">Creativity <span className="ba-sb-cat-count">9</span></div>
                        <div className="ba-sb-cat">Travel <span className="ba-sb-cat-count">7</span></div>
                        <div className="ba-sb-cat">Wellness <span className="ba-sb-cat-count">5</span></div>
                      </div>
                    </div>
                  </div>
  
                  <div className="ba-ba-related">
                    <div className="ba-ba-related-label">Related Posts</div>
                    <div className="ba-ba-related-grid">
                      <div className="ba-ba-related-card">
                        <div className="ba-ba-related-thumb"></div>
                        <div className="ba-ba-related-title">My morning ritual and why it works</div>
                        <div className="ba-ba-related-meta">5 min read</div>
                      </div>
                      <div className="ba-ba-related-card">
                        <div className="ba-ba-related-thumb"></div>
                        <div className="ba-ba-related-title">The case for slow living</div>
                        <div className="ba-ba-related-meta">4 min read</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <div className="ba-proof-strip">
          <div className="ba-proof-item">
            <div className="ba-proof-num">12+</div>
            <div className="ba-proof-label">Pro blogging features</div>
          </div>
          <div className="ba-proof-sep"></div>
          <div className="ba-proof-item">
            <div className="ba-proof-num">1</div>
            <div className="ba-proof-label">Extension. That's it.</div>
          </div>
          <div className="ba-proof-sep"></div>
          <div className="ba-proof-item">
            <div className="ba-proof-num">0</div>
            <div className="ba-proof-label">Lines of code required</div>
          </div>
          <div className="ba-proof-sep"></div>
          <div className="ba-proof-item">
            <div className="ba-proof-num">∞</div>
            <div className="ba-proof-label">Better than before</div>
          </div>
        </div>
      </div>
    );
  }
  