"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MenuItem } from "@/lib/types";
import { readImageAsDataUrl } from "@/lib/readImage";
import {
  Check,
  FileText,
  ImageIcon,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
} from "@/components/ui/icons";

interface Props {
  cafeId: number;
  menuDocumentUrl?: string;
  menuDocumentType?: "pdf" | "image";
}

export function MenuSection({
  cafeId,
  menuDocumentUrl,
  menuDocumentType,
}: Props) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [docUrl, setDocUrl] = useState(menuDocumentUrl);
  const [docType, setDocType] = useState(menuDocumentType);
  const [uploading, setUploading] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    price: "",
    category: "Food",
    description: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Staff mode comes from the real login (see /login). Cafe staff
    // (merchant / cashier / admin) can edit the menu of THEIR cafe only, and
    // the super admin can edit every cafe's menu — the API enforces the same
    // rule, so these controls are only a convenience.
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const user = d.user;
        const isCafeStaff =
          (user?.role === "cashier" ||
            user?.role === "merchant" ||
            user?.role === "admin") &&
          Number(user?.cafeId) === cafeId;
        setIsStaff(isCafeStaff || user?.role === "super_admin");
      })
      .catch(() => setIsStaff(false));
  }, [cafeId]);

  useEffect(() => {
    setDocUrl(menuDocumentUrl);
    setDocType(menuDocumentType);
  }, [menuDocumentUrl, menuDocumentType]);

  useEffect(() => {
    fetch(`/api/cafes/${cafeId}/menu`)
      .then((r) => r.json())
      .then((d) => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [cafeId]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return [...map.entries()];
  }, [items]);

  async function failureMessage(res: Response, fallback: string) {
    try {
      const body = await res.json();
      return body?.error?.message ?? fallback;
    } catch {
      return res.status === 413 ? "File is too large to upload." : fallback;
    }
  }

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category))],
    [items],
  );

  async function addItem() {
    setError(null);
    if (!draft.name.trim() || draft.price === "") {
      setError("Enter at least a name and a price.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          price: Number(draft.price),
          category: draft.category,
          description: draft.description,
        }),
      });
      if (!res.ok)
        throw new Error(await failureMessage(res, "Could not add this item."));
      const item: MenuItem = await res.json();
      setItems((prev) => [...prev, item]);
      setDraft({
        name: "",
        price: "",
        category: draft.category,
        description: "",
      });
      setAddingItem(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add this item.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: MenuItem) {
    setError(null);
    setEditingId(item.id);
    setConfirmDeleteId(null);
    setEditDraft({
      name: item.name,
      price: String(item.price),
      category: item.category,
      description: item.description ?? "",
    });
  }

  async function saveEdit(item: MenuItem) {
    setError(null);
    if (
      !editDraft.name.trim() ||
      editDraft.price === "" ||
      Number(editDraft.price) < 0
    ) {
      setError("A name and a valid price are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name,
          price: Number(editDraft.price),
          category: editDraft.category,
          description: editDraft.description,
        }),
      });
      if (!res.ok)
        throw new Error(await failureMessage(res, "Could not save changes."));
      const updated: MenuItem = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailable(item: MenuItem) {
    setError(null);
    const res = await fetch(`/api/cafes/${cafeId}/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    if (res.ok)
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i,
        ),
      );
    else setError(await failureMessage(res, "Could not update this item."));
  }

  async function removeItem(item: MenuItem) {
    setError(null);
    const res = await fetch(`/api/cafes/${cafeId}/menu/${item.id}`, {
      method: "DELETE",
    });
    setConfirmDeleteId(null);
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== item.id));
    else setError(await failureMessage(res, "Could not remove this item."));
  }

  async function uploadDocument(file: File) {
    setError(null);
    setUploading(true);
    try {
      let documentUrl: string;
      if (file.type === "application/pdf") {
        if (file.size > 3_000_000)
          throw new Error(
            "PDF is larger than 3MB. Compress it, or upload a photo of the menu instead.",
          );
        documentUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read this PDF."));
          reader.readAsDataURL(file);
        });
      } else {
        // Photos are downscaled in the browser so they fit the upload limit.
        documentUrl = await readImageAsDataUrl(file);
      }
      const res = await fetch(`/api/cafes/${cafeId}/menu-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentUrl }),
      });
      if (!res.ok)
        throw new Error(
          await failureMessage(res, "Could not upload the menu file."),
        );
      const d = await res.json();
      setDocUrl(d.menuDocumentUrl);
      setDocType(d.menuDocumentType);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not upload the menu file.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function removeDocument() {
    setError(null);
    const res = await fetch(`/api/cafes/${cafeId}/menu-document`, {
      method: "DELETE",
    });
    if (res.ok) {
      setDocUrl(undefined);
      setDocType(undefined);
    } else
      setError(await failureMessage(res, "Could not remove the menu file."));
  }

  return (
    <div id="menu" className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
          <UtensilsCrossed size={18} /> Menu
        </h2>
        {isStaff ? (
          <span className="flex items-center gap-1.5 rounded-full bg-capacity-greenBg px-3 py-1.5 text-xs font-bold text-capacity-green">
            <Check size={13} /> Staff mode
          </span>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-200"
          >
            <Lock size={13} /> Staff login
          </Link>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-xl bg-capacity-redBg px-3 py-2 text-sm font-semibold text-capacity-red"
        >
          {error}
        </p>
      )}

      <div className="rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-ink-900/5 sm:p-6">
        {loading ? (
          <p className="text-sm text-ink-400">Loading menu…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink-400">No menu items yet.</p>
        ) : (
          <div className="space-y-5">
            {grouped.map(([category, categoryItems]) => (
              <div key={category}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryItems.map((item) =>
                    editingId === item.id ? (
                      <div
                        key={item.id}
                        className="space-y-2 rounded-xl border border-brand-300 bg-brand-50/40 p-3"
                        data-testid="menu-edit-form"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={editDraft.name}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                name: e.target.value,
                              }))
                            }
                            placeholder="Item name"
                            aria-label="Item name"
                            className="rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm"
                          />
                          <input
                            value={editDraft.price}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                price: e.target.value,
                              }))
                            }
                            placeholder="Price (IDR)"
                            aria-label="Price"
                            type="number"
                            min={0}
                            className="rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm"
                          />
                        </div>
                        <input
                          value={editDraft.category}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              category: e.target.value,
                            }))
                          }
                          placeholder="Category"
                          aria-label="Category"
                          list="menu-categories"
                          className="w-full rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm"
                        />
                        <input
                          value={editDraft.description}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Description (optional)"
                          aria-label="Description"
                          className="w-full rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(item)}
                            disabled={busy}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
                          >
                            {busy ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}{" "}
                            Save changes
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-ink-100 px-4 py-2 text-sm font-semibold text-ink-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-3 py-2.5"
                      >
                        <div className={item.isAvailable ? "" : "opacity-50"}>
                          <p className="text-sm font-semibold text-ink-900">
                            {item.name}{" "}
                            {!item.isAvailable && (
                              <span className="text-xs font-normal text-ink-400">
                                (sold out)
                              </span>
                            )}
                          </p>
                          {item.description && (
                            <p className="text-xs text-ink-400">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`text-sm font-bold text-ink-900 ${item.isAvailable ? "" : "opacity-50"}`}
                          >
                            {formatIDR(item.price)}
                          </span>
                          {isStaff && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleAvailable(item)}
                                title={
                                  item.isAvailable
                                    ? "Mark as sold out"
                                    : "Mark as available"
                                }
                                className="rounded-lg bg-ink-100 px-2 py-1 text-[11px] font-bold text-ink-600 hover:bg-ink-100/70"
                              >
                                {item.isAvailable ? "Sold out?" : "Available?"}
                              </button>
                              <button
                                onClick={() => startEdit(item)}
                                title="Edit item"
                                aria-label={`Edit ${item.name}`}
                                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                              >
                                <Pencil size={14} />
                              </button>
                              {confirmDeleteId === item.id ? (
                                <button
                                  onClick={() => removeItem(item)}
                                  className="rounded-lg bg-capacity-red px-2 py-1 text-[11px] font-bold text-white"
                                >
                                  Delete?
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(item.id)}
                                  title="Remove item"
                                  aria-label={`Remove ${item.name}`}
                                  className="rounded-lg p-1.5 text-ink-400 hover:bg-capacity-redBg hover:text-capacity-red"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <datalist id="menu-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        {isStaff && (
          <div className="mt-4 border-t border-dashed border-ink-100 pt-4">
            {addingItem ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, name: e.target.value }))
                    }
                    placeholder="Item name"
                    className="rounded-lg border border-ink-100 px-3 py-2 text-sm"
                  />
                  <input
                    value={draft.price}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, price: e.target.value }))
                    }
                    placeholder="Price (IDR)"
                    type="number"
                    className="rounded-lg border border-ink-100 px-3 py-2 text-sm"
                  />
                </div>
                <input
                  value={draft.category}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, category: e.target.value }))
                  }
                  list="menu-categories"
                  placeholder="Category (e.g. Coffee, Food)"
                  className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
                />
                <input
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                  placeholder="Description (optional)"
                  className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addItem}
                    disabled={busy}
                    className="flex-1 rounded-lg bg-brand-600 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {busy ? "Saving…" : "Save item"}
                  </button>
                  <button
                    onClick={() => setAddingItem(false)}
                    className="rounded-lg border border-ink-100 px-4 py-2 text-sm font-semibold text-ink-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingItem(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-200 py-2 text-sm font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600"
              >
                <Plus size={14} /> Add menu item
              </button>
            )}
          </div>
        )}
      </div>

      {/* Menu PDF / image, accessible to everyone */}
      <div className="mt-4 rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-ink-900/5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <FileText size={16} /> Full menu (PDF / photo)
          </h3>
          {isStaff && (
            <div className="flex items-center gap-2">
              {docUrl && (
                <button
                  onClick={removeDocument}
                  className="flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-capacity-redBg hover:text-capacity-red"
                >
                  <X size={13} /> Remove
                </button>
              )}
              <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-200">
                {uploading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Upload size={13} />
                )}
                {uploading ? "Uploading…" : docUrl ? "Replace" : "Upload"}
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  data-testid="menu-doc-input"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadDocument(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}
        </div>

        {!docUrl ? (
          <p className="text-sm text-ink-400">No menu document uploaded yet.</p>
        ) : docType === "pdf" ? (
          <iframe
            src={docUrl}
            className="h-[70vh] w-full rounded-xl border border-ink-100"
            title="Cafe menu PDF"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={docUrl}
            alt="Cafe menu"
            className="w-full rounded-xl border border-ink-100 object-contain"
          />
        )}
        {!docUrl && !isStaff && (
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-400">
            <ImageIcon size={12} /> Staff can add one after signing in.
          </p>
        )}
      </div>
    </div>
  );
}

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}
