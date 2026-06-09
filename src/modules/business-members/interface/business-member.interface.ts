import { BusinessMemberStatus } from '../enums/business-member.enums';

export type CreateBusinessMemberInput = {
  businessId: string;
  userId: string;
  roleId: string;
  status?: BusinessMemberStatus;
  invitedByUserId?: string;
};

export type CreateBusinessOwnerInput = {
  businessId: string;
  userId: string;
  roleId: string;
};
