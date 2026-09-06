import {
  BadgeCheck,
  Building2,
  MapPin,
  ShieldCheck,
} from "lucide-react";

export default function TrustSection() {
  return (
    <section
      className="home-content-section celltro-trust-section"
      aria-labelledby="celtro-trust-heading"
    >
      <div className="home-content-container">

        <div className="home-bordered-section celltro-trust-wrapper">

          <div className="celtro-trust-badge">
            <span className="trust-avatar-group">
              <i />
              <i />
              <i />
            </span>

            <BadgeCheck size={16} />

            <strong>
              Trusted Device Selling
            </strong>
          </div>


          <div className="home-section-heading centered celltro-trust-heading">

            <span>
              GROWING SERVICE NETWORK
            </span>

            <h2 id="celtro-trust-heading">
              Trusted Across Mumbai,
              Navi Mumbai & Tier-1 Cities
            </h2>

            <p>
              CELLTRO is being built to
              provide a simple, secure
              and transparent device
              selling experience across
              major Indian cities.
            </p>

          </div>


          <div className="celtro-trust-stats">

            <article>
              <MapPin size={22} />

              <strong>
                Multi-City
              </strong>

              <span>
                Service Coverage
              </span>
            </article>


            <article>
              <ShieldCheck size={22} />

              <strong>
                Secure
              </strong>

              <span>
                Customer Process
              </span>
            </article>


            <article>
              <BadgeCheck size={22} />

              <strong>
                Verified
              </strong>

              <span>
                Device Inspection
              </span>
            </article>


            <article>
              <Building2 size={22} />

              <strong>
                Tier-1
              </strong>

              <span>
                City Expansion
              </span>
            </article>

          </div>


          <div className="celtro-city-row">

            <span>
              Mumbai
            </span>

            <i />

            <span>
              Navi Mumbai
            </span>

            <i />

            <span>
              Delhi NCR
            </span>

            <i />

            <span>
              Bengaluru
            </span>

            <i />

            <span>
              Hyderabad
            </span>

            <i />

            <span>
              Chennai
            </span>

            <i />

            <span>
              Pune
            </span>

          </div>

        </div>

      </div>
    </section>
  );
}