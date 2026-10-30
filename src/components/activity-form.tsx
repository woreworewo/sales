"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Image as ImageIcon, MapPin, LocateFixed, ArrowLeft } from "lucide-react";
import { saveRecord } from "@/app/actions";
import { ACTIVITY_TYPES, type Snapshot } from "@/lib/types";
import { canWriteHotel } from "@/lib/access";
import { today, formatDate } from "@/lib/format";

interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}
async function compressPhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Gunakan JPG, PNG, atau WebP.");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Foto terlalu besar. Pilih foto di bawah 20 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Foto tidak dapat diproses.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Foto tidak dapat diproses."))),
        "image/jpeg",
        0.82,
      ),
    );
    if (blob.size > 5 * 1024 * 1024) throw new Error("Foto masih terlalu besar. Pilih foto lain.");
    return new File([blob], "visit-photo.jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
export function ActivityForm({
  data,
  opportunityId,
  taskId,
  submissionId,
}: {
  data: Snapshot;
  opportunityId?: string;
  taskId?: string;
  submissionId: string;
}) {
  const task = data.tasks.find((t) => t.id === taskId),
    opp = data.opportunities.find((o) => o.id === (opportunityId || task?.opportunityId));
  const hotels = data.hotels.filter(
    (h) =>
      h.active && canWriteHotel(data.actor, h.id) && (data.scope === "all" || data.scope === h.id),
  );
  const [hotel, setHotel] = useState(opp?.hotelId || task?.hotelId || hotels[0]?.id || "");
  const [client, setClient] = useState(
    opp?.clientId ||
      task?.clientId ||
      data.clients.find((c) => c.hotelIds.includes(hotel))?.id ||
      "",
  );
  const [linked, setLinked] = useState(opp?.id || "");
  const [type, setType] = useState<string>("Sales Call"),
    [step, setStep] = useState(1);
  const [result, setResult] = useState("Ada kebutuhan"),
    [notes, setNotes] = useState(""),
    [next, setNext] = useState(""),
    [due, setDue] = useState(today());
  const [photo, setPhoto] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [position, setPosition] = useState<Position | null>(null),
    [simulated, setSimulated] = useState(false);
  const [localError, setLocalError] = useState(""),
    [locating, setLocating] = useState(false),
    [processing, setProcessing] = useState(false);
  const [state, action, pending] = useActionState(saveRecord, {}),
    router = useRouter();
  const [nonce] = useState(submissionId);
  const visit = ["Sales Visit", "Site Inspection"].includes(type),
    clients = data.clients.filter((c) => c.hotelIds.includes(hotel));
  useEffect(() => {
    if (state.redirectTo) router.replace(state.redirectTo);
  }, [state.redirectTo, router]);
  useEffect(() => {
    if (!photo) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  async function locate() {
    setLocalError("");
    if (!navigator.geolocation) {
      setLocalError("Perangkat ini tidak mendukung lokasi.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          capturedAt: new Date(p.timestamp).toISOString(),
        });
        setSimulated(false);
        setLocating(false);
      },
      (e) => {
        setLocalError(
          e.code === 1
            ? "Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini, lalu coba lagi."
            : "Lokasi belum tersedia. Pastikan GPS aktif dan coba di area terbuka.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }
  function advance() {
    setLocalError("");
    if (step === 1) {
      if (!client) {
        setLocalError("Pilih klien terlebih dahulu.");
        return;
      }
      if (visit && (!position || (!photo && !simulated))) {
        setLocalError("Tambahkan foto dan catat lokasi kunjungan.");
        return;
      }
    }
    if (step === 2 && (!notes.trim() || (next.trim() && !due))) {
      setLocalError("Isi catatan komunikasi dan tanggal tindak lanjut jika diperlukan.");
      return;
    }
    setStep((s) => s + 1);
  }
  function submit(fd: FormData) {
    fd.set("submissionId", nonce);
    fd.set("kind", "activity");
    fd.set("hotelId", hotel);
    fd.set("clientId", client);
    fd.set("opportunityId", linked);
    fd.set("taskId", taskId || "");
    fd.set("type", type);
    fd.set("occurredAt", new Date().toISOString());
    fd.set("result", result);
    fd.set("notes", notes);
    fd.set("nextAction", next);
    fd.set("nextDate", due);
    if (visit && position) {
      Object.entries(position).forEach(([k, v]) => fd.set(k, String(v)));
      fd.set("simulated", String(simulated));
      if (photo) fd.set("photo", photo);
    }
    action(fd);
  }
  const photoPreview = (
    <div className="photo">
      {preview ? (
        <>
          <img src={preview} alt="Pratinjau foto bukti kunjungan" width="400" height="200" />
          <small>
            {photo?.name} · {Math.round((photo?.size || 0) / 1024)} KB
          </small>
        </>
      ) : simulated ? (
        <>
          <ImageIcon size={26} aria-hidden />
          <strong>Foto simulasi</strong>
          <small>Bukan foto kunjungan nyata</small>
        </>
      ) : (
        <>
          <Camera size={26} aria-hidden />
          <span className="muted">Foto lokasi atau pertemuan</span>
          <small>Belum ada foto</small>
        </>
      )}
    </div>
  );
  return (
    <form action={submit} className="record-form">
      <div className="heading">
        <div>
          <h1>
            {step === 1 ? "Catat aktivitas" : step === 2 ? "Hasil komunikasi" : "Tinjau aktivitas"}
          </h1>
          <p>Data dan bukti → hasil → simpan</p>
        </div>
        <span className="step">{step} / 3</span>
      </div>
      {step === 1 && (
        <>
          <div className="fields">
            <label className="field">
              Jenis aktivitas
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Hotel yang diwakili
              <select
                value={hotel}
                disabled={!!task}
                onChange={(e) => {
                  setHotel(e.target.value);
                  setClient(
                    data.clients.find((c) => c.hotelIds.includes(e.target.value))?.id || "",
                  );
                  setLinked("");
                  setPosition(null);
                  setPhoto(null);
                  setSimulated(false);
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
                value={client}
                disabled={!!task}
                onChange={(e) => {
                  setClient(e.target.value);
                  setLinked("");
                }}
              >
                {!clients.length && <option value="">Tambahkan klien terlebih dahulu</option>}
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.pic}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Peluang terkait
              <select value={linked} disabled={!!task} onChange={(e) => setLinked(e.target.value)}>
                <option value="">Tanpa peluang</option>
                {data.opportunities
                  .filter((o) => o.hotelId === hotel && o.clientId === client)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          {visit ? (
            <div className="grid">
              <section>
                <div className="subheading">
                  <h2>Foto bukti</h2>
                  <small>Wajib untuk kunjungan</small>
                </div>
                {photoPreview}
                <div className="photo-tools">
                  <label className="upload">
                    <Camera size={17} aria-hidden />
                    {processing ? "Memproses foto…" : "Ambil / pilih foto"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      disabled={processing}
                      aria-label="Ambil foto bukti"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setLocalError("");
                        setProcessing(true);
                        try {
                          setPhoto(await compressPhoto(file));
                        } catch (error) {
                          setLocalError(
                            error instanceof Error ? error.message : "Foto tidak dapat diproses.",
                          );
                        } finally {
                          setProcessing(false);
                        }
                      }}
                    />
                  </label>
                  {data.demo && (
                    <button
                      className="link"
                      type="button"
                      onClick={() => {
                        setSimulated(true);
                        setPhoto(null);
                      }}
                    >
                      Foto simulasi
                    </button>
                  )}
                </div>
              </section>
              <section>
                <div className="subheading">
                  <h2>Lokasi saat tiba</h2>
                </div>
                <div className="location">
                  <MapPin size={18} aria-hidden /> {position ? "Lokasi tercatat" : "Belum dicatat"}
                  {position && (
                    <>
                      <small>
                        {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                      </small>
                      <small>
                        Akurasi ±{Math.round(position.accuracy)} m ·{" "}
                        {simulated ? "simulasi" : "GPS perangkat"}
                      </small>
                      <small>
                        {new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone:
                            data.hotels.find((h) => h.id === hotel)?.timezone || "Asia/Jakarta",
                        }).format(new Date(position.capturedAt))}
                      </small>
                    </>
                  )}
                  <button
                    className="button full-width"
                    type="button"
                    disabled={locating}
                    onClick={() => void locate()}
                  >
                    <LocateFixed size={17} aria-hidden />
                    {locating ? "Mencatat lokasi…" : "Ambil lokasi sekarang"}
                  </button>
                  {data.demo && (
                    <button
                      type="button"
                      className="link full-width"
                      onClick={() => {
                        setPosition({
                          latitude: -6.2088,
                          longitude: 106.8456,
                          accuracy: 18,
                          capturedAt: new Date().toISOString(),
                        });
                        setSimulated(true);
                      }}
                    >
                      Simulasi lokasi (demo)
                    </button>
                  )}
                </div>
                <p className="muted" style={{ marginTop: 9 }}>
                  Lokasi hanya diambil saat tombol ditekan, tanpa pelacakan terus-menerus.
                </p>
              </section>
            </div>
          ) : (
            <div className="callout">Catat hasil komunikasi tanpa memerlukan foto atau lokasi.</div>
          )}
        </>
      )}
      {step === 2 && (
        <>
          <div className="callout">
            {clients.find((c) => c.id === client)?.name} · {type}
            <small>{data.hotels.find((h) => h.id === hotel)?.name}</small>
          </div>
          <div className="fields">
            <label className="field wide">
              Hasil komunikasi
              <select value={result} onChange={(e) => setResult(e.target.value)}>
                {[
                  "Ada kebutuhan",
                  "Hubungi kembali",
                  "Belum ada kebutuhan",
                  "Tidak terhubung / PIC tidak ditemui",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="field wide">
              Catatan pertemuan / komunikasi *
              <textarea
                value={notes}
                maxLength={2000}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Kebutuhan klien, hasil pembahasan, dan kesepakatan berikutnya"
              />
            </label>
            <label className="field">
              Tindak lanjut berikutnya
              <input
                value={next}
                maxLength={200}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Contoh: Kirim proposal"
              />
            </label>
            <label className="field">
              Tanggal follow-up
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <div className="callout">
            {type} · {clients.find((c) => c.id === client)?.name}
            <small>
              {data.hotels.find((h) => h.id === hotel)?.name} · {data.actor.name}
            </small>
          </div>
          <div className="review">
            <small>Hasil komunikasi</small>
            {result}
          </div>
          <div className="review">
            <small>Catatan</small>
            {notes}
          </div>
          {visit && (
            <div className="review">
              <small>Foto bukti</small>
              {photoPreview}
              <small>
                Koordinat: {position?.latitude.toFixed(6)}, {position?.longitude.toFixed(6)} ·
                akurasi ±{Math.round(position?.accuracy || 0)} m {simulated ? "· SIMULASI" : ""}
              </small>
            </div>
          )}
          <div className="review">
            <small>Tindak lanjut</small>
            {next ? `${next} · ${formatDate(due)}` : "Tidak dijadwalkan"}
          </div>
        </>
      )}
      {(localError || state.error) && (
        <p className="form-error" role="alert">
          {localError || state.error}
        </p>
      )}
      <div className="form-actions">
        {step === 1 ? (
          <Link className="button" href="/?view=activities">
            Batal
          </Link>
        ) : (
          <button
            className="button"
            type="button"
            disabled={pending}
            onClick={() => {
              setLocalError("");
              setStep((s) => s - 1);
            }}
          >
            <ArrowLeft size={16} aria-hidden />
            Kembali
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            className="button primary"
            disabled={processing || locating}
            onClick={advance}
          >
            {step === 1 ? "Lanjut · Hasil komunikasi" : "Tinjau aktivitas"}
          </button>
        ) : (
          <button type="submit" className="button primary" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan aktivitas"}
          </button>
        )}
      </div>
    </form>
  );
}
