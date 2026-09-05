import Link from "next/link";
import {
//   Facebook,
//   Instagram,
//   Linkedin,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";

export default function CustomerFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="customer-footer">
      <div className="footer-main">
        <div className="footer-container">
          <div className="footer-brand-column">
            <Link href="/" className="footer-logo">
              <span className="footer-logo-mark">C</span>

              <span className="footer-logo-text">
                <strong>CELLTRO</strong>
                <small>Sell Smart. Sell Easy.</small>
              </span>
            </Link>

            <p className="footer-description">
              Sell your used phones and electronic devices
              through a simple, secure and transparent
              buyback process.
            </p>

            <div className="footer-trust">
              <ShieldCheck size={19} />

              <span>
                Secure device selling experience
              </span>
            </div>

            <div className="footer-socials">
              <a
                href="#"
                aria-label="CELLTRO Instagram"
              >
                {/* <Instagram size={18} /> */}
              </a>

              <a
                href="#"
                aria-label="CELLTRO Facebook"
              >
                {/* <Facebook size={18} /> */}
              </a>

              <a
                href="#"
                aria-label="CELLTRO LinkedIn"
              >
                {/* <Linkedin size={18} /> */}
              </a>
            </div>
          </div>

          <div className="footer-links-column">
            <h3>Sell Device</h3>

            <nav>
              <Link href="/#sell-by-category">
                Sell Mobile
              </Link>

              <Link href="/#sell-by-category">
                Sell Laptop
              </Link>

              <Link href="/#sell-by-category">
                Sell Tablet
              </Link>

              <Link href="/#sell-by-category">
                Sell Smartwatch
              </Link>
            </nav>
          </div>

          <div className="footer-links-column">
            <h3>Company</h3>

            <nav>
              <Link href="/about">
                About Us
              </Link>

              <Link href="/contact">
                Contact Us
              </Link>

              <Link href="/privacy-policy">
                Privacy Policy
              </Link>

              <Link href="/terms">
                Terms & Conditions
              </Link>
            </nav>
          </div>

          <div className="footer-contact-column">
            <h3>Contact</h3>

            <div className="footer-contact-item">
              <MapPin size={18} />

              <span>
                Mumbai, Maharashtra, India
              </span>
            </div>

            <div className="footer-contact-item">
              <Mail size={18} />

              <span>
                support@celltro.co.in
              </span>
            </div>

            <div className="footer-contact-item">
              <Phone size={18} />

              <span>
                Customer Support
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p>
            © {currentYear} CELLTRO. All rights reserved.
          </p>

          <div>
            <Link href="/privacy-policy">
              Privacy
            </Link>

            <Link href="/terms">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}