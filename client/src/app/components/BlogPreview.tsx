import { cn } from "@/app/components/ui/utils";
import { format } from "date-fns";

export interface BlogConfig {
  typography: {
    fontFamily: string;
    headingFont: string;
    baseSize: number;
  };
  colors: {
    accent: string;
    background: string;
    text: string;
    cardBg: string;
  };
  layout: {
    gridColumns: number;
    gap: number;
    showAuthor: boolean;
    showDate: boolean;
    cardStyle: 'minimal' | 'bordered' | 'shadow';
  };
}

interface BlogPreviewProps {
  config: BlogConfig;
}

const posts = [
  {
    id: 1,
    title: "The Future of Web Design",
    excerpt: "Exploring the latest trends in web design, from AI-generated layouts to immersive 3D experiences.",
    author: "Sarah Jenkins",
    date: new Date(2023, 10, 15),
    category: "Design",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 2,
    title: "Mastering React Hooks",
    excerpt: "A deep dive into React's most powerful feature. Learn how to manage state and side effects effectively.",
    author: "David Chen",
    date: new Date(2023, 10, 12),
    category: "Development",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 3,
    title: "Sustainable Architecture",
    excerpt: "How modern architects are incorporating eco-friendly materials and energy-efficient designs.",
    author: "Elena Rodriguez",
    date: new Date(2023, 10, 10),
    category: "Architecture",
    image: "https://images.unsplash.com/photo-1518005052357-e98719a07932?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 4,
    title: "The Art of Coffee",
    excerpt: "From bean to cup: understanding the complex journey of your morning brew.",
    author: "Michael Chang",
    date: new Date(2023, 10, 8),
    category: "Lifestyle",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800"
  },
];

export default function BlogPreview({ config }: BlogPreviewProps) {
  const { typography, colors, layout } = config;

  const containerStyle = {
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: typography.fontFamily,
  } as React.CSSProperties;

  const cardStyle = {
    backgroundColor: colors.cardBg,
    borderColor: layout.cardStyle === 'bordered' ? colors.text : 'transparent',
    boxShadow: layout.cardStyle === 'shadow' ? '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' : 'none',
  } as React.CSSProperties;

  return (
    <div 
      className="w-full h-full min-h-screen p-8 transition-colors duration-300"
      style={containerStyle}
    >
      <header className="mb-12 text-center">
        <h1 
          className="text-4xl font-bold mb-4"
          style={{ fontFamily: typography.headingFont, color: colors.accent }}
        >
          My Creative Space
        </h1>
        <p className="opacity-80 max-w-2xl mx-auto">
          Thoughts, stories, and ideas from the creative frontier.
        </p>
      </header>

      <div 
        className="grid gap-8 max-w-6xl mx-auto"
        style={{ 
          gridTemplateColumns: `repeat(${layout.gridColumns}, minmax(0, 1fr))`,
          gap: `${layout.gap}px`
        }}
      >
        {posts.map((post) => (
          <article 
            key={post.id} 
            className={cn(
              "overflow-hidden transition-all duration-300",
              layout.cardStyle === 'bordered' && "border rounded-lg",
              layout.cardStyle === 'shadow' && "rounded-lg",
              layout.cardStyle === 'minimal' && "border-b pb-8 last:border-0"
            )}
            style={cardStyle}
          >
            <div className="aspect-video overflow-hidden mb-4 rounded-md">
              <img 
                src={post.image} 
                alt={post.title} 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            
            <div className={cn("space-y-3", layout.cardStyle !== 'minimal' && "p-4")}>
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider opacity-60">
                <span style={{ color: colors.accent }}>{post.category}</span>
                {layout.showDate && <span>{format(post.date, "MMM d, yyyy")}</span>}
              </div>
              
              <h2 
                className="text-xl font-bold leading-tight hover:underline cursor-pointer"
                style={{ fontFamily: typography.headingFont }}
              >
                {post.title}
              </h2>
              
              <p className="text-sm opacity-80 leading-relaxed">
                {post.excerpt}
              </p>
              
              {layout.showAuthor && (
                <div className="pt-4 flex items-center gap-3 text-sm font-medium">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: colors.accent }}
                  >
                    {post.author.charAt(0)}
                  </div>
                  <span>{post.author}</span>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
