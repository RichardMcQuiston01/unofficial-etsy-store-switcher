import type {LicenseTier} from './license';

/**
 * Stripe Payment Links for the paid tiers (live mode — see ROADMAP.md Stage
 * 6). Each is pre-configured with `metadata.product_slug` and
 * `metadata.tier` (and, for Enterprise, `metadata.activation_limit`), which
 * Stripe copies onto the Checkout Session it creates; the license
 * service's webhook reads those to issue a license against the right
 * product and tier (see the license-service repo's Stage 1/4). There's no
 * backend on this side to create Checkout Sessions dynamically, so these
 * links — not a "Checkout" API call — are the entire checkout flow.
 */
export interface BillingPlan {
  id: string;
  label: string;
  price: string;
  url: string;
}

export interface BillingTierPlans {
  tier: Exclude<LicenseTier, 'free'>;
  name: string;
  description: string;
  plans: readonly BillingPlan[];
}

export const BILLING_TIERS: readonly BillingTierPlans[] = [
  {
    tier: 'etsy',
    name: 'Etsy',
    description: 'Unlimited saved Etsy shops, 1 device.',
    plans: [
      {
        id: 'etsy-monthly',
        label: 'Monthly',
        price: '$2.99/mo',
        url: 'https://buy.stripe.com/8x2fZh0u70Tk9v7gVOcs801',
      },
      {
        id: 'etsy-quarterly',
        label: 'Quarterly (90 days)',
        price: '$7.99',
        url: 'https://buy.stripe.com/cNieVdfp16dE9v720Ucs802',
      },
      {
        id: 'etsy-semiannual',
        label: 'Semi-annual (180 days)',
        price: '$14.99',
        url: 'https://buy.stripe.com/5kQ3cv1ybfOe8r3gVOcs803',
      },
      {
        id: 'etsy-annual',
        label: 'Annual',
        price: '$27.99',
        url: 'https://buy.stripe.com/4gMdR9a4HcC20YB5d6cs804',
      },
    ],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited saved Etsy shops, up to 5 devices.',
    plans: [
      {
        id: 'enterprise-monthly',
        label: 'Monthly',
        price: '$7.99/mo',
        url: 'https://buy.stripe.com/8x27sLa4H9pQ4aN5d6cs805',
      },
      {
        id: 'enterprise-quarterly',
        label: 'Quarterly (90 days)',
        price: '$21.99',
        url: 'https://buy.stripe.com/28E8wP0u76dE22F5d6cs806',
      },
      {
        id: 'enterprise-semiannual',
        label: 'Semi-annual (180 days)',
        price: '$40.99',
        url: 'https://buy.stripe.com/00w8wP7Wz7hI9v75d6cs807',
      },
      {
        id: 'enterprise-annual',
        label: 'Annual',
        price: '$74.99',
        url: 'https://buy.stripe.com/dRm4gz0u7dG636J20Ucs808',
      },
    ],
  },
];
