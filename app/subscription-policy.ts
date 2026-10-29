// Shared disclosure for the plan builder and payment checkout.
// Cancellation stops future renewals; current service fulfillment is confirmed separately.
export const subscriptionDisclosure = {
  title: 'A monthly subscription. Cancel anytime.',
  renewal: 'Your plan renews automatically each month until you cancel.',
  cancellation: 'Cancel before your next billing date to stop the next renewal charge.',
  existingBalance: 'Cancelling does not erase charges already billed or an outstanding balance.',
} as const;
