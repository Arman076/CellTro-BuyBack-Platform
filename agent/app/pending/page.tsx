import Link from 'next/link';

export default function PendingPage() {
  return (
    <main className="auth-page">
      <aside className="auth-hero">
        <div className="brand">
          Celltro
          <span className="brand-dot">
            .
          </span>
        </div>

        <div className="hero-content">
          <div className="hero-eyebrow">
            Agent Verification
          </div>

          <h1 className="hero-title">
            Almost there.
          </h1>

          <p className="hero-copy">
            Agent accounts become active
            after approval from the linked
            vendor.
          </p>
        </div>
      </aside>

      <section className="auth-main">
        <div
          className="
            auth-card
            pending-card
          "
        >
          <div className="mobile-brand">
            Celltro.
          </div>

          <div className="status-icon">
            …
          </div>

          <h1 className="card-title">
            Approval pending
          </h1>

          <p className="card-subtitle">
            Your registration has been
            submitted successfully. Your
            vendor needs to approve your
            Agent account before you can
            access assigned pickups.
          </p>

          <div className="status-details">
            <div className="status-row">
              <span className="status-key">
                Account status
              </span>

              <span className="status-value">
                Awaiting vendor approval
              </span>
            </div>
          </div>

          <Link
            href="/login"
            className="
              btn
              btn-primary
              btn-full
            "
            style={{
              display: 'grid',
              placeItems: 'center',
              textDecoration: 'none',
            }}
          >
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}