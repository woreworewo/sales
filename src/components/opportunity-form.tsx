"use client";
import { useState } from "react";
import { RecordForm } from "./record-form";
import { BUSINESS_TYPES, SOURCES, STAGES, type Opportunity, type Snapshot } from "@/lib/types";
import { canWriteHotel } from "@/lib/access";
import { today } from "@/lib/format";

export function OpportunityForm({
  data,
  record,
  clientId,
  activityId,
  submissionId,
}: {
  data: Snapshot;
  record?: Opportunity;
  clientId?: string;
  activityId?: string;
  submissionId: string;
}) {
  const activity = data.activities.find((a) => a.id === activityId);
  const hotels = data.hotels.filter(
    (h) =>
      h.active &&
      canWriteHotel(data.actor, h.id) &&
      (record ? h.id === record.hotelId : data.scope === "all" || h.id === data.scope),
  );
  const [hotel, setHotel] = useState(record?.hotelId || activity?.hotelId || hotels[0]?.id || "");
  const [businessType, setType] = useState(record?.businessType || "Meeting/Event");
  const [corporateType, setCorporate] = useState(record?.corporateType || "Pemesanan");
  const clients = data.clients.filter((c) => c.hotelIds.includes(hotel));
  const [client, setClient] = useState(
    record?.clientId || clientId || activity?.clientId || clients[0]?.id || "",
  );
  const owners = data.users.filter(
    (u) =>
      u.active &&
      canWriteHotel(u, hotel) &&
      (data.actor.admin || data.actor.hotelAccess[hotel] !== "sales" || u.id === data.actor.id),
  );
  return (
    <RecordForm
      kind="opportunity"
      id={record?.id}
      version={record?.version}
      cancel="/?view=opportunities"
      label="Simpan peluang"
      submissionId={submissionId}
    >
      <div className="fields">
        <label className="field">
          Nama peluang *
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={
              record?.title ||
              (activity ? `Kebutuhan ${clients.find((c) => c.id === client)?.name || "klien"}` : "")
            }
            placeholder="Contoh: Meeting tahunan PT ABC"
          />
        </label>
        <label className="field">
          Jenis bisnis
          <select
            name="businessType"
            value={businessType}
            onChange={(e) => setType(e.target.value as Opportunity["businessType"])}
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Hotel
          <select
            name="hotelId"
            value={hotel}
            onChange={(e) => {
              setHotel(e.target.value);
              setClient(data.clients.find((c) => c.hotelIds.includes(e.target.value))?.id || "");
            }}
          >
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Klien / PIC *
          <select
            name="clientId"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            required
          >
            {!clients.length && <option value="">Tambahkan klien dahulu</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Tanggal bisnis *
          <input
            name="businessDate"
            type="date"
            required
            defaultValue={record?.businessDate || today()}
          />
        </label>
        <label className="field">
          Tanggal closing *
          <input
            name="closeDate"
            type="date"
            required
            defaultValue={record?.closeDate || today()}
          />
        </label>
        {businessType === "Corporate Room" ? (
          <>
            <label className="field">
              Jenis corporate
              <select
                name="corporateType"
                value={corporateType}
                onChange={(e) => setCorporate(e.target.value as Opportunity["corporateType"])}
              >
                <option>Pemesanan</option>
                <option>Kontrak rate</option>
              </select>
            </label>
            <label className="field">
              Jumlah kamar
              <input
                name="quantity"
                type="number"
                min="0"
                max="100000"
                defaultValue={record?.quantity || 0}
              />
            </label>
            <label className="field">
              Jumlah malam
              <input
                name="nights"
                type="number"
                min="1"
                max="3650"
                defaultValue={record?.nights || 1}
              />
            </label>
            <input type="hidden" name="venue" value="" />
          </>
        ) : (
          <>
            <input name="corporateType" type="hidden" value="Pemesanan" />
            <input name="nights" type="hidden" value="1" />
            <label className="field">
              {businessType === "Wedding" ? "Jumlah tamu" : "Jumlah peserta"}
              <input
                name="quantity"
                type="number"
                min="0"
                max="100000"
                defaultValue={record?.quantity || 0}
              />
            </label>
            <label className="field">
              Venue / paket
              <input name="venue" maxLength={200} defaultValue={record?.venue || ""} />
            </label>
          </>
        )}
        <label className="field">
          Nilai estimasi / confirmed (Rp)
          <input
            name="value"
            inputMode="numeric"
            type="number"
            min="0"
            max="1000000000000"
            required
            defaultValue={record?.value || 0}
          />
        </label>
        <label className="field">
          Penanggung jawab
          <select
            name="ownerId"
            required
            defaultValue={record?.ownerId || owners[0]?.id || ""}
            key={hotel}
          >
            {owners.map((u) => (
              <option value={u.id} key={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Tahap
          <select name="stage" defaultValue={record?.stage || "Inquiry"}>
            {STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Sumber lead
          <select
            name="source"
            defaultValue={
              record?.source || (activity?.type === "Sales Visit" ? "Sales visit" : "Website")
            }
          >
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field wide">
          Catatan kebutuhan
          <textarea
            name="notes"
            maxLength={2000}
            defaultValue={record?.notes || activity?.notes || ""}
          />
        </label>
        <label className="field wide">
          Alasan lost (wajib jika Lost)
          <input name="lostReason" maxLength={1000} defaultValue={record?.lostReason || ""} />
        </label>
      </div>
      {businessType === "Corporate Room" && corporateType === "Kontrak rate" && (
        <p className="callout">
          Kontrak rate tanpa komitmen kamar tidak dihitung dalam nilai bisnis confirmed.
        </p>
      )}
      {!clients.length && (
        <p className="warning">Buat klien untuk hotel ini terlebih dahulu melalui menu Klien.</p>
      )}
    </RecordForm>
  );
}
