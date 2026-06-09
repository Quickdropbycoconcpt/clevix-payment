import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import * as argon from 'argon2';
import { Repository } from 'typeorm';
import { Key } from '../entity/keys.entity';
import { KeyType } from '../enums/keys.enums';
import { AuthenticatedKey, GeneratedKeyPair } from '../interface/key.interface';
import { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { businessScopeFilter } from 'src/shared/business-scope';

@Injectable()
export class KeysService {
  constructor(
    @InjectRepository(Key)
    private readonly keyRepository: Repository<Key>,
  ) {}

  private generateKeyPair(): GeneratedKeyPair {
    const privateKey = randomBytes(32).toString('hex');
    const publicKey = randomBytes(16).toString('hex');

    return {
      clientId: publicKey,
      secretKey: privateKey,
    };
  }

  async generateKey(
    user: JwtPayload,
  ): Promise<GeneratedKeyPair & { message: string }> {
    console.log(user);
    const scope = businessScopeFilter(user);
    const keyPairs = this.generateKeyPair();
    const clientId = keyPairs.clientId;
    const secretKey = await argon.hash(keyPairs.secretKey);

    /**
     * Generating new key invalidate or delete previous keys
     */
    const envKey = await this.keyRepository.findOne({
      where: { businessId: scope.businessId, environment: scope.environment },
    });
    if (envKey) {
      console.log(scope);
      await this.keyRepository.delete({
        businessId: scope.businessId,
        environment: scope.environment,
      });
    }

    const privateHash = this.keyRepository.create({
      keyHash: secretKey,
      clientId,
      ...scope,
    });

    await this.keyRepository.save([privateHash]);

    return {
      ...keyPairs,
      message:
        'Kindly copy your keys. You can only view them once. Your raw keys are not saved on our server.',
    };
  }

  async keyAuthentication(keys: GeneratedKeyPair): Promise<AuthenticatedKey> {
    const { clientId, secretKey } = keys;

    if (!clientId || !secretKey) {
      throw new UnauthorizedException('Invalid Api Key');
    }

    const keyInfo = await this.keyRepository.findOne({
      where: { clientId },
    });

    if (!keyInfo) {
      throw new UnauthorizedException('Invalid Api Key');
    }

    const isValidKey = await argon.verify(keyInfo.keyHash, secretKey);

    if (isValidKey) {
      return {
        businessId: keyInfo.businessId,
        environment: keyInfo.environment,
      };
    }

    throw new UnauthorizedException('Invalid Api Key');
  }

  private getKeyType(prefix: string): KeyType | null {
    if (prefix === 'pk') {
      return KeyType.PUBLIC;
    }

    if (prefix === 'sk') {
      return KeyType.SECRET;
    }

    return null;
  }
}
