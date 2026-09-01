// Afghan payment methods for boosts and shop orders.
// Real settlement is manual: user transfers, submits reference, admin/seller approves.
// Account numbers are configured per project — set them in Admin → Settings (future)
// or replace the empty strings below with your real merchant numbers.

export type PaymentMethodKey = "mpaisa" | "myMoney" | "hesab_pay" | "bank_transfer" | "cash";

export interface PaymentMethod {
  key: PaymentMethodKey;
  name: string;
  account: string;
  instructions: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    key: "cash",
    name: "Cash on delivery / office",
    account: "",
    instructions: "Pay in cash on delivery or at our office; keep the receipt.",
  },
  {
    key: "bank_transfer",
    name: "Bank transfer (AIB / Azizi)",
    account: "",
    instructions: "Transfer from any Afghan bank and paste the reference.",
  },
  {
    key: "mpaisa",
    name: "M-Paisa (Roshan)",
    account: "",
    instructions: "Send from your M-Paisa wallet, then paste the transaction ID.",
  },
  {
    key: "myMoney",
    name: "My Money (Etisalat)",
    account: "",
    instructions: "Send via My Money and paste the confirmation reference.",
  },
  {
    key: "hesab_pay",
    name: "HesabPay",
    account: "",
    instructions: "Pay to the HesabPay merchant and paste the reference code.",
  },
];
