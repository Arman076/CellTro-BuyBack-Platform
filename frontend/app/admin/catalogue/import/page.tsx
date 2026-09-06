'use client';

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ExternalLink,
} from 'lucide-react';

import {
  API_BASE_URL,
} from '@/lib/api';

interface Category {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
}

type ImportStatus =
  | 'NEW_MODEL'
  | 'NEW_VARIANT'
  | 'MODEL_UPDATE'
  | 'PRICE_UPDATE'
  | 'NO_CHANGE'
  | 'INVALID';

interface ValidationRow {
  rowNumber: number;

  brand: string;

  series:
    string | null;

  model: string;

  attributes:
    Record<
      string,
      string
    >;

  basePrice:
    number | null;

  imageUrl:
    string | null;

  active:
    boolean;

  status:
    ImportStatus;

  oldPrice?:
    number;

  newPrice?:
    number;

  message:
    string;
}

interface ValidationResponse {
  category: {
    id: number;
    name: string;
  };

  summary: {
    totalRows: number;

    validRows: number;

    invalidRows: number;

    newModels: number;

    newVariants: number;

    modelUpdates: number;

    priceUpdates: number;

    noChange: number;
  };

  rows:
    ValidationRow[];
}

interface ImportResult {
  createdModels: number;

  updatedModels: number;

  createdVariants: number;

  updatedVariants: number;

  skippedNoChange: number;
}

