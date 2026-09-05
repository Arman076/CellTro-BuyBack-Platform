import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  Truck,
} from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="hero-section">

      <div className="hero-background hero-background-one" />
      <div className="hero-background hero-background-two" />

      <div className="hero-container">

        <div className="hero-content">

          <div className="hero-badge">
            <BadgeCheck size={17} />
            Simple & trusted device selling
          </div>

          <h1>
            Sell Your Old Device
            <span> At The Best Value</span>
          </h1>

          <p>
            Get an instant estimated value for your device,
            schedule a pickup and sell without the usual hassle.
          </p>

          <div className="hero-buttons">

            <a href="#sell-by-category" className="primary-hero-button">
              Sell Your Device
              <ArrowRight size={19} />
            </a>

            <Link href="/#how-it-works" className="secondary-hero-button">
              How It Works
            </Link>

          </div>

          <div className="hero-trust">

            <div>
              <ShieldCheck size={20} />
              <span>Secure Process</span>
            </div>

            <div>
              <Truck size={20} />
              <span>Convenient Pickup</span>
            </div>

            <div>
              <BadgeCheck size={20} />
              <span>Transparent Quote</span>
            </div>

          </div>

        </div>

        <div className="hero-visual">

          <div className="hero-device-card">

            <div className="phone-illustration">

              <div className="phone-camera">
                <span />
                <span />
                <span />
              </div>

              <div className="phone-brand">
                Your Device
              </div>

            </div>

            <div className="floating-card floating-card-one">
              <span>1</span>

              <div>
                <small>Select device</small>
                <strong>Choose your model</strong>
              </div>
            </div>

            <div className="floating-card floating-card-two">
              <span>2</span>

              <div>
                <small>Get value</small>
                <strong>Instant estimate</strong>
              </div>
            </div>

            <div className="floating-card floating-card-three">
              <span>3</span>

              <div>
                <small>Pickup</small>
                <strong>Sell conveniently</strong>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}