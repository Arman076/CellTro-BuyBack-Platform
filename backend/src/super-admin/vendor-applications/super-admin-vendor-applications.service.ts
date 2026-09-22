import crypto from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

import {
  VendorApplicationStatus,
  VendorRole,
  VendorStatus,
  VendorUserStatus,
} from "../../generated/prisma/enums.js";

import {
  PrismaService,
} from "../../prisma/prisma/prisma.service.js";

import {
  VendorEmailService,
} from "../../vendor-security/vendor-email.service.js";

const TEMP_PASSWORD_VALID_HOURS = 24;
const MAX_PAGE_SIZE = 100;

type ListQuery = {
  status?: unknown;
  search?: unknown;
  page?: unknown;
  limit?: unknown;
};

type PasswordCredential = {
  password: string;
  passwordHash: string;
  expiresAt: Date;
};

type RejectTransactionResult =
  | {
      newlyRejected: false;
      applicationId: string;
      reason: string | null;
      email: null;
      contactName: null;
    }
  | {
      newlyRejected: true;
      applicationId: string;
      reason: string;
      email: string;
      contactName: string;
    };

@Injectable()
export class SuperAdminVendorApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: VendorEmailService,
  ) {}

  private parsePositiveInt(
    value: unknown,
    fallback: number,
  ): number {
    const parsed = Number(value);

    if (
      !Number.isInteger(parsed) ||
      parsed <= 0
    ) {
      return fallback;
    }

    return parsed;
  }

  private parseStatus(
    value: unknown,
  ): VendorApplicationStatus | undefined {
    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ""
    ) {
      return undefined;
    }

    const status = String(value)
      .trim()
      .toUpperCase();

    if (
      !Object.values(
        VendorApplicationStatus,
      ).includes(
        status as VendorApplicationStatus,
      )
    ) {
      throw new BadRequestException(
        "Invalid vendor application status.",
      );
    }

    return status as VendorApplicationStatus;
  }

  private normalizeApplicationId(
    value: unknown,
  ): string {
    const applicationId = String(
      value ?? "",
    ).trim();

    if (
      !applicationId ||
      applicationId.length > 100
    ) {
      throw new BadRequestException(
        "Invalid vendor application id.",
      );
    }

    return applicationId;
  }

  private normalizeRejectionReason(
    value: unknown,
  ): string {
    const reason = String(
      value ?? "",
    ).trim();

    if (reason.length < 3) {
      throw new BadRequestException(
        "Rejection reason is required.",
      );
    }

    if (reason.length > 500) {
      throw new BadRequestException(
        "Rejection reason must not exceed 500 characters.",
      );
    }

    return reason;
  }

  private createVendorCode(
    vendorId: number,
  ): string {
    return `VEN-${String(
      vendorId,
    ).padStart(6, "0")}`;
  }

  private generateTemporaryPassword(): string {
    /*
     * Cryptographically secure temporary password.
     * Do not log this value anywhere.
     */
    return crypto
      .randomBytes(18)
      .toString("base64url");
  }

  private async hashPassword(
    password: string,
  ): Promise<string> {
    const salt = crypto
      .randomBytes(16)
      .toString("hex");

    const derivedKey =
      await new Promise<Buffer>(
        (resolve, reject) => {
          crypto.scrypt(
            password,
            salt,
            64,
            (error, key) => {
              if (error) {
                reject(error);
                return;
              }

              resolve(key);
            },
          );
        },
      );

    /*
     * Password format:
     *
     * scrypt$<salt>$<derived-key>
     *
     * Vendor login service must verify
     * passwords using the same format.
     */
    return [
      "scrypt",
      salt,
      derivedKey.toString("hex"),
    ].join("$");
  }

  private async createTemporaryCredential():
    Promise<PasswordCredential> {
    const password =
      this.generateTemporaryPassword();

    const passwordHash =
      await this.hashPassword(
        password,
      );

    const expiresAt = new Date(
      Date.now() +
        TEMP_PASSWORD_VALID_HOURS *
          60 *
          60 *
          1000,
    );

    return {
      password,
      passwordHash,
      expiresAt,
    };
  }

  async list(
    query: ListQuery,
  ) {
    const page =
      this.parsePositiveInt(
        query.page,
        1,
      );

    const requestedLimit =
      this.parsePositiveInt(
        query.limit,
        20,
      );

    const limit = Math.min(
      requestedLimit,
      MAX_PAGE_SIZE,
    );

    const status =
      this.parseStatus(
        query.status,
      );

    const search = String(
      query.search ?? "",
    )
      .trim()
      .slice(0, 100);

    const digits =
      search.replace(
        /\D/g,
        "",
      );

    const where = {
      ...(status
        ? {
            status,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                businessName: {
                  contains: search,
                  mode:
                    "insensitive" as const,
                },
              },
              {
                contactName: {
                  contains: search,
                  mode:
                    "insensitive" as const,
                },
              },
              {
                normalizedEmail: {
                  contains:
                    search.toLowerCase(),
                },
              },
              ...(digits
                ? [
                    {
                      normalizedMobile: {
                        contains:
                          digits,
                      },
                    },
                  ]
                : []),
            ],
          }
        : {}),
    };

    /*
     * Independent reads do not need an
     * interactive DB transaction.
     */
    const [
      applications,
      total,
      pending,
      underReview,
      approved,
      rejected,
    ] = await Promise.all([
      this.prisma.vendorApplication.findMany({
        where,

        skip:
          (page - 1) *
          limit,

        take:
          limit,

        orderBy: [
          {
            submittedAt:
              "desc",
          },
          {
            id:
              "desc",
          },
        ],

        select: {
          id: true,
          businessName: true,
          contactName: true,
          email: true,
          mobile: true,

          panLast4: true,
          aadhaarLast4: true,

          status: true,

          submittedAt: true,
          reviewedAt: true,

          approvedVendor: {
            select: {
              id: true,
              vendorCode: true,
              status: true,
            },
          },
        },
      }),

      this.prisma.vendorApplication.count({
        where,
      }),

      this.prisma.vendorApplication.count({
        where: {
          status:
            VendorApplicationStatus.PENDING,
        },
      }),

      this.prisma.vendorApplication.count({
        where: {
          status:
            VendorApplicationStatus.UNDER_REVIEW,
        },
      }),

      this.prisma.vendorApplication.count({
        where: {
          status:
            VendorApplicationStatus.APPROVED,
        },
      }),

      this.prisma.vendorApplication.count({
        where: {
          status:
            VendorApplicationStatus.REJECTED,
        },
      }),
    ]);

    return {
      data:
        applications,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit,
          ),
      },

      summary: {
        pending,
        underReview,
        approved,
        rejected,
      },
    };
  }

  async getById(
    idInput: unknown,
  ) {
    const applicationId =
      this.normalizeApplicationId(
        idInput,
      );

    const application =
      await this.prisma.vendorApplication.findUnique({
        where: {
          id:
            applicationId,
        },

        select: {
          id: true,

          businessName: true,
          contactName: true,

          email: true,
          mobile: true,

          emailVerifiedAt: true,

          /*
           * Never expose encrypted PAN/Aadhaar
           * from this endpoint.
           */
          panLast4: true,
          aadhaarLast4: true,

          status: true,
          rejectionReason: true,

          submittedAt: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,

          approvedVendor: {
            select: {
              id: true,
              vendorCode: true,
              businessName: true,
              contactName: true,
              phone: true,
              email: true,
              status: true,
              createdAt: true,

              memberships: {
                take: 1,

                where: {
                  role:
                    VendorRole.OWNER,
                },

                select: {
                  user: {
                    select: {
                      status: true,

                      mustChangePassword:
                        true,

                      temporaryPasswordExpiresAt:
                        true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!application) {
      throw new NotFoundException(
        "Vendor application not found.",
      );
    }

    return application;
  }

  async approve(
    idInput: unknown,
  ) {
    const applicationId =
      this.normalizeApplicationId(
        idInput,
      );

    /*
     * Hash before opening transaction.
     * scrypt is CPU intensive and should not
     * keep a DB transaction open unnecessarily.
     */
    const credential =
      await this.createTemporaryCredential();

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          /*
           * Prevent concurrent approve/reject
           * operations across backend instances.
           */
          await tx.$queryRaw<
            Array<{
              lock_result:
                string | null;
            }>
          >`
            SELECT pg_advisory_xact_lock(
              hashtext(
                ${`celltro-vendor-application:${applicationId}`}
              )
            )::text AS lock_result
          `;

          const application =
            await tx.vendorApplication.findUnique({
              where: {
                id:
                  applicationId,
              },

              select: {
                id: true,

                businessName:
                  true,

                contactName:
                  true,

                email:
                  true,

                normalizedEmail:
                  true,

                normalizedMobile:
                  true,

                status:
                  true,

                approvedVendorId:
                  true,

                approvedVendor: {
                  select: {
                    id: true,

                    vendorCode:
                      true,
                  },
                },
              },
            });

          if (!application) {
            throw new NotFoundException(
              "Vendor application not found.",
            );
          }

          /*
           * Idempotency:
           * repeated approve must never create
           * another vendor/user/membership.
           */
          if (
            application.status ===
              VendorApplicationStatus.APPROVED &&
            application.approvedVendor
          ) {
            return {
              newlyApproved:
                false as const,

              applicationId:
                application.id,

              vendorId:
                application
                  .approvedVendor
                  .id,

              vendorCode:
                application
                  .approvedVendor
                  .vendorCode,

              email:
                application.email,

              contactName:
                application.contactName,
            };
          }

          if (
            application.status ===
            VendorApplicationStatus.REJECTED
          ) {
            throw new ConflictException(
              "Rejected application cannot be approved.",
            );
          }

          if (
            application.status !==
              VendorApplicationStatus.PENDING &&
            application.status !==
              VendorApplicationStatus.UNDER_REVIEW
          ) {
            throw new ConflictException(
              "Vendor application cannot be approved in its current state.",
            );
          }

          const existingUser =
            await tx.vendorUser.findUnique({
              where: {
                normalizedEmail:
                  application
                    .normalizedEmail,
              },

              select: {
                id: true,
              },
            });

          if (existingUser) {
            throw new ConflictException(
              "A vendor login already exists for this email address.",
            );
          }

          /*
           * PostgreSQL generates permanent
           * numeric vendor id first.
           *
           * Temporary unique vendorCode is replaced
           * immediately with VEN-xxxxxx.
           */
          const vendor =
            await tx.vendor.create({
              data: {
                vendorCode:
                  `PENDING-${crypto.randomUUID()}`,

                businessName:
                  application
                    .businessName,

                contactName:
                  application
                    .contactName,

                phone:
                  application
                    .normalizedMobile,

                email:
                  application
                    .normalizedEmail,

                status:
                  VendorStatus.ACTIVE,
              },

              select: {
                id: true,
              },
            });

          const vendorCode =
            this.createVendorCode(
              vendor.id,
            );

          await tx.vendor.update({
            where: {
              id:
                vendor.id,
            },

            data: {
              vendorCode,
            },
          });

          const vendorUser =
            await tx.vendorUser.create({
              data: {
                email:
                  application.email,

                normalizedEmail:
                  application
                    .normalizedEmail,

                passwordHash:
                  credential
                    .passwordHash,

                /*
                 * Vendor must change temporary
                 * password before normal access.
                 */
                status:
                  VendorUserStatus.PENDING_ACTIVATION,

                mustChangePassword:
                  true,

                temporaryPasswordExpiresAt:
                  credential
                    .expiresAt,
              },

              select: {
                id: true,
              },
            });

          await tx.vendorMembership.create({
            data: {
              vendorId:
                vendor.id,

              userId:
                vendorUser.id,

              role:
                VendorRole.OWNER,
            },
          });

          await tx.vendorApplication.update({
            where: {
              id:
                application.id,
            },

            data: {
              status:
                VendorApplicationStatus.APPROVED,

              approvedVendorId:
                vendor.id,

              reviewedAt:
                new Date(),

              rejectionReason:
                null,
            },
          });

          return {
            newlyApproved:
              true as const,

            applicationId:
              application.id,

            vendorId:
              vendor.id,

            vendorCode,

            email:
              application.email,

            contactName:
              application
                .contactName,
          };
        },
      );

    if (!result.newlyApproved) {
      return {
        applicationId:
          result.applicationId,

        status:
          VendorApplicationStatus.APPROVED,

        vendorId:
          result.vendorId,

        vendorCode:
          result.vendorCode,

        emailSent:
          null,

        message:
          "Vendor application is already approved. No duplicate vendor or credentials were created.",
      };
    }

    /*
     * SMTP happens after transaction commit.
     *
     * This avoids keeping a DB transaction open
     * while waiting for external SMTP.
     */
    try {
      await this.emailService.sendVendorApproval({
        email:
          result.email,

        contactName:
          result.contactName,

        vendorCode:
          result.vendorCode,

        temporaryPassword:
          credential.password,

        expiresInHours:
          TEMP_PASSWORD_VALID_HOURS,
      });
    } catch {
      /*
       * DB approval has already committed.
       * Never approve again just because SMTP
       * delivery failed.
       *
       * resendCredentials() safely rotates
       * the temporary password.
       */
      throw new ServiceUnavailableException(
        "Vendor was approved successfully, but the credentials email could not be delivered. Use resend credentials instead of approving again.",
      );
    }

    return {
      applicationId:
        result.applicationId,

      status:
        VendorApplicationStatus.APPROVED,

      vendorId:
        result.vendorId,

      vendorCode:
        result.vendorCode,

      emailSent:
        true,

      temporaryPasswordExpiresAt:
        credential.expiresAt,

      message:
        "Vendor approved and credentials email sent successfully.",
    };
  }

  async resendCredentials(
    idInput: unknown,
  ) {
    const applicationId =
      this.normalizeApplicationId(
        idInput,
      );

    /*
     * Every resend creates a new random
     * temporary password.
     *
     * Previous temporary password becomes invalid.
     */
    const credential =
      await this.createTemporaryCredential();

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw<
            Array<{
              lock_result:
                string | null;
            }>
          >`
            SELECT pg_advisory_xact_lock(
              hashtext(
                ${`celltro-vendor-application:${applicationId}`}
              )
            )::text AS lock_result
          `;

          const application =
            await tx.vendorApplication.findUnique({
              where: {
                id:
                  applicationId,
              },

              select: {
                id: true,
                status: true,
                email: true,
                contactName: true,

                approvedVendor: {
                  select: {
                    id: true,

                    vendorCode:
                      true,

                    memberships: {
                      where: {
                        role:
                          VendorRole.OWNER,
                      },

                      /*
                       * Fetch max two because exactly
                       * one OWNER membership is expected.
                       */
                      take: 2,

                      select: {
                        userId:
                          true,

                        user: {
                          select: {
                            id:
                              true,

                            status:
                              true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            });

          if (!application) {
            throw new NotFoundException(
              "Vendor application not found.",
            );
          }

          if (
            application.status !==
              VendorApplicationStatus.APPROVED ||
            !application.approvedVendor
          ) {
            throw new ConflictException(
              "Credentials can only be regenerated for an approved vendor.",
            );
          }

          const memberships =
            application
              .approvedVendor
              .memberships;

          if (
            memberships.length !== 1
          ) {
            throw new ConflictException(
              "Approved vendor does not have exactly one owner account.",
            );
          }

          const ownerUser =
            memberships[0].user;

          /*
           * This route is only for initial
           * temporary credentials.
           *
           * Activated users must use the
           * forgot-password flow later.
           */
          if (
            ownerUser.status !==
            VendorUserStatus.PENDING_ACTIVATION
          ) {
            throw new ConflictException(
              "Vendor account is already activated. Use password reset instead.",
            );
          }

          await tx.vendorUser.update({
            where: {
              id:
                ownerUser.id,
            },

            data: {
              passwordHash:
                credential
                  .passwordHash,

              mustChangePassword:
                true,

              temporaryPasswordExpiresAt:
                credential
                  .expiresAt,
            },
          });

          return {
            applicationId:
              application.id,

            vendorId:
              application
                .approvedVendor
                .id,

            vendorCode:
              application
                .approvedVendor
                .vendorCode,

            email:
              application.email,

            contactName:
              application
                .contactName,
          };
        },
      );

    try {
      await this.emailService.sendVendorApproval({
        email:
          result.email,

        contactName:
          result.contactName,

        vendorCode:
          result.vendorCode,

        temporaryPassword:
          credential.password,

        expiresInHours:
          TEMP_PASSWORD_VALID_HOURS,
      });
    } catch {
      /*
       * Password hash has already changed.
       * Another resend safely rotates it again.
       */
      throw new ServiceUnavailableException(
        "A new temporary credential was generated, but the email could not be delivered. Retry resend credentials.",
      );
    }

    return {
      applicationId:
        result.applicationId,

      vendorId:
        result.vendorId,

      vendorCode:
        result.vendorCode,

      emailSent:
        true,

      temporaryPasswordExpiresAt:
        credential.expiresAt,

      message:
        "New temporary credentials generated and emailed successfully.",
    };
  }

  async reject(
    idInput: unknown,
    reasonInput: unknown,
  ) {
    const applicationId =
      this.normalizeApplicationId(
        idInput,
      );

    const reason =
      this.normalizeRejectionReason(
        reasonInput,
      );

    /*
     * Explicit discriminated-union return type
     * lets TypeScript safely know that email,
     * contactName and reason are real strings
     * when newlyRejected === true.
     */
    const result: RejectTransactionResult =
      await this.prisma.$transaction(
        async (
          tx,
        ): Promise<RejectTransactionResult> => {
          /*
           * Same lock as approve().
           * Approval and rejection therefore cannot
           * race against each other.
           */
          await tx.$queryRaw<
            Array<{
              lock_result:
                string | null;
            }>
          >`
            SELECT pg_advisory_xact_lock(
              hashtext(
                ${`celltro-vendor-application:${applicationId}`}
              )
            )::text AS lock_result
          `;

          const application =
            await tx.vendorApplication.findUnique({
              where: {
                id:
                  applicationId,
              },

              select: {
                id: true,
                email: true,
                contactName: true,
                status: true,
                rejectionReason: true,
              },
            });

          if (!application) {
            throw new NotFoundException(
              "Vendor application not found.",
            );
          }

          if (
            application.status ===
            VendorApplicationStatus.APPROVED
          ) {
            throw new ConflictException(
              "Approved application cannot be rejected.",
            );
          }

          /*
           * Idempotent rejection.
           *
           * Do not rewrite original reason.
           * Do not automatically send duplicate email.
           */
          if (
            application.status ===
            VendorApplicationStatus.REJECTED
          ) {
            return {
              newlyRejected:
                false,

              applicationId:
                application.id,

              reason:
                application
                  .rejectionReason,

              email:
                null,

              contactName:
                null,
            };
          }

          if (
            application.status !==
              VendorApplicationStatus.PENDING &&
            application.status !==
              VendorApplicationStatus.UNDER_REVIEW
          ) {
            throw new ConflictException(
              "Vendor application cannot be rejected in its current state.",
            );
          }

          const updated =
            await tx.vendorApplication.update({
              where: {
                id:
                  application.id,
              },

              data: {
                status:
                  VendorApplicationStatus.REJECTED,

                rejectionReason:
                  reason,

                reviewedAt:
                  new Date(),
              },

              select: {
                id: true,
                email: true,
                contactName: true,
                rejectionReason: true,
              },
            });

          /*
           * We already have the validated local
           * reason string, so do not allow nullable
           * DB typing to leak into email input.
           */
          return {
            newlyRejected:
              true,

            applicationId:
              updated.id,

            email:
              updated.email,

            contactName:
              updated.contactName,

            reason,
          };
        },
      );

    /*
     * This branch returns before accessing
     * email/contactName.
     *
     * TypeScript now narrows the union correctly.
     */
    if (!result.newlyRejected) {
      return {
        applicationId:
          result.applicationId,

        status:
          VendorApplicationStatus.REJECTED,

        rejectionReason:
          result.reason,

        emailSent:
          null,

        message:
          "Vendor application is already rejected.",
      };
    }

    /*
     * From here result is guaranteed to be the
     * newlyRejected=true branch:
     *
     * email       -> string
     * contactName -> string
     * reason      -> string
     */
    try {
      await this.emailService.sendVendorRejection({
        email:
          result.email,

        contactName:
          result.contactName,

        reason:
          result.reason,
      });
    } catch {
      /*
       * Rejection is already committed.
       * We intentionally do not rollback a business
       * decision because external SMTP failed.
       */
      throw new ServiceUnavailableException(
        "Vendor application was rejected successfully, but the rejection email could not be delivered.",
      );
    }

    return {
      applicationId:
        result.applicationId,

      status:
        VendorApplicationStatus.REJECTED,

      rejectionReason:
        result.reason,

      emailSent:
        true,

      message:
        "Vendor application rejected and notification email sent successfully.",
    };
  }
}