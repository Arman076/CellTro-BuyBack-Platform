import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

import type {
  OtpProvider,
  OtpSendResult,
} from "../contracts/otp-provider.js";

type Msg91Response = {
  type?: string;
  message?: string;
  [key: string]: unknown;
};

@Injectable()
export class Msg91OtpProvider implements OtpProvider {
  private normalizeIndianPhone(value: unknown) {
    const digits = String(value ?? "").replace(/\D/g, "");
    const local =
      digits.startsWith("91") && digits.length === 12
        ? digits.slice(2)
        : digits;

    if (!/^[6-9]\d{9}$/.test(local)) {
      throw new BadRequestException(
        "Enter a valid 10-digit Indian mobile number.",
      );
    }

    return {
      local,
      international: `91${local}`,
    };
  }

  private getConfig() {
    const authKey = String(process.env.MSG91_AUTH_KEY ?? "").trim();
    const templateId = String(process.env.MSG91_TEMPLATE_ID ?? "").trim();

    if (!authKey || !templateId) {
      throw new ServiceUnavailableException(
        "MSG91 OTP provider is not configured.",
      );
    }

    const expiryRaw = Number(
      process.env.MSG91_OTP_EXPIRY_MINUTES ?? 5,
    );
    const lengthRaw = Number(
      process.env.MSG91_OTP_LENGTH ?? 6,
    );

    return {
      authKey,
      templateId,
      expiryMinutes:
        Number.isFinite(expiryRaw) && expiryRaw >= 1
          ? Math.floor(expiryRaw)
          : 5,
      otpLength:
        Number.isFinite(lengthRaw) &&
        lengthRaw >= 4 &&
        lengthRaw <= 9
          ? Math.floor(lengthRaw)
          : 6,
    };
  }

  private async readResponse(response: Response): Promise<Msg91Response> {
    const data = (await response.json().catch(() => ({}))) as Msg91Response;

    if (!response.ok) {
      throw new BadGatewayException(
        String(data?.message || "MSG91 request failed."),
      );
    }

    return data;
  }

  async sendOtp(phone: string): Promise<OtpSendResult> {
    const { international } = this.normalizeIndianPhone(phone);
    const {
      authKey,
      templateId,
      expiryMinutes,
      otpLength,
    } = this.getConfig();

    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("template_id", templateId);
    url.searchParams.set("mobile", international);
    url.searchParams.set("otp_expiry", String(expiryMinutes));
    url.searchParams.set("otp_length", String(otpLength));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authkey: authKey,
      },
      body: JSON.stringify({}),
    });

    const data = await this.readResponse(response);

    if (String(data?.type ?? "").toLowerCase() !== "success") {
      throw new BadGatewayException(
        String(data?.message || "Unable to send OTP."),
      );
    }

    return {
      provider: "MSG91",
      expiresInSeconds: expiryMinutes * 60,
      providerMessage: data?.message ? String(data.message) : null,
    };
  }

  async verifyOtp(phone: string, otp: string) {
    const { international } = this.normalizeIndianPhone(phone);
    const cleanOtp = String(otp ?? "").replace(/\D/g, "");

    if (!/^\d{4,9}$/.test(cleanOtp)) {
      throw new BadRequestException("Enter a valid OTP.");
    }

    const { authKey } = this.getConfig();

    const url = new URL(
      "https://control.msg91.com/api/v5/otp/verify",
    );
    url.searchParams.set("otp", cleanOtp);
    url.searchParams.set("mobile", international);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        authkey: authKey,
      },
    });

    const data = await this.readResponse(response);
    const message = String(data?.message ?? "");
    const lower = message.toLowerCase();

    if (
      !lower.includes("verified") ||
      lower.includes("invalid") ||
      lower.includes("expired")
    ) {
      throw new UnauthorizedException(
        message || "Invalid or expired OTP.",
      );
    }
  }
}
