import { Sparkles } from "lucide-react";

export function InviteEmail() {
  return (
    <div style={{
      fontFamily: "'Karla', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      backgroundColor: "#f5f5f5",
      padding: "40px 20px"
    }}>
      <div style={{
        maxWidth: "600px",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #059669 100%)",
          padding: "40px 40px 32px",
          textAlign: "center"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "16px"
          }}>
            <Sparkles 
              size={32} 
              style={{ color: "#ffffff" }}
            />
            <h1 style={{
              fontFamily: "'Courier Prime', monospace",
              fontSize: "32px",
              fontWeight: "700",
              color: "#ffffff",
              margin: "0",
              lineHeight: "1"
            }}>
              BetterBlog
            </h1>
          </div>
          <p style={{
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: "16px",
            margin: "0"
          }}>
            Welcome to your blogging upgrade
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "40px" }}>
          <h2 style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: "24px",
            color: "#171717",
            marginTop: "0",
            marginBottom: "16px"
          }}>
            🎉 Your subscription is active!
          </h2>
          
          <p style={{
            color: "#525252",
            fontSize: "16px",
            lineHeight: "1.6",
            margin: "0 0 16px"
          }}>
            Thanks for subscribing to BetterBlog! We're excited to help you take your Squarespace blog to the next level with powerful customization options.
          </p>

          <p style={{
            color: "#525252",
            fontSize: "16px",
            lineHeight: "1.6",
            margin: "0 0 32px"
          }}>
            Click the button below to access your dashboard and start customizing your blog. No password needed — we'll send you a magic link whenever you need to sign in.
          </p>

          {/* CTA Button */}
          <div style={{ textAlign: "center", margin: "32px 0" }}>
            <a 
              href="#"
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #1e3a8a 0%, #059669 100%)",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "600",
                padding: "14px 32px",
                borderRadius: "8px",
                textDecoration: "none",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
              }}
            >
              Get Started with BetterBlog
            </a>
          </div>

          {/* Info Box */}
          <div style={{
            backgroundColor: "#f5f5f5",
            borderLeft: "4px solid #059669",
            padding: "16px 20px",
            marginTop: "32px",
            borderRadius: "4px"
          }}>
            <p style={{
              color: "#171717",
              fontSize: "14px",
              fontWeight: "600",
              margin: "0 0 8px"
            }}>
              What's next?
            </p>
            <ul style={{
              color: "#525252",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: "0",
              paddingLeft: "20px"
            }}>
              <li>Access your personalized dashboard</li>
              <li>Configure your blog settings with live preview</li>
              <li>See changes update in real-time</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          backgroundColor: "#f5f5f5",
          padding: "24px 40px",
          borderTop: "1px solid #e5e5e5"
        }}>
          <p style={{
            color: "#737373",
            fontSize: "13px",
            lineHeight: "1.6",
            margin: "0 0 8px",
            textAlign: "center"
          }}>
            Need help? Reply to this email or visit our support center.
          </p>
          <p style={{
            color: "#a3a3a3",
            fontSize: "12px",
            margin: "0",
            textAlign: "center"
          }}>
            © 2024 BetterBlog. All rights reserved.
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <p style={{
        color: "#737373",
        fontSize: "12px",
        textAlign: "center",
        marginTop: "24px",
        maxWidth: "600px",
        margin: "24px auto 0"
      }}>
        This email was sent because a subscription was created for your email address. If you didn't sign up for BetterBlog, please contact our support team.
      </p>
    </div>
  );
}
