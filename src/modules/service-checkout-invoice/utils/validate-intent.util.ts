import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

export async function validateIntent<T extends object>(
  dtoClass: new () => T,
  intent: Record<string, any>,
): Promise<T> {
  const instance = plainToInstance(dtoClass, intent ?? {});

  try {
    await validateOrReject(instance, { forbidUnknownValues: false });
  } catch (errors) {
    const messages = (errors as Array<{ constraints?: Record<string, string> }>)
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .filter(Boolean);

    throw new BadRequestException(
      messages.length ? messages : 'Invalid payment intent',
    );
  }

  return instance;
}
