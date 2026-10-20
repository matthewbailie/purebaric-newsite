# Stripe payment links by rental length

Created and checked 20 Oct 2026. Every link is a monthly recurring subscription with **Collect tax automatically: Yes**, billed at the start of each period, Subscribe call to action, no addresses required. Prices match the admin Pricing tab on that date. The same links are stored in admin → Pricing & Payments → "Stripe payment links by rental length" (blob `settings/paymentLinks`); use the Copy button there to text one to a renter.

If a monthly rate changes in the admin, make a new Stripe link for that length (Payment links → Create → Add new product, Recurring, monthly, tax on) and paste it into the Pricing tab. A Stripe link cannot be re-priced in place.

## Home rentals

| Length | $/month | Stripe product | Link |
|---|---|---|---|
| 1 mo | $729 | 1-Month Chamber Rental | https://buy.stripe.com/bJe14n6dc3dk5lV4cG8EM0c |
| 2 mo | $659 | 2-Month Chamber Rental | https://buy.stripe.com/fZuaEX454g0629J10u8EM0d |
| 3 mo | $659 | 3-Month Chamber Rental | https://buy.stripe.com/00w4gzgRQ018eWv8sW8EM0e |
| 4 mo | $579 | 4-Month 1.5ATA Chamber Rental | https://buy.stripe.com/8x2eVd310g06g0zgZs8EM0a |
| 5 mo | $579 | 5-Month Chamber Rental | https://buy.stripe.com/9B6cN51WW7tA4hReRk8EM0f |
| 6 mo | $559 | 6-Month Chamber Rental | https://buy.stripe.com/8x24gzatscNUbKj10u8EM0g |
| 7 mo | $559 | 7-Month Chamber Rental | https://buy.stripe.com/dRmbJ1eJIbJQ6pZ10u8EM0h |
| 8 mo | $559 | 8-Month Chamber Rental | https://buy.stripe.com/9B6dR9bxw4ho5lV7oS8EM0i |
| 9 mo | $549 | 9-Month Chamber Rental | https://buy.stripe.com/7sY3cv5987tAeWvcJc8EM0j |
| 10 mo | $549 | 10-Month Chamber Rental | https://buy.stripe.com/7sY7sL6dc3dk29J6kO8EM0k |
| 11 mo | $549 | 11-Month Chamber Rental | https://buy.stripe.com/bJebJ17hgcNU01B9x08EM0l |
| 12 mo | $529 | 1-Year Chamber Rental | https://buy.stripe.com/8x26oH1WW5ls6pZ9x08EM02 |

## Business rentals

| Length | $/month | Stripe product | Link |
|---|---|---|---|
| 1 mo | $979 | Business Rental - 1.5 ATA Chamber | https://buy.stripe.com/dRmfZhats9BIbKjeRk8EM0b |
| 2 mo | $979 | Business Rental - 1.5 ATA Chamber, 2-Month | https://buy.stripe.com/dRm7sL1WWdRYcOn9x08EM0m |
| 3 mo | $929 | Business Rental - 1.5 ATA Chamber, 3-Month | https://buy.stripe.com/5kQ00jdFEcNU15F5gK8EM0n |
| 4 mo | $881 | Business Rental - 1.5 ATA Chamber, 4-Month | https://buy.stripe.com/aFadR9ats29g6pZdNg8EM0o |
| 5 mo | $881 | Business Rental - 1.5 ATA Chamber, 5-Month | https://buy.stripe.com/eVq28rfNM5lsg0zaB48EM0p |
| 6 mo | $832 | Business Rental - 1.5 ATA Chamber, 6-Month | https://buy.stripe.com/aFa6oHeJIdRYdSrcJc8EM0q |
| 7 mo | $832 | Business Rental - 1.5 ATA Chamber, 7-Month | https://buy.stripe.com/6oU5kD1WW3dk15FeRk8EM0r |
| 8 mo | $832 | Business Rental - 1.5 ATA Chamber, 8-Month | https://buy.stripe.com/9B66oH7hgeW201BaB48EM0s |
| 9 mo | $810 | Business Rental - 1.5 ATA Chamber, 9-Month | https://buy.stripe.com/dRmeVdbxw15caGfbF88EM0t |
| 10 mo | $810 | Business Rental - 1.5 ATA Chamber, 10-Month | https://buy.stripe.com/9B63cvfNM8xE6pZeRk8EM0u |
| 11 mo | $810 | Business Rental - 1.5 ATA Chamber, 11-Month | https://buy.stripe.com/9B6bJ15984hoeWv10u8EM0v |
| 12 mo | $783 | Business Rental - 1.5 ATA Chamber, 12-Month | https://buy.stripe.com/7sY5kD8lkaFM8y7gZs8EM0w |

## Older links still active in Stripe (not used by the admin)

- 4-Month Chamber Rental $590 (19 Sep, Lisa Kurtz's current subscription came from it)
- 3-Month Promo $549, 2.0 ATA $879, Weekly $164.75, Test $1
- 1-Month $829 and 3-Month $764 (old prices), 2-Month $729/month (wrong price)

None of these are in the admin table. Deactivate the mis-priced ones in Stripe when convenient so they cannot be reused by mistake; deactivating a link does not touch subscriptions already started from it.
