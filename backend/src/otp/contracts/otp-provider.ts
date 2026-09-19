export type OtpSendResult = {
  provider: "MSG91";
  expiresInSeconds: number;
  providerMessage?: string | null;
};

export interface OtpProvider {
  sendOtp(phone: string): Promise<OtpSendResult>;
  verifyOtp(phone: string, otp: string): Promise<void>;
}

export const OTP_PROVIDER = Symbol("OTP_PROVIDER");
