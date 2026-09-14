"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Address = {
  id: string;
  fullName: string;
  phone: string;
  house: string;
  street: string;
  locality: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
  type: "Home" | "Office" | "Other";
  serviceable: boolean;
};

export default function PickupSlotClient() {
  const [address, setAddress] = useState<Address | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("selectedPickupAddress");

    if (!saved) return;

    try {
      setAddress(JSON.parse(saved));
    } catch {
      sessionStorage.removeItem("selectedPickupAddress");
    }
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f8fa",
        padding: "32px 16px 80px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/sell/pickup"
          style={{
            display: "inline-block",
            marginBottom: "20px",
            color: "#344054",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ← Change address
        </Link>

        <h1
          style={{
            margin: 0,
            color: "#101828",
            fontSize: "clamp(26px, 4vw, 38px)",
            lineHeight: 1.15,
          }}
        >
          Choose your pickup date & time
        </h1>

        <p
          style={{
            marginTop: "10px",
            color: "#667085",
            lineHeight: 1.6,
          }}
        >
          Select a convenient pickup slot for your device.
        </p>

        {address && (
          <section
            style={{
              marginTop: "24px",
              padding: "18px",
              border: "1px solid #e4e7ec",
              borderRadius: "16px",
              background: "#fff",
            }}
          >
            <div
              style={{
                marginBottom: "6px",
                color: "#667085",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              PICKUP ADDRESS · {address.type}
            </div>

            <strong style={{ color: "#101828" }}>
              {address.fullName}
            </strong>

            <p
              style={{
                margin: "8px 0 0",
                color: "#667085",
                lineHeight: 1.6,
              }}
            >
              {address.house}, {address.street}
              <br />
              {address.locality}
              {address.landmark ? `, ${address.landmark}` : ""}
              <br />
              {address.city}, {address.state} - {address.pincode}
            </p>
          </section>
        )}

        <section
          style={{
            marginTop: "24px",
            padding: "24px",
            border: "1px solid #e4e7ec",
            borderRadius: "18px",
            background: "#fff",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#101828",
              fontSize: "20px",
            }}
          >
            Pickup slots
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              color: "#667085",
              lineHeight: 1.6,
            }}
          >
            Slot selection UI will be added here next. This page is now
            correctly connected to the address page.
          </p>
        </section>
      </div>
    </main>
  );
}
