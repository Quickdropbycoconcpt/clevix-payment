export class MoneyValueConverter {
  static fromKoboToNaira(kobo: string): number {
    return Number(kobo) / 100;
  }

  static fromNairaToKobo(naira: string): bigint {
    if (!/^\d+(\.\d{1,2})?$/.test(naira)) {
      throw new Error(
        'Amount must be a valid number with at most 2 decimal places',
      );
    }

    const [whole, decimal = ''] = naira.split('.');

    const paddedDecimal = decimal.padEnd(2, '0');

    return BigInt(`${whole}${paddedDecimal}`);
  }
}
