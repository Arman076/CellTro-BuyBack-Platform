import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

import type {
  Request,
} from "express";

@Injectable()
export class AdminConfigGuard
  implements CanActivate
{
  canActivate(
    context: ExecutionContext,
  ) {
    const expected =
      String(
        process.env
          .ADMIN_CONFIG_KEY ??
          "",
      ).trim();

    if (!expected) {
      throw new ServiceUnavailableException(
        "ADMIN_CONFIG_KEY is not configured.",
      );
    }

    const request =
      context
        .switchToHttp()
        .getRequest<Request>();

    const received =
      String(
        request.headers[
          "x-admin-config-key"
        ] ??
          "",
      ).trim();

    if (
      !received ||
      received !== expected
    ) {
      throw new UnauthorizedException(
        "Admin configuration access denied.",
      );
    }

    return true;
  }
}
