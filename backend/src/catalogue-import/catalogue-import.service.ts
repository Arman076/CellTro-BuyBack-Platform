import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as XLSX from 'xlsx';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

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
  series: string | null;
  model: string;

  attributes: Record<string, string>;

  basePrice: number | null;
  imageUrl: string | null;
  active: boolean;

  status: ImportStatus;

  oldPrice?: number;
  newPrice?: number;

  message: string;
}

interface ParsedExcelRow {
  rowNumber: number;

  brandName: string;
  seriesName: string;
  modelName: string;

  basePriceRaw: unknown;
  imageUrlRaw: unknown;
  activeRaw: unknown;

  raw: Record<string, unknown>;
}

interface ResolvedAttributeValue {
  attributeId: number;
  attributeName: string;
  optionId: number;
  optionValue: string;
}

@Injectable()
export class CatalogueImportService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async generateTemplate(
    categoryId: number,
  ): Promise<{
    buffer: Buffer;
    fileName: string;
  }> {
    const category =
      await this.prisma.category.findUnique({
        where: {
          id: categoryId,
        },

        include: {
          variantAttributes: {
            where: {
              isActive: true,
            },

            orderBy: {
              displayOrder: 'asc',
            },

            include: {
              options: {
                where: {
                  isActive: true,
                },

                orderBy: {
                  displayOrder: 'asc',
                },
              },
            },
          },

          series: {
            where: {
              isActive: true,
            },

            orderBy: {
              displayOrder: 'asc',
            },

            include: {
              brand: true,
            },
          },
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Category not found',
      );
    }

    const headers = [
      'Brand',
      'Series',
      'Model',

      ...category.variantAttributes.map(
        (attribute: any) =>
          attribute.name,
      ),

      'Base Price',
      'Image URL',
      'Active',
    ];

    const catalogueSheet =
      XLSX.utils.aoa_to_sheet([
        headers,
      ]);

    catalogueSheet['!cols'] =
      headers.map((header) => ({
        wch:
          header === 'Image URL'
            ? 60
            : Math.max(
                15,
                header.length + 5,
              ),
      }));

    /*
     * Dynamic attribute allowed values
     */
    const allowedValuesRows: any[][] = [
      [
        'Attribute',
        'Allowed Value',
      ],
    ];

    for (
      const attribute
      of category.variantAttributes
    ) {
      if (
        attribute.options.length ===
        0
      ) {
        allowedValuesRows.push([
          attribute.name,
          '',
        ]);

        continue;
      }

      for (
        const option
        of attribute.options
      ) {
        allowedValuesRows.push([
          attribute.name,
          option.value,
        ]);
      }
    }

    const allowedValuesSheet =
      XLSX.utils.aoa_to_sheet(
        allowedValuesRows,
      );

    allowedValuesSheet['!cols'] = [
      {
        wch: 30,
      },
      {
        wch: 40,
      },
    ];

    /*
     * Series reference
     */
    const seriesRows: any[][] = [
      [
        'Brand',
        'Series',
      ],
    ];

    if (category.series.length === 0) {
      seriesRows.push([
        '',
        'No active series configured',
      ]);
    } else {
      for (
        const series
        of category.series
      ) {
        seriesRows.push([
          series.brand.name,
          series.name,
        ]);
      }
    }

    const seriesSheet =
      XLSX.utils.aoa_to_sheet(
        seriesRows,
      );

    seriesSheet['!cols'] = [
      {
        wch: 30,
      },
      {
        wch: 40,
      },
    ];

    /*
     * Instructions
     */
    const instructionsRows = [
      [
        'Catalogue Import Instructions',
      ],

      [],

      [
        '1.',
        'Do not modify any column names.',
      ],

      [
        '2.',
        'Brand must already exist and must be mapped to the selected category.',
      ],

      [
        '3.',
        'Series is optional. If provided, it must already exist for the selected Brand + Category. Check the Series Reference sheet.',
      ],

      [
        '4.',
        'Model can be an existing model or a completely new model.',
      ],

      [
        '5.',
        'For Mobile category the sheet may contain RAM and Storage. Other categories will automatically receive their configured dynamic attributes.',
      ],

      [
        '6.',
        'Dynamic attribute values must exactly match the Allowed Values sheet.',
      ],

      [
        '7.',
        'Base Price must be numeric and cannot be negative.',
      ],

      [
        '8.',
        'Image URL should be a direct HTTPS S3 or CloudFront image URL.',
      ],

      [
        '9.',
        'Image URL may be left empty. For an existing model, an empty Image URL will not remove the current image.',
      ],

      [
        '10.',
        'Active accepts Yes/No, true/false, 1/0, active/inactive.',
      ],

      [
        '11.',
        'Duplicate variant combinations inside the same Excel file are invalid.',
      ],

      [
        '12.',
        'NEW_MODEL means the model and variant will be created after Confirm Import.',
      ],

      [
        '13.',
        'NEW_VARIANT means the model exists but this RAM/Storage or other dynamic combination is new.',
      ],

      [
        '14.',
        'MODEL_UPDATE means Series or Image URL will be updated while the variant itself has not changed.',
      ],

      [
        '15.',
        'PRICE_UPDATE means Base Price or variant Active status changed.',
      ],

      [
        '16.',
        'NO_CHANGE means no catalogue changes were detected for that row.',
      ],
    ];

    const instructionsSheet =
      XLSX.utils.aoa_to_sheet(
        instructionsRows,
      );

    instructionsSheet['!cols'] = [
      {
        wch: 8,
      },
      {
        wch: 120,
      },
    ];

    /*
     * Workbook
     */
    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      catalogueSheet,
      'Catalogue',
    );

    XLSX.utils.book_append_sheet(
      workbook,
      allowedValuesSheet,
      'Allowed Values',
    );

    XLSX.utils.book_append_sheet(
      workbook,
      seriesSheet,
      'Series Reference',
    );

    XLSX.utils.book_append_sheet(
      workbook,
      instructionsSheet,
      'Instructions',
    );

    const generated =
      XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      });

    const safeCategoryName =
      category.name
        .trim()
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          '-',
        )
        .replace(
          /^-+|-+$/g,
          '',
        );

    return {
      buffer:
        Buffer.from(generated),

      fileName:
        `${
          safeCategoryName ||
          'catalogue'
        }-catalogue-template.xlsx`,
    };
  }

  async validateFile(
    categoryId: number,
    buffer: Buffer,
  ): Promise<any> {
    const category =
      await this.getCategoryWithAttributes(
        categoryId,
      );

    const parsedRows =
      this.parseWorkbookRows(
        buffer,

        category.variantAttributes.map(
          (attribute: any) =>
            attribute.name,
        ),
      );

    const results: ValidationRow[] =
      [];

    for (
      const row
      of parsedRows
    ) {
      const result =
        await this.validateRow(
          category,
          row,
        );

      results.push(result);
    }

    this.markDuplicateUploadRows(
      results,
    );

    const newModelKeys =
      new Set(
        results
          .filter(
            (row) =>
              row.status ===
              'NEW_MODEL',
          )
          .map(
            (row) =>
              [
                this.normalize(
                  row.brand,
                ),

                this.normalize(
                  row.model,
                ),
              ].join('|'),
          ),
      );

    return {
      category: {
        id:
          category.id,

        name:
          category.name,
      },

      summary: {
        totalRows:
          results.length,

        validRows:
          results.filter(
            (row) =>
              row.status !==
              'INVALID',
          ).length,

        invalidRows:
          results.filter(
            (row) =>
              row.status ===
              'INVALID',
          ).length,

        newModels:
          newModelKeys.size,

        newVariants:
          results.filter(
            (row) =>
              row.status ===
              'NEW_VARIANT',
          ).length,

        modelUpdates:
          results.filter(
            (row) =>
              row.status ===
              'MODEL_UPDATE',
          ).length,

        priceUpdates:
          results.filter(
            (row) =>
              row.status ===
              'PRICE_UPDATE',
          ).length,

        noChange:
          results.filter(
            (row) =>
              row.status ===
              'NO_CHANGE',
          ).length,
      },

      rows:
        results,
    };
  }

  async confirmImport(
    categoryId: number,
    buffer: Buffer,
  ): Promise<any> {
    const validation =
      await this.validateFile(
        categoryId,
        buffer,
      );

    if (
      validation.summary
        .invalidRows > 0
    ) {
      throw new BadRequestException({
        message:
          'Import cancelled because the Excel file contains invalid rows. Fix the invalid rows and validate again.',

        validation,
      });
    }

    const category =
      await this.getCategoryWithAttributes(
        categoryId,
      );

    const parsedRows =
      this.parseWorkbookRows(
        buffer,

        category.variantAttributes.map(
          (attribute: any) =>
            attribute.name,
        ),
      );

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          let createdModels = 0;

          let updatedModels = 0;

          let createdVariants = 0;

          let updatedVariants = 0;

          let skippedNoChange = 0;

          const updatedModelIds =
            new Set<number>();

          for (
            const row
            of parsedRows
          ) {
            const brandName =
              this.cleanValue(
                row.brandName,
              );

            const seriesName =
              this.cleanValue(
                row.seriesName,
              );

            const modelName =
              this.cleanValue(
                row.modelName,
              );

            const imageUrl =
              this.cleanValue(
                row.imageUrlRaw,
              );

            const basePrice =
              this.parseBasePrice(
                row.basePriceRaw,
              );

            if (
              basePrice === null
            ) {
              throw new BadRequestException(
                `Invalid Base Price at Excel row ${row.rowNumber}`,
              );
            }

            const active =
              this.parseActive(
                row.activeRaw,
              );

            if (
              imageUrl &&
              !this.isValidHttpsUrl(
                imageUrl,
              )
            ) {
              throw new BadRequestException(
                `Invalid Image URL at Excel row ${row.rowNumber}. Use a valid HTTPS S3 or CloudFront URL.`,
              );
            }

            /*
             * Brand
             */
            const brandMapping =
              await tx.categoryBrand.findFirst({
                where: {
                  categoryId:
                    category.id,

                  brand: {
                    isActive:
                      true,

                    name: {
                      equals:
                        brandName,

                      mode:
                        'insensitive',
                    },
                  },
                },

                include: {
                  brand:
                    true,
                },
              });

            if (
              !brandMapping
            ) {
              throw new BadRequestException(
                `Brand "${brandName}" is not available for ${category.name}`,
              );
            }

            /*
             * Series
             */
            let resolvedSeries:
              any = null;

            if (seriesName) {
              resolvedSeries =
                await tx.productSeries.findFirst({
                  where: {
                    categoryId:
                      category.id,

                    brandId:
                      brandMapping
                        .brand.id,

                    isActive:
                      true,

                    name: {
                      equals:
                        seriesName,

                      mode:
                        'insensitive',
                    },
                  },
                });

              if (
                !resolvedSeries
              ) {
                throw new BadRequestException(
                  `Series "${seriesName}" is not available for ${brandMapping.brand.name} at Excel row ${row.rowNumber}`,
                );
              }
            }

            /*
             * Dynamic attributes
             */
            const resolvedValues:
              ResolvedAttributeValue[] =
                [];

            for (
              const attribute
              of category.variantAttributes
            ) {
              const rawValue =
                this.getRawValue(
                  row.raw,
                  attribute.name,
                );

              const value =
                this.cleanValue(
                  rawValue,
                );

              if (!value) {
                throw new BadRequestException(
                  `${attribute.name} is required at Excel row ${row.rowNumber}`,
                );
              }

              const option =
                attribute.options.find(
                  (item: any) =>
                    this.normalize(
                      item.value,
                    ) ===
                    this.normalize(
                      value,
                    ),
                );

              if (!option) {
                throw new BadRequestException(
                  `Invalid ${attribute.name} "${value}" at Excel row ${row.rowNumber}`,
                );
              }

              resolvedValues.push({
                attributeId:
                  attribute.id,

                attributeName:
                  attribute.name,

                optionId:
                  option.id,

                optionValue:
                  option.value,
              });
            }

            /*
             * Find model
             */
            let product =
              await tx.product.findFirst({
                where: {
                  categoryId:
                    category.id,

                  brandId:
                    brandMapping
                      .brand.id,

                  name: {
                    equals:
                      modelName,

                    mode:
                      'insensitive',
                  },
                },

                include: {
                  variants: {
                    include: {
                      values:
                        true,
                    },
                  },

                  series:
                    true,
                },
              });

            /*
             * Create new model
             */
            if (!product) {
              const slug =
                await this.generateUniqueProductSlug(
                  tx,
                  category.id,
                  brandMapping
                    .brand.id,
                  modelName,
                );

              product =
                await tx.product.create({
                  data: {
                    name:
                      modelName,

                    slug,

                    categoryId:
                      category.id,

                    brandId:
                      brandMapping
                        .brand.id,

                    seriesId:
                      resolvedSeries
                        ?.id ??
                      null,

                    imageUrl:
                      imageUrl ||
                      null,
                  },

                  include: {
                    variants: {
                      include: {
                        values:
                          true,
                      },
                    },

                    series:
                      true,
                  },
                });

              createdModels++;
            } else {
              /*
               * Update model metadata.
               *
               * Blank Series does NOT remove an existing series.
               * Blank Image URL does NOT remove an existing image.
               */
              const updateData:
                Record<
                  string,
                  unknown
                > = {};

              if (
                resolvedSeries &&
                product.seriesId !==
                  resolvedSeries.id
              ) {
                updateData.seriesId =
                  resolvedSeries.id;
              }

              if (
                imageUrl &&
                product.imageUrl !==
                  imageUrl
              ) {
                updateData.imageUrl =
                  imageUrl;
              }

              if (
                Object.keys(
                  updateData,
                ).length > 0
              ) {
                await tx.product.update({
                  where: {
                    id:
                      product.id,
                  },

                  data:
                    updateData,
                });

                if (
                  !updatedModelIds.has(
                    product.id,
                  )
                ) {
                  updatedModelIds.add(
                    product.id,
                  );

                  updatedModels++;
                }

                if (
                  resolvedSeries
                ) {
                  product.seriesId =
                    resolvedSeries.id;
                }

                if (imageUrl) {
                  product.imageUrl =
                    imageUrl;
                }
              }
            }

            /*
             * Variant signature
             */
            const incomingSignature =
              this.buildSignature(
                resolvedValues.map(
                  (value) => ({
                    attributeId:
                      value.attributeId,

                    optionId:
                      value.optionId,
                  }),
                ),
              );

            const existingVariant =
              product.variants.find(
                (
                  variant: any,
                ) => {
                  const existingSignature =
                    this.buildSignature(
                      variant.values.map(
                        (
                          value: any,
                        ) => ({
                          attributeId:
                            value.attributeId,

                          optionId:
                            value.optionId,
                        }),
                      ),
                    );

                  return (
                    existingSignature ===
                    incomingSignature
                  );
                },
              );

            /*
             * New variant
             */
            if (
              !existingVariant
            ) {
              const createdVariant =
                await tx.productVariant.create({
                  data: {
                    productId:
                      product.id,

                    basePrice,

                    isActive:
                      active,

                    values: {
                      create:
                        resolvedValues.map(
                          (
                            value,
                          ) => ({
                            attributeId:
                              value.attributeId,

                            optionId:
                              value.optionId,
                          }),
                        ),
                    },
                  },

                  include: {
                    values:
                      true,
                  },
                });

              product.variants.push(
                createdVariant,
              );

              createdVariants++;

              continue;
            }

            /*
             * Existing variant
             */
            const oldPrice =
              Number(
                existingVariant
                  .basePrice,
              );

            const priceChanged =
              oldPrice !==
              basePrice;

            const activeChanged =
              existingVariant
                .isActive !==
              active;

            if (
              !priceChanged &&
              !activeChanged
            ) {
              skippedNoChange++;

              continue;
            }

            await tx.productVariant.update({
              where: {
                id:
                  existingVariant.id,
              },

              data: {
                basePrice,

                isActive:
                  active,
              },
            });

            existingVariant.basePrice =
              basePrice as any;

            existingVariant.isActive =
              active;

            updatedVariants++;
          }

          return {
            createdModels,

            updatedModels,

            createdVariants,

            updatedVariants,

            skippedNoChange,
          };
        },
      );

    return {
      success: true,

      message:
        'Catalogue imported successfully',

      category: {
        id:
          category.id,

        name:
          category.name,
      },

      summary:
        result,
    };
  }

  private async validateRow(
    category: any,
    row: ParsedExcelRow,
  ): Promise<ValidationRow> {
    const brandName =
      this.cleanValue(
        row.brandName,
      );

    const seriesName =
      this.cleanValue(
        row.seriesName,
      );

    const modelName =
      this.cleanValue(
        row.modelName,
      );

    const imageUrl =
      this.cleanValue(
        row.imageUrlRaw,
      );

    const baseResult:
      ValidationRow = {
      rowNumber:
        row.rowNumber,

      brand:
        brandName,

      series:
        seriesName ||
        null,

      model:
        modelName,

      attributes:
        {},

      basePrice:
        null,

      imageUrl:
        imageUrl ||
        null,

      active:
        true,

      status:
        'INVALID',

      message:
        '',
    };

    /*
     * Basic validation
     */
    if (!brandName) {
      return {
        ...baseResult,

        message:
          'Brand is required',
      };
    }

    if (!modelName) {
      return {
        ...baseResult,

        message:
          'Model is required',
      };
    }

    const basePrice =
      this.parseBasePrice(
        row.basePriceRaw,
      );

    if (
      basePrice === null
    ) {
      return {
        ...baseResult,

        message:
          'Base Price must be a valid number greater than or equal to 0',
      };
    }

    const active =
      this.parseActive(
        row.activeRaw,
      );

    if (
      imageUrl &&
      !this.isValidHttpsUrl(
        imageUrl,
      )
    ) {
      return {
        ...baseResult,

        basePrice,

        active,

        message:
          'Image URL must be a valid HTTPS S3 or CloudFront URL',
      };
    }

    /*
     * Brand
     */
    const brandMapping =
      await this.prisma.categoryBrand.findFirst({
        where: {
          categoryId:
            category.id,

          brand: {
            isActive:
              true,

            name: {
              equals:
                brandName,

              mode:
                'insensitive',
            },
          },
        },

        include: {
          brand:
            true,
        },
      });

    if (
      !brandMapping
    ) {
      return {
        ...baseResult,

        basePrice,

        active,

        message:
          `Brand "${brandName}" does not exist or is not mapped to ${category.name}`,
      };
    }

    /*
     * Series
     */
    let resolvedSeries:
      any = null;

    if (seriesName) {
      resolvedSeries =
        await this.prisma.productSeries.findFirst({
          where: {
            categoryId:
              category.id,

            brandId:
              brandMapping
                .brand.id,

            isActive:
              true,

            name: {
              equals:
                seriesName,

              mode:
                'insensitive',
            },
          },
        });

      if (
        !resolvedSeries
      ) {
        return {
          ...baseResult,

          brand:
            brandMapping
              .brand.name,

          series:
            seriesName,

          model:
            modelName,

          basePrice,

          imageUrl:
            imageUrl ||
            null,

          active,

          message:
            `Series "${seriesName}" does not exist for ${brandMapping.brand.name}`,
        };
      }
    }

    /*
     * Dynamic attributes
     */
    const resolvedValues:
      ResolvedAttributeValue[] =
        [];

    const attributeValues:
      Record<
        string,
        string
      > = {};

    for (
      const attribute
      of category.variantAttributes
    ) {
      const rawValue =
        this.getRawValue(
          row.raw,
          attribute.name,
        );

      const value =
        this.cleanValue(
          rawValue,
        );

      attributeValues[
        attribute.name
      ] = value;

      if (!value) {
        return {
          ...baseResult,

          brand:
            brandMapping
              .brand.name,

          series:
            resolvedSeries
              ?.name ??
            null,

          model:
            modelName,

          attributes:
            attributeValues,

          basePrice,

          imageUrl:
            imageUrl ||
            null,

          active,

          message:
            `${attribute.name} is required`,
        };
      }

      const option =
        attribute.options.find(
          (item: any) =>
            this.normalize(
              item.value,
            ) ===
            this.normalize(
              value,
            ),
        );

      if (!option) {
        return {
          ...baseResult,

          brand:
            brandMapping
              .brand.name,

          series:
            resolvedSeries
              ?.name ??
            null,

          model:
            modelName,

          attributes:
            attributeValues,

          basePrice,

          imageUrl:
            imageUrl ||
            null,

          active,

          message:
            `Invalid ${attribute.name} "${value}"`,
        };
      }

      attributeValues[
        attribute.name
      ] =
        option.value;

      resolvedValues.push({
        attributeId:
          attribute.id,

        attributeName:
          attribute.name,

        optionId:
          option.id,

        optionValue:
          option.value,
      });
    }

    /*
     * Existing model
     */
    const product =
      await this.prisma.product.findFirst({
        where: {
          categoryId:
            category.id,

          brandId:
            brandMapping
              .brand.id,

          name: {
            equals:
              modelName,

            mode:
              'insensitive',
          },
        },

        include: {
          variants: {
            include: {
              values:
                true,
            },
          },

          series:
            true,
        },
      });

    /*
     * New model
     */
    if (!product) {
      return {
        rowNumber:
          row.rowNumber,

        brand:
          brandMapping
            .brand.name,

        series:
          resolvedSeries
            ?.name ??
          null,

        model:
          modelName,

        attributes:
          attributeValues,

        basePrice,

        imageUrl:
          imageUrl ||
          null,

        active,

        newPrice:
          basePrice,

        status:
          'NEW_MODEL',

        message:
          `New model "${modelName}" and its variant will be created`,
      };
    }

    /*
     * Detect Product metadata changes
     */
    const seriesChanged =
      Boolean(
        resolvedSeries,
      ) &&
      product.seriesId !==
        resolvedSeries.id;

    const imageChanged =
      Boolean(
        imageUrl,
      ) &&
      product.imageUrl !==
        imageUrl;

    const metadataChanges:
      string[] = [];

    if (seriesChanged) {
      metadataChanges.push(
        `Series → ${resolvedSeries.name}`,
      );
    }

    if (imageChanged) {
      metadataChanges.push(
        'Image URL will be updated',
      );
    }

    /*
     * Variant lookup
     */
    const incomingSignature =
      this.buildSignature(
        resolvedValues.map(
          (value) => ({
            attributeId:
              value.attributeId,

            optionId:
              value.optionId,
          }),
        ),
      );

    const existingVariant =
      product.variants.find(
        (
          variant: any,
        ) => {
          const existingSignature =
            this.buildSignature(
              variant.values.map(
                (
                  value: any,
                ) => ({
                  attributeId:
                    value.attributeId,

                  optionId:
                    value.optionId,
                }),
              ),
            );

          return (
            existingSignature ===
            incomingSignature
          );
        },
      );

    /*
     * New variant
     */
    if (
      !existingVariant
    ) {
      return {
        rowNumber:
          row.rowNumber,

        brand:
          brandMapping
            .brand.name,

        series:
          resolvedSeries
            ?.name ??
          product.series
            ?.name ??
          null,

        model:
          product.name,

        attributes:
          attributeValues,

        basePrice,

        imageUrl:
          imageUrl ||
          product.imageUrl ||
          null,

        active,

        newPrice:
          basePrice,

        status:
          'NEW_VARIANT',

        message:
          metadataChanges.length >
          0
            ? `New variant will be created. ${metadataChanges.join(', ')}`
            : 'New variant will be created',
      };
    }

    const oldPrice =
      Number(
        existingVariant
          .basePrice,
      );

    const priceChanged =
      oldPrice !==
      basePrice;

    const activeChanged =
      existingVariant
        .isActive !==
      active;

    /*
     * Price/active update
     */
    if (
      priceChanged ||
      activeChanged
    ) {
      const changes:
        string[] = [];

      if (priceChanged) {
        changes.push(
          `price ${oldPrice} → ${basePrice}`,
        );
      }

      if (activeChanged) {
        changes.push(
          `active ${
            existingVariant
              .isActive
              ? 'Yes'
              : 'No'
          } → ${
            active
              ? 'Yes'
              : 'No'
          }`,
        );
      }

      changes.push(
        ...metadataChanges,
      );

      return {
        rowNumber:
          row.rowNumber,

        brand:
          brandMapping
            .brand.name,

        series:
          resolvedSeries
            ?.name ??
          product.series
            ?.name ??
          null,

        model:
          product.name,

        attributes:
          attributeValues,

        basePrice,

        imageUrl:
          imageUrl ||
          product.imageUrl ||
          null,

        active,

        oldPrice,

        newPrice:
          basePrice,

        status:
          'PRICE_UPDATE',

        message:
          changes.join(', '),
      };
    }

    /*
     * Only model metadata changed
     */
    if (
      metadataChanges.length >
      0
    ) {
      return {
        rowNumber:
          row.rowNumber,

        brand:
          brandMapping
            .brand.name,

        series:
          resolvedSeries
            ?.name ??
          product.series
            ?.name ??
          null,

        model:
          product.name,

        attributes:
          attributeValues,

        basePrice,

        imageUrl:
          imageUrl ||
          product.imageUrl ||
          null,

        active,

        oldPrice,

        newPrice:
          basePrice,

        status:
          'MODEL_UPDATE',

        message:
          metadataChanges.join(
            ', ',
          ),
      };
    }

    /*
     * No change
     */
    return {
      rowNumber:
        row.rowNumber,

      brand:
        brandMapping
          .brand.name,

      series:
        product.series
          ?.name ??
        null,

      model:
        product.name,

      attributes:
        attributeValues,

      basePrice,

      imageUrl:
        product.imageUrl ||
        null,

      active,

      oldPrice,

      newPrice:
        basePrice,

      status:
        'NO_CHANGE',

      message:
        'No changes detected',
    };
  }

  private async getCategoryWithAttributes(
    categoryId: number,
  ): Promise<any> {
    const category =
      await this.prisma.category.findUnique({
        where: {
          id:
            categoryId,
        },

        include: {
          variantAttributes: {
            where: {
              isActive:
                true,
            },

            orderBy: {
              displayOrder:
                'asc',
            },

            include: {
              options: {
                where: {
                  isActive:
                    true,
                },

                orderBy: {
                  displayOrder:
                    'asc',
                },
              },
            },
          },
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Category not found',
      );
    }

    if (
      category.variantAttributes
        .length === 0
    ) {
      throw new BadRequestException(
        `No active variant attributes are configured for ${category.name}`,
      );
    }

    return category;
  }

  private parseWorkbookRows(
    buffer: Buffer,
    attributeNames: string[],
  ): ParsedExcelRow[] {
    let workbook:
      XLSX.WorkBook;

    try {
      workbook =
        XLSX.read(
          buffer,
          {
            type:
              'buffer',
          },
        );
    } catch {
      throw new BadRequestException(
        'Unable to read Excel file',
      );
    }

    const worksheet =
      workbook.Sheets[
        'Catalogue'
      ];

    if (!worksheet) {
      throw new BadRequestException(
        'Excel file must contain a sheet named "Catalogue"',
      );
    }

    const rows =
      XLSX.utils.sheet_to_json<
        Record<
          string,
          unknown
        >
      >(
        worksheet,
        {
          defval:
            '',

          raw:
            false,
        },
      );

    if (
      rows.length === 0
    ) {
      throw new BadRequestException(
        'Catalogue sheet does not contain any data rows',
      );
    }

    const expectedHeaders = [
      'Brand',
      'Series',
      'Model',

      ...attributeNames,

      'Base Price',
      'Image URL',
      'Active',
    ];

    const actualHeaders =
      Object.keys(
        rows[0] ||
          {},
      );

    for (
      const expectedHeader
      of expectedHeaders
    ) {
      const found =
        actualHeaders.some(
          (header) =>
            this.normalize(
              header,
            ) ===
            this.normalize(
              expectedHeader,
            ),
        );

      if (!found) {
        throw new BadRequestException(
          `Missing required Excel column "${expectedHeader}"`,
        );
      }
    }

    return rows.map(
      (
        raw,
        index,
      ) => ({
        rowNumber:
          index + 2,

        brandName:
          this.cleanValue(
            this.getRawValue(
              raw,
              'Brand',
            ),
          ),

        seriesName:
          this.cleanValue(
            this.getRawValue(
              raw,
              'Series',
            ),
          ),

        modelName:
          this.cleanValue(
            this.getRawValue(
              raw,
              'Model',
            ),
          ),

        basePriceRaw:
          this.getRawValue(
            raw,
            'Base Price',
          ),

        imageUrlRaw:
          this.getRawValue(
            raw,
            'Image URL',
          ),

        activeRaw:
          this.getRawValue(
            raw,
            'Active',
          ),

        raw,
      }),
    );
  }

  private markDuplicateUploadRows(
    rows: ValidationRow[],
  ): void {
    const seen =
      new Map<
        string,
        number
      >();

    for (
      const row
      of rows
    ) {
      if (
        row.status ===
        'INVALID'
      ) {
        continue;
      }

      const key =
        this.buildUploadRowKey(
          row,
        );

      const previousRow =
        seen.get(key);

      if (
        previousRow
      ) {
        row.status =
          'INVALID';

        row.message =
          `Duplicate variant row in uploaded Excel (same configuration as row ${previousRow})`;

        continue;
      }

      seen.set(
        key,
        row.rowNumber,
      );
    }
  }

  private buildUploadRowKey(
    row: ValidationRow,
  ): string {
    const attributes =
      Object.entries(
        row.attributes,
      )
        .map(
          ([
            name,
            value,
          ]) =>
            `${this.normalize(name)}:${this.normalize(value)}`,
        )
        .sort()
        .join('|');

    return [
      this.normalize(
        row.brand,
      ),

      this.normalize(
        row.model,
      ),

      attributes,
    ].join('|');
  }

  private buildSignature(
    values: {
      attributeId: number;
      optionId: number;
    }[],
  ): string {
    return values
      .map(
        (value) =>
          `${value.attributeId}:${value.optionId}`,
      )
      .sort()
      .join('|');
  }

  private getRawValue(
    row: Record<
      string,
      unknown
    >,
    requestedHeader: string,
  ): unknown {
    const matchingKey =
      Object.keys(
        row,
      ).find(
        (key) =>
          this.normalize(
            key,
          ) ===
          this.normalize(
            requestedHeader,
          ),
      );

    if (
      !matchingKey
    ) {
      return '';
    }

    return row[
      matchingKey
    ];
  }

  private parseBasePrice(
    value: unknown,
  ): number | null {
    const cleaned =
      this.cleanValue(
        value,
      )
        .replace(
          /,/g,
          '',
        )
        .replace(
          /₹/g,
          '',
        )
        .trim();

    if (!cleaned) {
      return null;
    }

    const parsed =
      Number(
        cleaned,
      );

    if (
      !Number.isFinite(
        parsed,
      ) ||
      parsed < 0
    ) {
      return null;
    }

    return parsed;
  }

  private parseActive(
    value: unknown,
  ): boolean {
    const normalized =
      this.normalize(
        this.cleanValue(
          value,
        ),
      );

    if (!normalized) {
      return true;
    }

    if (
      [
        'yes',
        'true',
        '1',
        'active',
      ].includes(
        normalized,
      )
    ) {
      return true;
    }

    if (
      [
        'no',
        'false',
        '0',
        'inactive',
      ].includes(
        normalized,
      )
    ) {
      return false;
    }

    return true;
  }

  private isValidHttpsUrl(
    value: string,
  ): boolean {
    try {
      const parsedUrl =
        new URL(
          value,
        );

      return (
        parsedUrl.protocol ===
        'https:'
      );
    } catch {
      return false;
    }
  }

  private cleanValue(
    value: unknown,
  ): string {
    if (
      value === null ||
      value === undefined
    ) {
      return '';
    }

    return String(
      value,
    ).trim();
  }

  private normalize(
    value: unknown,
  ): string {
    return this.cleanValue(
      value,
    )
      .toLowerCase()
      .replace(
        /\s+/g,
        ' ',
      );
  }

  private slugify(
    value: string,
  ): string {
    return value
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-',
      )
      .replace(
        /^-+|-+$/g,
        '',
      );
  }

  private async generateUniqueProductSlug(
    tx: any,
    categoryId: number,
    brandId: number,
    modelName: string,
  ): Promise<string> {
    const raw =
      this.slugify(
        modelName,
      );

    const base =
      raw ||
      'model';

    let slug =
      base;

    let suffix =
      2;

    while (
      await tx.product.findUnique({
        where: {
          categoryId_brandId_slug: {
            categoryId,

            brandId,

            slug,
          },
        },
      })
    ) {
      slug =
        `${base}-${suffix}`;

      suffix++;
    }

    return slug;
  }
}