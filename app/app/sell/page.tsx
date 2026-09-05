import Link from 'next/link';
import { ArrowLeft, ArrowRight, Smartphone } from 'lucide-react';

export default function SellPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f7faf9',
        padding: '70px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '1180px',
          margin: '0 auto',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '28px',
            color: '#087f70',
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <section
          style={{
            background: '#ffffff',
            border: '1px solid #e4ebe9',
            borderRadius: '22px',
            padding: '50px 35px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              margin: '0 auto 20px',
              borderRadius: '18px',
              display: 'grid',
              placeItems: 'center',
              background: '#eaf8f5',
              color: '#087f70',
            }}
          >
            <Smartphone size={36} />
          </div>

          <p
            style={{
              margin: 0,
              color: '#087f70',
              fontWeight: 800,
              fontSize: '12px',
              letterSpacing: '1.5px',
            }}
          >
            SELL YOUR DEVICE
          </p>

          <h1
            style={{
              margin: '12px 0 14px',
              fontSize: 'clamp(32px, 5vw, 48px)',
            }}
          >
            Choose Your Device
          </h1>

          <p
            style={{
              maxWidth: '600px',
              margin: '0 auto',
              color: '#64716e',
              lineHeight: 1.7,
            }}
          >
            Select your device category from the home page to continue
            with brand, model, variant and price selection.
          </p>

          <Link
            href="/#sell-by-category"
            style={{
              marginTop: '28px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '13px 20px',
              borderRadius: '12px',
              background: '#087f70',
              color: '#ffffff',
              fontWeight: 700,
            }}
          >
            Choose Category
            <ArrowRight size={18} />
          </Link>
        </section>
      </div>
    </main>
  );
}