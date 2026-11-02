# Parcel

TLC reached 11 states and 19 steps. The chart draws 8 states and 8 arrows.

## Rules that break

### NeverShipUnpaid

1. In the basket
2. Ordered, awaiting payment: you check out
3. Shipped before payment cleared: the warehouse packs it [the payment is still pending]

## Rules that hold
TypeOK, RefundOnlyAfterPayment, NoDeadlock
