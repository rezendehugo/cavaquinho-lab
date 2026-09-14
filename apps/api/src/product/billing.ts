import Stripe from 'stripe';
import type { ProductRepository } from './repository.js';

export interface BillingGateway {
  createCheckout(ownerId: string, email: string | undefined, price: 'monthly' | 'annual'): Promise<string>;
  createPortal(ownerId: string): Promise<string>;
  processWebhook(rawBody: string, signature: string): Promise<void>;
}

export class DisabledBillingGateway implements BillingGateway {
  async createCheckout(): Promise<string> { throw new Error('billing_unavailable'); }
  async createPortal(): Promise<string> { throw new Error('billing_unavailable'); }
  async processWebhook(): Promise<void> { throw new Error('billing_unavailable'); }
}

export class StripeBillingGateway implements BillingGateway {
  private readonly stripe: Stripe;
  constructor(
    secretKey: string,
    private readonly webhookSecret: string,
    private readonly appUrl: string,
    private readonly prices: { monthly: string; annual: string },
    private readonly repository: ProductRepository
  ) { this.stripe = new Stripe(secretKey); }

  async createCheckout(ownerId: string, email: string | undefined, price: 'monthly' | 'annual'): Promise<string> {
    const current = await this.repository.getSubscription(ownerId);
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription', customer: current?.stripeCustomerId ?? undefined,
      customer_email: current?.stripeCustomerId ? undefined : email,
      client_reference_id: ownerId, metadata: { ownerId },
      line_items: [{ price: this.prices[price], quantity: 1 }],
      success_url: `${this.appUrl}/account?checkout=success`, cancel_url: `${this.appUrl}/pricing?checkout=cancelled`,
      allow_promotion_codes: true
    }, { idempotencyKey: `checkout:${ownerId}:${price}:${new Date().toISOString().slice(0, 13)}` });
    if (!session.url) throw new Error('checkout_url_missing');
    return session.url;
  }

  async createPortal(ownerId: string): Promise<string> {
    const current = await this.repository.getSubscription(ownerId);
    if (!current?.stripeCustomerId) throw new Error('subscription_not_found');
    return (await this.stripe.billingPortal.sessions.create({ customer: current.stripeCustomerId, return_url: `${this.appUrl}/account` })).url;
  }

  async processWebhook(rawBody: string, signature: string): Promise<void> {
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    if (!await this.repository.claimStripeEvent(event.id, new Date(event.created * 1000).toISOString())) return;
    if (!['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) return;
    const subscription = event.data.object as Stripe.Subscription;
    const ownerId = subscription.metadata.ownerId;
    if (!ownerId) throw new Error('subscription_owner_missing');
    await this.repository.saveSubscription({
      ownerId, stripeCustomerId: String(subscription.customer), stripeSubscriptionId: subscription.id,
      status: subscription.status, priceId: subscription.items.data[0]?.price.id ?? null,
      currentPeriodEnd: new Date((subscription.items.data[0]?.current_period_end ?? event.created) * 1000).toISOString(),
      lastEventCreatedAt: new Date(event.created * 1000).toISOString()
    });
  }
}
