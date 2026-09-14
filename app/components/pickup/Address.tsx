"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./PickupAddress.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type AddressType = "Home" | "Office" | "Other";
type PayoutMethod = "CASH" | "UPI";

type Address = {
  id: number;
  fullName: string;
  phone: string;
  house: string;
  street: string;
  locality: string;
  landmark?: string | null;
  pincode: string;
  city: string;
  state: string;
  type: AddressType;
  serviceable: boolean;
};

type PickupSlot = {
  id: number;
  code: string;
  label: string;
  startTime: string;
  endTime: string;
};

type SellQuote = {
  productId: number;
  productName: string;
  productImage?: string | null;
  variantId: number;
  variantLabel: string;
  basePrice: number;
  totalDeduction: number;
  finalPrice: number;
};

interface PickupAddressProps {
  verifiedPhone: string;
}

const emptyForm = {
  fullName: "",
  house: "",
  street: "",
  locality: "",
  landmark: "",
  pincode: "",
  city: "",
  state: "",
  type: "Home" as AddressType,
};

const fallbackSlots: PickupSlot[] = [
  { id: -1, code: "10_14", label: "10:00 AM - 02:00 PM", startTime: "10:00", endTime: "14:00" },
  { id: -2, code: "14_18", label: "02:00 PM - 06:00 PM", startTime: "14:00", endTime: "18:00" },
  { id: -3, code: "18_22", label: "06:00 PM - 10:00 PM", startTime: "18:00", endTime: "22:00" },
];

async function apiJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function makePickupDates(days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);

    const value = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    const dayLabel =
      index === 0
        ? "Today"
        : index === 1
          ? "Tomorrow"
          : new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date);

    return {
      value,
      dayLabel,
      dateLabel: new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
      }).format(date),
    };
  });
}

