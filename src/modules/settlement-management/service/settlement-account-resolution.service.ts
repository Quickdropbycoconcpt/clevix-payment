import { Injectable } from '@nestjs/common';
import {
  SettlementAllocation,
  SettlementAccountResolver,
} from '../settlement-account-resolver.interface';

@Injectable()
export class SettlementAccountResolutionService {
  private readonly resolvers: SettlementAccountResolver[] = [];

  registerResolver(resolver: SettlementAccountResolver): void {
    this.resolvers.push(resolver);
  }

  /**
   * Returns `undefined` if nothing claims this reference (fall back to
   * general config entirely), or the list of allocations the owning
   * feature resolved — which may itself contain a single null-account
   * allocation when there's no override.
   */
  async resolve(
    merchantRef: string,
  ): Promise<SettlementAllocation[] | undefined> {
    for (const resolver of this.resolvers) {
      const result = await resolver.resolve(merchantRef);

      if (result.owned) {
        return result.allocations;
      }
    }

    return undefined;
  }
}
