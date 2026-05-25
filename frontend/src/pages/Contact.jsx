/**
 * CONTACT PAGE
 *
 * Contact information và form:
 * - Company contact details
 * - Contact form
 * - Office location map
 */

const Contact = () => {
  return (
    <div className="contact-page">
      <div
        className="container"
        style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}
      >
        <h1>Contact Us</h1>
        <p>Get in touch with our customer service team.</p>

        <div
          className="contact-content"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "40px",
            marginTop: "30px",
          }}
        >
          <div className="contact-map">
            <h3 style={{ marginBottom: "20px", color: "#333" }}>
              Our Location
            </h3>
            <div
              style={{
                width: "100%",
                height: "500px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.3193280163757!2d106.69589331533359!3d10.782616892318266!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f1c06f4e1dd%3A0x43900f1d4539489d!2sNguyen%20Hue%20Walking%20Street!5e0!3m2!1sen!2s!4v1633089729439!5m2!1sen!2s"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Store Location Map"
              ></iframe>
            </div>
            <div
              style={{
                marginTop: "15px",
                padding: "12px",
                backgroundColor: "#f8f9fa",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#666",
                textAlign: "center",
              }}
            >
              📍 123 Electronic Street, Tech City | 📞 +0123 456 7890 | 🕒
              Mon-Fri 9AM-6PM
            </div>
          </div>

          <div
            className="contact-form"
            style={{
              height: "580px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h3 style={{ marginBottom: "20px" }}>Send us a message</h3>
            <form
              style={{
                marginTop: "0px",
                flex: "1",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <input
                type="text"
                placeholder="Your Name"
                style={{
                  width: "100%",
                  padding: "15px",
                  marginBottom: "20px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
              />
              <input
                type="email"
                placeholder="Your Email"
                style={{
                  width: "100%",
                  padding: "15px",
                  marginBottom: "20px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
              />
              <input
                type="tel"
                placeholder="Your Phone"
                style={{
                  width: "100%",
                  padding: "15px",
                  marginBottom: "20px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                }}
              />
              <textarea
                placeholder="Your Message"
                style={{
                  width: "100%",
                  padding: "15px",
                  marginBottom: "20px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  resize: "vertical",
                  fontSize: "16px",
                  flex: "1",
                  minHeight: "200px",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              ></textarea>
              <button
                type="submit"
                style={{
                  background: "#ff6b35",
                  color: "white",
                  border: "none",
                  padding: "18px 30px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "600",
                  marginTop: "auto",
                }}
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
