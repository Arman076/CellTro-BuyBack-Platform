"use client";

import { useSearchParams } from "next/navigation";

import VendorAuth from "@/components/auth/VendorAuth";

export default function ResetPasswordPage() {
  const params = useSearchParams();

  return (
    <VendorAuth
      mode={
        params.get("step") === "new"
          ? "reset"
          : "otp"
      }
    />
  );
}