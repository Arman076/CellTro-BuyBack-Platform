"use client";

import Link from "next/link";

import {
  ChevronDown,
  ChevronRight,
  LocateFixed,
  MapPin,
  Menu,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import DeviceSearch from "@/components/customer/DeviceSearch";

type Category = {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  displayOrder: number;
};

type PincodePostOffice = {
  Name?: string;
  District?: string;
  State?: string;
  Division?: string;
  Region?: string;
};

type PincodeResponse = {
  Status?: string;
  Message?: string;
  PostOffice?: PincodePostOffice[] | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

export default function CustomerHeader() {
  const [location, setLocation] =
    useState("Choose Location");

  const [locationOpen, setLocationOpen] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [manualLocation, setManualLocation] =
    useState("");

  const [detecting, setDetecting] =
    useState(false);

  const [savingLocation, setSavingLocation] =
    useState(false);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [
    categoriesLoading,
    setCategoriesLoading,
  ] = useState(true);

  /* =========================
     LOAD SAVED LOCATION
  ========================= */

  useEffect(() => {
    const savedLocation =
      localStorage.getItem(
        "customerLocation",
      );

    if (savedLocation) {
      setLocation(savedLocation);
    }
  }, []);

  /* =========================
     LOAD CATEGORIES
  ========================= */

  useEffect(() => {
    async function loadCategories() {
      try {
        setCategoriesLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/categories`,
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load categories",
          );
        }

        const data: Category[] =
          await response.json();

        const activeCategories = data
          .filter(
            (category) =>
              category.isActive,
          )
          .sort(
            (a, b) =>
              a.displayOrder -
              b.displayOrder,
          );

        setCategories(activeCategories);
      } catch (error) {
        console.error(
          "Header category error:",
          error,
        );

        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    }

    void loadCategories();
  }, []);

  /* =========================
     LOCK BODY SCROLL
  ========================= */

  useEffect(() => {
    if (
      menuOpen ||
      locationOpen
    ) {
      document.body.style.overflow =
        "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [
    menuOpen,
    locationOpen,
  ]);

  /* =========================
     STORE LOCATION
  ========================= */

  function storeLocation(
    value: string,
  ) {
    setLocation(value);

    localStorage.setItem(
      "customerLocation",
      value,
    );

    setManualLocation("");
    setLocationOpen(false);
  }

  /* =========================
     REVERSE GEOCODING
  ========================= */

  async function reverseGeocode(
    latitude: number,
    longitude: number,
  ) {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      );

      if (!response.ok) {
        throw new Error(
          "Reverse geocoding failed",
        );
      }

      const data =
        await response.json();

      const possibleValues = [
        data.locality,
        data.city,
        data.localityInfo
          ?.administrative?.[2]
          ?.name,
        data.principalSubdivision,
      ].filter(
        (value): value is string =>
          typeof value === "string" &&
          value.trim().length > 0,
      );

      const uniqueValues =
        possibleValues.filter(
          (
            value,
            index,
            array,
          ) =>
            array.findIndex(
              (item) =>
                item.toLowerCase() ===
                value.toLowerCase(),
            ) === index,
        );

      if (
        uniqueValues.length === 0
      ) {
        return "Current Location";
      }

      return uniqueValues
        .slice(0, 3)
        .join(", ");
    } catch (error) {
      console.error(
        "Reverse geocoding error:",
        error,
      );

      return "Current Location";
    }
  }

  /* =========================
     CURRENT LOCATION
  ========================= */

  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      alert(
        "Location service is not supported by this browser.",
      );

      return;
    }

    setDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const readableLocation =
          await reverseGeocode(
            position.coords.latitude,
            position.coords.longitude,
          );

        storeLocation(
          readableLocation,
        );

        setDetecting(false);
      },

      () => {
        setDetecting(false);

        alert(
          "Location permission was not granted. Please enter your city or pincode manually.",
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }

  /* =========================
     PINCODE LOOKUP
  ========================= */

  async function saveLocation(
    value: string,
  ) {
    const cleanValue =
      value.trim();

    if (!cleanValue) {
      return;
    }

    /*
      If user enters a six digit
      Indian pincode, resolve it.
    */

    if (
      /^\d{6}$/.test(
        cleanValue,
      )
    ) {
      try {
        setSavingLocation(true);

        const response = await fetch(
          `https://api.postalpincode.in/pincode/${cleanValue}`,
        );

        if (!response.ok) {
          throw new Error(
            "Pincode lookup failed",
          );
        }

        const data: PincodeResponse[] =
          await response.json();

        const result =
          data?.[0];

        const offices =
          result?.PostOffice;

        if (
          !offices ||
          offices.length === 0
        ) {
          alert(
            "Pincode not found. Please check and try again.",
          );

          return;
        }

        /*
          Example 400037 can have
          multiple post offices.

          We collect first two unique
          locality names so user sees
          useful human-readable area.
        */

        const localityNames =
          offices
            .map(
              (office) =>
                office.Name?.trim(),
            )
            .filter(
              (
                name,
              ): name is string =>
                Boolean(name),
            )
            .filter(
              (
                name,
                index,
                array,
              ) =>
                array.findIndex(
                  (item) =>
                    item.toLowerCase() ===
                    name.toLowerCase(),
                ) === index,
            )
            .slice(0, 2);

        const district =
          offices[0]?.District?.trim();

        const parts = [
          ...localityNames,
          district,
        ].filter(Boolean);

        const readableLocation =
          `${parts.join(", ")} - ${cleanValue}`;

        storeLocation(
          readableLocation,
        );
      } catch (error) {
        console.error(
          "Pincode lookup error:",
          error,
        );

        alert(
          "Unable to resolve this pincode right now.",
        );
      } finally {
        setSavingLocation(false);
      }

      return;
    }

    /*
      User typed a city/locality
      manually.
    */

    storeLocation(
      cleanValue,
    );
  }

  return (
    <>
      <header className="celtro-header">

        {/* =====================
            TOP ROW
        ===================== */}

        <div className="celtro-header-main">

          <Link
            href="/"
            className="celtro-logo"
            aria-label="CELLTRO Home"
          >
            <span className="celtro-logo-mark">
              C
            </span>

            <span className="celtro-logo-copy">
              <strong>
                CELLTRO
              </strong>

              <small>
                Sell Smart. Sell Easy.
              </small>
            </span>
          </Link>


          {/* DESKTOP SEARCH */}

          <div className="celtro-desktop-search">
            <DeviceSearch
              variant="header"
              placeholder="Search for your device..."
            />
          </div>


          {/* ACTIONS */}

          <div className="celtro-header-actions">

            <button
              type="button"
              className="celtro-location-button"
              onClick={() =>
                setLocationOpen(true)
              }
            >
              <MapPin size={17} />

              <span>
                {location}
              </span>

              <ChevronDown
                size={15}
              />
            </button>


            <Link
              href="/#sell-by-category"
              className="celtro-sell-link"
            >
              Sell Device

              <ChevronDown
                size={14}
              />
            </Link>


            <button
              type="button"
              className="celtro-login-button"
            >
              <UserRound
                size={17}
              />

              <span>
                Login
              </span>
            </button>


            <button
              type="button"
              className="celtro-menu-button"
              onClick={() =>
                setMenuOpen(true)
              }
              aria-label="Open menu"
              aria-expanded={
                menuOpen
              }
            >
              <Menu size={23} />
            </button>

          </div>

        </div>


        {/* =====================
            MOBILE SEARCH
        ===================== */}

        <div className="celtro-mobile-device-search">
          <DeviceSearch
            variant="header"
            placeholder="Search phone, laptop, watch..."
          />
        </div>


        {/* =====================
            MOBILE ACTIONS
        ===================== */}

        <div className="celtro-mobile-actions">

          <button
            type="button"
            className="celtro-mobile-location"
            onClick={() =>
              setLocationOpen(true)
            }
          >
            <MapPin size={17} />

            <span>
              {location}
            </span>
          </button>


          <Link
            href="/#sell-by-category"
            className="celtro-mobile-sell"
          >
            Sell Device

            <ChevronRight
              size={16}
            />
          </Link>

        </div>

      </header>


      {/* =========================
          MOBILE MENU
      ========================= */}

      {menuOpen && (
        <div
          className="celtro-menu-overlay"
          onClick={() =>
            setMenuOpen(false)
          }
        >
          <aside
            className="celtro-menu-panel"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="celtro-menu-header">

              <Link
                href="/"
                className="celtro-menu-logo"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                <span>
                  C
                </span>

                <strong>
                  CELLTRO
                </strong>
              </Link>


              <button
                type="button"
                onClick={() =>
                  setMenuOpen(false)
                }
                aria-label="Close menu"
              >
                <X size={22} />
              </button>

            </div>


            <div className="celtro-menu-title">

              <span>
                SELL YOUR DEVICE
              </span>

              <h2>
                Choose Category
              </h2>

            </div>


            <nav
              className="celtro-category-menu"
              aria-label="Device categories"
            >

              {categoriesLoading && (
                <p className="celtro-menu-message">
                  Loading categories...
                </p>
              )}


              {!categoriesLoading &&
                categories.length === 0 && (
                  <p className="celtro-menu-message">
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


            <div className="celtro-menu-divider" />


            <button
              type="button"
              className="celtro-menu-location"
              onClick={() => {
                setMenuOpen(false);
                setLocationOpen(true);
              }}
            >
              <MapPin size={19} />

              <span>
                <small>
                  Your Location
                </small>

                <strong>
                  {location}
                </strong>
              </span>

              <ChevronRight
                size={18}
              />
            </button>


            <button
              type="button"
              className="celtro-menu-login"
            >
              <UserRound
                size={19}
              />

              Login / Register
            </button>

          </aside>
        </div>
      )}


      {/* =========================
          LOCATION MODAL
      ========================= */}

      {locationOpen && (
        <div
          className="celtro-location-overlay"
          onClick={() =>
            setLocationOpen(false)
          }
        >
          <div
            className="celtro-location-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="celtro-location-header">

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
                onClick={() =>
                  setLocationOpen(false)
                }
                aria-label="Close location"
              >
                <X size={21} />
              </button>

            </div>


            <button
              type="button"
              className="celtro-detect-location"
              onClick={
                detectCurrentLocation
              }
              disabled={detecting}
            >
              <LocateFixed
                size={21}
              />

              <span>
                <strong>
                  {detecting
                    ? "Detecting location..."
                    : "Use Current Location"}
                </strong>

                <small>
                  Show nearby area instead
                  of coordinates
                </small>
              </span>
            </button>


            <div className="celtro-location-divider">
              <span>
                OR
              </span>
            </div>


            <label
              htmlFor="celtro-location-input"
              className="celtro-location-label"
            >
              Enter city or pincode
            </label>


            <div className="celtro-location-input">

              <MapPin size={19} />

              <input
                id="celtro-location-input"
                type="text"
                value={manualLocation}
                placeholder="Mumbai or 400037"
                onChange={(event) =>
                  setManualLocation(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    void saveLocation(
                      manualLocation,
                    );
                  }
                }}
              />

            </div>


            <button
              type="button"
              className="celtro-save-location"
              disabled={
                !manualLocation.trim() ||
                savingLocation
              }
              onClick={() =>
                void saveLocation(
                  manualLocation,
                )
              }
            >
              {savingLocation
                ? "Finding location..."
                : "Save Location"}
            </button>

          </div>
        </div>
      )}
    </>
  );
}