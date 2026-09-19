import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

import {
  PrismaService,
} from "../prisma/prisma/prisma.service.js";

type PostalLookupResponse = Array<{
  Message?: string;
  Status?: string;
  PostOffice?: Array<{
    District?: string;
    State?: string;
    Name?: string;
    Pincode?: string;
  }> | null;
}>;

@Injectable()
export class FlowConfigService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  private normalizePincode(
    value: unknown,
  ) {
    const pincode =
      String(value ?? "")
        .replace(/\D/g, "");

    if (
      !/^[1-9]\d{5}$/.test(
        pincode,
      )
    ) {
      throw new BadRequestException(
        "Enter a valid 6-digit pincode.",
      );
    }

    return pincode;
  }

  private normalizeAudience(
    value: unknown,
  ) {
    const audience =
      String(value ?? "")
        .trim()
        .toUpperCase();

    if (
      audience !== "CUSTOMER" &&
      audience !== "AGENT"
    ) {
      throw new BadRequestException(
        "Audience must be CUSTOMER or AGENT.",
      );
    }

    return audience as
      | "CUSTOMER"
      | "AGENT";
  }

  private normalizeLabel(
    value: unknown,
  ) {
    const label =
      String(value ?? "")
        .trim();

    if (
      !label ||
      label.length > 160
    ) {
      throw new BadRequestException(
        "Label is required and must be 160 characters or less.",
      );
    }

    return label;
  }

  private makeCode(
    label: string,
  ) {
    return label
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 70);
  }

  private async lookupPostalDetails(
    pincodeInput: unknown,
  ) {
    const pincode =
      this.normalizePincode(
        pincodeInput,
      );

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        6000,
      );

    try {
      const response =
        await fetch(
          `https://api.postalpincode.in/pincode/${encodeURIComponent(
            pincode,
          )}`,
          {
            method:
              "GET",

            headers: {
              accept:
                "application/json",
            },

            signal:
              controller.signal,
          },
        );

      if (!response.ok) {
        throw new ServiceUnavailableException(
          "Pincode lookup service is unavailable.",
        );
      }

      const data =
        (await response.json()) as PostalLookupResponse;

      const first =
        Array.isArray(data)
          ? data[0]
          : null;

      const offices =
        first?.PostOffice;

      if (
        String(
          first?.Status ??
            "",
        ).toLowerCase() !==
          "success" ||
        !Array.isArray(
          offices,
        ) ||
        offices.length === 0
      ) {
        throw new BadRequestException(
          "Pincode was not found.",
        );
      }

      const district =
        String(
          offices[0]
            ?.District ??
            "",
        ).trim();

      const state =
        String(
          offices[0]
            ?.State ??
            "",
        ).trim();

      if (
        !district ||
        !state
      ) {
        throw new ServiceUnavailableException(
          "District/state information is unavailable for this pincode.",
        );
      }

      return {
        pincode,
        district,
        state,
      };
    } catch (error) {
      if (
        error instanceof
          BadRequestException ||
        error instanceof
          ServiceUnavailableException
      ) {
        throw error;
      }

      throw new ServiceUnavailableException(
        "Unable to look up pincode right now. Please try again.",
      );
    } finally {
      clearTimeout(
        timeout,
      );
    }
  }

  async lookupPincode(
    pincodeInput: unknown,
  ) {
    return this.lookupPostalDetails(
      pincodeInput,
    );
  }

  async listPincodes() {
    return this.prisma.serviceablePincode.findMany({
      orderBy: [
        {
          isActive:
            "desc",
        },
        {
          state:
            "asc",
        },
        {
          district:
            "asc",
        },
        {
          pincode:
            "asc",
        },
      ],
    });
  }

  async addPincode(
    value: unknown,
  ) {
    /*
     * Do not trust district/state coming from the browser.
     * Backend resolves them again from the pincode.
     */
    const location =
      await this.lookupPostalDetails(
        value,
      );

    return this.prisma.serviceablePincode.upsert({
      where: {
        pincode:
          location.pincode,
      },

      update: {
        district:
          location.district,

        state:
          location.state,

        isActive:
          true,
      },

      create: {
        pincode:
          location.pincode,

        district:
          location.district,

        state:
          location.state,

        isActive:
          true,
      },
    });
  }

  async setPincodeStatus(
    idInput: unknown,
    isActiveInput: unknown,
  ) {
    const id =
      Number(
        idInput,
      );

    if (
      !Number.isInteger(
        id,
      ) ||
      id <= 0 ||
      typeof isActiveInput !==
        "boolean"
    ) {
      throw new BadRequestException(
        "Invalid pincode status request.",
      );
    }

    try {
      return await this.prisma.serviceablePincode.update({
        where: {
          id,
        },

        data: {
          isActive:
            isActiveInput,
        },
      });
    } catch {
      throw new NotFoundException(
        "Pincode record not found.",
      );
    }
  }

  async listCancellationReasons(
    audienceInput: unknown,
  ) {
    const audience =
      this.normalizeAudience(
        audienceInput,
      );

    return this.prisma.cancellationReasonMaster.findMany({
      where: {
        audience,
      },

      orderBy: [
        {
          displayOrder:
            "asc",
        },
        {
          id:
            "asc",
        },
      ],
    });
  }

  async addCancellationReason(
    body: any,
  ) {
    const audience =
      this.normalizeAudience(
        body?.audience,
      );

    const label =
      this.normalizeLabel(
        body?.label,
      );

    const baseCode =
      this.makeCode(
        label,
      );

    if (!baseCode) {
      throw new BadRequestException(
        "Unable to create reason code.",
      );
    }

    const existing =
      await this.prisma.cancellationReasonMaster.findUnique({
        where: {
          audience_code: {
            audience,
            code:
              baseCode,
          },
        },
      });

    if (existing) {
      throw new BadRequestException(
        "This cancellation reason already exists.",
      );
    }

    return this.prisma.cancellationReasonMaster.create({
      data: {
        audience,
        code:
          baseCode,
        label,
        requiresFreeText:
          body?.requiresFreeText ===
          true,
        isActive:
          body?.isActive !==
          false,
        displayOrder:
          Number.isInteger(
            Number(
              body?.displayOrder,
            ),
          )
            ? Number(
                body.displayOrder,
              )
            : 0,
      },
    });
  }

  async updateCancellationReason(
    idInput: unknown,
    body: any,
  ) {
    const id =
      Number(
        idInput,
      );

    if (
      !Number.isInteger(
        id,
      ) ||
      id <= 0
    ) {
      throw new BadRequestException(
        "Invalid cancellation reason.",
      );
    }

    const data: {
      label?: string;
      requiresFreeText?: boolean;
      isActive?: boolean;
      displayOrder?: number;
    } = {};

    if (
      body?.label !==
      undefined
    ) {
      data.label =
        this.normalizeLabel(
          body.label,
        );
    }

    if (
      body?.requiresFreeText !==
      undefined
    ) {
      data.requiresFreeText =
        body.requiresFreeText ===
        true;
    }

    if (
      body?.isActive !==
      undefined
    ) {
      if (
        typeof body.isActive !==
        "boolean"
      ) {
        throw new BadRequestException(
          "isActive must be true or false.",
        );
      }

      data.isActive =
        body.isActive;
    }

    if (
      body?.displayOrder !==
      undefined
    ) {
      const displayOrder =
        Number(
          body.displayOrder,
        );

      if (
        !Number.isInteger(
          displayOrder,
        )
      ) {
        throw new BadRequestException(
          "displayOrder must be an integer.",
        );
      }

      data.displayOrder =
        displayOrder;
    }

    try {
      return await this.prisma.cancellationReasonMaster.update({
        where: {
          id,
        },

        data,
      });
    } catch {
      throw new NotFoundException(
        "Cancellation reason not found.",
      );
    }
  }

  async listFeedbackOptions() {
    return this.prisma.customerFeedbackOption.findMany({
      orderBy: [
        {
          displayOrder:
            "asc",
        },
        {
          id:
            "asc",
        },
      ],
    });
  }

  async addFeedbackOption(
    body: any,
  ) {
    const label =
      this.normalizeLabel(
        body?.label,
      );

    const code =
      this.makeCode(
        label,
      );

    if (!code) {
      throw new BadRequestException(
        "Unable to create feedback option code.",
      );
    }

    const existing =
      await this.prisma.customerFeedbackOption.findUnique({
        where: {
          code,
        },
      });

    if (existing) {
      throw new BadRequestException(
        "This feedback option already exists.",
      );
    }

    return this.prisma.customerFeedbackOption.create({
      data: {
        code,
        label,
        requiresFreeText:
          body?.requiresFreeText ===
          true,
        isActive:
          body?.isActive !==
          false,
        displayOrder:
          Number.isInteger(
            Number(
              body?.displayOrder,
            ),
          )
            ? Number(
                body.displayOrder,
              )
            : 0,
      },
    });
  }

  async updateFeedbackOption(
    idInput: unknown,
    body: any,
  ) {
    const id =
      Number(
        idInput,
      );

    if (
      !Number.isInteger(
        id,
      ) ||
      id <= 0
    ) {
      throw new BadRequestException(
        "Invalid feedback option.",
      );
    }

    const data: {
      label?: string;
      requiresFreeText?: boolean;
      isActive?: boolean;
      displayOrder?: number;
    } = {};

    if (
      body?.label !==
      undefined
    ) {
      data.label =
        this.normalizeLabel(
          body.label,
        );
    }

    if (
      body?.requiresFreeText !==
      undefined
    ) {
      data.requiresFreeText =
        body.requiresFreeText ===
        true;
    }

    if (
      body?.isActive !==
      undefined
    ) {
      if (
        typeof body.isActive !==
        "boolean"
      ) {
        throw new BadRequestException(
          "isActive must be true or false.",
        );
      }

      data.isActive =
        body.isActive;
    }

    if (
      body?.displayOrder !==
      undefined
    ) {
      const displayOrder =
        Number(
          body.displayOrder,
        );

      if (
        !Number.isInteger(
          displayOrder,
        )
      ) {
        throw new BadRequestException(
          "displayOrder must be an integer.",
        );
      }

      data.displayOrder =
        displayOrder;
    }

    try {
      return await this.prisma.customerFeedbackOption.update({
        where: {
          id,
        },

        data,
      });
    } catch {
      throw new NotFoundException(
        "Feedback option not found.",
      );
    }
  }
}
