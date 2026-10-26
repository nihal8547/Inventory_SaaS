import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', 'secret'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Strict Multi-Tenant Isolation:
    // If x-tenant-id header is supplied, verify that non-superadmin users actually belong to it!
    const requestedTenantId = req.headers['x-tenant-id'];

    if (user.isSuperAdmin) {
      if (requestedTenantId) {
        req.tenantId = requestedTenantId;
      }
    } else {
      if (requestedTenantId) {
        const validMembership = await this.prisma.membership.findFirst({
          where: {
            userId: user.id,
            tenantId: requestedTenantId,
            isActive: true,
          },
        });
        if (!validMembership) {
          throw new UnauthorizedException('Unauthorized access to specified organization/tenant');
        }
        req.tenantId = requestedTenantId;
      } else {
        // Fallback to the user's primary active membership
        const primaryMembership = await this.prisma.membership.findFirst({
          where: { userId: user.id, isActive: true },
        });
        if (primaryMembership) {
          req.tenantId = primaryMembership.tenantId;
        }
      }
    }

    return {
      id: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      tenantId: req.tenantId,
    };
  }
}
