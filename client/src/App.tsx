import { useState, useEffect } from 'react'

interface BlogConfig {
  showAuthor: boolean
  showDate: boolean
  showTableOfContents: boolean
  tableOfContentsPosition: 'left' | 'right'
  showProgressBar: boolean
  showRecentPostsSidebar: boolean
  recentPostsCount: number
  sidebarPosition: 'left' | 'right'
}

const defaultConfig: BlogConfig = {
  showAuthor: false,
  showDate: true,
  showTableOfContents: false,
  tableOfContentsPosition: 'left',
  showProgressBar: false,
  showRecentPostsSidebar: false,
  recentPostsCount: 5,
  sidebarPosition: 'left',
}

const RECENT_POSTS_OPTIONS = [3, 5, 10, 15]

type ModalStatus = 'success' | 'failure' | null

function App() {
  const [config, setConfig] = useState<BlogConfig>(defaultConfig)
  const [siteKey] = useState('demo-site-key')
  const [modalStatus, setModalStatus] = useState<ModalStatus>(null)

  useEffect(() => {
    fetch(`/api/config/${siteKey}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setConfig({
            showAuthor: Boolean(data.showAuthor),
            showDate: Boolean(data.showDate),
            showTableOfContents: Boolean(data.showTableOfContents),
            tableOfContentsPosition:
              data.tableOfContentsPosition === 'left' || data.tableOfContentsPosition === 'right'
                ? data.tableOfContentsPosition
                : 'left',
            showProgressBar: Boolean(data.showProgressBar),
            showRecentPostsSidebar: Boolean(data.showRecentPostsSidebar),
            recentPostsCount: RECENT_POSTS_OPTIONS.includes(data.recentPostsCount)
              ? data.recentPostsCount
              : 5,
            sidebarPosition:
              data.sidebarPosition === 'left' || data.sidebarPosition === 'right'
                ? data.sidebarPosition
                : 'left',
          })
        }
      })
      .catch(() => {})
  }, [siteKey])

  const handleSave = async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteKey, config }),
      })
      setModalStatus(response.ok ? 'success' : 'failure')
    } catch (error) {
      console.error('Failed to save config:', error)
      setModalStatus('failure')
    }
  }

  return (
    <div className="app">
      {modalStatus && (
        <div className="modal-overlay" onClick={() => setModalStatus(null)}>
          <div className={`modal modal--${modalStatus}`} onClick={(e) => e.stopPropagation()}>
            <h3>{modalStatus === 'success' ? 'Success' : 'Error'}</h3>
            <p>
              {modalStatus === 'success'
                ? 'Configuration saved!'
                : 'Failed to save configuration. Please try again.'}
            </p>
            <button
              className="modal-btn"
              onClick={() => setModalStatus(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}
      <header>
        <h1>Squarespace Blog Configurator</h1>
        <p>Customize your blog layout and paste the script into Squarespace Code Injection</p>
      </header>

      <main>
        <section className="config-section">
          <h2>Layout Settings</h2>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={config.showAuthor}
                onChange={(e) => setConfig({ ...config, showAuthor: e.target.checked })}
              />
              Show Author
            </label>
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={config.showDate}
                onChange={(e) => setConfig({ ...config, showDate: e.target.checked })}
              />
              Show Date
            </label>
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={config.showTableOfContents}
                onChange={(e) => setConfig({ ...config, showTableOfContents: e.target.checked })}
              />
              Table of Contents
            </label>
          </div>

          {config.showTableOfContents && (
            <div className="form-group">
              <label>Table of Contents position</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="tableOfContentsPosition"
                    value="left"
                    checked={config.tableOfContentsPosition === 'left'}
                    onChange={() => setConfig({ ...config, tableOfContentsPosition: 'left' })}
                  />
                  Left
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="tableOfContentsPosition"
                    value="right"
                    checked={config.tableOfContentsPosition === 'right'}
                    onChange={() => setConfig({ ...config, tableOfContentsPosition: 'right' })}
                  />
                  Right
                </label>
              </div>
            </div>
          )}

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={config.showProgressBar}
                onChange={(e) => setConfig({ ...config, showProgressBar: e.target.checked })}
              />
              Progress Bar
            </label>
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={config.showRecentPostsSidebar}
                onChange={(e) => setConfig({ ...config, showRecentPostsSidebar: e.target.checked })}
              />
              Recent Posts Sidebar
            </label>
          </div>

          {config.showRecentPostsSidebar && (
            <div className="form-group">
              <label htmlFor="recentPostsCount">Number of recent posts</label>
              <select
                id="recentPostsCount"
                value={config.recentPostsCount}
                onChange={(e) =>
                  setConfig({ ...config, recentPostsCount: parseInt(e.target.value, 10) })
                }
              >
                {RECENT_POSTS_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Sidebar position</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="sidebarPosition"
                  value="left"
                  checked={config.sidebarPosition === 'left'}
                  onChange={() => setConfig({ ...config, sidebarPosition: 'left' })}
                />
                Left
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="sidebarPosition"
                  value="right"
                  checked={config.sidebarPosition === 'right'}
                  onChange={() => setConfig({ ...config, sidebarPosition: 'right' })}
                />
                Right
              </label>
            </div>
          </div>

          <button onClick={handleSave} className="save-btn">
            Save Configuration
          </button>
        </section>

        <section className="code-section">
          <h2>Installation Code</h2>
          <p>Paste this into Squarespace Code Injection (Settings → Advanced → Code Injection):</p>
          <pre>
            <code>{`<script src="https://your-domain.com/loader.js" data-site-key="${siteKey}"></script>`}</code>
          </pre>
        </section>
      </main>
    </div>
  )
}

export default App
