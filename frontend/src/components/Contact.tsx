import React from "react";
import { Link } from "react-router-dom";

const Contact: React.FC = () => {
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

      <h2>Report Fuel Price Updates</h2>
      <p>
        Fuel prices change frequently. If you notice a price difference at any station,
        please help keep our data accurate by reporting it through the app's price reporting
        feature or by contacting us directly.
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
