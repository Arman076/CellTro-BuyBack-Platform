import Link from "next/link";

import {
  Clock3,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";

type SiteSettings = {
  companyName: string;
  tagline: string | null;

  supportPhone: string | null;
  whatsappNumber: string | null;

  supportEmail: string | null;
  businessEmail: string | null;

  officeAddress: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;

  businessHours: string | null;

  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  youtubeUrl: string | null;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

const fallbackSettings: SiteSettings = {
  companyName: "CELLTRO",
  tagline: "Sell Smart. Sell Easy.",

  supportPhone: null,
  whatsappNumber: null,

  supportEmail: null,
  businessEmail: null,

  officeAddress: null,
  city: "Mumbai",
  state: "Maharashtra",
  pincode: null,

  businessHours: null,

  facebookUrl: null,
  instagramUrl: null,
  linkedinUrl: null,
  youtubeUrl: null,
};

async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const response = await fetch(
      `${API_URL}/site-settings/public`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return fallbackSettings;
    }

    const data = await response.json();

    return {
      companyName:
        data.companyName ||
        fallbackSettings.companyName,

      tagline:
        data.tagline ||
        fallbackSettings.tagline,

      supportPhone:
        data.supportPhone || null,

      whatsappNumber:
        data.whatsappNumber || null,

      supportEmail:
        data.supportEmail || null,

      businessEmail:
        data.businessEmail || null,

      officeAddress:
        data.officeAddress || null,

      city:
        data.city || null,

      state:
        data.state || null,

      pincode:
        data.pincode || null,

      businessHours:
        data.businessHours || null,

      facebookUrl:
        data.facebookUrl || null,

      instagramUrl:
        data.instagramUrl || null,

      linkedinUrl:
        data.linkedinUrl || null,

      youtubeUrl:
        data.youtubeUrl || null,
    };
  } catch (error) {
    console.error(
      "Unable to load public site settings:",
      error,
    );

    return fallbackSettings;
  }
}

function createAddress(
  settings: SiteSettings,
) {
  const parts = [
    settings.officeAddress,
    settings.city,
    settings.state,
    settings.pincode,
  ].filter(Boolean);

  return parts.join(", ");
}

function createPhoneHref(phone: string) {
  return `tel:${phone.replace(
    /[^\d+]/g,
    "",
  )}`;
}

function createWhatsAppHref(
  phone: string,
) {
  const number = phone.replace(/\D/g, "");

  return `https://wa.me/${number}`;
}

export default async function CustomerFooter() {
  const currentYear =
    new Date().getFullYear();

  const settings =
    await getSiteSettings();

  const address =
    createAddress(settings);

  const contactEmail =
    settings.supportEmail ||
    settings.businessEmail;

  const hasSocialLinks = Boolean(
    settings.instagramUrl ||
      settings.facebookUrl ||
      settings.linkedinUrl ||
      settings.youtubeUrl,
  );

  return (
    <footer className="customer-footer">
      <div className="footer-main">
        <div className="footer-container">
          {/* BRAND */}

          <div className="footer-brand-column">
            <Link
              href="/"
              className="footer-logo"
            >
              <span className="footer-logo-mark">
                {settings.companyName
                  .charAt(0)
                  .toUpperCase()}
              </span>

              <span className="footer-logo-text">
                <strong>
                  {settings.companyName}
                </strong>

                {settings.tagline && (
                  <small>
                    {settings.tagline}
                  </small>
                )}
              </span>
            </Link>

            <p className="footer-description">
              Sell your used phones and
              electronic devices through a
              simple, secure and transparent
              buyback process.
            </p>

            <div className="footer-trust">
              <ShieldCheck size={19} />

              <span>
                Secure device selling
                experience
              </span>
            </div>

            {/* SOCIAL LINKS */}

            {hasSocialLinks && (
              <div className="footer-socials">
                {settings.instagramUrl && (
                  <a
                    href={
                      settings.instagramUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${settings.companyName} Instagram`}
                    title="Instagram"
                  >
                    <Globe2 size={18} />
                  </a>
                )}

                {settings.facebookUrl && (
                  <a
                    href={
                      settings.facebookUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${settings.companyName} Facebook`}
                    title="Facebook"
                  >
                    <Globe2 size={18} />
                  </a>
                )}

                {settings.linkedinUrl && (
                  <a
                    href={
                      settings.linkedinUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${settings.companyName} LinkedIn`}
                    title="LinkedIn"
                  >
                    <Globe2 size={18} />
                  </a>
                )}

                {settings.youtubeUrl && (
                  <a
                    href={
                      settings.youtubeUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${settings.companyName} YouTube`}
                    title="YouTube"
                  >
                    <Globe2 size={18} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* SELL DEVICE */}

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

          {/* COMPANY */}

          <div className="footer-links-column">
            <h3>Company</h3>

            <nav>
              <Link href="/about">
                About Us
              </Link>

              <Link href="/partner-with-us">
                Partner With Us
              </Link>

              <Link href="/contact-us">
                Contact Us
              </Link>

              <Link href="/privacy-policy">
                Privacy Policy
              </Link>

              <Link href="/terms-and-conditions">
                Terms & Conditions
              </Link>
            </nav>
          </div>

          {/* CONTACT */}

          <div className="footer-contact-column">
            <h3>Contact</h3>

            {address && (
              <div className="footer-contact-item">
                <MapPin size={18} />

                <span>
                  {address}
                </span>
              </div>
            )}

            {contactEmail && (
              <div className="footer-contact-item">
                <Mail size={18} />

                <a
                  href={`mailto:${contactEmail}`}
                >
                  {contactEmail}
                </a>
              </div>
            )}

            {settings.supportPhone && (
              <div className="footer-contact-item">
                <Phone size={18} />

                <a
                  href={createPhoneHref(
                    settings.supportPhone,
                  )}
                >
                  {
                    settings.supportPhone
                  }
                </a>
              </div>
            )}

            {settings.whatsappNumber && (
              <div className="footer-contact-item">
                <MessageCircle
                  size={18}
                />

                <a
                  href={createWhatsAppHref(
                    settings.whatsappNumber,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp Support
                </a>
              </div>
            )}

            {settings.businessHours && (
              <div className="footer-contact-item">
                <Clock3 size={18} />

                <span>
                  {
                    settings.businessHours
                  }
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM */}

      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p>
            © {currentYear}{" "}
            {settings.companyName}. All
            rights reserved.
          </p>

          <div>
            <Link href="/privacy-policy">
              Privacy
            </Link>

            <Link href="/terms-and-conditions">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}