export default function CatalogueImportPage() {
  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>(
      [],
    );

  const [
    categoryId,
    setCategoryId,
  ] =
    useState<number>(
      0,
    );

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    validation,
    setValidation,
  ] =
    useState<ValidationResponse | null>(
      null,
    );

  const [
    loadingCategories,
    setLoadingCategories,
  ] =
    useState(
      true,
    );

  const [
    downloading,
    setDownloading,
  ] =
    useState(
      false,
    );

  const [
    validating,
    setValidating,
  ] =
    useState(
      false,
    );

  const [
    confirming,
    setConfirming,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState(
      '',
    );

  const [
    importResult,
    setImportResult,
  ] =
    useState<ImportResult | null>(
      null,
    );

  useEffect(() => {
    const loadCategories =
      async () => {
        try {
          setLoadingCategories(
            true,
          );

          setError(
            '',
          );

          const response =
            await fetch(
              `${API_BASE_URL}/categories`,
              {
                cache:
                  'no-store',
              },
            );

          if (
            !response.ok
          ) {
            throw new Error(
              'Unable to load categories',
            );
          }

          const data:
            Category[] =
            await response.json();

          const activeCategories =
            data.filter(
              (
                category,
              ) =>
                category.isActive,
            );

          setCategories(
            activeCategories,
          );

          if (
            activeCategories.length >
            0
          ) {
            setCategoryId(
              activeCategories[
                0
              ].id,
            );
          }
        } catch (
          err
        ) {
          setError(
            err instanceof
              Error
              ? err.message
              : 'Unable to load categories',
          );
        } finally {
          setLoadingCategories(
            false,
          );
        }
      };

    void loadCategories();
  }, []);

  const downloadTemplate =
    async () => {
      if (
        !categoryId
      ) {
        setError(
          'Please select a category',
        );

        return;
      }

      try {
        setDownloading(
          true,
        );

        setError(
          '',
        );

        const response =
          await fetch(
            `${API_BASE_URL}/catalogue-import/template/${categoryId}`,
          );

        if (
          !response.ok
        ) {
          const data =
            await response
              .json()
              .catch(
                () =>
                  null,
              );

          throw new Error(
            data?.message ??
              'Unable to download template',
          );
        }

        const blob =
          await response.blob();

        const url =
          window.URL.createObjectURL(
            blob,
          );

        const contentDisposition =
          response.headers.get(
            'content-disposition',
          );

        let fileName =
          'catalogue-template.xlsx';

        const match =
          contentDisposition?.match(
            /filename="(.+)"/,
          );

        if (
          match?.[1]
        ) {
          fileName =
            match[1];
        }

        const anchor =
          document.createElement(
            'a',
          );

        anchor.href =
          url;

        anchor.download =
          fileName;

        document.body.appendChild(
          anchor,
        );

        anchor.click();

        anchor.remove();

        window.URL.revokeObjectURL(
          url,
        );
      } catch (
        err
      ) {
        setError(
          err instanceof
            Error
            ? err.message
            : 'Template download failed',
        );
      } finally {
        setDownloading(
          false,
        );
      }
    };

  const handleFileChange = (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[
        0
      ] ??
      null;

    setSelectedFile(
      file,
    );

    setValidation(
      null,
    );

    setImportResult(
      null,
    );

    setError(
      '',
    );
  };

  const validateFile =
    async () => {
      if (
        !categoryId
      ) {
        setError(
          'Please select a category',
        );

        return;
      }

      if (
        !selectedFile
      ) {
        setError(
          'Please select an Excel file',
        );

        return;
      }

      try {
        setValidating(
          true,
        );

        setError(
          '',
        );

        setValidation(
          null,
        );

        setImportResult(
          null,
        );

        const formData =
          new FormData();

        formData.append(
          'file',
          selectedFile,
        );

        const response =
          await fetch(
            `${API_BASE_URL}/catalogue-import/validate/${categoryId}`,
            {
              method:
                'POST',

              body:
                formData,
            },
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            Array.isArray(
              data.message,
            )
              ? data.message.join(
                  ', ',
                )
              : data.message ??
                  'Validation failed',
          );
        }

        setValidation(
          data,
        );
      } catch (
        err
      ) {
        setError(
          err instanceof
            Error
            ? err.message
            : 'Validation failed',
        );
      } finally {
        setValidating(
          false,
        );
      }
    };

  const confirmImport =
    async () => {
      if (
        !categoryId ||
        !selectedFile ||
        !validation
      ) {
        setError(
          'Validate the Excel file first.',
        );

        return;
      }

      if (
        validation.summary
          .invalidRows >
        0
      ) {
        setError(
          'Fix all invalid rows before confirming the import.',
        );

        return;
      }

      const approved =
        window.confirm(
          'Confirm catalogue import? Models, Series mapping, Image URL, variants and prices may be created or updated.',
        );

      if (
        !approved
      ) {
        return;
      }

      try {
        setConfirming(
          true,
        );

        setError(
          '',
        );

        setImportResult(
          null,
        );

        const formData =
          new FormData();

        formData.append(
          'file',
          selectedFile,
        );

        const response =
          await fetch(
            `${API_BASE_URL}/catalogue-import/confirm/${categoryId}`,
            {
              method:
                'POST',

              body:
                formData,
            },
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          const message =
            typeof data?.message ===
            'string'
              ? data.message
              : data?.message
                    ?.message ??
                'Catalogue import failed';

          throw new Error(
            message,
          );
        }

        setImportResult(
          data.summary,
        );

        /*
         * Revalidate after import
         */
        const refreshData =
          new FormData();

        refreshData.append(
          'file',
          selectedFile,
        );

        const refreshedResponse =
          await fetch(
            `${API_BASE_URL}/catalogue-import/validate/${categoryId}`,
            {
              method:
                'POST',

              body:
                refreshData,
            },
          );

        if (
          refreshedResponse.ok
        ) {
          setValidation(
            await refreshedResponse.json(),
          );
        }
      } catch (
        err
      ) {
        setError(
          err instanceof
            Error
            ? err.message
            : 'Catalogue import failed',
        );
      } finally {
        setConfirming(
          false,
        );
      }
    };

  const attributeNames =
    useMemo(
      () => {
        if (
          !validation ||
          validation.rows
            .length ===
            0
        ) {
          return [];
        }

        const names =
          new Set<string>();

        for (
          const row
          of validation.rows
        ) {
          for (
            const key
            of Object.keys(
              row.attributes,
            )
          ) {
            names.add(
              key,
            );
          }
        }

        return Array.from(
          names,
        );
      },
      [
        validation,
      ],
    );

  function getStatusStyle(
    status:
      ImportStatus,
  ) {
    switch (
      status
    ) {
      case 'NEW_MODEL':
        return {
          background:
            '#ede9fe',

          color:
            '#5b21b6',
        };

      case 'NEW_VARIANT':
        return {
          background:
            '#dcfce7',

          color:
            '#166534',
        };

      case 'MODEL_UPDATE':
        return {
          background:
            '#dbeafe',

          color:
            '#1d4ed8',
        };

      case 'PRICE_UPDATE':
        return {
          background:
            '#fef3c7',

          color:
            '#92400e',
        };

      case 'NO_CHANGE':
        return {
          background:
            '#e0f2fe',

          color:
            '#075985',
        };

      case 'INVALID':
        return {
          background:
            '#fee2e2',

          color:
            '#991b1b',
        };
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">
          Catalogue Import
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Bulk upload models,
          Series, variants,
          Base Price and S3 /
          CloudFront Image URLs
          using Excel.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mb-5 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          1. Select Category
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Excel columns are
          generated dynamically
          based on the selected
          category.
        </p>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium">
              Category
            </label>

            <select
              value={
                categoryId
              }
              disabled={
                loadingCategories
              }
              onChange={(
                event,
              ) => {
                setCategoryId(
                  Number(
                    event.target
                      .value,
                  ),
                );

                setSelectedFile(
                  null,
                );

                setValidation(
                  null,
                );

                setImportResult(
                  null,
                );
              }}
              className="w-full rounded-xl border px-3 py-2.5"
            >
              <option value={0}>
                Select Category
              </option>

              {categories.map(
                (
                  category,
                ) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {
                      category.name
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={
              downloadTemplate
            }
            disabled={
              !categoryId ||
              downloading
            }
            className="rounded-xl bg-gray-900 px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading
              ? 'Downloading...'
              : 'Download Excel Template'}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          Excel format:
          <strong>
            {' '}
            Brand | Series |
            Model | Dynamic
            Attributes | Base
            Price | Image URL |
            Active
          </strong>

          <div className="mt-1 text-xs text-blue-700">
            Example for Mobile:
            Brand | Series |
            Model | RAM |
            Storage | Base Price
            | Image URL | Active
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          2. Upload Catalogue
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Upload the completed
          Excel file and validate
          it before importing.
        </p>

        <div className="mt-5 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <input
            id="catalogue-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={
              handleFileChange
            }
            className="hidden"
          />

          <div className="text-lg font-semibold">
            Upload Catalogue
            Excel
          </div>

          <p className="mt-1 text-sm text-gray-500">
            XLSX or XLS
          </p>

          <label
            htmlFor="catalogue-file"
            className="mt-4 inline-block cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Choose Excel File
          </label>

          {selectedFile && (
            <div className="mx-auto mt-5 max-w-lg rounded-xl border bg-white p-4 text-left">
              <p className="text-xs text-gray-500">
                Selected File
              </p>

              <p className="mt-1 break-all font-semibold">
                {
                  selectedFile.name
                }
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {(
                  selectedFile.size /
                  1024 /
                  1024
                ).toFixed(
                  2,
                )}{' '}
                MB
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={
            validateFile
          }
          disabled={
            !selectedFile ||
            !categoryId ||
            validating
          }
          className="mt-5 rounded-xl bg-green-600 px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {validating
            ? 'Validating Excel...'
            : 'Validate Catalogue'}
        </button>
      </section>

      {validation && (
        <>
          <h2 className="mb-3 text-xl font-bold">
            Validation Summary
          </h2>

          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            <SummaryCard
              title="Total"
              value={
                validation
                  .summary
                  .totalRows
              }
            />

            <SummaryCard
              title="Valid"
              value={
                validation
                  .summary
                  .validRows
              }
            />

            <SummaryCard
              title="Invalid"
              value={
                validation
                  .summary
                  .invalidRows
              }
            />

            <SummaryCard
              title="New Models"
              value={
                validation
                  .summary
                  .newModels
              }
            />

            <SummaryCard
              title="New Variants"
              value={
                validation
                  .summary
                  .newVariants
              }
            />

            <SummaryCard
              title="Model Updates"
              value={
                validation
                  .summary
                  .modelUpdates
              }
            />

            <SummaryCard
              title="Price Updates"
              value={
                validation
                  .summary
                  .priceUpdates
              }
            />

            <SummaryCard
              title="No Change"
              value={
                validation
                  .summary
                  .noChange
              }
            />
          </div>

          <section className="mb-5 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  3. Confirm
                  Import
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Creates new
                  models/variants
                  and updates
                  existing prices,
                  Series and Image
                  URLs.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  confirmImport
                }
                disabled={
                  confirming ||
                  validation
                    .summary
                    .invalidRows >
                    0
                }
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {confirming
                  ? 'Importing...'
                  : 'Confirm Import'}
              </button>
            </div>

            {validation
              .summary
              .invalidRows >
              0 && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Fix all INVALID
                rows before
                confirming the
                import.
              </div>
            )}
          </section>

          {importResult && (
            <section className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-5">
              <h2 className="font-bold text-green-800">
                Catalogue Imported
                Successfully
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                <SummaryCard
                  title="Models Created"
                  value={
                    importResult
                      .createdModels
                  }
                />

                <SummaryCard
                  title="Models Updated"
                  value={
                    importResult
                      .updatedModels
                  }
                />

                <SummaryCard
                  title="Variants Created"
                  value={
                    importResult
                      .createdVariants
                  }
                />

                <SummaryCard
                  title="Variants Updated"
                  value={
                    importResult
                      .updatedVariants
                  }
                />

                <SummaryCard
                  title="No Change"
                  value={
                    importResult
                      .skippedNoChange
                  }
                />
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold">
                Validation Preview
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Review Series,
                model,
                attributes,
                price and image
                before importing.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1400px] w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <TableHeader>
                      Row
                    </TableHeader>

                    <TableHeader>
                      Brand
                    </TableHeader>

                    <TableHeader>
                      Series
                    </TableHeader>

                    <TableHeader>
                      Model
                    </TableHeader>

                    {attributeNames.map(
                      (
                        name,
                      ) => (
                        <TableHeader
                          key={
                            name
                          }
                        >
                          {
                            name
                          }
                        </TableHeader>
                      ),
                    )}

                    <TableHeader>
                      Active
                    </TableHeader>

                    <TableHeader>
                      Old Price
                    </TableHeader>

                    <TableHeader>
                      New Price
                    </TableHeader>

                    <TableHeader>
                      Image URL
                    </TableHeader>

                    <TableHeader>
                      Status
                    </TableHeader>

                    <TableHeader>
                      Message
                    </TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {validation.rows.map(
                    (
                      row,
                    ) => (
                      <tr
                        key={
                          row.rowNumber
                        }
                        className="border-t"
                      >
                        <TableCell>
                          {
                            row.rowNumber
                          }
                        </TableCell>

                        <TableCell>
                          {row.brand ||
                            '-'}
                        </TableCell>

                        <TableCell>
                          {row.series ||
                            '-'}
                        </TableCell>

                        <TableCell>
                          {row.model ||
                            '-'}
                        </TableCell>

                        {attributeNames.map(
                          (
                            name,
                          ) => (
                            <TableCell
                              key={
                                name
                              }
                            >
                              {row
                                .attributes[
                                name
                              ] ||
                                '-'}
                            </TableCell>
                          ),
                        )}

                        <TableCell>
                          {row.active
                            ? 'Yes'
                            : 'No'}
                        </TableCell>

                        <TableCell>
                          {row.oldPrice !==
                          undefined
                            ? `₹${row.oldPrice.toLocaleString(
                                'en-IN',
                              )}`
                            : '-'}
                        </TableCell>

                        <TableCell>
                          {row.newPrice !==
                          undefined
                            ? `₹${row.newPrice.toLocaleString(
                                'en-IN',
                              )}`
                            : row.basePrice !==
                                null
                              ? `₹${row.basePrice.toLocaleString(
                                  'en-IN',
                                )}`
                              : '-'}
                        </TableCell>

                        <TableCell>
                          {row.imageUrl ? (
                            <a
                              href={
                                row.imageUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                            >
                              View Image
                              <ExternalLink
                                size={
                                  13
                                }
                              />
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>

                        <TableCell>
                          <span
                            style={{
                              ...getStatusStyle(
                                row.status,
                              ),
                            }}
                            className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
                          >
                            {
                              row.status
                            }
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="whitespace-normal">
                            {
                              row.message
                            }
                          </span>
                        </TableCell>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-gray-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function TableHeader({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-700">
      {children}
    </th>
  );
}

function TableCell({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-sm align-top">
      {children}
    </td>
  );
}