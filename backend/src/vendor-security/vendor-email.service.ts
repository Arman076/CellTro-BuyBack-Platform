import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";

import nodemailer from "nodemailer";

type VendorApprovalEmailInput = {
  email: string;
  contactName: string;
  vendorCode: string;
  temporaryPassword: string;
  expiresInHours: number;
};

type VendorRejectionEmailInput = {
  email: string;
  contactName: string;
  reason: string;
};

@Injectable()
export class VendorEmailService {
  private createTransporter() {
    const host =
      process.env.SMTP_HOST?.trim();

    const port = Number(
      process.env.SMTP_PORT ?? "465",
    );

    const user =
      process.env.SMTP_USER?.trim();

    const password =
      process.env.SMTP_PASSWORD;

    if (
      !host ||
      !Number.isInteger(port) ||
      port <= 0 ||
      port > 65535 ||
      !user ||
      !password
    ) {
      throw new ServiceUnavailableException(
        "Email service is not configured",
      );
    }

    return nodemailer.createTransport({
      host,
      port,

      secure:
        port === 465,

      auth: {
        user,
        pass: password,
      },

      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  private getFromAddress() {
    const from =
      process.env.SMTP_FROM?.trim();

    if (!from) {
      throw new ServiceUnavailableException(
        "SMTP_FROM is not configured",
      );
    }

    return from;
  }

  private escapeHtml(
    value: string,
  ) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private logEmailFailure(
    operation: string,
    error: unknown,
  ) {
    if (
      process.env.NODE_ENV ===
      "production"
    ) {
      return;
    }

    const smtpError =
      error as {
        code?: string;
        responseCode?: number;
        message?: string;
      };

    /*
     * Never log OTPs, passwords,
     * SMTP credentials or email body.
     */
    console.error(
      `[VendorEmail] ${operation} failure:`,
      {
        code:
          smtpError.code,

        responseCode:
          smtpError.responseCode,

        message:
          smtpError.message,
      },
    );
  }

  async sendSignupOtp(
    email: string,
    otp: string,
  ): Promise<void> {
    const from =
      this.getFromAddress();

    const transporter =
      this.createTransporter();

    try {
      await transporter.sendMail({
        from,
        to: email,

        subject:
          "Verify your Celltro vendor email",

        text:
          `Your Celltro verification code is ${otp}. ` +
          "This code expires in 10 minutes. " +
          "Do not share this code with anyone.",

        html: `
          <div
            style="
              max-width:520px;
              margin:0 auto;
              padding:32px;
              font-family:Arial,sans-serif;
              color:#0f172a;
            "
          >
            <div
              style="
                font-size:24px;
                font-weight:800;
                color:#0f2b5b;
                margin-bottom:28px;
              "
            >
              Celltro
            </div>

            <h2
              style="
                margin:0 0 12px;
                color:#0f2b5b;
              "
            >
              Verify your email
            </h2>

            <p
              style="
                color:#64748b;
                line-height:1.6;
              "
            >
              Use this verification code to
              continue your Celltro vendor
              registration.
            </p>

            <div
              style="
                margin:28px 0;
                padding:20px;
                border-radius:12px;
                background:#f1f5f9;
                text-align:center;
                font-size:32px;
                font-weight:800;
                letter-spacing:8px;
                color:#1265df;
              "
            >
              ${this.escapeHtml(otp)}
            </div>

            <p
              style="
                color:#64748b;
                font-size:13px;
              "
            >
              This code expires in
              <strong>10 minutes</strong>.
            </p>

            <p
              style="
                color:#94a3b8;
                font-size:12px;
                line-height:1.5;
              "
            >
              Never share this OTP with anyone.
              Celltro will never ask you to share
              your verification code.
            </p>
          </div>
        `,
      });
    } catch (error) {
      this.logEmailFailure(
        "signup OTP email",
        error,
      );

      throw new ServiceUnavailableException(
        "Unable to send verification email. Please try again.",
      );
    }
  }

  async sendVendorApproval(
    input: VendorApprovalEmailInput,
  ): Promise<void> {
    const from =
      this.getFromAddress();

    const transporter =
      this.createTransporter();

    const portalUrl =
      process.env.VENDOR_PORTAL_URL?.trim() ??
      "";

    const safeContactName =
      this.escapeHtml(
        input.contactName,
      );

    const safeVendorCode =
      this.escapeHtml(
        input.vendorCode,
      );

    const safeTemporaryPassword =
      this.escapeHtml(
        input.temporaryPassword,
      );

    const safePortalUrl =
      this.escapeHtml(
        portalUrl,
      );

    try {
      await transporter.sendMail({
        from,
        to: input.email,

        subject:
          "Your Celltro vendor application has been approved",

        text:
          `Hello ${input.contactName},\n\n` +
          "Your Celltro vendor application has been approved.\n\n" +
          `Vendor ID / Username: ${input.vendorCode}\n` +
          `Temporary Password: ${input.temporaryPassword}\n` +
          (
            portalUrl
              ? `Vendor Portal: ${portalUrl}\n`
              : ""
          ) +
          `\nThis temporary password expires in ${input.expiresInHours} hours.\n` +
          "You must change your temporary password after signing in.\n\n" +
          "Do not share your password with anyone.",

        html: `
          <div
            style="
              max-width:560px;
              margin:0 auto;
              padding:32px;
              font-family:Arial,sans-serif;
              color:#0f172a;
            "
          >
            <div
              style="
                font-size:24px;
                font-weight:800;
                color:#0f2b5b;
                margin-bottom:28px;
              "
            >
              Celltro
            </div>

            <h2
              style="
                margin:0 0 12px;
                color:#0f2b5b;
              "
            >
              Vendor application approved
            </h2>

            <p
              style="
                line-height:1.6;
                color:#475569;
              "
            >
              Hello ${safeContactName},
            </p>

            <p
              style="
                line-height:1.6;
                color:#475569;
              "
            >
              Your Celltro vendor application
              has been approved.
            </p>

            <div
              style="
                margin:24px 0;
                padding:20px;
                border-radius:12px;
                background:#f1f5f9;
              "
            >
              <p
                style="
                  margin:0 0 16px;
                "
              >
                <strong>
                  Vendor ID / Username
                </strong>
                <br />
                ${safeVendorCode}
              </p>

              <p
                style="
                  margin:0;
                "
              >
                <strong>
                  Temporary Password
                </strong>
                <br />
                ${safeTemporaryPassword}
              </p>
            </div>

            ${
              portalUrl
                ? `
                  <p
                    style="
                      margin:24px 0;
                    "
                  >
                    <a
                      href="${safePortalUrl}"
                      style="
                        display:inline-block;
                        padding:12px 20px;
                        border-radius:8px;
                        background:#1265df;
                        color:#ffffff;
                        text-decoration:none;
                        font-weight:700;
                      "
                    >
                      Open Vendor Portal
                    </a>
                  </p>
                `
                : ""
            }

            <p
              style="
                line-height:1.6;
                color:#64748b;
                font-size:13px;
              "
            >
              This temporary password expires in
              <strong>
                ${input.expiresInHours} hours
              </strong>.
              You must create a new password
              after signing in.
            </p>

            <p
              style="
                color:#94a3b8;
                font-size:12px;
                line-height:1.5;
              "
            >
              Never share your password with
              anyone.
            </p>
          </div>
        `,
      });
    } catch (error) {
      this.logEmailFailure(
        "vendor approval email",
        error,
      );

      throw new ServiceUnavailableException(
        "Unable to send vendor approval email.",
      );
    }
  }

  async sendVendorRejection(
    input: VendorRejectionEmailInput,
  ): Promise<void> {
    const from =
      this.getFromAddress();

    const transporter =
      this.createTransporter();

    const safeContactName =
      this.escapeHtml(
        input.contactName,
      );

    const safeReason =
      this.escapeHtml(
        input.reason,
      );

    try {
      await transporter.sendMail({
        from,
        to: input.email,

        subject:
          "Update on your Celltro vendor application",

        text:
          `Hello ${input.contactName},\n\n` +
          "Your Celltro vendor application has been reviewed and was not approved.\n\n" +
          `Reason: ${input.reason}\n\n` +
          "Celltro",

        html: `
          <div
            style="
              max-width:560px;
              margin:0 auto;
              padding:32px;
              font-family:Arial,sans-serif;
              color:#0f172a;
            "
          >
            <div
              style="
                font-size:24px;
                font-weight:800;
                color:#0f2b5b;
                margin-bottom:28px;
              "
            >
              Celltro
            </div>

            <h2
              style="
                margin:0 0 12px;
                color:#0f2b5b;
              "
            >
              Vendor application update
            </h2>

            <p
              style="
                line-height:1.6;
                color:#475569;
              "
            >
              Hello ${safeContactName},
            </p>

            <p
              style="
                line-height:1.6;
                color:#475569;
              "
            >
              Your Celltro vendor application
              has been reviewed and was not
              approved.
            </p>

            <div
              style="
                margin:24px 0;
                padding:20px;
                border-radius:12px;
                background:#f8fafc;
              "
            >
              <strong>
                Reason
              </strong>

              <p
                style="
                  margin:8px 0 0;
                  line-height:1.6;
                  color:#475569;
                "
              >
                ${safeReason}
              </p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logEmailFailure(
        "vendor rejection email",
        error,
      );

      throw new ServiceUnavailableException(
        "Unable to send vendor rejection email.",
      );
    }
  }
}