export default function PickupAddress({ verifiedPhone }: PickupAddressProps) {
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState<
    "idle" | "serviceable" | "unserviceable"
  >("idle");

  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlotCode, setSelectedSlotCode] = useState("");
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [slotConfirmed, setSlotConfirmed] = useState(false);

  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod | "">("");
  const [upiMobile, setUpiMobile] = useState(verifiedPhone);
  const [quote, setQuote] = useState<SellQuote | null>(null);

  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");

  const pickupDates = useMemo(() => makePickupDates(7), []);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  useEffect(() => {
    const raw = sessionStorage.getItem("sellQuote");
    if (raw) {
      try {
        setQuote(JSON.parse(raw));
      } catch {
        sessionStorage.removeItem("sellQuote");
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutData() {
      setError("");
      setLoadingAddresses(true);

      try {
        const [addressData, slotData] = await Promise.all([
          apiJson(
            `${API}/orders/customer-addresses?phone=${encodeURIComponent(verifiedPhone)}`,
          ),
          apiJson(`${API}/orders/pickup-slots`),
        ]);

        if (cancelled) return;

        const nextAddresses = Array.isArray(addressData) ? addressData : [];
        setAddresses(nextAddresses);

        if (nextAddresses.length > 0) {
          setSelectedAddressId(nextAddresses[0].id);
        }

        setSlots(Array.isArray(slotData) && slotData.length ? slotData : fallbackSlots);
      } catch (e) {
        if (cancelled) return;
        // Slots remain usable for UI even before backend migration is applied.
        setSlots(fallbackSlots);
        setError(
          e instanceof Error
            ? e.message
            : "Unable to load saved addresses. Please try again.",
        );
      } finally {
        if (!cancelled) setLoadingAddresses(false);
      }
    }

    loadCheckoutData();

    return () => {
      cancelled = true;
    };
  }, [verifiedPhone]);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "pincode") {
      setPincodeStatus("idle");

      if (value.length < 6) {
        setForm((prev) => ({
          ...prev,
          pincode: value.replace(/\D/g, "").slice(0, 6),
          city: "",
          state: "",
        }));
      }
    }
  }

  async function checkPincode() {
    if (!/^\d{6}$/.test(form.pincode)) return;

    setCheckingPincode(true);
    setPincodeStatus("idle");

    try {
      // Temporary serviceability until Super Admin pincode mapping is connected.
      const supportedPincodes = new Set([
        "400001",
        "400002",
        "400003",
        "400004",
        "400005",
        "400006",
        "400007",
        "400008",
        "400009",
        "400010",
        "400011",
        "400012",
        "400013",
        "400014",
        "400015",
        "400016",
        "400017",
        "400018",
        "400019",
        "400020",
        "400021",
        "400022",
        "400023",
        "400024",
        "400025",
        "400026",
        "400027",
        "400028",
        "400029",
        "400030",
        "400031",
        "400032",
        "400033",
        "400034",
        "400035",
        "400036",
        "400037",
        "400038",
        "400039",
        "400040",
        "400042",
        "400043",
        "400049",
        "400050",
        "400051",
        "400052",
        "400053",
        "400054",
        "400055",
        "400056",
        "400057",
        "400058",
        "400059",
        "400060",
        "400061",
        "400062",
        "400063",
        "400064",
        "400065",
        "400066",
        "400067",
        "400068",
        "400069",
        "400070",
        "400071",
        "400072",
        "400074",
        "400075",
        "400076",
        "400077",
        "400078",
        "400079",
        "400080",
        "400081",
        "400082",
        "400083",
        "400084",
        "400085",
        "400086",
        "400087",
        "400088",
        "400089",
        "400090",
        "400091",
        "400092",
        "400093",
        "400094",
        "400095",
        "400096",
        "400097",
        "400098",
        "400099",
        "400101",
        "400102",
        "400103",
        "400104",
      ]);

      await new Promise((resolve) => setTimeout(resolve, 250));

      const isServiceable = supportedPincodes.has(form.pincode);

      if (isServiceable) {
        setForm((prev) => ({
          ...prev,
          city: "Mumbai",
          state: "Maharashtra",
        }));
        setPincodeStatus("serviceable");
      } else {
        setForm((prev) => ({
          ...prev,
          city: "",
          state: "",
        }));
        setPincodeStatus("unserviceable");
      }
    } finally {
      setCheckingPincode(false);
    }
  }

  function resetAddressForm() {
    setForm(emptyForm);
    setEditingAddressId(null);
    setPincodeStatus("idle");
    setShowForm(false);
  }

  function editAddress(address: Address) {
    setEditingAddressId(address.id);
    setForm({
      fullName: address.fullName,
      house: address.house,
      street: address.street,
      locality: address.locality,
      landmark: address.landmark || "",
      pincode: address.pincode,
      city: address.city,
      state: address.state,
      type: address.type,
    });
    setPincodeStatus("serviceable");
    setShowForm(true);
    window.setTimeout(() => {
      document.getElementById("pickup-address-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  async function saveAddress(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (pincodeStatus !== "serviceable") {
      setError("Please check pincode serviceability before saving the address.");
      return;
    }

    try {
      setSavingAddress(true);

      const payload = {
        ...form,
        phone: verifiedPhone,
      };

      const saved = editingAddressId
        ? await apiJson(`${API}/orders/customer-addresses/${editingAddressId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiJson(`${API}/orders/customer-addresses`, {
            method: "POST",
            body: JSON.stringify(payload),
          });

      setAddresses((current) => {
        if (editingAddressId) {
          return current.map((item) => (item.id === saved.id ? saved : item));
        }
        return [...current, saved];
      });

      setSelectedAddressId(saved.id);
      setAddressConfirmed(false);
      setSlotConfirmed(false);
      resetAddressForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save address.");
    } finally {
      setSavingAddress(false);
    }
  }

  async function deleteAddress(id: number) {
    setError("");

    try {
      await apiJson(`${API}/orders/customer-addresses/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ phone: verifiedPhone }),
      });

      setAddresses((current) => current.filter((address) => address.id !== id));

      if (selectedAddressId === id) {
        const remaining = addresses.filter((address) => address.id !== id);
        setSelectedAddressId(remaining[0]?.id ?? null);
      }

      setAddressConfirmed(false);
      setSlotConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete address.");
    }
  }

  function confirmAddress() {
    if (!selectedAddress) {
      setError("Please select a pickup address.");
      return;
    }

    setError("");
    setAddressConfirmed(true);
    setSlotConfirmed(false);

    window.setTimeout(() => {
      document.getElementById("pickup-slot-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  function confirmSlot() {
    if (!selectedDate || !selectedSlotCode) {
      setError("Please select both pickup date and time slot.");
      return;
    }

    setError("");
    setSlotConfirmed(true);

    window.setTimeout(() => {
      document.getElementById("payment-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  async function confirmOrder() {
    setError("");

    if (!selectedAddress || !selectedDate || !selectedSlotCode || !payoutMethod) {
      setError("Please complete address, pickup slot and payment preference.");
      return;
    }

    if (payoutMethod === "UPI" && !/^[6-9]\d{9}$/.test(upiMobile)) {
      setError("Enter a valid 10-digit mobile number for UPI payout.");
      return;
    }

    if (!quote) {
      setError(
        "Quote details are missing. Please go back to the device evaluation and calculate the exact value again.",
      );
      return;
    }

    try {
      setPlacingOrder(true);

      const order = await apiJson(`${API}/orders`, {
        method: "POST",
        body: JSON.stringify({
          phone: verifiedPhone,
          addressId: selectedAddress.id,
          pickupDate: selectedDate,
          pickupSlotCode: selectedSlotCode,
          payoutMethod,
          payoutUpiMobile: payoutMethod === "UPI" ? upiMobile : null,
          quote,
        }),
      });

      sessionStorage.setItem("lastSellOrderNumber", order.orderNumber);
      router.push(`/sell/order-success/${encodeURIComponent(order.orderNumber)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to confirm pickup.");
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.kicker}>CELLTRO DEVICE PICKUP</span>
          <h1>You&apos;re almost done</h1>
          <p>Confirm your pickup address, time slot and payout preference.</p>
        </header>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.checkoutLayout}>
          <div className={styles.checkoutMain}>
            <section className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>{addressConfirmed ? "✓" : "1"}</span>
                <div>
                  <h2>Pickup Address</h2>
                  <p>Select Home, Office or add another address.</p>
                </div>
              </div>

              {loadingAddresses ? (
                <div className={styles.loadingBlock}>Loading saved addresses...</div>
              ) : (
                <>
                  <div className={styles.addressGrid}>
                    {addresses.map((address) => {
                      const selected = selectedAddressId === address.id;

                      return (
                        <article
                          key={address.id}
                          className={`${styles.addressCard} ${
                            selected ? styles.selectedCard : ""
                          }`}
                        >
                          <label className={styles.addressSelector}>
                            <input
                              type="radio"
                              name="pickup-address"
                              value={address.id}
                              checked={selected}
                              onChange={() => {
                                setSelectedAddressId(address.id);
                                setAddressConfirmed(false);
                                setSlotConfirmed(false);
                              }}
                            />

                            <div className={styles.addressContent}>
                              <div className={styles.addressHeading}>
                                <span className={styles.addressType}>{address.type}</span>
                                <span className={styles.serviceable}>Pickup Available</span>
                              </div>

                              <strong>{address.fullName}</strong>
                              <p>
                                {address.house}, {address.street}
                                <br />
                                {address.locality}
                                {address.landmark ? `, ${address.landmark}` : ""}
                                <br />
                                {address.city}, {address.state} - {address.pincode}
                              </p>
                            </div>
                          </label>

                          <div className={styles.cardActions}>
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() => editAddress(address)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={styles.deleteButton}
                              onClick={() => deleteAddress(address.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    })}

                    <button
                      type="button"
                      className={styles.addAddressCard}
                      onClick={() => {
                        resetAddressForm();
                        setShowForm(true);
                      }}
                    >
                      <span className={styles.plusIcon}>+</span>
                      <span>
                        <strong>Add New Address</strong>
                        <small>Home, office or any new pickup location</small>
                      </span>
                    </button>
                  </div>

                  {showForm && (
                    <form
                      id="pickup-address-form"
                      className={styles.formCard}
                      onSubmit={saveAddress}
                    >
                      <div className={styles.formHeader}>
                        <div>
                          <h3>{editingAddressId ? "Edit Address" : "Add New Address"}</h3>
                          <p>Enter the exact location where our pickup agent should visit.</p>
                        </div>
                        <button
                          type="button"
                          className={styles.closeButton}
                          onClick={resetAddressForm}
                          aria-label="Close address form"
                        >
                          ×
                        </button>
                      </div>

                      <div className={styles.formGrid}>
                        <div className={styles.field}>
                          <label htmlFor="fullName">Full Name</label>
                          <input
                            id="fullName"
                            required
                            autoComplete="name"
                            value={form.fullName}
                            onChange={(e) => handleChange("fullName", e.target.value)}
                            placeholder="Enter full name"
                          />
                        </div>

                        <div className={styles.field}>
                          <label htmlFor="phone">Verified Mobile Number</label>
                          <input id="phone" value={verifiedPhone} disabled />
                        </div>

                        <div className={styles.field}>
                          <label htmlFor="house">Flat / House / Office No.</label>
                          <input
                            id="house"
                            required
                            autoComplete="address-line1"
                            value={form.house}
                            onChange={(e) => handleChange("house", e.target.value)}
                            placeholder="Flat 101 / Office 504"
                          />
                        </div>

                        <div className={styles.field}>
                          <label htmlFor="street">Building / Street</label>
                          <input
                            id="street"
                            required
                            autoComplete="address-line2"
                            value={form.street}
                            onChange={(e) => handleChange("street", e.target.value)}
                            placeholder="Building or street"
                          />
                        </div>

                        <div className={styles.field}>
                          <label htmlFor="locality">Area / Locality</label>
                          <input
                            id="locality"
                            required
                            value={form.locality}
                            onChange={(e) => handleChange("locality", e.target.value)}
                            placeholder="Wadala"
                          />
                        </div>

                        <div className={styles.field}>
                          <label htmlFor="landmark">
                            Landmark <span>Optional</span>
                          </label>
                          <input
                            id="landmark"
                            value={form.landmark}
                            onChange={(e) => handleChange("landmark", e.target.value)}
                            placeholder="Near station"
                          />
                        </div>

                        <div className={styles.field}>
                          <label htmlFor="pincode">Pincode</label>
                          <div className={styles.pincodeWrapper}>
                            <input
                              id="pincode"
                              required
                              inputMode="numeric"
                              autoComplete="postal-code"
                              maxLength={6}
                              value={form.pincode}
                              onChange={(e) =>
                                handleChange(
                                  "pincode",
                                  e.target.value.replace(/\D/g, "").slice(0, 6),
                                )
                              }
                              placeholder="400037"
                            />
                            <button
                              type="button"
                              onClick={checkPincode}
                              disabled={form.pincode.length !== 6 || checkingPincode}
                            >
                              {checkingPincode ? "Checking..." : "Check"}
                            </button>
                          </div>

                          {pincodeStatus === "serviceable" && (
                            <p className={styles.successMessage}>
                              ✓ Pickup available at this location
                            </p>
                          )}

                          {pincodeStatus === "unserviceable" && (
                            <p className={styles.errorMessage}>
                              Pickup is currently unavailable for this pincode.
                            </p>
                          )}
                        </div>

                        <div className={styles.field}>
                          <label htmlFor="city">City</label>
                          <input
                            id="city"
                            value={form.city}
                            readOnly
                            placeholder="Auto detected"
                          />
                        </div>

                        <div className={styles.field}>
                          <label htmlFor="state">State</label>
                          <input
                            id="state"
                            value={form.state}
                            readOnly
                            placeholder="Auto detected"
                          />
                        </div>
                      </div>

                      <fieldset className={styles.addressTypeGroup}>
                        <legend>Save address as</legend>
                        <div className={styles.typeOptions}>
                          {(["Home", "Office", "Other"] as AddressType[]).map((type) => (
                            <label
                              key={type}
                              className={`${styles.typeButton} ${
                                form.type === type ? styles.activeType : ""
                              }`}
                            >
                              <input
                                type="radio"
                                name="addressType"
                                value={type}
                                checked={form.type === type}
                                onChange={() => handleChange("type", type)}
                              />
                              {type}
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <div className={styles.formActions}>
                        <button
                          type="button"
                          className={styles.cancelButton}
                          onClick={resetAddressForm}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className={styles.saveButton}
                          disabled={pincodeStatus !== "serviceable" || savingAddress}
                        >
                          {savingAddress ? "Saving..." : "Save & Use Address"}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className={styles.stepAction}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={!selectedAddress}
                      onClick={confirmAddress}
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}
            </section>

            <section
              id="pickup-slot-section"
              className={`${styles.stepCard} ${
                !addressConfirmed ? styles.lockedStep : ""
              }`}
            >
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>{slotConfirmed ? "✓" : "2"}</span>
                <div>
                  <h2>Pickup Slot</h2>
                  <p>Choose the date and time convenient for you.</p>
                </div>
              </div>

              {addressConfirmed && (
                <div className={styles.stepBody}>
                  <div className={styles.dateStrip}>
                    {pickupDates.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={`${styles.dateCard} ${
                          selectedDate === item.value ? styles.selectedOption : ""
                        }`}
                        onClick={() => {
                          setSelectedDate(item.value);
                          setSlotConfirmed(false);
                        }}
                      >
                        <strong>{item.dayLabel}</strong>
                        <span>{item.dateLabel}</span>
                      </button>
                    ))}
                  </div>

                  <h3 className={styles.sectionLabel}>Available time</h3>
                  <div className={styles.slotGrid}>
                    {slots.map((slot) => (
                      <button
                        key={slot.code}
                        type="button"
                        className={`${styles.slotButton} ${
                          selectedSlotCode === slot.code ? styles.selectedOption : ""
                        }`}
                        onClick={() => {
                          setSelectedSlotCode(slot.code);
                          setSlotConfirmed(false);
                        }}
                      >
                        <span className={styles.radioDot} />
                        {slot.label}
                      </button>
                    ))}
                  </div>

                  <div className={styles.stepAction}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={!selectedDate || !selectedSlotCode}
                      onClick={confirmSlot}
                    >
                      Continue to Payment
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section
              id="payment-section"
              className={`${styles.stepCard} ${
                !slotConfirmed ? styles.lockedStep : ""
              }`}
            >
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>3</span>
                <div>
                  <h2>Payment Preference</h2>
                  <p>How would you like to receive your device payment?</p>
                </div>
              </div>

              {slotConfirmed && (
                <div className={styles.stepBody}>
                  <div className={styles.paymentOptions}>
                    <button
                      type="button"
                      className={`${styles.paymentOption} ${
                        payoutMethod === "CASH" ? styles.selectedOption : ""
                      }`}
                      onClick={() => setPayoutMethod("CASH")}
                    >
                      <span className={styles.paymentIcon}>₹</span>
                      <span>
                        <strong>Cash</strong>
                        <small>Receive cash after successful pickup inspection.</small>
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.paymentOption} ${
                        payoutMethod === "UPI" ? styles.selectedOption : ""
                      }`}
                      onClick={() => setPayoutMethod("UPI")}
                    >
                      <span className={styles.paymentIcon}>UPI</span>
                      <span>
                        <strong>Online / UPI</strong>
                        <small>Receive payout on your UPI-linked mobile number.</small>
                      </span>
                    </button>
                  </div>

                  {payoutMethod === "UPI" && (
                    <div className={styles.upiBox}>
                      <label htmlFor="upiMobile">UPI-linked mobile number</label>
                      <div className={styles.phoneField}>
                        <span>+91</span>
                        <input
                          id="upiMobile"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={upiMobile}
                          onChange={(event) =>
                            setUpiMobile(
                              event.target.value.replace(/\D/g, "").slice(0, 10),
                            )
                          }
                          placeholder="10-digit mobile number"
                        />
                      </div>
                      <small>
                        This number is only stored as your payout preference. No OTP is
                        requested again here.
                      </small>
                    </div>
                  )}

                  <div className={styles.confirmBox}>
                    <div>
                      <span>Estimated payout</span>
                      <strong>{quote ? formatPrice(quote.finalPrice) : "—"}</strong>
                    </div>
                    <button
                      type="button"
                      className={styles.confirmButton}
                      disabled={
                        !payoutMethod ||
                        placingOrder ||
                        (payoutMethod === "UPI" && !/^[6-9]\d{9}$/.test(upiMobile))
                      }
                      onClick={confirmOrder}
                    >
                      {placingOrder ? "Confirming..." : "Confirm Pickup"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className={styles.summaryCard}>
            <div className={styles.summaryTitle}>Order Summary</div>

            {quote ? (
              <>
                <div className={styles.deviceSummary}>
                  <div className={styles.deviceImage}>
                    {quote.productImage ? (
                      <img
                        src={quote.productImage}
                        alt={quote.productName}
                        loading="lazy"
                      />
                    ) : (
                      <span>DEVICE</span>
                    )}
                  </div>
                  <div>
                    <strong>{quote.productName}</strong>
                    <span>{quote.variantLabel}</span>
                  </div>
                </div>

                <div className={styles.priceRows}>
                  <div>
                    <span>Base Value</span>
                    <strong>{formatPrice(quote.basePrice)}</strong>
                  </div>
                  <div>
                    <span>Condition Adjustment</span>
                    <strong>-{formatPrice(quote.totalDeduction)}</strong>
                  </div>
                  <div className={styles.totalRow}>
                    <span>Estimated Value</span>
                    <strong>{formatPrice(quote.finalPrice)}</strong>
                  </div>
                </div>
              </>
            ) : (
              <p className={styles.emptySummary}>
                Quote details will appear here after device evaluation.
              </p>
            )}

            {selectedAddress && (
              <div className={styles.miniSummary}>
                <span>Pickup Address</span>
                <strong>
                  {selectedAddress.type} · {selectedAddress.pincode}
                </strong>
              </div>
            )}

            {selectedDate && selectedSlotCode && (
              <div className={styles.miniSummary}>
                <span>Pickup</span>
                <strong>
                  {selectedDate} ·{" "}
                  {slots.find((slot) => slot.code === selectedSlotCode)?.label}
                </strong>
              </div>
            )}

            <div className={styles.notice}>
              Final payout can change only if the physical device condition differs
              from the answers submitted during evaluation.
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
