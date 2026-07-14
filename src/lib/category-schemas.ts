// Category-specific attribute schemas.
// Drives both the Sell form (dynamic fields) and the browse filters.
// `key` is stored inside listings.attributes JSONB.

import type { CategoryKey } from "./categories";

export type FieldType = "text" | "number" | "select";

export interface AttrField {
  key: string;
  label: string;              // English fallback / translation key: `attr.<key>`
  type: FieldType;
  options?: string[];         // for select; option label key: `attr.<key>.<option>`
  filterable?: boolean;       // show in filters panel
  suffix?: string;            // e.g. "km", "m²"
  min?: number;
  max?: number;
}

export const CATEGORY_SCHEMAS: Record<CategoryKey, AttrField[]> = {
  real_estate: [
    { key: "property_type", label: "Property type", type: "select",
      options: ["house", "apartment", "land", "shop", "office"], filterable: true },
    { key: "bedrooms", label: "Bedrooms", type: "number", filterable: true, min: 0, max: 20 },
    { key: "bathrooms", label: "Bathrooms", type: "number", min: 0, max: 20 },
    { key: "area_size", label: "Area", type: "number", suffix: "m²", filterable: true },
  ],
  vehicles: [
    { key: "vehicle_type", label: "Vehicle type", type: "select",
      options: ["car", "motorcycle", "truck", "bus", "other"], filterable: true },
    { key: "make", label: "Make", type: "text", filterable: true },
    { key: "model", label: "Model", type: "text" },
    { key: "year", label: "Year", type: "number", filterable: true, min: 1950, max: 2030 },
    { key: "mileage", label: "Mileage", type: "number", suffix: "km" },
    { key: "fuel", label: "Fuel", type: "select",
      options: ["petrol", "diesel", "hybrid", "electric", "gas"], filterable: true },
    { key: "transmission", label: "Transmission", type: "select",
      options: ["manual", "automatic"] },
  ],
  marketplace: [
    { key: "condition", label: "Condition", type: "select",
      options: ["new", "like_new", "used", "for_parts"], filterable: true },
    { key: "brand", label: "Brand", type: "text" },
  ],
  jobs: [
    { key: "job_type", label: "Job type", type: "select",
      options: ["full_time", "part_time", "contract", "internship", "remote"], filterable: true },
    { key: "experience", label: "Experience", type: "select",
      options: ["entry", "mid", "senior"], filterable: true },
    { key: "salary_period", label: "Salary period", type: "select",
      options: ["hour", "day", "month", "year"] },
  ],
  services: [
    { key: "service_type", label: "Service type", type: "select",
      options: ["professional", "home", "education", "events", "other"], filterable: true },
  ],
};

export function getSchema(cat: CategoryKey): AttrField[] {
  return CATEGORY_SCHEMAS[cat] ?? [];
}
