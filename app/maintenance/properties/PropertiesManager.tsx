"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building,
  MapPin,
  UserPlus,
  UserMinus,
  History,
  Mail,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

interface Person {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface PropertyItem {
  _id: string;
  title: string;
  address: string;
  city: string;
  postalCode?: string;
  ownerId?: Person;
  tenantId?: Person | null;
}

type Feedback = { type: "success" | "error"; message: string } | null;

type PropertyFields = { title: string; address: string; city: string; postalCode: string; ownerEmail?: string };

const EMPTY_FIELDS: PropertyFields = { title: "", address: "", city: "Tunis", postalCode: "", ownerEmail: "" };

const inputClass =
  "w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500";

function PropertyForm({
  initial,
  askOwnerEmail,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: PropertyFields;
  askOwnerEmail: boolean;
  submitLabel: string;
  onSubmit: (fields: PropertyFields) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<PropertyFields>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof PropertyFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(await onSubmit(fields));
        setSaving(false);
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input required placeholder="Titre (ex. Appartement S+2 Lac 1)" value={fields.title} onChange={set("title")} className={`${inputClass} sm:col-span-2`} />
        <input required placeholder="Adresse" value={fields.address} onChange={set("address")} className={`${inputClass} sm:col-span-2`} />
        <input required placeholder="Ville" value={fields.city} onChange={set("city")} className={inputClass} />
        <input required placeholder="Code postal" inputMode="numeric" value={fields.postalCode} onChange={set("postalCode")} className={inputClass} />
        {askOwnerEmail && (
          <input required type="email" placeholder="E-mail du propriétaire" value={fields.ownerEmail} onChange={set("ownerEmail")} className={`${inputClass} sm:col-span-2`} />
        )}
      </div>
      {error && (
        <p className="text-xs text-rose-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-xl text-xs text-slate-300 bg-slate-800 hover:bg-slate-700">
          Annuler
        </button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export function PropertiesManager({ isAdmin }: { isAdmin: boolean }) {
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const createProperty = async (fields: PropertyFields): Promise<string | null> => {
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isAdmin ? fields : { ...fields, ownerEmail: undefined }),
      });
      const json = await res.json();
      if (!json.success) return json.message;
      setProperties((list) => [...list, json.data].sort((a, b) => a.title.localeCompare(b.title)));
      setShowCreate(false);
      setFeedback((f) => ({ ...f, [json.data._id]: { type: "success", message: json.message } }));
      return null;
    } catch {
      return "Erreur réseau, réessayez.";
    }
  };

  const editProperty = async (property: PropertyItem, fields: PropertyFields): Promise<string | null> => {
    try {
      const { ownerEmail: _ignored, ...body } = fields;
      const res = await fetch(`/api/properties/${property._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) return json.message;
      setProperties((list) => list.map((p) => (p._id === property._id ? { ...p, ...json.data } : p)));
      setEditingId(null);
      return null;
    } catch {
      return "Erreur réseau, réessayez.";
    }
  };

  const deleteProperty = async (property: PropertyItem) => {
    if (!window.confirm(`Supprimer le logement "${property.title}" ?`)) return;
    setSavingId(property._id);
    try {
      const res = await fetch(`/api/properties/${property._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setProperties((list) => list.filter((p) => p._id !== property._id));
      } else {
        setFeedback((f) => ({ ...f, [property._id]: { type: "error", message: json.message } }));
      }
    } catch {
      setFeedback((f) => ({ ...f, [property._id]: { type: "error", message: "Erreur réseau, réessayez." } }));
    } finally {
      setSavingId(null);
    }
  };

  useEffect(() => {
    fetch("/api/properties")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setProperties(json.data);
      })
      .catch((err) => console.error("Failed to load properties:", err))
      .finally(() => setLoading(false));
  }, []);

