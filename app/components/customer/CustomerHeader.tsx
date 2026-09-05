"use client";

import Link from "next/link";
import {
  LocateFixed,
  MapPin,
  Menu,
  Search,
  UserRound,
  X,
  ChevronRight,
} from "lucide-react";

import { useEffect, useState } from "react";

type Category = {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  displayOrder: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function CustomerHeader() {
  const [location, setLocation] = useState("Choose Location");
  const [locationOpen, setLocationOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [manualLocation, setManualLocation] = useState("");
  const [detecting, setDetecting] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    const savedLocation =
      localStorage.getItem("customerLocation");

    if (savedLocation) {
      setLocation(savedLocation);
    }
  }, []);

  useEffect(() => {
    async function loadCategories() {
      try {
        setCategoriesLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/categories`,
        );

        if (!response.ok) {
          throw new Error("Failed to load categories");
        }

        const data: Category[] = await response.json();

        const activeCategories = data
          .filter((category) => category.isActive)
          .sort(
            (a, b) =>
              a.displayOrder - b.displayOrder,
          );

        setCategories(activeCategories);
      } catch (error) {
        console.error(
          "Header category load error:",
          error,
        );

        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    }

    loadCategories();
  }, []);

  function saveLocation(value: string) {
    const cleanValue = value.trim();

    if (!cleanValue) {
      return;
    }

    setLocation(cleanValue);

    localStorage.setItem(
      "customerLocation",
      cleanValue,
    );

    setManualLocation("");
    setLocationOpen(false);
  }

  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      alert(
        "Location service is not supported by this browser.",
      );

      return;
    }

    setDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude =
          position.coords.latitude.toFixed(4);

        const longitude =
          position.coords.longitude.toFixed(4);

        const detectedLocation =
          `${latitude}, ${longitude}`;

        setLocation(detectedLocation);

        localStorage.setItem(
          "customerLocation",
          detectedLocation,
        );

        setDetecting(false);
        setLocationOpen(false);
      },

      () => {
        setDetecting(false);

        alert(
          "Location permission was not granted. Enter your city or pincode manually.",
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }

  return (
    <>
      <header className="customer-header">

        {/* DESKTOP / MOBILE TOP ROW */}

        <div className="header-container">

          <Link
            href="/"
            className="customer-logo"
          >
            <span className="logo-mark">
              C
            </span>

            <span className="logo-text">
              <strong>YourBrand</strong>

              <small>
                Sell Smart. Sell Easy.
              </small>
            </span>
          </Link>

          {/* Desktop Search */}

          <div className="header-search">
            <Search size={19} />

            <input
              type="search"
              placeholder="Search your device..."
              aria-label="Search your device"
            />
          </div>

          {/* Desktop Actions */}

          <div className="header-actions">

            <button
              type="button"
              className="location-button desktop-location"
              onClick={() =>
                setLocationOpen(true)
              }
            >
              <MapPin size={18} />

              <span>
                <small>Your Location</small>

                <strong>
                  {location}
                </strong>
              </span>
            </button>

            <Link
              href="/#sell-by-category"
              className="sell-button"
            >
              Sell Device
            </Link>

            <button
              type="button"
              className="login-button"
            >
              <UserRound size={18} />
              <span>Login</span>
            </button>

            {/* MOBILE HAMBURGER */}

            <button
              type="button"
              className="mobile-menu-button"
              onClick={() =>
                setMenuOpen(true)
              }
              aria-label="Open menu"
            >
              <Menu size={23} />
            </button>

          </div>

        </div>

        {/* MOBILE SEARCH */}

        <div className="mobile-search">

          <Search size={18} />

          <input
            type="search"
            placeholder="Search phone, laptop, watch..."
            aria-label="Search devices"
          />

        </div>

        {/* MOBILE LOCATION + SELL ONLY */}

        <div className="mobile-header-actions">

          <button
            type="button"
            className="mobile-location-action"
            onClick={() =>
              setLocationOpen(true)
            }
          >
            <MapPin size={18} />

            <span>
              <small>
                Your Location
              </small>

              <strong>
                {location === "Choose Location"
                  ? "Choose Location"
                  : location}
              </strong>
            </span>
          </button>

          <Link
            href="/#sell-by-category"
            className="mobile-sell-action"
          >
            Sell Device
          </Link>

        </div>

      </header>

      {/* ======================
          MOBILE MENU
      ====================== */}

      {menuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() =>
            setMenuOpen(false)
          }
        >
          <aside
            className="mobile-menu-panel"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mobile-menu-header">

              <div>
                <span>
                  MENU
                </span>

                <h2>
                  Sell Your Device
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMenuOpen(false)
                }
                aria-label="Close menu"
              >
                <X size={21} />
              </button>

            </div>

            <div className="mobile-menu-section-title">
              Categories
            </div>

            <nav className="mobile-category-menu">

              {categoriesLoading && (
                <p className="menu-message">
                  Loading categories...
                </p>
              )}

              {!categoriesLoading &&
                categories.length === 0 && (
                  <p className="menu-message">
                    No categories available
                  </p>
                )}

              {categories.map(
                (category) => (
                  <Link
                    key={category.id}
                    href={`/sell/${category.slug}`}
                    onClick={() =>
                      setMenuOpen(false)
                    }
                  >
                    <span>
                      {category.name}
                    </span>

                    <ChevronRight
                      size={18}
                    />
                  </Link>
                ),
              )}

            </nav>

            <div className="mobile-menu-divider" />

            <button
              type="button"
              className="menu-location-button"
              onClick={() => {
                setMenuOpen(false);
                setLocationOpen(true);
              }}
            >
              <MapPin size={19} />

              <span>
                <small>
                  Current Location
                </small>

                <strong>
                  {location}
                </strong>
              </span>

              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              className="menu-login-button"
            >
              <UserRound size={19} />

              Login / Register
            </button>

          </aside>
        </div>
      )}

      {/* ======================
          LOCATION MODAL
      ====================== */}

      {locationOpen && (
        <div
          className="location-modal-overlay"
          onClick={() =>
            setLocationOpen(false)
          }
        >
          <div
            className="location-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="location-modal-header">

              <div>
                <span>
                  YOUR LOCATION
                </span>

                <h2>
                  Select your location
                </h2>
              </div>

              <button
                type="button"
                className="location-modal-close"
                onClick={() =>
                  setLocationOpen(false)
                }
              >
                <X size={21} />
              </button>

            </div>

            <button
              type="button"
              className="detect-location-button"
              onClick={
                detectCurrentLocation
              }
              disabled={detecting}
            >
              <LocateFixed size={20} />

              <span>
                <strong>
                  {detecting
                    ? "Detecting location..."
                    : "Use Current Location"}
                </strong>

                <small>
                  Allow browser location
                  access
                </small>
              </span>
            </button>

            <div className="location-divider">
              <span>OR</span>
            </div>

            <label
              className="location-input-label"
              htmlFor="manual-location"
            >
              Enter city or pincode
            </label>

            <div className="location-input-group">

              <MapPin size={19} />

              <input
                id="manual-location"
                type="text"
                placeholder="Mumbai or 400001"
                value={manualLocation}
                onChange={(event) =>
                  setManualLocation(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    saveLocation(
                      manualLocation,
                    );
                  }
                }}
              />

            </div>

            <button
              type="button"
              className="save-location-button"
              disabled={
                !manualLocation.trim()
              }
              onClick={() =>
                saveLocation(
                  manualLocation,
                )
              }
            >
              Save Location
            </button>

          </div>
        </div>
      )}
    </>
  );
}