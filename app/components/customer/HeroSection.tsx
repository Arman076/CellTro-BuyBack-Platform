import {
  BadgeCheck,
  ShieldCheck,
  Sparkles,
  Truck,
  WalletCards,
} from "lucide-react";

import DeviceSearch from "@/components/customer/DeviceSearch";

export default function HeroSection() {
  return (
    <section className="celtro-hero">

      {/* BACKGROUND DECORATION */}

      <div className="celtro-hero-glow celtro-hero-glow-left" />

      <div className="celtro-hero-glow celtro-hero-glow-right" />


      <div className="celtro-hero-container">

        {/* BADGE */}

        <div className="celtro-hero-badge">

          <Sparkles size={16} />

          <span>
            Simple, Secure &
            Transparent
          </span>

        </div>


        {/* MAIN SEO H1 */}

        <h1>
          Sell Your Old Device
          <span>
            {" "}For The Best Value
          </span>
        </h1>


        {/* DESCRIPTION */}

        <p className="celtro-hero-description">
          Select your device, get an
          estimated value and schedule
          a convenient pickup with
          CELLTRO.
        </p>


        {/* REAL DEVICE SEARCH */}

        <div className="celtro-hero-device-search">

          <DeviceSearch
            variant="hero"
            placeholder="Search iPhone, Samsung, laptop..."
          />

        </div>


        {/* PROCESS */}

        <div className="celtro-hero-process">

          <span>
            CHECK PRICE
          </span>

          <i />

          <span>
            SCHEDULE PICKUP
          </span>

          <i />

          <span>
            GET PAID
          </span>

        </div>


        {/* TRUST FEATURES */}

        <div className="celtro-hero-trust">

          <div>
            <ShieldCheck
              size={19}
            />

            <span>
              Secure Process
            </span>
          </div>


          <div>
            <Truck
              size={19}
            />

            <span>
              Convenient Pickup
            </span>
          </div>


          <div>
            <WalletCards
              size={19}
            />

            <span>
              Transparent Value
            </span>
          </div>


          <div>
            <BadgeCheck
              size={19}
            />

            <span>
              Verified Sale
            </span>
          </div>

        </div>

      </div>
    </section>
  );
}