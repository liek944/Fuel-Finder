import React, { useState } from "react";
import { Link } from "react-router-dom";

interface FormData {
  name: string;
  email: string;
  message: string;
  subscribeNewsletter: boolean;
}

const Contact: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    message: "",
    subscribeNewsletter: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    // Simulate form submission (replace with actual API call)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Form submitted:", formData);
      setSubmitStatus("success");
      setFormData({ name: "", email: "", message: "", subscribeNewsletter: false });
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    fontSize: 16,
    border: "1px solid #ddd",
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
    color: "#333",
  };

  return (
    <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", lineHeight: 1.6 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <img src="/logo.jpeg" alt="Fuel Finder" style={{ width: 40, height: 40, borderRadius: 8 }} />
        <h1 style={{ margin: 0 }}>Contact Us</h1>
      </header>

      <p>
        We welcome your feedback, suggestions, and contributions to help make Fuel Finder
        better for everyone in Oriental Mindoro. Whether you have station updates, found
        an error, or just want to share your thoughts, we'd love to hear from you!
      </p>

      {/* Contact Form Section */}
      <div
        style={{
          background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
          borderRadius: 16,
          padding: 32,
          marginTop: 32,
          marginBottom: 32,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#1976D2", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 24 }}>✉️</span> Send Us a Message
        </h2>
        <p style={{ color: "#666", marginBottom: 24 }}>
          Fill out the form below and we'll get back to you as soon as possible.
        </p>

        {submitStatus === "success" && (
          <div
            style={{
              background: "#d4edda",
              color: "#155724",
              padding: 16,
              borderRadius: 8,
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 20 }}>✅</span>
            Thank you for your message! We'll respond soon.
          </div>
        )}

        {submitStatus === "error" && (
          <div
            style={{
              background: "#f8d7da",
              color: "#721c24",
              padding: 16,
              borderRadius: 8,
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 20 }}>❌</span>
            Something went wrong. Please try again.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="name" style={labelStyle}>
              Your Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="John Doe"
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = "#1976D2";
                e.target.style.boxShadow = "0 0 0 3px rgba(25, 118, 210, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#ddd";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="email" style={labelStyle}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="you@example.com"
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = "#1976D2";
                e.target.style.boxShadow = "0 0 0 3px rgba(25, 118, 210, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#ddd";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="message" style={labelStyle}>
              Message
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              required
              placeholder="Tell us about your feedback, suggestions, or report an issue..."
              rows={5}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: 120,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#1976D2";
                e.target.style.boxShadow = "0 0 0 3px rgba(25, 118, 210, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#ddd";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Newsletter Subscription */}
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
              border: "1px solid #e0e0e0",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                name="subscribeNewsletter"
                checked={formData.subscribeNewsletter}
                onChange={handleInputChange}
                style={{
                  width: 20,
                  height: 20,
                  marginTop: 2,
                  accentColor: "#1976D2",
                  cursor: "pointer",
                }}
              />
              <div>
                <strong style={{ color: "#333" }}>
                  📬 Subscribe to our Newsletter
                </strong>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "#666" }}>
                  Get updates on new features, fuel price trends, and tips for finding the best deals in Oriental Mindoro.
                </p>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "14px 24px",
              fontSize: 16,
              fontWeight: 600,
              color: "#fff",
              background: isSubmitting
                ? "#90caf9"
                : "linear-gradient(135deg, #1976D2 0%, #1565C0 100%)",
              border: "none",
              borderRadius: 8,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
            }}
            onMouseOver={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(25, 118, 210, 0.4)";
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(25, 118, 210, 0.3)";
            }}
          >
            {isSubmitting ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>

      <h2>Report Fuel Price Updates</h2>
      <p>
        Fuel prices change frequently. If you notice a price difference at any station,
        please help keep our data accurate by contacting us directly through the form above
        or reaching out to the station owner.
      </p>

      <h2>Submit Station Information Corrections</h2>
      <p>
        Found incorrect details about operating hours, amenities, or location? Let us know
        so we can update our database and provide accurate information to all users.
      </p>

      <h2>Feedback and Suggestions</h2>
      <p>
        Have ideas for new features or improvements? We're always looking to enhance the
        user experience. Your input helps shape the future of Fuel Finder.
      </p>

      <h2>Get in Touch</h2>
      <p>
        You can reach us through the following channels:
      </p>
      <ul>
        <li><strong>Email:</strong> Contact us through our GitHub repository</li>
        <li><strong>GitHub:</strong> Open an issue or submit a pull request on our project repository</li>
        <li><strong>Community:</strong> Join discussions and share your experiences with other users</li>
      </ul>

      <h2>Business Inquiries</h2>
      <p>
        Station owners interested in managing their listings or advertising opportunities
        can reach out for more information about our business partnerships.
      </p>

      <div style={{ marginTop: 24 }}>
        <Link to="/" style={{ color: "#1976D2", textDecoration: "none", fontWeight: 600 }}>
          ← Back to map
        </Link>
      </div>
    </div>
  );
};

export default Contact;