  const updateTenant = async (property: PropertyItem, email: string | null) => {
    setSavingId(property._id);
    setFeedback((f) => ({ ...f, [property._id]: null }));
    try {
      const res = await fetch(`/api/properties/${property._id}/tenant`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!json.success) {
        setFeedback((f) => ({ ...f, [property._id]: { type: "error", message: json.message } }));
        return;
      }
      setProperties((list) =>
        list.map((p) => (p._id === property._id ? { ...p, tenantId: json.data.tenantId } : p))
      );
      setEmails((e) => ({ ...e, [property._id]: "" }));
      setFeedback((f) => ({ ...f, [property._id]: { type: "success", message: json.message } }));
    } catch {
      setFeedback((f) => ({
        ...f,
        [property._id]: { type: "error", message: "Erreur réseau, réessayez." },
      }));
    } finally {
      setSavingId(null);
    }
  };

  const occupied = properties.filter((p) => p.tenantId).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            {isAdmin ? "Logements & locataires" : "Mes logements"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Assignez un locataire à chaque logement. Ses demandes de maintenance vous seront envoyées pour
            validation et assignation d&apos;un technicien.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {!loading && properties.length > 0 && (
            <>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {occupied} occupé{occupied > 1 ? "s" : ""}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {properties.length - occupied} vacant{properties.length - occupied > 1 ? "s" : ""}
            </span>
            </>
          )}
          {!showCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter un logement
            </button>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="rounded-2xl bg-slate-900 border border-blue-500/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Nouveau logement</h2>
            <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-100" aria-label="Fermer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <PropertyForm
            initial={EMPTY_FIELDS}
            askOwnerEmail={isAdmin}
            submitLabel="Ajouter"
            onSubmit={createProperty}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
          <Building className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <p className="text-sm text-slate-300 font-medium">Aucun logement enregistré.</p>
          <p className="text-xs text-slate-500 mt-1">
            Cliquez sur « Ajouter un logement » pour enregistrer votre premier bien, puis assignez-lui un locataire.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties.map((p) => {
            const tenant = p.tenantId;
            const saving = savingId === p._id;
            const fb = feedback[p._id];
            return (
              <div key={p._id} className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Building className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-slate-100 truncate">{p.title}</h2>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {p.address}, {p.city}
                        </span>
                      </p>
                      {isAdmin && p.ownerId && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          Propriétaire : {p.ownerId.firstName} {p.ownerId.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        tenant
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {tenant ? "Occupé" : "Vacant"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingId(editingId === p._id ? null : p._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                      aria-label="Modifier le logement"
                      title="Modifier"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {!tenant && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => deleteProperty(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                        aria-label="Supprimer le logement"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {editingId === p._id && (
                  <div className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-3">
                    <PropertyForm
                      initial={{ title: p.title, address: p.address, city: p.city, postalCode: p.postalCode || "" }}
                      askOwnerEmail={false}
                      submitLabel="Enregistrer"
                      onSubmit={(fields) => editProperty(p, fields)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                )}

                {tenant ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-800/60 border border-slate-700/60 p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center text-xs font-semibold">
                        {tenant.firstName[0]}
                        {tenant.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-100 font-medium truncate">
                          {tenant.firstName} {tenant.lastName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{tenant.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (window.confirm(`Retirer ${tenant.firstName} ${tenant.lastName} de ce logement ?`)) {
                          updateTenant(p, null);
                        }
                      }}
                      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                      Retirer
                    </button>
                  </div>
                ) : (
                  <form
                    className="flex flex-col sm:flex-row gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateTenant(p, emails[p._id] || "");
                    }}
                  >
                    <div className="relative flex-1">
                      <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="E-mail du locataire"
                        value={emails[p._id] || ""}
                        onChange={(e) => setEmails((m) => ({ ...m, [p._id]: e.target.value }))}
                        className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-8 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                      Assigner
                    </button>
                  </form>
                )}

                {fb && (
                  <p
                    className={`text-xs flex items-start gap-1.5 ${
                      fb.type === "success" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {fb.type === "success" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                    )}
                    {fb.message}
                  </p>
                )}

                <Link
                  href={`/maintenance/properties/${p._id}/history`}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400"
                >
                  <History className="w-3.5 h-3.5" />
                  Historique de maintenance
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
