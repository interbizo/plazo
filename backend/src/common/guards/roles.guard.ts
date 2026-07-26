import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check both class-level and method-level roles (method overrides class)
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      "roles",
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    // SUPER_ADMIN always has access
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // SELLER can also access BUYER endpoints (marketplace users can buy & sell)
    let hasRole = requiredRoles.includes(user.role);
    if (
      !hasRole &&
      user.role === UserRole.SELLER &&
      requiredRoles.includes(UserRole.BUYER)
    ) {
      hasRole = true;
    }
    // ADMIN can also access BUYER/SELLER endpoints, but must not bypass
    // SUPER_ADMIN-only routes.
    if (
      !hasRole &&
      user.role === UserRole.ADMIN &&
      requiredRoles.some(
        (role) => role === UserRole.BUYER || role === UserRole.SELLER,
      )
    ) {
      hasRole = true;
    }

    if (!hasRole) {
      throw new ForbiddenException(
        "Access denied. Insufficient permissions.",
      );
    }

    return true;
  }
}
