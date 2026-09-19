import { Inject, Injectable } from "@nestjs/common";
import { OTP_PROVIDER } from "./contracts/otp-provider.js";
import type { OtpProvider } from "./contracts/otp-provider.js";

@Injectable()
export class OtpService {
  constructor(
    @Inject(OTP_PROVIDER)
    private readonly provider: OtpProvider,
  ) {}

  sendOtp(phone: string) {
    return this.provider.sendOtp(phone);
  }

  verifyOtp(phone: string, otp: string) {
    return this.provider.verifyOtp(phone, otp);
  }
}
