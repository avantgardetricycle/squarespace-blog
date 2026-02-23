import ReactDOM from 'react-dom/client';
import { BlogFeed } from './BlogFeed';

interface Config {
  blogPath?: string;
  [key: string]: unknown;
}

async function mount({ config }: { config: Config }) {
  const root = document.getElementById('blog-root');
  if (!root) return;

  const blogPath = config.blogPath ?? '/blog';

  const res = await fetch(`${blogPath}?format=json`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Failed to load blog JSON: ${res.status}`);

  const data = await res.json();

  ReactDOM.createRoot(root).render(<BlogFeed data={data} config={config} />);
}

// Expose mount globally for the loader
(window as any).mount = mount;
