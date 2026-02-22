import { Sparkles, Lock } from "lucide-react";

export function MagicLinkEmail() {
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
            Your secure login link
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "40px" }}>
          <div style={{
            textAlign: "center",
            marginBottom: "24px"
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "#f0fdf4",
              marginBottom: "16px"
            }}>
              <Lock size={32} style={{ color: "#059669" }} />
            </div>
          </div>

          <h2 style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: "24px",
            color: "#171717",
            marginTop: "0",
            marginBottom: "16px",
            textAlign: "center"
          }}>
            Sign in to BetterBlog
          </h2>
          
          <p style={{
            color: "#525252",
            fontSize: "16px",
            lineHeight: "1.6",
            margin: "0 0 16px",
            textAlign: "center"
          }}>
            Click the button below to securely access your BetterBlog dashboard. This link will expire in 15 minutes.
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
              Sign In to Your Dashboard
            </a>
          </div>

          <p style={{
            color: "#737373",
            fontSize: "14px",
            lineHeight: "1.6",
            margin: "32px 0 0",
            textAlign: "center"
          }}>
            Or copy and paste this link into your browser:
          </p>

          <div style={{
            backgroundColor: "#f5f5f5",
            padding: "12px 16px",
            borderRadius: "6px",
            marginTop: "12px",
            border: "1px solid #e5e5e5"
          }}>
            <code style={{
              color: "#525252",
              fontSize: "13px",
              wordBreak: "break-all",
              fontFamily: "'Courier Prime', monospace"
            }}>
              https://betterblog.app/auth/verify?token=abc123xyz789...
            </code>
          </div>

          {/* Security Info */}
          <div style={{
            backgroundColor: "#fef2f2",
            borderLeft: "4px solid #dc2626",
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
              🔒 Security reminder
            </p>
            <p style={{
              color: "#525252",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: "0"
            }}>
              This link is unique to you and should not be shared. It will expire in 15 minutes for your security. If you didn't request this login, you can safely ignore this email.
            </p>
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
        This email was sent to verify your login request for BetterBlog. If you didn't attempt to sign in, please contact our support team immediately.
      </p>
    </div>
  );
}
