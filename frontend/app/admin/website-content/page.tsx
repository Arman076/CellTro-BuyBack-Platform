'use client';

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Edit3,
  FileText,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type SiteSettings = {
  id?: number;
  companyName: string;
  tagline: string;
  supportPhone: string;
  whatsappNumber: string;
  supportEmail: string;
  businessEmail: string;
  officeAddress: string;
  city: string;
  state: string;
  pincode: string;
  businessHours: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
};

type TermsSection = {
  id: number;
  title: string;
  content: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type TermsForm = {
  title: string;
  content: string;
  displayOrder: number;
  isActive: boolean;
};

const emptySettings: SiteSettings = {
  companyName: 'CELLTRO',
  tagline: 'Sell Smart. Sell Easy.',
  supportPhone: '',
  whatsappNumber: '',
  supportEmail: '',
  businessEmail: '',
  officeAddress: '',
  city: '',
  state: '',
  pincode: '',
  businessHours: '',
  facebookUrl: '',
  instagramUrl: '',
  linkedinUrl: '',
  youtubeUrl: '',
};

const emptyTermsForm: TermsForm = {
  title: '',
  content: '',
  displayOrder: 0,
  isActive: true,
};

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-4 focus:ring-gray-100';

export default function WebsiteContentPage() {
  const [form, setForm] =
    useState<SiteSettings>(emptySettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [terms, setTerms] = useState<TermsSection[]>([]);
  const [termsLoading, setTermsLoading] = useState(true);

  const [showTermsForm, setShowTermsForm] = useState(false);
  const [editingTermsId, setEditingTermsId] =
    useState<number | null>(null);

  const [termsForm, setTermsForm] =
    useState<TermsForm>(emptyTermsForm);

  const [termsSaving, setTermsSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  /* =======================================================
     SITE SETTINGS
  ======================================================= */

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/site-settings`,
        {
          cache: 'no-store',
        },
      );

      if (!response.ok) {
        throw new Error(
          'Unable to load website settings.',
        );
      }

      const data = await response.json();

      setForm({
        id: data.id,
        companyName: data.companyName ?? 'CELLTRO',
        tagline:
          data.tagline ?? 'Sell Smart. Sell Easy.',
        supportPhone: data.supportPhone ?? '',
        whatsappNumber: data.whatsappNumber ?? '',
        supportEmail: data.supportEmail ?? '',
        businessEmail: data.businessEmail ?? '',
        officeAddress: data.officeAddress ?? '',
        city: data.city ?? '',
        state: data.state ?? '',
        pincode: data.pincode ?? '',
        businessHours: data.businessHours ?? '',
        facebookUrl: data.facebookUrl ?? '',
        instagramUrl: data.instagramUrl ?? '',
        linkedinUrl: data.linkedinUrl ?? '',
        youtubeUrl: data.youtubeUrl ?? '',
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load website settings.',
      );
    }
  }, []);

  /* =======================================================
     TERMS
  ======================================================= */

  const loadTerms = useCallback(async () => {
    setTermsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/terms-sections`,
        {
          cache: 'no-store',
        },
      );

      if (!response.ok) {
        throw new Error(
          'Unable to load Terms & Conditions.',
        );
      }

      const data = await response.json();

      setTerms(
        Array.isArray(data) ? data : [],
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load Terms & Conditions.',
      );
    } finally {
      setTermsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function initialize() {
      setLoading(true);

      await Promise.all([
        loadSettings(),
        loadTerms(),
      ]);

      setLoading(false);
    }

    void initialize();
  }, [loadSettings, loadTerms]);

  function updateField(
    field: keyof SiteSettings,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccessMessage('');
    setErrorMessage('');
  }

  async function handleSettingsSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const payload = {
        companyName: form.companyName.trim(),
        tagline: form.tagline.trim(),

        supportPhone:
          form.supportPhone.trim() || undefined,

        whatsappNumber:
          form.whatsappNumber.trim() || undefined,

        supportEmail:
          form.supportEmail.trim() || undefined,

        businessEmail:
          form.businessEmail.trim() || undefined,

        officeAddress:
          form.officeAddress.trim() || undefined,

        city:
          form.city.trim() || undefined,

        state:
          form.state.trim() || undefined,

        pincode:
          form.pincode.trim() || undefined,

        businessHours:
          form.businessHours.trim() || undefined,

        facebookUrl:
          form.facebookUrl.trim() || undefined,

        instagramUrl:
          form.instagramUrl.trim() || undefined,

        linkedinUrl:
          form.linkedinUrl.trim() || undefined,

        youtubeUrl:
          form.youtubeUrl.trim() || undefined,
      };

      const response = await fetch(
        `${API_URL}/site-settings`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        const message = Array.isArray(result?.message)
          ? result.message.join(', ')
          : result?.message;

        throw new Error(
          message ||
            'Unable to save website settings.',
        );
      }

      setSuccessMessage(
        'Website information updated successfully.',
      );

      await loadSettings();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save website settings.',
      );
    } finally {
      setSaving(false);
    }
  }

  function openAddTerms() {
    const nextOrder =
      terms.length > 0
        ? Math.max(
            ...terms.map(
              (item) => item.displayOrder,
            ),
          ) + 1
        : 1;

    setEditingTermsId(null);

    setTermsForm({
      ...emptyTermsForm,
      displayOrder: nextOrder,
    });

    setShowTermsForm(true);
    setErrorMessage('');
    setSuccessMessage('');
  }

  function openEditTerms(section: TermsSection) {
    setEditingTermsId(section.id);

    setTermsForm({
      title: section.title,
      content: section.content,
      displayOrder: section.displayOrder,
      isActive: section.isActive,
    });

    setShowTermsForm(true);
    setErrorMessage('');
    setSuccessMessage('');
  }

  function closeTermsForm() {
    setShowTermsForm(false);
    setEditingTermsId(null);
    setTermsForm(emptyTermsForm);
  }

  async function saveTerms(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setTermsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        title: termsForm.title.trim(),
        content: termsForm.content.trim(),
        displayOrder:
          Number(termsForm.displayOrder) || 0,
        isActive: termsForm.isActive,
      };

      if (!payload.title) {
        throw new Error(
          'Terms section title is required.',
        );
      }

      if (!payload.content) {
        throw new Error(
          'Terms section content is required.',
        );
      }

      const url =
        editingTermsId !== null
          ? `${API_URL}/terms-sections/${editingTermsId}`
          : `${API_URL}/terms-sections`;

      const method =
        editingTermsId !== null
          ? 'PATCH'
          : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const message = Array.isArray(result?.message)
          ? result.message.join(', ')
          : result?.message;

        throw new Error(
          message ||
            'Unable to save Terms & Conditions.',
        );
      }

      setSuccessMessage(
        editingTermsId !== null
          ? 'Terms section updated successfully.'
          : 'Terms section added successfully.',
      );

      closeTermsForm();

      await loadTerms();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save Terms & Conditions.',
      );
    } finally {
      setTermsSaving(false);
    }
  }

  async function toggleTermsStatus(
    section: TermsSection,
  ) {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(
        `${API_URL}/terms-sections/${section.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isActive: !section.isActive,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          'Unable to update section status.',
        );
      }

      setSuccessMessage(
        !section.isActive
          ? 'Terms section activated.'
          : 'Terms section hidden from customer website.',
      );

      await loadTerms();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update section.',
      );
    }
  }

  async function deleteTerms(
    section: TermsSection,
  ) {
    const confirmed = window.confirm(
      `Delete "${section.title}"?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(section.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(
        `${API_URL}/terms-sections/${section.id}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error(
          'Unable to delete Terms section.',
        );
      }

      setSuccessMessage(
        'Terms section deleted successfully.',
      );

      await loadTerms();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete Terms section.',
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function changeOrder(
    index: number,
    direction: 'up' | 'down',
  ) {
    const targetIndex =
      direction === 'up'
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= terms.length
    ) {
      return;
    }

    const current = terms[index];
    const target = terms[targetIndex];

    try {
      await Promise.all([
        fetch(
          `${API_URL}/terms-sections/${current.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              displayOrder:
                target.displayOrder,
            }),
          },
        ),

        fetch(
          `${API_URL}/terms-sections/${target.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              displayOrder:
                current.displayOrder,
            }),
          },
        ),
      ]);

      await loadTerms();
    } catch {
      setErrorMessage(
        'Unable to change display order.',
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
          <Loader2
            className="animate-spin"
            size={20}
          />

          Loading website settings...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* HEADER */}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Globe2 size={17} />
              WEBSITE MANAGEMENT
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Website Display
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
              Manage CELLTRO business information and
              legal website content from one place.
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white">
            <Settings2 size={23} />
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 size={19} />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {/* BUSINESS SETTINGS */}

      <form
        onSubmit={handleSettingsSubmit}
        className="space-y-6"
      >
        <SettingsSection
          icon={<Building2 size={20} />}
          title="Business Information"
          description="Primary CELLTRO brand information."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Company Name"
              required
            >
              <input
                value={form.companyName}
                onChange={(event) =>
                  updateField(
                    'companyName',
                    event.target.value,
                  )
                }
                required
                className={inputClass}
              />
            </Field>

            <Field label="Tagline">
              <input
                value={form.tagline}
                onChange={(event) =>
                  updateField(
                    'tagline',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<Phone size={20} />}
          title="Customer Support"
          description="Customer contact information."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Support Phone"
              icon={<Phone size={16} />}
            >
              <input
                value={form.supportPhone}
                onChange={(event) =>
                  updateField(
                    'supportPhone',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field
              label="WhatsApp Number"
              icon={
                <MessageCircle size={16} />
              }
            >
              <input
                value={form.whatsappNumber}
                onChange={(event) =>
                  updateField(
                    'whatsappNumber',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field
              label="Support Email"
              icon={<Mail size={16} />}
            >
              <input
                type="email"
                value={form.supportEmail}
                onChange={(event) =>
                  updateField(
                    'supportEmail',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field
              label="Business Email"
              icon={<Mail size={16} />}
            >
              <input
                type="email"
                value={form.businessEmail}
                onChange={(event) =>
                  updateField(
                    'businessEmail',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<MapPin size={20} />}
          title="Office Address"
          description="Business location and operating hours."
        >
          <div className="space-y-5">
            <Field label="Office Address">
              <textarea
                rows={4}
                value={form.officeAddress}
                onChange={(event) =>
                  updateField(
                    'officeAddress',
                    event.target.value,
                  )
                }
                className={`${inputClass} resize-y`}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="City">
                <input
                  value={form.city}
                  onChange={(event) =>
                    updateField(
                      'city',
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="State">
                <input
                  value={form.state}
                  onChange={(event) =>
                    updateField(
                      'state',
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Pincode">
                <input
                  value={form.pincode}
                  maxLength={6}
                  onChange={(event) =>
                    updateField(
                      'pincode',
                      event.target.value.replace(
                        /\D/g,
                        '',
                      ),
                    )
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <Field
              label="Business Hours"
              icon={<Clock3 size={16} />}
            >
              <input
                value={form.businessHours}
                onChange={(event) =>
                  updateField(
                    'businessHours',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<Globe2 size={20} />}
          title="Social Media"
          description="Official social media links."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Facebook URL">
              <input
                type="url"
                value={form.facebookUrl}
                onChange={(event) =>
                  updateField(
                    'facebookUrl',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Instagram URL">
              <input
                type="url"
                value={form.instagramUrl}
                onChange={(event) =>
                  updateField(
                    'instagramUrl',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="LinkedIn URL">
              <input
                type="url"
                value={form.linkedinUrl}
                onChange={(event) =>
                  updateField(
                    'linkedinUrl',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="YouTube URL">
              <input
                type="url"
                value={form.youtubeUrl}
                onChange={(event) =>
                  updateField(
                    'youtubeUrl',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>
          </div>
        </SettingsSection>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <Save size={18} />
            )}

            {saving
              ? 'Saving...'
              : 'Save Business Settings'}
          </button>
        </div>
      </form>

      {/* =====================================================
          TERMS & CONDITIONS
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <FileText size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                Terms & Conditions
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Add, edit, hide, reorder or delete
                customer-facing Terms & Conditions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddTerms}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <Plus size={18} />
            Add Section
          </button>
        </div>

        {showTermsForm && (
          <div className="border-b border-gray-200 bg-gray-50 p-5 sm:p-6">
            <form
              onSubmit={saveTerms}
              className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  {editingTermsId !== null
                    ? 'Edit Terms Section'
                    : 'Add Terms Section'}
                </h3>

                <button
                  type="button"
                  onClick={closeTermsForm}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                >
                  <X size={19} />
                </button>
              </div>

              <Field
                label="Section Title"
                required
              >
                <input
                  value={termsForm.title}
                  onChange={(event) =>
                    setTermsForm(
                      (current) => ({
                        ...current,
                        title:
                          event.target.value,
                      }),
                    )
                  }
                  required
                  maxLength={200}
                  className={inputClass}
                  placeholder="Example: Device Ownership"
                />
              </Field>

              <Field
                label="Content"
                required
              >
                <textarea
                  value={termsForm.content}
                  onChange={(event) =>
                    setTermsForm(
                      (current) => ({
                        ...current,
                        content:
                          event.target.value,
                      }),
                    )
                  }
                  required
                  rows={6}
                  maxLength={10000}
                  className={`${inputClass} resize-y`}
                  placeholder="Enter Terms & Conditions content..."
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Display Order">
                  <input
                    type="number"
                    min={0}
                    value={
                      termsForm.displayOrder
                    }
                    onChange={(event) =>
                      setTermsForm(
                        (current) => ({
                          ...current,
                          displayOrder:
                            Number(
                              event.target
                                .value,
                            ),
                        }),
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                <div>
                  <span className="mb-2 block text-sm font-medium text-gray-700">
                    Status
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setTermsForm(
                        (current) => ({
                          ...current,
                          isActive:
                            !current.isActive,
                        }),
                      )
                    }
                    className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      termsForm.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    {termsForm.isActive
                      ? 'Active'
                      : 'Inactive'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeTermsForm}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={termsSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  {termsSaving ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={18} />
                  )}

                  {termsSaving
                    ? 'Saving...'
                    : editingTermsId !== null
                      ? 'Update Section'
                      : 'Add Section'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="p-5 sm:p-6">
          {termsLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2
                size={20}
                className="mr-2 animate-spin"
              />

              Loading Terms...
            </div>
          ) : terms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
              <FileText
                size={32}
                className="mx-auto mb-3 text-gray-400"
              />

              <p className="font-medium text-gray-700">
                No Terms & Conditions added
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Click Add Section to create your
                first section.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {terms.map(
                (section, index) => (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-gray-200 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                            #{section.displayOrder}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              section.isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {section.isActive
                              ? 'Active'
                              : 'Inactive'}
                          </span>
                        </div>

                        <h3 className="font-semibold text-gray-900">
                          {section.title}
                        </h3>

                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                          {section.content}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() =>
                            changeOrder(
                              index,
                              'up',
                            )
                          }
                          className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                          title="Move Up"
                        >
                          <ChevronUp size={18} />
                        </button>

                        <button
                          type="button"
                          disabled={
                            index ===
                            terms.length - 1
                          }
                          onClick={() =>
                            changeOrder(
                              index,
                              'down',
                            )
                          }
                          className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                          title="Move Down"
                        >
                          <ChevronDown
                            size={18}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleTermsStatus(
                              section,
                            )
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                            section.isActive
                              ? 'border-orange-200 bg-orange-50 text-orange-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {section.isActive
                            ? 'Deactivate'
                            : 'Activate'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEditTerms(
                              section,
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                        >
                          <Edit3 size={15} />
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={
                            deletingId ===
                            section.id
                          }
                          onClick={() =>
                            deleteTerms(
                              section,
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                        >
                          {deletingId ===
                          section.id ? (
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2
                              size={15}
                            />
                          )}

                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
            {icon}
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              {title}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  icon,
  required = false,
  children,
}: {
  label: string;
  icon?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
        {icon}
        {label}

        {required && (
          <span className="text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}