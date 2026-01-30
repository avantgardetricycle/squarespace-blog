import { useState } from 'react'

interface BlogConfig {
  layout: 'grid' | 'list' | 'masonry'
  postsPerPage: number
  showExcerpt: boolean
  showDate: boolean
  showAuthor: boolean
}

const defaultConfig: BlogConfig = {
  layout: 'grid',
  postsPerPage: 9,
  showExcerpt: true,
  showDate: true,
  showAuthor: false,
}

function App() {
  const [config, setConfig] = useState<BlogConfig>(defaultConfig)
  const [token] = useState('demo-token-123')

  const handleSave = async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, config }),
      })
      if (response.ok) {
        alert('Configuration saved!')
      }
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Squarespace Blog Configurator</h1>
        <p>Customize your blog layout and paste the script into Squarespace Code Injection</p>
      </header>

      <main>
        <section className="config-section">
          <h2>Layout Settings</h2>

          <div className="form-group">
            <label htmlFor="layout">Layout Style</label>
            <select
              id="layout"
              value={config.layout}
              onChange={(e) => setConfig({ ...config, layout: e.target.value as BlogConfig['layout'] })}
            >
              <option value="grid">Grid</option>
              <option value="list">List</option>
              <option value="masonry">Masonry</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="postsPerPage">Posts Per Page</label>
            <input
              id="postsPerPage"
              type="number"
              min="1"
              max="50"
              value={config.postsPerPage}
              onChange={(e) => setConfig({ ...config, postsPerPage: parseInt(e.target.value) || 9 })}
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={config.showExcerpt}
                onChange={(e) => setConfig({ ...config, showExcerpt: e.target.checked })}
              />
              Show Excerpt
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
                checked={config.showAuthor}
                onChange={(e) => setConfig({ ...config, showAuthor: e.target.checked })}
              />
              Show Author
            </label>
          </div>

          <button onClick={handleSave} className="save-btn">
            Save Configuration
          </button>
        </section>

        <section className="code-section">
          <h2>Installation Code</h2>
          <p>Paste this into Squarespace Code Injection (Settings → Advanced → Code Injection):</p>
          <pre>
            <code>{`<script src="https://your-domain.com/loader.js" data-token="${token}"></script>`}</code>
          </pre>
        </section>
      </main>
    </div>
  )
}

export default App
