import {storage} from 'wxt/utils/storage';

// This extension has no backend of its own — entitlement is verified by a
// separate, shared Licensing Service (github.com/RichardMcQuiston01/license-service)
// that also backs other products. Its integration contract (ROADMAP.md
// Stage 4 there): checkout happens externally (Stripe Payment Links, see
// lib/billing.ts), the customer receives a license key by email, and this
// module redeems/re-checks that key against the service's HTTP API. The
// free tier (FREE_TIER_ACCOUNT_LIMIT) never talks to this service at all.
const LICENSE_SERVICE_URL =
  'https://qzmoikhehzkrhgnkwoin.supabase.co/functions/v1';
// A publishable key, analogous to a Stripe publishable key — meant to ship
// in client code. It only grants the licenses-activate/-validate endpoints,
// which are already rate-limited and scoped to this product's license rows.
const LICENSE_SERVICE_PUBLISHABLE_KEY =
  'sb_publishable_aEbh7LeGbHCaDUBCPLFh_A_3ybUpscM';
const PRODUCT_SLUG = 'store-switcheroo';

/** Free-tier accounts are capped at this many; the paid tier is unlimited. */
export const FREE_TIER_ACCOUNT_LIMIT = 2;

/** Shown to the popup when ADD_ACCOUNT is rejected for being at the free-tier cap. */
export const FREE_TIER_LIMIT_MESSAGE =
  'Free plan is limited to 2 shops. Upgrade to add more.';

// A license is re-checked against the service at most this often (e.g. on
// popup open), rather than on every single popup load.
const REVALIDATE_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * "etsy" and "enterprise" are today's two paid tiers (see ROADMAP.md Stage
 * 6) — both mean "unlimited Etsy shops," since Etsy is the only platform
 * this extension supports; "enterprise" additionally raises the license
 * service's activation_limit (device count) via Checkout Session metadata.
 * A future multi-platform tier (Etsy + Shopify + others) is a real feature
 * this extension doesn't have yet, not just a pricing tier — see ROADMAP.md
 * Stage 11 — so it isn't sold or represented here until it exists.
 */
export type LicenseTier = 'free' | 'etsy' | 'enterprise';

interface StoredLicense {
  key: string;
  tier: LicenseTier;
  expiresAt: string | null;
  lastValidatedAt: string;
}

interface LicenseServiceResponse {
  valid: boolean;
  tier?: string;
  expiresAt?: string | null;
  reason?: string;
}

const deviceIdItem = storage.defineItem<string | null>('local:deviceId', {
  fallback: null,
  version: 1,
});

const licenseItem = storage.defineItem<StoredLicense | null>('local:license', {
  fallback: null,
  version: 1,
});

export interface Entitlement {
  tier: LicenseTier;
  expiresAt: string | null;
}

/** Whether an entitlement lifts the free tier's shop-count cap. */
export function hasUnlimitedShops(entitlement: Entitlement): boolean {
  return entitlement.tier !== 'free';
}

function isLicenseTier(value: string): value is LicenseTier {
  return value === 'etsy' || value === 'enterprise';
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await deviceIdItem.getValue();
  if (existing) {
    return existing;
  }
  const id = crypto.randomUUID();
  await deviceIdItem.setValue(id);
  return id;
}

async function callLicenseEndpoint(
  endpoint: 'licenses-activate' | 'licenses-validate',
  key: string,
  deviceId: string,
): Promise<LicenseServiceResponse> {
  const response = await fetch(`${LICENSE_SERVICE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: LICENSE_SERVICE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({key, productSlug: PRODUCT_SLUG, deviceId}),
  });
  return (await response.json()) as LicenseServiceResponse;
}

function licenseErrorMessage(reason: string | undefined): string {
  switch (reason) {
    case 'not_found':
      return 'That license key was not recognized.';
    case 'license_canceled':
      return 'This license has been canceled.';
    case 'license_expired':
      return 'This license has expired.';
    case 'license_revoked':
      return 'This license has been revoked.';
    case 'activation_limit_reached':
      return 'This license is already active on another device.';
    case 'rate_limited':
      return 'Too many attempts — try again in a minute.';
    case 'missing_fields':
      return 'Enter your license key.';
    default:
      return "Couldn't verify this license key. Try again.";
  }
}

/**
 * Redeems a license key on this install, consuming an activation slot on
 * the license service. Persists the entitlement locally on success; throws
 * a human-readable error (and stores nothing) otherwise.
 */
export async function activateLicense(key: string): Promise<void> {
  const trimmedKey = key.trim();
  if (!trimmedKey) {
    throw new Error(licenseErrorMessage('missing_fields'));
  }

  const deviceId = await getOrCreateDeviceId();
  const result = await callLicenseEndpoint(
    'licenses-activate',
    trimmedKey,
    deviceId,
  );

  if (!result.valid) {
    throw new Error(licenseErrorMessage(result.reason));
  }

  await licenseItem.setValue({
    key: trimmedKey,
    tier: result.tier && isLicenseTier(result.tier) ? result.tier : 'etsy',
    expiresAt: result.expiresAt ?? null,
    lastValidatedAt: new Date().toISOString(),
  });
}

/**
 * Re-checks a stored license's entitlement against the license service,
 * e.g. on popup open. A no-op if no license is stored. On an explicit
 * "no longer valid" response the local entitlement is cleared, downgrading
 * to the free tier; a network failure leaves the last-known entitlement
 * alone rather than downgrading someone just because they're offline.
 */
export async function revalidateLicense(): Promise<void> {
  const stored = await licenseItem.getValue();
  if (!stored) {
    return;
  }

  const deviceId = await getOrCreateDeviceId();
  try {
    const result = await callLicenseEndpoint(
      'licenses-validate',
      stored.key,
      deviceId,
    );
    if (!result.valid) {
      await licenseItem.setValue(null);
      return;
    }
    await licenseItem.setValue({
      ...stored,
      tier:
        result.tier && isLicenseTier(result.tier) ? result.tier : stored.tier,
      expiresAt: result.expiresAt ?? null,
      lastValidatedAt: new Date().toISOString(),
    });
  } catch {
    // Offline or the service is unreachable — keep the existing entitlement.
  }
}

/**
 * Calls revalidateLicense() only if the stored license hasn't been checked
 * recently, so popup opens don't hit the network every single time.
 */
export async function revalidateLicenseIfStale(): Promise<void> {
  const stored = await licenseItem.getValue();
  if (!stored) {
    return;
  }
  const elapsed = Date.now() - new Date(stored.lastValidatedAt).getTime();
  if (elapsed >= REVALIDATE_INTERVAL_MS) {
    await revalidateLicense();
  }
}

/** Reads the current entitlement from local storage only — no network call. */
export async function getEntitlement(): Promise<Entitlement> {
  const stored = await licenseItem.getValue();
  if (!stored) {
    return {tier: 'free', expiresAt: null};
  }
  return {tier: stored.tier, expiresAt: stored.expiresAt};
}
