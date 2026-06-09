import { Request } from 'express';
import { AuthenticatedKey } from '../../key-management/interface/key.interface';
import { BusinessMember } from 'src/modules/business-members/entity/business-member.entity';

export type JwtPayload = {
  businessId?: string;
  userId: string;
  permissions?: string[];
  environment: string;
};

export type AuthenticatedRequest = Request & {
  user?: JwtPayload;
  apiKey?: AuthenticatedKey;
  businessMembership?: BusinessMember;
};
