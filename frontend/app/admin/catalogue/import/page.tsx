'use client';

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { API_BASE_URL } from '@/lib/api';

interface Category {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
}

type ImportStatus =
  | 'NEW_MODEL'
  | 'NEW_VARIANT'
  | 'PRICE_UPDATE'
  | 'NO_CHANGE'
  | 'INVALID';

interface ValidationRow {
  rowNumber: number;
  brand: string;
  model: string;

  attributes: Record<
    string,
    string
  >;

  basePrice: number | null;
  active: boolean;

  status: ImportStatus;

  oldPrice?: number;
  newPrice?: number;

  message: string;
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
    priceUpdates: number;
    noChange: number;
  };

  rows: ValidationRow[];
}

interface ImportResult {
  createdModels: number;
  createdVariants: number;
  updatedVariants: number;
  skippedNoChange: number;
}

export default function CatalogueImportPage() {
  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    categoryId,
    setCategoryId,
  ] = useState<number>(0);

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(null);

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
  ] = useState(true);

  const [
    downloading,
    setDownloading,
  ] = useState(false);

  const [
    validating,
    setValidating,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    confirming,
    setConfirming,
  ] = useState(false);

  const [
    importResult,
    setImportResult,
  ] = useState<ImportResult | null>(null);

  useEffect(() => {
    const loadCategories =
      async () => {
        try {
          setLoadingCategories(
            true,
          );

          setError('');

          const response =
            await fetch(
              `${API_BASE_URL}/categories`,
              {
                cache:
                  'no-store',
              },
            );

          if (!response.ok) {
            throw new Error(
              'Unable to load categories',
            );
          }

          const data:
            Category[] =
            await response.json();

          const activeCategories =
            data.filter(
              (category) =>
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
              activeCategories[0]
                .id,
            );
          }
        } catch (err) {
          setError(
            err instanceof Error
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
      if (!categoryId) {
        setError(
          'Please select a category',
        );

        return;
      }

      try {
        setDownloading(true);
        setError('');

        const response =
          await fetch(
            `${API_BASE_URL}/catalogue-import/template/${categoryId}`,
          );

        if (!response.ok) {
          const data =
            await response
              .json()
              .catch(
                () => null,
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

        if (match?.[1]) {
          fileName =
            match[1];
        }

        const anchor =
          document.createElement(
            'a',
          );

        anchor.href = url;
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
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Template download failed',
        );
      } finally {
        setDownloading(false);
      }
    };

  const handleFileChange = (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0] ??
      null;

    setSelectedFile(file);
    setValidation(null);
    setImportResult(null);
    setError('');
  };

  const validateFile =
    async () => {
      if (!categoryId) {
        setError(
          'Please select a category',
        );

        return;
      }

      if (!selectedFile) {
        setError(
          'Please select an Excel file',
        );

        return;
      }

      try {
        setValidating(true);
        setError('');
        setValidation(null);
        setImportResult(null);

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
              method: 'POST',
              body: formData,
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
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

        setValidation(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Validation failed',
        );
      } finally {
        setValidating(false);
      }
    };


  const confirmImport =
    async () => {
      if (!categoryId) {
        setError(
          'Please select a category',
        );

        return;
      }

      if (!selectedFile) {
        setError(
          'Please select an Excel file',
        );

        return;
      }

      if (!validation) {
        setError(
          'Please validate the Excel file first',
        );

        return;
      }

      if (
        validation.summary.invalidRows >
        0
      ) {
        setError(
          'Fix all invalid rows before confirming the import.',
        );

        return;
      }

      const approved =
        window.confirm(
          'Confirm catalogue import? New models and variants will be created and existing prices may be updated.',
        );

      if (!approved) {
        return;
      }

      try {
        setConfirming(true);
        setError('');
        setImportResult(null);

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
              method: 'POST',
              body: formData,
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          const message =
            typeof data?.message ===
            'string'
              ? data.message
              : data?.message?.message ??
                'Catalogue import failed';

          throw new Error(message);
        }

        setImportResult(
          data.summary as ImportResult,
        );

        const revalidateForm =
          new FormData();

        revalidateForm.append(
          'file',
          selectedFile,
        );

        const revalidateResponse =
          await fetch(
            `${API_BASE_URL}/catalogue-import/validate/${categoryId}`,
            {
              method: 'POST',
              body: revalidateForm,
            },
          );

        if (
          revalidateResponse.ok
        ) {
          const refreshed =
            await revalidateResponse.json();

          setValidation(refreshed);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Catalogue import failed',
        );
      } finally {
        setConfirming(false);
      }
    };

  const attributeNames =
    useMemo(() => {
      if (
        !validation ||
        validation.rows.length ===
          0
      ) {
        return [];
      }

      const names =
        new Set<string>();

      for (
        const row of
        validation.rows
      ) {
        for (
          const key of
          Object.keys(
            row.attributes,
          )
        ) {
          names.add(key);
        }
      }

      return Array.from(names);
    }, [validation]);

  const getStatusStyle = (
    status: ImportStatus,
  ) => {
    switch (status) {
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
  };

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '1600px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          marginBottom: '26px',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            marginBottom: '8px',
          }}
        >
          Catalogue Import
        </h1>

        <p
          style={{
            color: '#6b7280',
            margin: 0,
          }}
        >
          Bulk create models,
          variants and update base
          prices using Excel.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '14px 16px',
            marginBottom: '20px',
            borderRadius: '10px',
            background: '#fee2e2',
            border:
              '1px solid #fecaca',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          border:
            '1px solid #e5e7eb',
          borderRadius: '14px',
          padding: '22px',
          marginBottom: '20px',
          background: '#ffffff',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            marginTop: 0,
            marginBottom: '6px',
          }}
        >
          1. Select Category
        </h2>

        <p
          style={{
            color: '#6b7280',
            fontSize: '14px',
            marginTop: 0,
            marginBottom: '18px',
          }}
        >
          Excel columns will be
          generated automatically
          according to the selected
          category attributes.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'end',
          }}
        >
          <div
            style={{
              minWidth: '260px',
              flex: 1,
            }}
          >
            <label
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '7px',
                fontSize: '14px',
              }}
            >
              Category
            </label>

            <select
              value={categoryId}
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

                setValidation(null);
                setImportResult(null);
                setError('');
              }}
              style={{
                width: '100%',
                padding:
                  '11px 12px',
                border:
                  '1px solid #d1d5db',
                borderRadius: '8px',
                background:
                  '#ffffff',
                outline: 'none',
              }}
            >
              <option value={0}>
                Select category
              </option>

              {categories.map(
                (category) => (
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
            style={{
              padding:
                '11px 18px',
              minHeight: '42px',
              border: 0,
              borderRadius: '8px',
              cursor:
                downloading
                  ? 'not-allowed'
                  : 'pointer',
              fontWeight: 600,
              background:
                '#111827',
              color: '#ffffff',
              opacity:
                !categoryId ||
                downloading
                  ? 0.6
                  : 1,
            }}
          >
            {downloading
              ? 'Downloading...'
              : 'Download Excel Template'}
          </button>
        </div>
      </div>

      <div
        style={{
          border:
            '1px solid #e5e7eb',
          borderRadius: '14px',
          padding: '22px',
          marginBottom: '20px',
          background: '#ffffff',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            marginTop: 0,
            marginBottom: '6px',
          }}
        >
          2. Upload Catalogue
        </h2>

        <p
          style={{
            color: '#6b7280',
            fontSize: '14px',
            marginTop: 0,
            marginBottom: '18px',
          }}
        >
          Upload the completed
          Excel file to check new
          models, variants, pricing
          changes and invalid data.
        </p>

        <div
          style={{
            border:
              '2px dashed #d1d5db',
            borderRadius: '14px',
            padding: '28px 20px',
            textAlign: 'center',
            background: '#f9fafb',
          }}
        >
          <input
            id="catalogue-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={
              handleFileChange
            }
            style={{
              display: 'none',
            }}
          />

          <div
            style={{
              fontSize: '38px',
              marginBottom: '8px',
            }}
          >
            📄
          </div>

          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              marginBottom: '5px',
            }}
          >
            Upload Catalogue Excel
          </div>

          <div
            style={{
              color: '#6b7280',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            XLSX or XLS files up
            to 10 MB
          </div>

          <label
            htmlFor="catalogue-file"
            style={{
              display:
                'inline-block',
              padding:
                '10px 20px',
              background:
                '#2563eb',
              color: '#ffffff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Choose Excel File
          </label>

          {selectedFile && (
            <div
              style={{
                margin:
                  '18px auto 0',
                maxWidth: '520px',
                background:
                  '#ffffff',
                border:
                  '1px solid #e5e7eb',
                padding:
                  '12px 14px',
                borderRadius:
                  '10px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color:
                    '#6b7280',
                  marginBottom:
                    '4px',
                }}
              >
                Selected file
              </div>

              <div
                style={{
                  fontWeight: 600,
                  wordBreak:
                    'break-word',
                }}
              >
                {
                  selectedFile.name
                }
              </div>

              <div
                style={{
                  color:
                    '#6b7280',
                  fontSize: '12px',
                  marginTop: '3px',
                }}
              >
                {(
                  selectedFile.size /
                  1024 /
                  1024
                ).toFixed(2)}{' '}
                MB
              </div>
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
          style={{
            marginTop: '18px',
            padding:
              '11px 22px',
            border: 0,
            borderRadius: '8px',
            cursor:
              !selectedFile ||
              validating
                ? 'not-allowed'
                : 'pointer',
            fontWeight: 600,
            background:
              '#16a34a',
            color: '#ffffff',
            opacity:
              !selectedFile ||
              !categoryId ||
              validating
                ? 0.6
                : 1,
          }}
        >
          {validating
            ? 'Validating Excel...'
            : 'Validate Catalogue'}
        </button>
      </div>

      {validation && (
        <>
          <div
            style={{
              marginBottom:
                '12px',
            }}
          >
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                marginBottom:
                  '4px',
              }}
            >
              Validation Summary
            </h2>

            <div
              style={{
                color:
                  '#6b7280',
                fontSize: '14px',
              }}
            >
              Category:{' '}
              <strong>
                {
                  validation
                    .category.name
                }
              </strong>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(145px, 1fr))',
              gap: '12px',
              marginBottom:
                '20px',
            }}
          >
            <SummaryCard
              title="Total Rows"
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

          <div
            style={{
              border:
                '1px solid #e5e7eb',
              borderRadius: '14px',
              padding: '18px',
              marginBottom: '20px',
              background:
                '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '14px',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent:
                  'space-between',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    marginTop: 0,
                    marginBottom: '5px',
                  }}
                >
                  3. Confirm Import
                </h2>

                <p
                  style={{
                    color: '#6b7280',
                    fontSize: '14px',
                    margin: 0,
                  }}
                >
                  This will create new
                  models and variants and
                  update existing prices.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  confirmImport
                }
                disabled={
                  confirming ||
                  validation.summary
                    .invalidRows > 0
                }
                style={{
                  padding:
                    '11px 20px',
                  border: 0,
                  borderRadius: '8px',
                  cursor:
                    confirming ||
                    validation.summary
                      .invalidRows > 0
                      ? 'not-allowed'
                      : 'pointer',
                  fontWeight: 600,
                  background:
                    validation.summary
                      .invalidRows > 0
                      ? '#9ca3af'
                      : '#2563eb',
                  color: '#ffffff',
                  opacity:
                    confirming
                      ? 0.7
                      : 1,
                }}
              >
                {confirming
                  ? 'Importing...'
                  : 'Confirm Import'}
              </button>
            </div>

            {validation.summary
              .invalidRows > 0 && (
              <div
                style={{
                  marginTop: '14px',
                  padding:
                    '11px 13px',
                  borderRadius:
                    '8px',
                  background:
                    '#fef2f2',
                  border:
                    '1px solid #fecaca',
                  color:
                    '#991b1b',
                  fontSize:
                    '13px',
                }}
              >
                Confirm Import is
                disabled because the
                Excel file contains
                invalid rows.
              </div>
            )}
          </div>

          {importResult && (
            <div
              style={{
                border:
                  '1px solid #bbf7d0',
                borderRadius:
                  '14px',
                padding: '18px',
                marginBottom:
                  '20px',
                background:
                  '#f0fdf4',
              }}
            >
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  marginTop: 0,
                  marginBottom:
                    '14px',
                  color:
                    '#166534',
                }}
              >
                Catalogue Imported
                Successfully
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                }}
              >
                <SummaryCard
                  title="Models Created"
                  value={
                    importResult
                      .createdModels
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
            </div>
          )}

          <div
            style={{
              border:
                '1px solid #e5e7eb',
              borderRadius:
                '14px',
              overflow:
                'hidden',
              background:
                '#ffffff',
            }}
          >
            <div
              style={{
                padding: '18px',
                borderBottom:
                  '1px solid #e5e7eb',
              }}
            >
              <h2
                style={{
                  fontSize:
                    '18px',
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                Validation Preview
              </h2>
            </div>

            <div
              style={{
                overflowX:
                  'auto',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse:
                    'collapse',
                  minWidth:
                    '1150px',
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        '#f9fafb',
                    }}
                  >
                    <TableHeader>
                      Row
                    </TableHeader>

                    <TableHeader>
                      Brand
                    </TableHeader>

                    <TableHeader>
                      Model
                    </TableHeader>

                    {attributeNames.map(
                      (name) => (
                        <TableHeader
                          key={
                            name
                          }
                        >
                          {name}
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
                      Status
                    </TableHeader>

                    <TableHeader>
                      Message
                    </TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {validation.rows.map(
                    (row) => (
                      <tr
                        key={
                          row.rowNumber
                        }
                        style={{
                          borderTop:
                            '1px solid #e5e7eb',
                        }}
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
                          {row.model ||
                            '-'}
                        </TableCell>

                        {attributeNames.map(
                          (name) => (
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
                          <span
                            style={{
                              ...getStatusStyle(
                                row.status,
                              ),
                              display:
                                'inline-block',
                              padding:
                                '5px 10px',
                              borderRadius:
                                '999px',
                              fontSize:
                                '12px',
                              fontWeight:
                                700,
                              whiteSpace:
                                'nowrap',
                            }}
                          >
                            {
                              row.status
                            }
                          </span>
                        </TableCell>

                        <TableCell>
                          {
                            row.message
                          }
                        </TableCell>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
    <div
      style={{
        border:
          '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px',
        background: '#ffffff',
      }}
    >
      <div
        style={{
          color: '#6b7280',
          fontSize: '13px',
          marginBottom: '6px',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: '26px',
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th
      style={{
        padding:
          '12px 14px',
        textAlign: 'left',
        fontSize: '13px',
        fontWeight: 600,
        whiteSpace:
          'nowrap',
      }}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td
      style={{
        padding:
          '12px 14px',
        fontSize: '13px',
        verticalAlign:
          'top',
        whiteSpace:
          'nowrap',
      }}
    >
      {children}
    </td>
  );
}

