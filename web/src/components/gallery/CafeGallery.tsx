"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readImageAsDataUrl } from "@/lib/readImage";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  Pencil,
  Pin,
  Plus,
  Trash2,
  Upload,
  X,
} from "@/components/ui/icons";

interface Photo {
  id: number;
  cafeId: number;
  caption: string | null;
  createdAt: string;
}

async function errorOf(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message ?? fallback;
  } catch {
    if (res.status === 413)
      return "Foto terlalu besar untuk dikirim. Coba foto yang lebih kecil.";
    return fallback;
  }
}

/**
 * Gallery of room / interior photos on the cafe page.
 *
 * - Everyone sees the grid + lightbox (renders nothing when there are no photos
 *   and the viewer cannot add any).
 * - `canManage` (cafe staff of this cafe, or super admin — decided by the page)
 *   unlocks: add photos (several at once), edit caption, delete, "use as cover"
 *   and replacing the cover photo. The API re-checks every one of these on the
 *   server, so the flag only controls what is shown.
 */
export function CafeGallery({
  cafeId,
  canManage,
  onCoverChanged,
  title = "Foto cafe",
}: {
  cafeId: number;
  canManage: boolean;
  onCoverChanged?: () => void;
  title?: string;
}) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [max, setMax] = useState(12);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/photos`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("load");
      const body = await res.json();
      setPhotos(body.data ?? []);
      if (typeof body.max === "number") setMax(body.max);
    } catch {
      setPhotos((prev) => prev ?? []);
    }
  }, [cafeId]);

  useEffect(() => {
    load();
  }, [load]);

  // Lightbox keyboard controls.
  useEffect(() => {
    if (lightbox === null || !photos) return;
    const count = photos.length;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowRight")
        setLightbox((i) => (i === null ? i : (i + 1) % count));
      else if (e.key === "ArrowLeft")
        setLightbox((i) => (i === null ? i : (i - 1 + count) % count));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, photos]);

  async function onFilesChosen(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setNotice(null);
    const list = Array.from(files);
    const room = max - (photos?.length ?? 0);
    if (room <= 0) {
      setError(`Maksimal ${max} foto per cafe. Hapus salah satu dulu.`);
      return;
    }
    const batch = list.slice(0, room);
    let added = 0;
    for (let i = 0; i < batch.length; i++) {
      setBusy(`Mengunggah foto ${i + 1} dari ${batch.length}…`);
      try {
        const imageUrl = await readImageAsDataUrl(batch[i]);
        const res = await fetch(`/api/cafes/${cafeId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl, caption: "" }),
        });
        if (!res.ok) {
          setError(await errorOf(res, "Foto tidak bisa disimpan."));
          break;
        }
        added++;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Foto tidak bisa diproses.");
        break;
      }
    }
    setBusy(null);
    if (added > 0) setNotice(`${added} foto ditambahkan.`);
    if (list.length > batch.length && !error)
      setNotice(
        `Hanya ${batch.length} foto yang ditambahkan (batas ${max} foto).`,
      );
    if (fileRef.current) fileRef.current.value = "";
    await load();
  }

  async function onCoverChosen(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    setNotice(null);
    setBusy("Mengganti foto sampul…");
    try {
      const coverImageUrl = await readImageAsDataUrl(file);
      const res = await fetch(`/api/cafes/${cafeId}/cover`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImageUrl }),
      });
      if (!res.ok)
        setError(await errorOf(res, "Foto sampul tidak bisa disimpan."));
      else {
        setNotice("Foto sampul diperbarui.");
        onCoverChanged?.();
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Foto sampul tidak bisa diproses.",
      );
    } finally {
      setBusy(null);
      if (coverRef.current) coverRef.current.value = "";
    }
  }

  async function saveCaption(id: number) {
    setError(null);
    const res = await fetch(`/api/cafe-photos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: captionDraft }),
    });
    if (!res.ok) {
      setError(await errorOf(res, "Keterangan tidak bisa disimpan."));
      return;
    }
    setEditingId(null);
    await load();
  }

  async function setAsCover(id: number) {
    setError(null);
    setNotice(null);
    setBusy("Menjadikan sampul…");
    const res = await fetch(`/api/cafe-photos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setCover: true }),
    });
    setBusy(null);
    if (!res.ok) {
      setError(await errorOf(res, "Tidak bisa menjadikan foto ini sampul."));
      return;
    }
    setNotice("Foto dijadikan sampul cafe.");
    onCoverChanged?.();
  }

  async function remove(id: number) {
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/cafe-photos/${id}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    if (!res.ok) {
      setError(await errorOf(res, "Foto tidak bisa dihapus."));
      return;
    }
    await load();
  }

  if (photos === null) return null;
  if (photos.length === 0 && !canManage) return null;

  const current = lightbox !== null ? photos[lightbox] : null;

  return (
    <section id="photos" className="mt-8 scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
          <ImageIcon size={18} /> {title}
          {canManage && (
            <span className="text-xs font-semibold text-ink-400">
              {photos.length}/{max}
            </span>
          )}
        </h2>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => coverRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-bold text-ink-800 transition hover:bg-ink-100/70 disabled:opacity-50"
            >
              <Upload size={13} /> Ganti sampul
            </button>
            <button
              type="button"
              disabled={!!busy || photos.length >= max}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              <Plus size={13} /> Tambah foto
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onFilesChosen(e.target.files)}
              data-testid="gallery-file-input"
            />
            <input
              ref={coverRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onCoverChosen(e.target.files)}
              data-testid="cover-file-input"
            />
          </div>
        )}
      </div>

      {busy && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
          <Loader2 size={15} className="animate-spin" /> {busy}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}
      {notice && !error && !busy && (
        <p className="mb-3 rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
          {notice}
        </p>
      )}

      {photos.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-ink-100 bg-surface p-8 text-center text-sm text-ink-400">
          Belum ada foto ruangan. Tekan <b>Tambah foto</b> untuk mengunggah foto
          interior, meja, atau suasana cafe.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <figure
              key={p.id}
              className="group relative overflow-hidden rounded-2xl bg-ink-100 ring-1 ring-ink-900/5"
              data-testid="gallery-photo"
            >
              <button
                type="button"
                onClick={() => setLightbox(i)}
                className="block aspect-[4/3] w-full"
                aria-label={
                  p.caption ? `Buka foto: ${p.caption}` : `Buka foto ${i + 1}`
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/cafe-photos/${p.id}`}
                  alt={p.caption || `Foto ${i + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              </button>

              {editingId === p.id ? (
                <form
                  className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/70 p-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveCaption(p.id);
                  }}
                >
                  <input
                    autoFocus
                    value={captionDraft}
                    maxLength={120}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    placeholder="Keterangan foto"
                    className="min-w-0 flex-1 rounded-lg bg-white px-2 py-1 text-xs text-black outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-brand-600 px-2 text-xs font-bold text-white"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg bg-white/20 px-2 text-xs font-bold text-white"
                    aria-label="Batal"
                  >
                    <X size={12} />
                  </button>
                </form>
              ) : (
                p.caption && (
                  <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-xs font-semibold text-white">
                    {p.caption}
                  </figcaption>
                )
              )}

              {canManage && editingId !== p.id && (
                <div className="absolute right-1.5 top-1.5 flex gap-1">
                  <IconBtn
                    label="Jadikan sampul"
                    onClick={() => setAsCover(p.id)}
                    disabled={!!busy}
                    icon={<Pin size={13} />}
                  />
                  <IconBtn
                    label="Ubah keterangan"
                    onClick={() => {
                      setEditingId(p.id);
                      setCaptionDraft(p.caption ?? "");
                    }}
                    icon={<Pencil size={13} />}
                  />
                  {confirmDeleteId === p.id ? (
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="rounded-full bg-red-600 px-2.5 text-[11px] font-bold text-white"
                    >
                      Hapus?
                    </button>
                  ) : (
                    <IconBtn
                      label="Hapus foto"
                      onClick={() => setConfirmDeleteId(p.id)}
                      icon={<Trash2 size={13} />}
                    />
                  )}
                </div>
              )}
            </figure>
          ))}
        </div>
      )}

      {current && lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Foto cafe"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X size={20} />
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Foto sebelumnya"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox - 1 + photos.length) % photos.length);
                }}
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                aria-label="Foto berikutnya"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox + 1) % photos.length);
                }}
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
          <figure
            className="max-h-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/cafe-photos/${current.id}`}
              alt={current.caption || `Foto ${lightbox + 1}`}
              className="max-h-[80vh] max-w-full rounded-xl object-contain"
            />
            <figcaption className="mt-3 text-center text-sm text-white/90">
              {current.caption || ""}
              <span className="ml-2 text-xs text-white/50">
                {lightbox + 1}/{photos.length}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}

function IconBtn({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80 disabled:opacity-50"
    >
      {icon}
    </button>
  );
}
