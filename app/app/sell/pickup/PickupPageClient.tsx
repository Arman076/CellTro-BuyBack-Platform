"use client";

import { useEffect, useState } from "react";
import PickupAddress from "@/components/pickup/Address";

export default function PickupPageClient() {
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  useEffect(() => {
    setVerifiedPhone(sessionStorage.getItem("verifiedCustomerPhone") || "");
  }, []);

  if (verifiedPhone === null) {
    return (
      <main style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
        <p>Loading pickup details...</p>
      </main>
    );
  }

  if (!verifiedPhone) {
    return (
      <main
        style={{
          minHeight: "70vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div>
          <h1>Verification session not found</h1>
          <p>Please complete mobile verification before scheduling pickup.</p>
        </div>
      </main>
    );
  }

  return <PickupAddress verifiedPhone={verifiedPhone} />;
}
