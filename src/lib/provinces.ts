// Afghanistan provinces — public, safe to ship in client bundle.
export const AF_PROVINCES = [
  "Kabul", "Herat", "Kandahar", "Balkh (Mazar-e Sharif)", "Nangarhar (Jalalabad)",
  "Kunduz", "Helmand", "Ghazni", "Bamyan", "Parwan", "Baghlan", "Takhar",
  "Faryab", "Jawzjan", "Samangan", "Sar-e Pol", "Badakhshan", "Badghis",
  "Daykundi", "Farah", "Ghor", "Khost", "Kunar", "Laghman", "Logar",
  "Maidan Wardak", "Nimruz", "Nuristan", "Paktia", "Paktika", "Panjshir",
  "Uruzgan", "Zabul", "Kapisa",
] as const;
export type AfProvince = typeof AF_PROVINCES[number];
