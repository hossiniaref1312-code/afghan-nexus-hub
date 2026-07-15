// Afghan telco / bank payment options for ad boosts.
// Real settlement is manual: user transfers, submits reference, admin approves.

export type PaymentMethodKey =
  | "mpaisa"
  | "myMoney"
  | "hesab_pay"
  | "bank_transfer"
  | "cash";

export interface PaymentMethod {
  key: PaymentMethodKey;
  name: string;         // display name
  account: string;      // number to send funds to
  instructions: string; // short user-facing help
}

// TODO: replace account numbers with the operator's real merchant numbers.
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    key: "mpaisa",
    name: "M-Paisa (Roshan)",
    account: "0799 000 000",
    instructions: "Send from your M-Paisa wallet, then paste the transaction ID.",
  },
  {
    key: "myMoney",
    name: "My Money (Etisalat)",
    account: "0786 000 000",
    instructions: "Send via My Money and paste the confirmation reference.",
  },
  {
    key: "hesab_pay",
    name: "HesabPay",
    account: "afghanmarket",
    instructions: "Pay to the HesabPay merchant and paste the reference code.",
  },
  {
    key: "bank_transfer",
    name: "Bank transfer (AIB / Azizi)",
    account: "IBAN AF00 0000 0000 0000",
    instructions: "Transfer from any Afghan bank and paste the reference.",
  },
  {
    key: "cash",
    name: "Cash on office visit",
    account: "Kabul office",
    instructions: "Pay in cash at our office; keep the receipt number.",
  },
];
