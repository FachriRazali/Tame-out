"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AuthStatus } from "@/components/ui/AuthStatus";
import { StaffNavTabs } from "@/components/staff/StaffNavTabs";
import { useStaffContext } from "@/lib/useStaffContext";
import { readImageAsDataUrl } from "@/lib/readImage";
import {
  ArrowLeft,
  Check,
  ImageIcon,
  Loader2,
  Megaphone,
  Pin,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
} from "@/components/ui/icons";

interface District {
  id: number;
  city: string;
  name: string;
}

interface CafeOption {
  id: number;
  name: string;
  isActive: boolean;
  popularityScore: number;
  isBoosted: boolean;
  boostTagline: string;
}

type StaffRole = "merchant" | "admin" | "cashier";

interface StaffAccount {
  id: number;
  fullName: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABEL: Record<StaffRole, string> = {
  merchant: "Merchant",
  admin: "Admin",
  cashier: "Cashier",
};

export default function AdminPage() {
  const { cafeId: toolsCafeId } = useStaffContext();
  const [cafes, setCafes] = useState<CafeOption[] | null>(null);
  const [selectedCafeId, setSelectedCafeId] = useState<number | null>(null);
  const [staff, setStaff] = useState<StaffAccount[] | null>(null);
  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [cafeFormOpen, setCafeFormOpen] = useState(false);

  async function refreshCafes(selectId?: number) {
    const res = await fetch("/api/admin/cafes");
    const data = await res.json();
    setCafes(data.data ?? []);
    if (selectId) setSelectedCafeId(selectId);
    else if (!selectedCafeId && data.data?.[0])
      setSelectedCafeId(data.data[0].id);
  }

  useEffect(() => {
    refreshCafes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshStaff(cafeId: number) {
    setStaff(null);
    const res = await fetch(`/api/admin/cafes/${cafeId}/staff`);
    const data = await res.json();
    setStaff(data.data ?? []);
  }

  useEffect(() => {
    if (selectedCafeId) refreshStaff(selectedCafeId);
  }, [selectedCafeId]);

  async function toggleCafeActive(cafe: CafeOption) {
    await fetch(`/api/admin/cafes/${cafe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !cafe.isActive }),
    });
    refreshCafes();
  }

  async function toggleActive(userId: number, isActive: boolean) {
    await fetch(`/api/admin/staff/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (selectedCafeId) refreshStaff(selectedCafeId);
  }

  async function removeStaff(userId: number) {
    if (
      !confirm(
        "Deactivate this account? They will no longer be able to sign in.",
      )
    )
      return;
    await fetch(`/api/admin/staff/${userId}`, { method: "DELETE" });
    if (selectedCafeId) refreshStaff(selectedCafeId);
  }

  const selectedCafe = cafes?.find((c) => c.id === selectedCafeId) ?? null;

  return (
    <main className="min-h-screen bg-ink-50 pb-16">
      <header className="border-b border-ink-100 bg-surface">
        <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6">
          <div className="flex items-start justify-between">
            <div>
              <Link
                href="/"
                className="flex items-center gap-1.5 text-xs font-semibold text-ink-400 hover:text-ink-700"
              >
                <ArrowLeft size={13} /> Back to Tame&apos;out
              </Link>
              <h1 className="mt-1 flex items-center gap-2 text-xl font-extrabold text-ink-900">
                <ShieldCheck size={20} className="text-brand-600" /> Super Admin
              </h1>
              <p className="text-sm text-ink-500">
                Add cafes, and create merchant/admin/cashier accounts scoped to
                each one.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AuthStatus />
              <ThemeToggle />
            </div>
          </div>
          {toolsCafeId ? (
            <StaffNavTabs cafeId={toolsCafeId} />
          ) : (
            <div className="h-4" />
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        {cafes === null ? (
          <div className="flex items-center gap-2 py-16 text-sm text-ink-400">
            <Loader2 size={16} className="animate-spin" /> Loading cafes…
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-2xl bg-surface p-5 shadow-soft">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-900">Cafes</h2>
                <button
                  onClick={() => setCafeFormOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
                >
                  <Plus size={13} /> New cafe
                </button>
              </div>

              {cafeFormOpen && (
                <NewCafeForm
                  onCreated={(id) => {
                    setCafeFormOpen(false);
                    refreshCafes(id);
                  }}
                />
              )}

              <div className="flex flex-wrap gap-2">
                {cafes.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCafeId(c.id)}
                    className={
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
                      (c.id === selectedCafeId
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-ink-100 text-ink-600 hover:border-ink-200")
                    }
                  >
                    {c.isBoosted && (
                      <Pin
                        size={11}
                        className="text-brand-600"
                        aria-label="Pinned"
                      />
                    )}
                    {c.name}
                    {!c.isActive && (
                      <span className="text-ink-400">(inactive)</span>
                    )}
                  </button>
                ))}
              </div>

              {selectedCafe && (
                <button
                  onClick={() => toggleCafeActive(selectedCafe)}
                  className="mt-3 rounded-lg border border-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                >
                  {selectedCafe.isActive
                    ? "Deactivate this cafe"
                    : "Reactivate this cafe"}
                </button>
              )}
            </div>

            {selectedCafe && (
              <CoverImagePanel
                key={`cover-${selectedCafe.id}`}
                cafe={selectedCafe}
              />
            )}

            {selectedCafe && (
              <RankingPanel
                key={selectedCafe.id}
                cafe={selectedCafe}
                featuredCount={
                  cafes.filter((c) => c.isBoosted && c.isActive).length
                }
                onSaved={() => refreshCafes()}
              />
            )}

            {selectedCafeId && (
              <div className="rounded-2xl bg-surface p-5 shadow-soft">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-ink-900">
                    Staff accounts — {selectedCafe?.name}
                  </h2>
                  <button
                    onClick={() => setStaffFormOpen((v) => !v)}
                    className="flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white hover:bg-ink-800"
                  >
                    <Plus size={13} /> New account
                  </button>
                </div>

                {staffFormOpen && (
                  <NewStaffForm
                    cafeId={selectedCafeId}
                    onCreated={() => {
                      setStaffFormOpen(false);
                      refreshStaff(selectedCafeId);
                    }}
                  />
                )}

                {staff === null ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-ink-400">
                    <Loader2 size={16} className="animate-spin" /> Loading…
                  </div>
                ) : staff.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-400">
                    No staff accounts for this cafe yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {staff.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between py-3"
                      >
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                            {s.fullName}
                            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                              {ROLE_LABEL[s.role]}
                            </span>
                          </p>
                          <p className="text-xs text-ink-500">{s.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              "rounded-full px-2 py-0.5 text-[10px] font-bold " +
                              (s.isActive
                                ? "bg-capacity-green/15 text-capacity-green"
                                : "bg-ink-100 text-ink-400")
                            }
                          >
                            {s.isActive ? "Active" : "Deactivated"}
                          </span>
                          <button
                            onClick={() => toggleActive(s.id, s.isActive)}
                            className="rounded-lg border border-ink-100 px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                          >
                            {s.isActive ? "Deactivate" : "Reactivate"}
                          </button>
                          <button
                            onClick={() => removeStaff(s.id)}
                            className="rounded-lg p-1.5 text-ink-400 hover:bg-capacity-red/10 hover:text-capacity-red"
                            title="Deactivate"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// Add / replace / remove the cover photo of an EXISTING cafe (the photo that
// shows on the landing-page card, the featured carousel and the cafe page).
// Previously the photo could only be set while creating a new cafe.
function CoverImagePanel({ cafe }: { cafe: CafeOption }) {
  const [current, setCurrent] = useState<string | null | undefined>(undefined); // undefined = loading
  const [draft, setDraft] = useState<string | null>(null); // newly chosen, not yet saved
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/cafes/${cafe.id}`)
      .then((r) => r.json())
      .then((d) => alive && setCurrent(d?.coverImageUrl || null))
      .catch(() => alive && setCurrent(null));
    return () => {
      alive = false;
    };
  }, [cafe.id]);

  async function choose(file: File) {
    setMsg(null);
    setReading(true);
    try {
      setDraft(await readImageAsDataUrl(file));
    } catch (e) {
      setMsg({
        ok: false,
        text: e instanceof Error ? e.message : "Could not read this image.",
      });
    } finally {
      setReading(false);
    }
  }

  async function save(next: string | null) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/cafes/${cafe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImageUrl: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          data?.error?.message ?? `Could not save the photo (${res.status}).`,
        );
      setCurrent(next);
      setDraft(null);
      setMsg({ ok: true, text: next ? "Foto tersimpan." : "Foto dihapus." });
    } catch (e) {
      setMsg({
        ok: false,
        text: e instanceof Error ? e.message : "Could not save the photo.",
      });
    } finally {
      setSaving(false);
    }
  }

  const shown = draft ?? current;
  return (
    <div className="mb-4 rounded-2xl bg-surface p-5 shadow-soft">
      <h2 className="mb-1 text-sm font-bold text-ink-900">
        Cover photo — {cafe.name}
      </h2>
      <p className="mb-4 text-xs text-ink-400">
        Tambah atau ganti foto cafe yang sudah ada. Tampil di card, carousel
        Featured, dan halaman cafe.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        {current === undefined ? (
          <div className="flex h-24 w-36 items-center justify-center rounded-lg bg-ink-100">
            <Loader2 size={16} className="animate-spin text-ink-400" />
          </div>
        ) : shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="Cover"
            className="h-24 w-36 rounded-lg object-cover ring-1 ring-ink-900/10"
          />
        ) : (
          <div className="flex h-24 w-36 flex-col items-center justify-center gap-1 rounded-lg bg-ink-100 text-ink-400">
            <ImageIcon size={20} />
            <span className="text-[11px] font-semibold">Belum ada foto</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-full bg-ink-100 px-3.5 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-100/70">
            {reading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Upload size={13} />
            )}
            {reading
              ? "Memproses…"
              : current || draft
                ? "Pilih foto lain"
                : "Upload foto"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = ""; // so choosing the same file again still fires
                if (f) choose(f);
              }}
            />
          </label>

          {draft && (
            <div className="flex gap-2">
              <button
                onClick={() => save(draft)}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}{" "}
                Simpan foto
              </button>
              <button
                onClick={() => setDraft(null)}
                disabled={saving}
                className="rounded-lg border border-ink-100 px-3 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50"
              >
                Batal
              </button>
            </div>
          )}
          {!draft && current && (
            <button
              onClick={() => save(null)}
              disabled={saving}
              className="flex w-fit items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-50"
            >
              <Trash2 size={12} /> Hapus foto
            </button>
          )}
          {msg && (
            <span
              className={
                "text-xs font-semibold " +
                (msg.ok ? "text-capacity-green" : "text-capacity-red")
              }
            >
              {msg.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Super-admin-only platform controls for ONE cafe: the popularity score that
// the landing page's "Popularity" sort ranks by, and the featured pin that
// puts the cafe in the landing page's featured carousel. Merchants/cashiers
// never see this — /admin itself is super_admin-only (middleware.ts) and the
// API behind it re-checks (requireSuperAdmin).
function RankingPanel({
  cafe,
  featuredCount,
  onSaved,
}: {
  cafe: CafeOption;
  featuredCount: number;
  onSaved: () => void;
}) {
  // Text drafts, so the fields can be cleared and retyped freely.
  const [score, setScore] = useState(String(cafe.popularityScore));
  const [boosted, setBoosted] = useState(cafe.isBoosted);
  const [tagline, setTagline] = useState(cafe.boostTagline);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const scoreNum = Number(score);
  const scoreValid =
    score.trim() !== "" &&
    Number.isFinite(scoreNum) &&
    scoreNum >= 0 &&
    scoreNum <= 9999;
  const dirty =
    (scoreValid && scoreNum !== cafe.popularityScore) ||
    boosted !== cafe.isBoosted ||
    tagline.trim() !== cafe.boostTagline;

  async function save() {
    if (!scoreValid) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/cafes/${cafe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          popularityScore: scoreNum,
          isBoosted: boosted,
          boostTagline: tagline,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not save.");
      setMsg({ ok: true, text: "Tersimpan." });
      onSaved();
    } catch (e) {
      setMsg({
        ok: false,
        text: e instanceof Error ? e.message : "Could not save.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 rounded-2xl bg-surface p-5 shadow-soft">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-ink-900">
          Ranking &amp; featured — {cafe.name}
        </h2>
        <span className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-semibold text-ink-500">
          {featuredCount} cafe featured sekarang
        </span>
      </div>
      <p className="mb-4 text-xs text-ink-400">
        Hanya super admin yang bisa mengubah ini. Berlaku di halaman utama.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-600">
            Popularity score (0 – 9999)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={score}
            onChange={(e) => setScore(e.target.value.replace(",", "."))}
            aria-label="Popularity score"
            className="w-full rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm font-semibold text-ink-900 focus:border-brand-500 focus:outline-none"
          />
          <span className="mt-1 block text-[11px] text-ink-400">
            Makin tinggi makin atas saat urutan "Popularity" dipilih. Saat ini{" "}
            {cafe.popularityScore}.
          </span>
          {!scoreValid && (
            <span className="mt-1 block text-[11px] font-semibold text-capacity-red">
              Isi angka 0 sampai 9999.
            </span>
          )}
        </label>

        <div>
          <span className="mb-1 block text-xs font-semibold text-ink-600">
            Featured cafe (pin)
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={boosted}
            onClick={() => setBoosted((v) => !v)}
            className={
              "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold transition " +
              (boosted
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-ink-100 text-ink-600 hover:border-ink-200")
            }
          >
            <span className="flex items-center gap-2">
              <Megaphone size={14} />{" "}
              {boosted ? "Di-pin di Featured" : "Tidak di-pin"}
            </span>
            <span
              className={
                "relative h-5 w-9 rounded-full transition " +
                (boosted ? "bg-brand-600" : "bg-ink-200")
              }
              aria-hidden
            >
              <span
                className={
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all " +
                  (boosted ? "left-[18px]" : "left-0.5")
                }
              />
            </span>
          </button>
          <span className="mt-1 block text-[11px] text-ink-400">
            Cafe yang di-pin tampil di carousel Featured (maks. 5, urut
            popularity).
          </span>
        </div>
      </div>

      {boosted && (
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold text-ink-600">
            Tagline featured (opsional)
          </span>
          <input
            value={tagline}
            maxLength={140}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="mis. Kopi susu terbaik di Dinoyo"
            className="w-full rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
          />
        </label>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !dirty || !scoreValid}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Check size={13} />
          )}{" "}
          Simpan
        </button>
        {msg && (
          <span
            className={
              "text-xs font-semibold " +
              (msg.ok ? "text-capacity-green" : "text-capacity-red")
            }
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

function NewCafeForm({ onCreated }: { onCreated: (cafeId: number) => void }) {
  const [districts, setDistricts] = useState<District[] | null>(null);
  const [name, setName] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/districts")
      .then((r) => r.json())
      .then((d) => {
        setDistricts(d.data ?? []);
        if (d.data?.[0]) setDistrictId(String(d.data[0].id));
      });
  }, []);

  // The photo is read (and downscaled) in the browser — see lib/readImage.ts
  // for why this is not a server upload on Vercel.
  async function readCoverImage(file: File) {
    setError(null);
    setUploadingImage(true);
    try {
      setCoverImageUrl(await readImageAsDataUrl(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this image.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cafes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          districtId: Number(districtId),
          address,
          latitude: Number(latitude),
          longitude: Number(longitude),
          whatsappNumber,
          coverImageUrl: coverImageUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error?.message ?? "Could not create cafe.");
      onCreated(data.data.id);
      setName("");
      setAddress("");
      setLatitude("");
      setLongitude("");
      setWhatsappNumber("");
      setCoverImageUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create cafe.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-5 space-y-2 rounded-xl border border-dashed border-ink-200 p-4"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          required
          placeholder="Cafe name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <select
          value={districtId}
          onChange={(e) => setDistrictId(e.target.value)}
          className="rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          {districts === null ? (
            <option>Loading districts…</option>
          ) : (
            districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}, {d.city}
              </option>
            ))
          )}
        </select>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-ink-200 p-3">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt="Cover preview"
            className="h-14 w-20 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-14 w-20 items-center justify-center rounded-md bg-ink-100 text-ink-300">
            <ImageIcon size={18} />
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-200">
          {uploadingImage ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Upload size={13} />
          )}
          {uploadingImage
            ? "Uploading…"
            : coverImageUrl
              ? "Change photo"
              : "Upload cover photo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] && readCoverImage(e.target.files[0])
            }
          />
        </label>
        <span className="text-[11px] text-ink-400">
          Optional — tampil di card &amp; halaman cafe.
        </span>
      </div>
      <input
        required
        placeholder="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          required
          type="number"
          step="any"
          placeholder="Latitude"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <input
          required
          type="number"
          step="any"
          placeholder="Longitude"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <input
          required
          placeholder="WhatsApp number"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      {error && (
        <p className="text-xs font-semibold text-capacity-red">{error}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Plus size={13} />
        )}
        Create cafe
      </button>
      <p className="text-[11px] text-ink-400">
        Tip: right-click a spot on Google Maps to copy its exact lat/long.
      </p>
    </form>
  );
}

function NewStaffForm({
  cafeId,
  onCreated,
}: {
  cafeId: number;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("cashier");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cafes/${cafeId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error?.message ?? "Could not create account.");
      setFullName("");
      setEmail("");
      setPassword("");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-5 space-y-2 rounded-xl border border-dashed border-ink-200 p-4"
    >
      <div className="grid gap-2 sm:grid-cols-4">
        <input
          required
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none sm:col-span-1"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none sm:col-span-1"
        />
        <input
          required
          type="password"
          placeholder="Password (6+ chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none sm:col-span-1"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as StaffRole)}
          className="rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm focus:border-brand-500 focus:outline-none sm:col-span-1"
        >
          <option value="merchant">Merchant</option>
          <option value="admin">Admin</option>
          <option value="cashier">Cashier</option>
        </select>
      </div>
      {error && (
        <p className="text-xs font-semibold text-capacity-red">{error}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white hover:bg-ink-800 disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <UserPlus size={13} />
        )}
        Create account
      </button>
    </form>
  );
}
