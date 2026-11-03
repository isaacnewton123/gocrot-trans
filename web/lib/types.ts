import type { Models } from "appwrite";

export type Driver = Models.Row & {
  phone: string;
  name: string;
  active: boolean;
  note?: string;
};

export type Trip = Models.Row & {
  seriesCode: string;
  driverPhone: string;
  driverName: string;
  origin: string;
  destination: string;
  total: number;
  tol?: number | null;
  bensin?: number | null;
  parkir?: number | null;
  lain?: number | null;
  confirmedAt: string;
  sourceText?: string;
};

export type Series = Models.Row & {
  code: string;
  prefix: string;
  suffix: number;
  sequence: number;
  status: "available" | "used" | "blocked";
  tripId?: string;
  blockedReason?: string;
  usedAt?: string;
};

export type ChatLog = Models.Row & {
  phone: string;
  direction: "in" | "out";
  body: string;
};

export type PublicTrip = {
  origin: string;
  destination: string;
  total: number;
  driverName: string;
  confirmedAt: string;
  seriesCode: string;
  breakdown: {
    tol: number | null;
    bensin: number | null;
    parkir: number | null;
    lain: number | null;
  };
};

export type Validation =
  | { ok: true; result: "valid"; series: string; trip: PublicTrip }
  | { ok: true; result: "not_found"; series: string }
  | { ok: true; result: "already_used"; series: string; usedAt: string | null }
  | { ok: true; result: "unused"; series: string }
  | { ok: true; result: "blocked"; series: string; reason: string | null };

export type GenerateResult = {
  ok: true;
  prefix: string;
  created: number;
  from: string;
  to: string;
  nextSuffix: number;
  nextSequence: number;
};
