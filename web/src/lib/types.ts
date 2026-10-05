// ============================================================================
// Shared domain types — mirror database/schema.sql 1:1 so the API layer and
// the UI never drift apart.
// ============================================================================

export type PriceTier = "$" | "$$" | "$$$";
// Rupiah price-range buckets for the landing page's price filter/sort —
// computed from Cafe.avgPriceIdr, independent of the legacy $/$$/$$$ tier.
export type PriceBucket = "under25" | "25to50" | "50to75" | "75to100plus";
export type ZoneType = "indoor" | "outdoor" | "smoking";
export type TableShape = "round" | "square" | "rectangle" | "sofa" | "bar";
export type TableStatus = "available" | "reserved" | "occupied" | "maintenance";
export type CapacityColor = "green" | "yellow" | "red";

export type ReservationStatus =
  | "pending_payment"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "expired"
  | "no_show";

export type ReservationSource = "guest" | "registered" | "walk_in";
export type PaymentStatus = "pending" | "paid" | "expired" | "failed" | "refunded";
export type CashierAction =
  | "check_in_qr"
  | "check_in_manual"
  | "walk_in_seat"
  | "checkout"
  | "mark_available"
  | "mark_occupied"
  | "mark_reserved"
  | "mark_maintenance";

export interface District {
  id: number;
  city: string;
  name: string; // kecamatan
  lat: number;
  lng: number;
}

export interface LiveCapacity {
  occupancyPct: number;
  color: CapacityColor;
  tablesAvailable: number;
  tablesReserved: number;
  tablesOccupied: number;
  totalTables: number;
  updatedAt: string;
}

export interface Cafe {
  id: number;
  name: string;
  slug: string;
  description: string;
  districtId: number;
  districtName: string;
  address: string;
  lat: number;
  lng: number;
  priceTier: PriceTier;
  avgPriceIdr: number;
  whatsappNumber: string;
  coverImageUrl: string;
  openingTime: string;
  closingTime: string;
  popularityScore: number;
  avgRating: number;
  totalReviews: number;
  requiresDownPayment: boolean;
  dpAmount: number;
  dpHoldMinutes: number;
  defaultSlotMinutes: number;
  gracePeriodMinutes: number;
  liveCapacity: LiveCapacity;
  distanceKm?: number;
  menuDocumentUrl?: string;
  menuDocumentType?: "pdf" | "image";
  hasBoardGames: boolean;
  hasPrayerRoom: boolean;
  isBoosted: boolean;
  boostTagline?: string;
  createdAt: string;
}

// Slim shape for the landing page's ads carousel — a subset of Cafe.
export interface BoostedCafe {
  id: number;
  name: string;
  coverImageUrl: string;
  boostTagline: string;
}

export interface MenuItem {
  id: number;
  cafeId: number;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  sortOrder: number;
}

export interface TableLayoutMeta {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: TableShape;
  rotation: number;
}

export interface CafeTable {
  id: number;
  floorId: number;
  cafeId: number;
  tableCode: string;
  shape: TableShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity: number;
  status: TableStatus;
  currentReservationId?: number | null;
  hasPowerOutlet: boolean;
}

// A polygon point as a percentage of the floor's canvasWidth/canvasHeight —
// [xPct, yPct], each 0-100. Rendered as a CSS clip-path so the floor plan
// can be any shape (L, plus, freeform) instead of always a rectangle.
export type OutlinePoint = [number, number];

export interface Floor {
  id: number;
  cafeId: number;
  name: string;
  zoneType: ZoneType;
  level: number;
  canvasWidth: number;
  canvasHeight: number;
  outlinePoints?: OutlinePoint[] | null;
  tables: CafeTable[];
}

export interface Reservation {
  id: number;
  reservationCode: string;
  cafeId: number;
  tableId: number | null;
  userId: number | null;
  source: ReservationSource;
  guestName?: string;
  guestWhatsapp?: string;
  partySize: number;
  slotMinutes: number;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  status: ReservationStatus;
  qrCodeToken: string;
  paymentHoldExpiresAt?: string | null;
}

export interface Payment {
  id: number;
  reservationId: number;
  amount: number;
  currency: "IDR";
  status: PaymentStatus;
  holdExpiresAt: string;
  method?: string;
}

export interface NotificationLogEntry {
  id: number;
  reservationId: number;
  channel: "whatsapp" | "push";
  type: string;
  recipient: string;
  status: "queued" | "sent" | "delivered" | "failed";
  createdAt: string;
  message: string;
}
