import { BadRequestException } from '@nestjs/common';
import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [a, b] = parts;

  if (a === 0) return true; // "this network"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true; // multicast / reserved

  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized === '::1' || normalized === '::') {
    return true;
  }
  if (/^fe[89ab]/.test(normalized)) {
    return true; // link-local fe80::/10
  }
  if (/^f[cd]/.test(normalized)) {
    return true; // unique local fc00::/7
  }
  if (normalized.startsWith('::ffff:')) {
    const embeddedIpv4 = normalized.slice('::ffff:'.length);

    if (isIP(embeddedIpv4) === 4) {
      return isPrivateIpv4(embeddedIpv4);
    }
  }

  return false;
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);

  if (version === 4) {
    return isPrivateIpv4(address);
  }
  if (version === 6) {
    return isPrivateIpv6(address);
  }

  return true;
}

/**
 * Rejects any http(s) URL that resolves to a private, loopback, link-local
 * (including cloud metadata) or otherwise non-public address, to prevent
 * user-supplied URLs (webhooks, etc.) from being used for SSRF.
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<void> {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('URL must use http or https');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new BadRequestException('URL host is not allowed');
  }

  const literalIpVersion = isIP(hostname);
  const addresses = literalIpVersion
    ? [hostname]
    : await resolveAllAddresses(hostname);

  if (addresses.length === 0) {
    throw new BadRequestException('Unable to resolve URL host');
  }

  for (const address of addresses) {
    if (isPrivateAddress(address)) {
      throw new BadRequestException(
        'URL resolves to a private or reserved address and is not allowed',
      );
    }
  }
}

async function resolveAllAddresses(hostname: string): Promise<string[]> {
  try {
    const records = await dns.lookup(hostname, { all: true, verbatim: true });

    return records.map((record) => record.address);
  } catch {
    throw new BadRequestException('Unable to resolve URL host');
  }
}
