import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Plus, ArrowLeft, ChevronRight, MapPin, Camera, Building2 } from "lucide-react";
import type { Snapshot, Opportunity, Task, Activity, Hotel } from "@/lib/types";
import { BUSINESS_TYPES, SOURCES, STAGES } from "@/lib/types";
import { canWriteHotel, canWriteRecord, roleLabel } from "@/lib/access";
import { compactCurrency, currency, formatDate, today, metrics, businessValue } from "@/lib/format";
import { RecordForm } from "./record-form";
import { OpportunityForm } from "./opportunity-form";
import { ActivityForm } from "./activity-form";
import { NAV_ITEMS } from "./icons";
import { logout, setHotelScope } from "@/app/actions";

export type Params = Record<string, string | undefined>;
const href = (view: string, extra: Record<string, string> = {}) =>
  "/?" + new URLSearchParams({ view, ...extra }).toString();
const Badge = ({ stage }: { stage: string }) => (
  <span className={`badge ${stage === "Won" ? "won" : ""}`}>{stage}</span>
);
const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="empty">{children}</div>
);
function Heading({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="heading">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}
function NewLink({
  view,
  label,
  extra = {},
}: {
  view: string;
  label: string;
  extra?: Record<string, string>;
}) {
  return (
    <Link className="button primary" href={href(view, { action: "new", ...extra })}>
      <Plus size={16} aria-hidden />
      {label}
    </Link>
  );
}
function Field({
  label,
  name,
  value = "",
  type = "text",
  required = false,
  readOnly = false,
}: {
  label: string;
  name: string;
  value?: string | number;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        readOnly={readOnly}
        maxLength={200}
      />
    </label>
  );
}
function Choice({
  label,
  name,
  values,
  value,
}: {
  label: string;
  name: string;
  values: readonly string[];
  value: string;
}) {
  return (
    <label className="field">
      {label}
      <select name={name} defaultValue={value}>
        {values.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
}
export function Workspace({ data, params }: { data: Snapshot; params: Params }) {
  const submissionId = randomUUID();
  const view = params.view || "dashboard",
    id = params.id || "",
    action = params.action || "";
  const writeHotels = data.hotels.filter(
    (h) =>
      h.active && canWriteHotel(data.actor, h.id) && (data.scope === "all" || h.id === data.scope),
  );
  const name = (clientId: string) => data.clients.find((c) => c.id === clientId)?.name || "Klien";
  const hotel = (hotelId: string) => data.hotels.find((h) => h.id === hotelId)?.name || "Hotel";
  const owner = (ownerId: string) => data.users.find((u) => u.id === ownerId)?.name || "Sales";
  const back = (
    <Link className="back" href={href(view)}>
      <ArrowLeft size={16} aria-hidden />
      Kembali
    </Link>
  );
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month || "")
    ? params.month!
    : today().slice(0, 7);
  const readOnly = <Empty>Data tidak ditemukan atau akses Anda tidak mencakup data ini.</Empty>;
  const tasks = data.tasks.filter((t) => !t.completedAt);
  function taskDay(task: Task) {
    return today(data.hotels.find((h) => h.id === task.hotelId)?.timezone);
  }
  function TaskList({ rows }: { rows: Task[] }) {
    return (
      <>
        {rows.length ? (
          rows.map((t) => (
            <div className="list-row" key={t.id}>
              <div className="row-main">
                <strong>{t.title}</strong>
                <small>
                  {name(t.clientId)} · {hotel(t.hotelId)} · {owner(t.ownerId)}
                </small>
                <small className={t.dueDate < taskDay(t) ? "late" : ""}>
                  {t.dueDate < taskDay(t) ? "Terlambat · " : ""}
                  {formatDate(t.dueDate)}
                </small>
              </div>
              {canWriteRecord(data.actor, t) && (
                <Link className="button" href={href("activities", { action: "new", task: t.id })}>
                  Catat hasil
                </Link>
              )}
            </div>
          ))
        ) : (
          <Empty>Tidak ada follow-up pada daftar ini.</Empty>
        )}
      </>
    );
  }
  function ActivityList({ rows }: { rows: Activity[] }) {
    return (
      <>
        {rows.length ? (
          rows.map((a) => (
            <Link className="list-row" key={a.id} href={href("activities", { id: a.id })}>
              <span className="row-main">
                <strong>
                  {a.type} · {name(a.clientId)}
                </strong>
                <small>
                  {a.result} · {owner(a.ownerId)}
                </small>
                <small>
                  {formatDate(a.occurredAt, data.hotels.find((h) => h.id === a.hotelId)?.timezone)}{" "}
                  · {hotel(a.hotelId)}
                </small>
              </span>
              <ChevronRight size={16} aria-hidden />
            </Link>
          ))
        ) : (
          <Empty>Belum ada aktivitas tercatat.</Empty>
        )}
      </>
    );
  }
  function Opportunities({ rows }: { rows: Opportunity[] }) {
    return (
      <section className="panel opportunities-table">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Peluang / klien</th>
                <th className="desktop-col">Hotel · Sales</th>
                <th>Tahap</th>
                <th className="money">Nilai</th>
                <th className="desktop-col">Tanggal bisnis</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link className="record-link" href={href("opportunities", { id: d.id })}>
                      {d.title}
                    </Link>
                    <small>{name(d.clientId)}</small>
                    <small className="mobile-meta">
                      {hotel(d.hotelId)} · {d.businessType}
                    </small>
                  </td>
                  <td className="desktop-col">
                    {hotel(d.hotelId)}
                    <small>{owner(d.ownerId)}</small>
                  </td>
                  <td>
                    <Badge stage={d.stage} />
                  </td>
                  <td className="money">{d.value ? compactCurrency(d.value) : "Belum diisi"}</td>
                  <td className="desktop-col">{formatDate(d.businessDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty>Tidak ada peluang yang sesuai.</Empty>}
        <div className="table-footer">
          {rows.length} peluang · IDR · nilai estimasi / confirmed untuk Won
        </div>
      </section>
    );
  }
  function Stats() {
    const summary = metrics(data.opportunities, month);
    return (
      <div className="stats">
        <div className="stat">
          <span>Pipeline aktif</span>
          <strong>{compactCurrency(summary.pipeline)}</strong>
          <span>{summary.openCount} peluang</span>
        </div>
        <div className="stat">
          <span>Confirmed</span>
          <strong>{compactCurrency(summary.confirmed)}</strong>
          <span>
            Closing{" "}
            {new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
              new Date(month + "-15T12:00:00Z"),
            )}
          </span>
        </div>
        <div className="stat">
          <span>Follow-up</span>
          <strong>{tasks.length}</strong>
          <span>{tasks.filter((t) => t.dueDate < taskDay(t)).length} terlambat</span>
        </div>
      </div>
    );
  }
  function Pagination({ count }: { count: number }) {
    const page = Math.max(1, Math.min(Math.ceil(count / 20) || 1, Number(params.page) || 1));
    return count > 20 ? (
      <div className="actions">
        <span className="muted">
          Halaman {page} / {Math.ceil(count / 20)}
        </span>
        {page > 1 && (
          <Link
            className="button"
            href={href(view, {
              ...(Object.fromEntries(
                Object.entries(params).filter(([, v]) => v !== undefined),
              ) as Record<string, string>),
              page: String(page - 1),
            })}
          >
            Sebelumnya
          </Link>
        )}
        {page * 20 < count && (
          <Link
            className="button"
            href={href(view, {
              ...(Object.fromEntries(
                Object.entries(params).filter(([, v]) => v !== undefined),
              ) as Record<string, string>),
              page: String(page + 1),
            })}
          >
            Berikutnya
          </Link>
        )}
      </div>
    ) : null;
  }
  function paged<T>(rows: T[]) {
    const page = Math.max(1, Math.min(Math.ceil(rows.length / 20) || 1, Number(params.page) || 1));
    return rows.slice((page - 1) * 20, page * 20);
  }

  if (view === "dashboard")
    return (
      <>
        <Heading
          title={`Selamat ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(new Date()) < "12" ? "pagi" : "datang"}, ${data.actor.name.split(" ")[0]}.`}
          sub={new Intl.DateTimeFormat("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Jakarta",
          }).format(new Date())}
          action={
            writeHotels.length ? <NewLink view="activities" label="Catat aktivitas" /> : undefined
          }
        />
        <Stats />
        <div className="grid">
          <section className="panel">
            <div className="panel-head">
              <h2>Prioritas hari ini</h2>
              <Link className="link" href={href("activities")}>
                Lihat semua
              </Link>
            </div>
            <TaskList
              rows={tasks
                .filter((t) => t.dueDate <= taskDay(t))
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .slice(0, 5)}
            />
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Peluang aktif</h2>
              <Link className="link" href={href("opportunities")}>
                Lihat semua
              </Link>
            </div>
            {data.opportunities
              .filter((d) => !["Won", "Lost"].includes(d.stage))
              .slice(0, 4)
              .map((d) => (
                <Link className="list-row" key={d.id} href={href("opportunities", { id: d.id })}>
                  <span className="row-main">
                    <strong>{d.title}</strong>
                    <small>
                      {name(d.clientId)} · {hotel(d.hotelId)}
                    </small>
                  </span>
                  <span className="row-end">
                    <Badge stage={d.stage} />
                    <small>{compactCurrency(d.value)}</small>
                  </span>
                </Link>
              ))}
            {!data.opportunities.length && (
              <Empty>Mulai dengan menambahkan klien dan peluang.</Empty>
            )}
          </section>
        </div>
        {data.demo && (
          <p className="muted">
            Mode demo · perubahan tersimpan secara lokal. Ubah akun melalui menu Akun.
          </p>
        )}
      </>
    );

  if (view === "clients") {
    const c = data.clients.find((c) => c.id === id);
    if (action === "new" || action === "edit") {
      if (
        !writeHotels.length ||
        (action === "edit" && (!c || !c.hotelIds.some((h) => canWriteHotel(data.actor, h))))
      )
        return readOnly;
      return (
        <>
          {back}
          <Heading title={c ? "Edit klien" : "Klien baru"} />
          <RecordForm
            submissionId={submissionId}
            kind="client"
            id={c?.id}
            version={c?.version}
            cancel={href(view)}
          >
            <div className="fields">
              <Field label="Nama perusahaan / kontak *" name="name" value={c?.name} required />
              <Choice
                label="Segmen"
                name="segment"
                values={[
                  "Corporate",
                  "Government",
                  "Travel Agent",
                  "Wedding Organizer",
                  "Individu",
                ]}
                value={c?.segment || "Corporate"}
              />
              <Field label="Nama PIC *" name="pic" value={c?.pic} required />
              <Field label="Telepon" name="phone" type="tel" value={c?.phone} />
              <Field label="Email" name="email" type="email" value={c?.email} />
            </div>
            <fieldset className="access-fieldset">
              <legend>Dapat digunakan di hotel</legend>
              {writeHotels.map((h) => (
                <label className="check" key={h.id}>
                  <input
                    type="checkbox"
                    name="hotelIds"
                    value={h.id}
                    defaultChecked={c ? c.hotelIds.includes(h.id) : writeHotels.length === 1}
                  />
                  {h.name}
                </label>
              ))}
            </fieldset>
            {c && (
              <p className="muted">
                Hotel yang sudah terhubung tetap dipertahankan agar riwayat bisnis tidak terputus.
              </p>
            )}
          </RecordForm>
        </>
      );
    }
    if (id) {
      if (!c) return readOnly;
      return (
        <>
          {back}
          <Heading
            title={c.name}
            sub={c.segment}
            action={
              c.hotelIds.some((h) => canWriteHotel(data.actor, h)) ? (
                <Link className="button" href={href(view, { action: "edit", id })}>
                  Edit kontak
                </Link>
              ) : undefined
            }
          />
          <section className="panel pad">
            <div className="info">
              <div>
                <small>PIC</small>
                {c.pic}
              </div>
              <div>
                <small>Telepon</small>
                {c.phone || "—"}
              </div>
              <div>
                <small>Email</small>
                {c.email || "—"}
              </div>
            </div>
          </section>
          <div className="subheading">
            <h2>Peluang terkait</h2>
            {writeHotels.some((h) => c.hotelIds.includes(h.id)) && (
              <NewLink view="opportunities" label="Peluang" extra={{ client: id }} />
            )}
          </div>
          <Opportunities rows={data.opportunities.filter((d) => d.clientId === id)} />
          <div className="subheading">
            <h2>Riwayat komunikasi</h2>
          </div>
          <section className="panel">
            <ActivityList rows={data.activities.filter((a) => a.clientId === id)} />
          </section>
        </>
      );
    }
    const rows = data.clients.filter((c) =>
      `${c.name} ${c.pic}`.toLowerCase().includes((params.q || "").toLowerCase()),
    );
    return (
      <>
        <Heading
          title="Klien"
          sub="Perusahaan dan kontak dalam satu tempat"
          action={writeHotels.length ? <NewLink view={view} label="Klien baru" /> : undefined}
        />
        <form className="filters">
          <input type="hidden" name="view" value={view} />
          <input
            name="q"
            placeholder="Cari perusahaan atau PIC…"
            aria-label="Cari klien"
            defaultValue={params.q || ""}
          />
          <button className="button" type="submit">
            Cari
          </button>
        </form>
        <section className="panel">
          {paged(rows).map((c) => (
            <Link className="list-row" key={c.id} href={href(view, { id: c.id })}>
              <span className="row-main">
                <strong>{c.name}</strong>
                <small>
                  {c.pic} · {c.segment}
                </small>
                <small>{c.hotelIds.map((h) => hotel(h)).join(" · ")}</small>
              </span>
              <ChevronRight size={17} aria-hidden />
            </Link>
          ))}
          {!rows.length && <Empty>Belum ada klien yang sesuai.</Empty>}
        </section>
        <Pagination count={rows.length} />
      </>
    );
  }
  if (view === "opportunities") {
    const d = data.opportunities.find((d) => d.id === id);
    if (action === "new" || action === "edit") {
      if (!writeHotels.length || (action === "edit" && (!d || !canWriteRecord(data.actor, d))))
        return readOnly;
      return (
        <>
          {back}
          <Heading title={d ? "Edit peluang" : "Peluang baru"} />
          <OpportunityForm
            submissionId={submissionId}
            data={data}
            record={d}
            clientId={params.client}
            activityId={params.activity}
          />
        </>
      );
    }
    if (id) {
      if (!d) return readOnly;
      return (
        <>
          {back}
          <Heading
            title={d.title}
            sub={name(d.clientId)}
            action={
              canWriteRecord(data.actor, d) ? (
                <Link className="button" href={href(view, { id, action: "edit" })}>
                  Edit peluang
                </Link>
              ) : undefined
            }
          />
          <div className="actions">
            <Badge stage={d.stage} />
            <span className="muted">{d.businessType}</span>
          </div>
          <div className="info">
            <div>
              <small>Hotel · Sales</small>
              {hotel(d.hotelId)}
              <br />
              {owner(d.ownerId)}
            </div>
            <div>
              <small>Nilai {d.stage === "Won" ? "confirmed" : "estimasi"}</small>
              {d.value ? currency(d.value) : "Belum ditentukan"}
            </div>
            <div>
              <small>Tanggal bisnis</small>
              {formatDate(d.businessDate)}
            </div>
            <div>
              <small>Tanggal closing</small>
              {formatDate(d.closeDate)}
            </div>
            <div>
              <small>Kebutuhan</small>
              {d.quantity}{" "}
              {d.businessType === "Corporate Room"
                ? `kamar · ${d.nights} malam`
                : d.businessType === "Wedding"
                  ? "tamu"
                  : "peserta"}
              {d.venue && ` · ${d.venue}`}
            </div>
            <div>
              <small>Sumber lead</small>
              {d.source}
            </div>
          </div>
          {d.notes && <div className="callout">{d.notes}</div>}
          {d.lostReason && <p className="callout">Alasan lost: {d.lostReason}</p>}
          {d.businessType === "Corporate Room" && d.corporateType === "Kontrak rate" && (
            <p className="callout">
              Kontrak rate tanpa komitmen kamar tidak dihitung sebagai bisnis confirmed.
            </p>
          )}
          <div className="subheading">
            <h2>Follow-up</h2>
            {canWriteRecord(data.actor, d) && (
              <NewLink view="activities" label="Catat aktivitas" extra={{ opportunity: id }} />
            )}
          </div>
          <section className="panel">
            <TaskList rows={tasks.filter((t) => t.opportunityId === id)} />
          </section>
          <div className="subheading">
            <h2>Riwayat komunikasi</h2>
          </div>
          <section className="panel">
            <ActivityList rows={data.activities.filter((a) => a.opportunityId === id)} />
          </section>
          <div className="subheading">
            <h2>Riwayat tahap</h2>
          </div>
          <section className="panel">
            {d.history.length ? (
              d.history.map((h, i) => (
                <div className="list-row" key={i}>
                  <span className="row-main">
                    {h.from ? `${h.from} → ` : "Dibuat · "}
                    {h.to}
                    <small>
                      {formatDate(h.at)} · {owner(h.actorId)}
                    </small>
                  </span>
                </div>
              ))
            ) : (
              <Empty>Belum ada perubahan tahap.</Empty>
            )}
          </section>
        </>
      );
    }
    const rows = data.opportunities.filter(
      (d) =>
        (!params.type || d.businessType === params.type) &&
        (!params.stage || d.stage === params.stage) &&
        `${d.title} ${name(d.clientId)}`.toLowerCase().includes((params.q || "").toLowerCase()),
    );
    return (
      <>
        <Heading
          title="Peluang"
          sub="Corporate room, meeting/event & wedding"
          action={writeHotels.length ? <NewLink view={view} label="Baru" /> : undefined}
        />
        <form className="filters">
          <input type="hidden" name="view" value={view} />
          <input
            name="q"
            placeholder="Cari peluang atau klien…"
            aria-label="Cari peluang"
            defaultValue={params.q || ""}
          />
          <select name="type" aria-label="Jenis bisnis" defaultValue={params.type || ""}>
            <option value="">Semua jenis</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select name="stage" aria-label="Tahap penjualan" defaultValue={params.stage || ""}>
            <option value="">Semua tahap</option>
            {STAGES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button className="button">Terapkan</button>
        </form>
        <Opportunities rows={paged(rows)} />
        <Pagination count={rows.length} />
      </>
    );
  }
  if (view === "activities") {
    if (action === "new") {
      if (!writeHotels.length) return readOnly;
      const task = params.task ? tasks.find((t) => t.id === params.task) : undefined;
      if (params.task && (!task || !canWriteRecord(data.actor, task))) return readOnly;
      return (
        <>
          {back}
          <ActivityForm
            submissionId={submissionId}
            data={data}
            opportunityId={params.opportunity}
            taskId={params.task}
          />
        </>
      );
    }
    if (id) {
      const a = data.activities.find((a) => a.id === id);
      if (!a) return readOnly;
      const zone = data.hotels.find((h) => h.id === a.hotelId)?.timezone;
      return (
        <>
          {back}
          <Heading title={a.type} sub={name(a.clientId)} />
          <div className="info">
            <div>
              <small>Hotel · Sales</small>
              {hotel(a.hotelId)}
              <br />
              {owner(a.ownerId)}
            </div>
            <div>
              <small>Waktu aktivitas</small>
              {formatDate(a.occurredAt, zone)}
              <br />
              {new Intl.DateTimeFormat("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: zone,
              }).format(new Date(a.occurredAt))}
            </div>
            <div>
              <small>Hasil</small>
              {a.result}
            </div>
          </div>
          <div className="review">
            <small>Catatan</small>
            {a.notes}
          </div>
          {a.evidence && (
            <div className="grid" style={{ marginTop: 20 }}>
              <div className="photo">
                {a.evidence.simulated ? (
                  <>
                    <Camera size={26} aria-hidden />
                    <strong>Foto simulasi</strong>
                    <small>Bukan foto kunjungan nyata</small>
                  </>
                ) : (
                  <img
                    src={`/api/evidence/${a.id}`}
                    alt="Foto bukti kunjungan"
                    width="400"
                    height="200"
                  />
                )}
              </div>
              <div className="location">
                <MapPin size={18} aria-hidden /> Lokasi kunjungan
                <small>
                  {a.evidence.latitude.toFixed(6)}, {a.evidence.longitude.toFixed(6)} · ±
                  {Math.round(a.evidence.accuracy)} m
                </small>
                <small>
                  {a.evidence.simulated
                    ? "Koordinat dan waktu simulasi"
                    : "Lokasi dikirim dari perangkat; bukan verifikasi kehadiran independen."}
                </small>
                <small>Dicatat server: {formatDate(a.evidence.recordedAt, zone)}</small>
              </div>
            </div>
          )}
          <div className="review">
            <small>Tindak lanjut</small>
            {a.nextAction ? `${a.nextAction} · ${formatDate(a.nextDate)}` : "Tidak dijadwalkan"}
          </div>
          {canWriteHotel(data.actor, a.hotelId) && (
            <div className="form-actions">
              <NewLink
                view="opportunities"
                label="Buat peluang dari aktivitas"
                extra={{ activity: id }}
              />
            </div>
          )}
        </>
      );
    }
    const tab = params.tab || "today";
    const rows = tasks.filter((t) =>
      tab === "late" ? t.dueDate < taskDay(t) : tab === "all" ? true : t.dueDate === taskDay(t),
    );
    return (
      <>
        <Heading
          title="Aktivitas"
          sub="Sales call, kunjungan, dan tindak lanjut"
          action={writeHotels.length ? <NewLink view={view} label="Catat" /> : undefined}
        />
        <div className="pills" role="group" aria-label="Daftar aktivitas">
          {[
            ["today", "Hari ini"],
            ["late", "Terlambat"],
            ["all", "Semua"],
            ["history", "Riwayat"],
          ].map(([key, label]) => (
            <Link
              className="pill"
              key={key}
              href={href(view, { tab: key })}
              aria-current={tab === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </div>
        <section className="panel">
          {tab === "history" ? (
            <ActivityList rows={paged(data.activities)} />
          ) : (
            <TaskList rows={paged(rows)} />
          )}
        </section>
        <Pagination count={tab === "history" ? data.activities.length : rows.length} />
      </>
    );
  }
  if (view === "reports") {
    const summary = metrics(data.opportunities, month);
    const selected = data.hotels.filter(
      (h) => h.active && (data.scope === "all" || h.id === data.scope),
    );
    return (
      <>
        <Heading title="Laporan" sub="Berdasarkan tanggal closing; bukan revenue aktual" />
        <form className="filters">
          <input type="hidden" name="view" value={view} />
          <label className="field">
            Periode closing
            <input name="month" type="month" required defaultValue={month} />
          </label>
          <button className="button">Terapkan</button>
        </form>
        <Stats />
        <section className="panel">
          <div className="panel-head">
            <h2>Ringkasan per hotel</h2>
            <small>Conversion {summary.conversion === null ? "—" : summary.conversion + "%"}</small>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hotel</th>
                  <th>Won / Lost</th>
                  <th className="money">Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((h) => {
                  const s = metrics(
                    data.opportunities.filter((d) => d.hotelId === h.id),
                    month,
                  );
                  return (
                    <tr key={h.id}>
                      <td>{h.name}</td>
                      <td>
                        {s.won} / {s.lost}
                      </td>
                      <td className="money">{compactCurrency(s.confirmed)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            Conversion = Won ÷ (Won + Lost). Kontrak rate tanpa komitmen kamar tidak dihitung dalam
            confirmed.
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Sumber lead</h2>
            <small>Seluruh data yang dimuat</small>
          </div>
          {SOURCES.map((source) => {
            const rows = data.opportunities.filter((o) => o.source === source);
            return rows.length ? (
              <div className="list-row" key={source}>
                <span>{source}</span>
                <small>
                  {rows.length} peluang · pipeline{" "}
                  {compactCurrency(
                    rows
                      .filter((r) => !["Won", "Lost"].includes(r.stage))
                      .reduce((n, d) => n + businessValue(d), 0),
                  )}
                </small>
              </div>
            ) : null;
          })}
          {!data.opportunities.length && <Empty>Belum ada data untuk laporan.</Empty>}
        </section>
      </>
    );
  }
  if (view === "users") {
    if (!data.actor.admin) return readOnly;
    const u = data.users.find((u) => u.id === id);
    if (action === "new" || action === "edit") {
      if (action === "edit" && (!u || u.admin)) return readOnly;
      return (
        <>
          {back}
          <Heading
            title={u ? "Atur akses user" : "User baru"}
            sub="Login menggunakan email Google yang didaftarkan"
          />
          <RecordForm
            submissionId={submissionId}
            kind="user"
            id={u?.id}
            version={u?.version}
            cancel={href(view)}
            label="Simpan akses"
          >
            <div className="fields">
              <Field label="Nama *" name="name" value={u?.name} required />
              <Field
                label="Email Google *"
                name="email"
                value={u?.email}
                type="email"
                required
                readOnly={!!u}
              />
            </div>
            <fieldset className="access-fieldset">
              <legend>Akses hotel dan peran</legend>
              {data.hotels
                .filter((h) => h.active)
                .map((h) => (
                  <div className="access-row" key={h.id}>
                    <label className="check">
                      <input
                        type="checkbox"
                        name="hotelIds"
                        value={h.id}
                        defaultChecked={!!u?.hotelAccess[h.id]}
                      />
                      {h.name}
                    </label>
                    <label className="field">
                      <span>Peran</span>
                      <select name={`role-${h.id}`} defaultValue={u?.hotelAccess[h.id] || "sales"}>
                        <option value="sales">Sales Executive</option>
                        <option value="manager">Sales Manager</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </label>
                  </div>
                ))}
            </fieldset>
            <label className="check">
              <input type="checkbox" name="active" defaultChecked={u?.active ?? true} />
              Akun aktif
            </label>
            <p className="muted">
              Tidak mengirim undangan atau email secara otomatis. Akun yang nonaktif tidak dapat
              mengakses workspace.
            </p>
          </RecordForm>
        </>
      );
    }
    return (
      <>
        <Heading
          title="Pengguna"
          sub="Satu user, beberapa hotel, peran berbeda"
          action={<NewLink view={view} label="User baru" />}
        />
        <section className="panel">
          {data.users.map((u) => (
            <div className="list-row" key={u.id}>
              <div className="row-main">
                <strong>{u.name}</strong>
                <small>
                  {u.email} · {u.active ? "Aktif" : "Nonaktif"}
                </small>
                <small>
                  {u.admin
                    ? "Group Admin · Seluruh hotel"
                    : Object.entries(u.hotelAccess)
                        .map(([h, r]) => hotel(h) + ": " + roleLabel(r))
                        .join(" · ")}
                </small>
              </div>
              {u.admin ? (
                <Badge stage="Admin" />
              ) : (
                <Link className="button" href={href(view, { action: "edit", id: u.id })}>
                  Atur akses
                </Link>
              )}
            </div>
          ))}
        </section>
      </>
    );
  }
  if (view === "settings") {
    const h = data.hotels.find((h) => h.id === id);
    if (action === "new" || action === "edit") {
      if (!data.actor.admin || (action === "edit" && !h)) return readOnly;
      return (
        <>
          {back}
          <Heading title={h ? "Edit hotel" : "Hotel baru"} />
          <RecordForm
            submissionId={submissionId}
            kind="hotel"
            id={h?.id}
            version={h?.version}
            cancel={href(view)}
          >
            <div className="fields">
              <Field label="Nama hotel *" name="name" value={h?.name} required />
              <Field label="Kota *" name="city" value={h?.city} required />
              <Choice
                label="Zona waktu"
                name="timezone"
                values={["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]}
                value={h?.timezone || "Asia/Jakarta"}
              />
            </div>
            <label className="check">
              <input name="active" type="checkbox" defaultChecked={h?.active ?? true} />
              Hotel aktif
            </label>
          </RecordForm>
        </>
      );
    }
    return (
      <>
        <Heading
          title="Pengaturan"
          sub="Hotel dalam grup"
          action={data.actor.admin ? <NewLink view={view} label="Hotel baru" /> : undefined}
        />
        <section className="panel">
          {data.hotels.map((h) => (
            <div className="list-row" key={h.id}>
              <Building2 size={19} aria-hidden />
              <div className="row-main">
                <strong>{h.name}</strong>
                <small>
                  {h.city} · {h.timezone} · IDR · {h.active ? "Aktif" : "Nonaktif"}
                </small>
              </div>
              {data.actor.admin && (
                <Link className="button" href={href(view, { id: h.id, action: "edit" })}>
                  Edit
                </Link>
              )}
            </div>
          ))}
          {!data.hotels.length && <Empty>Tambahkan hotel pertama untuk mulai bekerja.</Empty>}
        </section>
        <div className="callout">
          Semua hotel menggunakan IDR.
          <small>
            Hotel yang dinonaktifkan tidak menerima perubahan data baru. Riwayat tetap tersimpan.
          </small>
        </div>
      </>
    );
  }
  if (view === "account")
    return (
      <>
        <Heading title="Akun saya" />
        <section className="panel pad">
          <div className="profile">
            <span className="avatar">{data.actor.name[0]}</span>
            <span>
              <h2>{data.actor.name}</h2>
              <small>{data.actor.email}</small>
            </span>
          </div>
          <form action={setHotelScope} className="fields">
            <label className="field">
              Tampilkan data dari
              <select name="scope" defaultValue={data.scope}>
                <option value="all">Semua hotel yang diizinkan</option>
                {data.hotels
                  .filter((h) => h.active)
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
              </select>
            </label>
            <div
              className="form-actions"
              style={{ margin: 0, justifyContent: "start", alignItems: "end" }}
            >
              <button className="button primary">Terapkan</button>
            </div>
          </form>
          <p className="muted">Pilihan hotel disimpan di sini agar halaman kerja tetap ringkas.</p>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Hak akses hotel</h2>
          </div>
          {data.hotels.map((h) => (
            <div className="list-row" key={h.id}>
              <span>{h.name}</span>
              <Badge
                stage={data.actor.admin ? "Group Admin" : roleLabel(data.actor.hotelAccess[h.id])}
              />
            </div>
          ))}
        </section>
        <form action={logout}>
          <button className="button">{data.demo ? "Ganti akun / keluar demo" : "Keluar"}</button>
        </form>
        {data.demo && (
          <p className="muted" style={{ marginTop: 15 }}>
            Demo berjalan di komputer ini; data belum tersambung ke Firebase.
          </p>
        )}
      </>
    );
  return (
    <>
      <Heading title="Lainnya" />
      <div className="menu-grid">
        {NAV_ITEMS.filter(
          (n) =>
            ["reports", "settings", "account"].includes(n.id) ||
            (n.id === "users" && data.actor.admin),
        ).map(({ id, label, icon: Icon }) => (
          <Link key={id} className="menu-tile" href={href(id)}>
            <Icon size={21} aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </>
  );
}
