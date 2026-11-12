"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plus,
  Search,
  Download,
  FileText,
  Pencil,
  Trash2,
  ArrowUpRight,
  ImageIcon,
  RefreshCw,
  X,
  Send,
} from "lucide-react";
import { api } from "@/lib/client";
import { resources, type Field, type Resource } from "@/lib/resources";
import {
  counties,
  money,
  dateTime,
  type RecordRow,
  type Role,
  chatKey,
} from "@/lib/domain";
import { useUser } from "./workspace-shell";
function message(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}
function decode(value: unknown) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}
function Photo({ url, alt }: { url: unknown; alt: string }) {
  return typeof url === "string" && url.startsWith("/api/files/") ? (
    <Image
      src={url}
      alt={alt}
      width={64}
      height={64}
      unoptimized
      className="record-photo"
    />
  ) : (
    <span className="image-placeholder" aria-label="No image">
      <ImageIcon size={20} />
    </span>
  );
}
function Feedback({ error, notice }: { error: string; notice: string }) {
  return (
    <>
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="feedback success" role="status">
          {notice}
        </p>
      )}
    </>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="form-dialog"
      onCancel={onClose}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function SectionTitle({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="workspace-section-head">
      <div>
        <span className="eyebrow">NAROK COUNTY · YOUR WORKSPACE</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function WorkspaceScreen({ section }: { section: string }) {
  if (section === "overview") return <Overview />;
  if (section === "account") return <Account />;
  if (section === "accounts") return <Accounts />;
  if (section === "messages") return <Messages />;
  return <Records key={section} section={section} />;
}
function Overview() {
  const user = useUser();
  const [data, setData] = useState<{
    counts: Record<string, number>;
    news: RecordRow[];
  } | null>(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      setData(await api("overview"));
      setError("");
    } catch (e) {
      setError(message(e));
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  return (
    <>
      <SectionTitle
        title={`Welcome back, ${user.name}.`}
        description={
          user.role === "farmer"
            ? "Your produce, your records, and the people supporting your next season."
            : "A clear view of the people and activity behind Narok’s farming community."
        }
      />
      <Feedback error={error} notice="" />
      {error && (
        <button className="button button-outline" onClick={refresh}>
          Try again
        </button>
      )}
      <div className="metric-strip">
        {data ? (
          Object.entries(data.counts).map(([label, value]) => (
            <div className="metric" key={label}>
              <span className="metric-label">
                {
                  {
                    farmers: "Registered farmers",
                    demand: "Open produce demands",
                    stations: "Pickup stations",
                    inputs: "Available farm inputs",
                    news: "County updates",
                  }[label]
                }
              </span>
              <strong>{value}</strong>
            </div>
          ))
        ) : (
          <p className="loading-state" role="status">
            Loading your overview…
          </p>
        )}
      </div>
      <div className="quick-actions">
        {user.role === "farmer" ? (
          <>
            <Link href="/workspace/demand">
              Find produce opportunities <ArrowUpRight size={17} />
            </Link>
            <Link href="/workspace/messages">
              Talk to an agronomist <ArrowUpRight size={17} />
            </Link>
          </>
        ) : user.role === "agronomist" ? (
          <>
            <Link href="/workspace/messages">
              Farmer conversations <ArrowUpRight size={17} />
            </Link>
            <Link href="/workspace/news">
              Share a county update <ArrowUpRight size={17} />
            </Link>
          </>
        ) : (
          <>
            <Link href="/workspace/farmers">
              Review farmer accounts <ArrowUpRight size={17} />
            </Link>
            <Link href="/workspace/supplies">
              Review produce supplies <ArrowUpRight size={17} />
            </Link>
          </>
        )}
      </div>
      <div className="activity-heading">
        <h2>From the county</h2>
        <span>Community updates</span>
      </div>
      {data?.news.length
        ? data.news.map((item) => (
            <article className="news-entry" key={Number(item.id)}>
              <div>
                <span className="tag">{decode(item.county)}</span>
                <time>{dateTime(item.time)}</time>
              </div>
              <p>{decode(item.message)}</p>
              <small>{decode(item.source)}</small>
            </article>
          ))
        : data && (
            <div className="empty-state">
              <h3>No county updates yet.</h3>
              <p>Local news and practical information will appear here.</p>
            </div>
          )}
    </>
  );
}
function Records({ section }: { section: string }) {
  const user = useUser();
  const resource = resources[section];
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<RecordRow | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [confirm, setConfirm] = useState<{
    title: string;
    run: () => Promise<void>;
  } | null>(null);
  const [supply, setSupply] = useState<RecordRow | null>(null);
  const [payment, setPayment] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const all = (await api<{ rows: RecordRow[] }>(`data/${section}`)).rows;
      while (all.length && all.length % 500 === 0) {
        const more = (
          await api<{ rows: RecordRow[] }>(
            `data/${section}?after=${all.at(-1)?.id}`,
          )
        ).rows;
        if (!more.length) break;
        all.push(...more);
        if (more.length < 500) break;
      }
      setRecords(all);
      setSelected([]);
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, [section]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  if (!resource) return <p>Section not found.</p>;
  async function run(
    action: () => Promise<unknown>,
    success = "Changes saved.",
  ) {
    setBusy(true);
    setError("");
    try {
      await action();
      setNotice(success);
      setConfirm(null);
      await refresh();
    } catch (e) {
      setError(message(e));
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }
  const filtered = records.filter((row) =>
    resource.columns.some((column) =>
      decode(row[column.key]).toLowerCase().includes(search.toLowerCase()),
    ),
  );
  const shown = filtered.slice(page * 20, (page + 1) * 20);
  const canWrite = resource.write.includes(user.role);
  const canDelete = (resource.remove ?? resource.write).includes(user.role);
  const canSelect =
    (user.role === "admin" &&
      ["supplies", "sales", "purchases"].includes(section)) ||
    (user.role === "farmer" &&
      ["inputs", "products", "sales", "purchases"].includes(section));
  const showFarmer = user.role !== "farmer";
  const columns = resource.columns.filter(
    (c) => c.key !== "farmer_name" || showFarmer,
  );
  return (
    <>
      <SectionTitle title={resource.title} description={resource.description}>
        {canWrite && (
          <button className="button button-primary" onClick={() => setEdit({})}>
            <Plus size={16} />
            Add{" "}
            {section === "news"
              ? "update"
              : section === "agronomists"
                ? "agronomist"
                : "record"}
          </button>
        )}
      </SectionTitle>
      <Feedback error={error} notice={notice} />
      <div className="records-toolbar">
        <label className="search-box">
          <Search size={16} />
          <input
            aria-label={`Search ${resource.title}`}
            type="search"
            placeholder="Search these records…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <div className="toolbar-actions">
          <span className="records-count">{filtered.length} records</span>
          <button
            className="icon-button"
            onClick={refresh}
            aria-label="Refresh records"
          >
            <RefreshCw size={16} />
          </button>
          <a
            className="icon-button"
            href={`/api/report/${section}?format=csv`}
            aria-label="Download CSV"
          >
            <Download size={16} />
          </a>
          <a
            className="icon-button"
            href={`/api/report/${section}?format=pdf`}
            aria-label="Download PDF"
          >
            <FileText size={16} />
          </a>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="selection-bar">
          <span>{selected.length} selected</span>
          <button
            type="button"
            className="text-button"
            onClick={() => setSelected([])}
          >
            Clear
          </button>
          {user.role === "farmer" &&
          ["inputs", "products"].includes(section) ? (
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() =>
                setConfirm({
                  title:
                    "Record this order? Payment will be tracked separately.",
                  run: () =>
                    run(
                      () => api("orders", { kind: section, ids: selected }),
                      "Order recorded. See your purchase records for payment status.",
                    ),
                })
              }
            >
              Order selected
            </button>
          ) : (
            <button
              className="button button-primary"
              onClick={() => setPayment(true)}
            >
              {user.role === "admin"
                ? "Record settlement"
                : "Verify payment reference"}
            </button>
          )}
        </div>
      )}
      {loading ? (
        <div className="loading-state" role="status">
          Loading records…
        </div>
      ) : !filtered.length ? (
        <div className="empty-state">
          <h3>{search ? "No matching records." : "Nothing here yet."}</h3>
          <p>
            {search
              ? "Try a different name or clear your search."
              : "New records will appear here as your community gets to work."}
          </p>
          {error && (
            <button className="button button-outline" onClick={refresh}>
              Retry
            </button>
          )}
        </div>
      ) : (
        <>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={`${resource.title} records`}
          >
            <table>
              <thead>
                <tr>
                  {canSelect && (
                    <th>
                      <span className="sr-only">Select</span>
                    </th>
                  )}
                  {columns.map((c) => (
                    <th key={c.key} scope="col">
                      {c.label}
                    </th>
                  ))}
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={Number(row.id)}>
                    {canSelect && (
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select record ${row.id}`}
                          checked={selected.includes(Number(row.id))}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, Number(row.id)]
                                : selected.filter(
                                    (id) => id !== Number(row.id),
                                  ),
                            )
                          }
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key}>
                        {c.kind === "image" ? (
                          <Photo
                            url={row[c.key]}
                            alt={decode(row.name ?? row.product)}
                          />
                        ) : c.kind === "money" ? (
                          money(row[c.key])
                        ) : c.kind === "date" ? (
                          dateTime(row[c.key])
                        ) : c.kind === "status" ? (
                          <span
                            className={`status-badge ${Number(row[c.key]) > 0 ? "positive" : ""}`}
                          >
                            {c.key === "paid"
                              ? Number(row.paid) > 0
                                ? "Paid"
                                : "Unpaid"
                              : section === "farmers"
                                ? Number(row.status) === 1
                                  ? "Approved"
                                  : "Pending"
                                : section === "demand"
                                  ? Number(row.status) === 0
                                    ? "Open"
                                    : "Closed"
                                  : Number(row.status) === 1
                                    ? "Verified"
                                    : "Pending"}
                          </span>
                        ) : (
                          decode(row[c.key])
                        )}
                      </td>
                    ))}
                    <td>
                      <div className="row-actions">
                        {canWrite && (
                          <button
                            className="icon-button"
                            aria-label={`Edit record ${row.id}`}
                            onClick={() => setEdit(row)}
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="icon-button danger-button"
                            aria-label={`Delete record ${row.id}`}
                            onClick={() =>
                              setConfirm({
                                title:
                                  "Delete this record? This cannot be undone.",
                                run: () =>
                                  run(() =>
                                    api(`data/${section}`, {
                                      action: "delete",
                                      id: row.id,
                                    }),
                                  ),
                              })
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                        {user.role === "admin" &&
                          ["farmers", "demand"].includes(section) && (
                            <button
                              className="text-button"
                              onClick={() =>
                                setConfirm({
                                  title:
                                    section === "farmers"
                                      ? Number(row.status) === 0
                                        ? "Approve this farmer account?"
                                        : "Suspend this farmer account?"
                                      : Number(row.status) === 0
                                        ? "Close this produce demand?"
                                        : "Reopen this produce demand?",
                                  run: () =>
                                    run(() =>
                                      api(`data/${section}`, {
                                        action: "toggle",
                                        id: row.id,
                                        status:
                                          Number(row.status) === 0 ? 1 : 0,
                                      }),
                                    ),
                                })
                              }
                            >
                              {section === "farmers"
                                ? Number(row.status) === 0
                                  ? "Approve"
                                  : "Suspend"
                                : Number(row.status) === 0
                                  ? "Close"
                                  : "Reopen"}
                            </button>
                          )}
                        {section === "demand" && user.role === "farmer" && (
                          <button
                            className="text-button"
                            onClick={() => setSupply(row)}
                          >
                            Supply produce
                          </button>
                        )}
                        {section === "supplies" &&
                          Number(row.status) === 0 &&
                          (user.role === "admin" || user.role === "farmer") && (
                            <button
                              className="text-button"
                              onClick={() =>
                                setConfirm({
                                  title:
                                    user.role === "admin"
                                      ? "Verify this delivery?"
                                      : "Cancel this supply?",
                                  run: () =>
                                    run(() =>
                                      api("supplies", {
                                        id: row.id,
                                        action:
                                          user.role === "admin"
                                            ? "verify"
                                            : "cancel",
                                      }),
                                    ),
                                })
                              }
                            >
                              {user.role === "admin" ? "Verify" : "Cancel"}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>
              Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / 20))}
            </span>
            <button
              disabled={(page + 1) * 20 >= filtered.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
      {edit && (
        <RecordEditor
          resource={resource}
          initial={edit}
          onClose={() => setEdit(null)}
          onSave={async (data) => {
            await api(`data/${section}`, data);
            setEdit(null);
            setNotice("Changes saved.");
            await refresh();
          }}
        />
      )}
      {confirm && (
        <Modal title="Confirm action" onClose={() => setConfirm(null)}>
          <p>{confirm.title}</p>
          <div className="dialog-actions">
            <button
              className="button button-outline"
              onClick={() => setConfirm(null)}
            >
              Go back
            </button>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={confirm.run}
            >
              {busy ? "Saving…" : "Confirm"}
            </button>
          </div>
        </Modal>
      )}
      {supply && (
        <SupplyForm
          demand={supply}
          onClose={() => setSupply(null)}
          onSaved={async () => {
            setSupply(null);
            setNotice("Your supply has been submitted for verification.");
            await refresh();
          }}
        />
      )}
      {payment && (
        <PaymentForm
          kind={section}
          ids={selected}
          admin={user.role === "admin"}
          onClose={() => setPayment(false)}
          onSaved={async () => {
            setPayment(false);
            setNotice(
              "Payment recorded. No bank or mobile-money transfer was initiated.",
            );
            await refresh();
          }}
        />
      )}
    </>
  );
}
function Upload({
  id,
  initial = "",
  scope = "catalog",
  peerId,
  onChange,
  onBusy,
}: {
  id?: string;
  initial?: string;
  scope?: string;
  peerId?: number;
  onChange: (url: string) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const [url, setUrl] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    onBusy?.(true);
    setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("scope", scope);
      if (peerId) data.set("peerId", String(peerId));
      const result = await api<{ url: string }>("upload", data);
      setUrl(result.url);
      onChange(result.url);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <div className="upload-field">
      {url && <Photo url={url} alt="Uploaded image preview" />}
      <input
        id={id}
        aria-label="Upload image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <small>JPEG, PNG, or WebP · up to 3 MB</small>
      {busy && <p role="status">Uploading image…</p>}
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
function RecordEditor({
  resource,
  initial,
  onClose,
  onSave,
}: {
  resource: Resource;
  initial: RecordRow;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photo, setPhoto] = useState(String(initial.photo ?? ""));
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      await onSave({ ...data, photo, id: initial.id });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${initial.id ? "Edit" : "Add"} ${resource.title.toLowerCase()}`}
      onClose={onClose}
    >
      <Feedback error={error} notice="" />
      <form onSubmit={submit} className="record-editor">
        {resource.fields
          .filter((f) => f.type !== "password" || !initial.id)
          .map((field) => (
            <div className="editor-field" key={field.name}>
              <label htmlFor={`editor-${field.name}`}>{field.label}</label>
              {field.type === "image" ? (
                <Upload
                  id={`editor-${field.name}`}
                  initial={photo.startsWith("/api/") ? photo : ""}
                  onChange={setPhoto}
                  onBusy={setUploading}
                />
              ) : (
                <FieldControl field={field} value={initial[field.name]} />
              )}
            </div>
          ))}
        <div className="dialog-actions">
          <button
            className="button button-outline"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={busy || uploading}
          >
            {busy ? "Saving…" : "Save details"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function FieldControl({ field, value }: { field: Field; value: unknown }) {
  const props = {
    id: `editor-${field.name}`,
    name: field.name,
    required: field.required || field.type === "password",
    defaultValue: decode(value),
  };
  if (field.type === "textarea")
    return <textarea {...props} rows={4} maxLength={10000} />;
  if (field.type === "select")
    return (
      <select {...props}>
        <option value="">Select a sub-county</option>
        {field.options?.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    );
  return (
    <input
      {...props}
      type={
        field.type === "password"
          ? "password"
          : field.type === "number"
            ? "number"
            : "text"
      }
      min={field.type === "number" ? 0 : undefined}
      step={field.type === "number" ? "0.001" : undefined}
      minLength={field.type === "password" ? 12 : undefined}
      autoComplete={field.type === "password" ? "new-password" : undefined}
      maxLength={field.type === "password" ? 72 : 255}
    />
  );
}
function SupplyForm({
  demand,
  onClose,
  onSaved,
}: {
  demand: RecordRow;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [stations, setStations] = useState<RecordRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const user = useUser();
  useEffect(() => {
    api<{ rows: RecordRow[] }>("data/stations")
      .then((data) =>
        setStations(
          data.rows.filter(
            (r) =>
              String(r.county).toLowerCase() === user.location.toLowerCase(),
          ),
        ),
      )
      .catch((e) => setError(message(e)));
  }, [user.location]);
  return (
    <Modal title={`Supply ${decode(demand.product)}`} onClose={onClose}>
      <p>
        {money(demand.rate)} per {decode(demand.measure)} ·{" "}
        {decode(demand.maxsupply)} remaining
      </p>
      <Feedback error={error} notice="" />
      <form
        className="record-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("supplies", {
              ...Object.fromEntries(new FormData(e.currentTarget)),
              demandId: Number(demand.id),
            });
            await onSaved();
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Quantity ({decode(demand.measure)})
          <input
            name="quantity"
            type="number"
            min="0.001"
            step="0.001"
            max={Number(demand.maxsupply)}
            required
          />
        </label>
        <label>
          Pickup station
          <select name="stationId" required defaultValue="">
            <option value="">Select a station</option>
            {stations.map((s) => (
              <option key={Number(s.id)} value={Number(s.id)}>
                {decode(s.station)}
              </option>
            ))}
          </select>
        </label>
        {!stations.length && (
          <p className="form-hint">
            If no stations are available in your sub-county, contact the
            administrator.
          </p>
        )}
        <button
          className="button button-primary"
          disabled={busy || !stations.length}
        >
          {busy ? "Submitting…" : "Submit supply"}
        </button>
      </form>
    </Modal>
  );
}
function PaymentForm({
  kind,
  ids,
  admin,
  onClose,
  onSaved,
}: {
  kind: string;
  ids: number[];
  admin: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={admin ? "Record a settlement" : "Verify a payment"}
      onClose={onClose}
    >
      <p>
        {admin
          ? "Record an existing payment only after confirming the real transaction. This does not transfer money."
          : "Submit the transaction reference from your payment provider."}
      </p>
      <Feedback error={error} notice="" />
      <form
        className="record-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api(admin ? "payments" : "verify-payment", {
              ...Object.fromEntries(new FormData(e.currentTarget)),
              kind,
              ids,
            });
            await onSaved();
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Transaction reference
          <input name="reference" required minLength={5} maxLength={100} />
        </label>
        {admin && (
          <label>
            Payment method
            <select name="mode">
              <option>Cash</option>
              <option>Bank</option>
              <option>MPESA</option>
            </select>
          </label>
        )}
        <button className="button button-primary" disabled={busy}>
          {busy ? "Checking…" : admin ? "Record payment" : "Verify reference"}
        </button>
      </form>
    </Modal>
  );
}
function Account() {
  const user = useUser();
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState("");
  const [uploading, setUploading] = useState(false);
  const person = user.role === "farmer" || user.role === "agronomist";
  return (
    <>
      <SectionTitle
        title="My account"
        description="Keep your details current. Leave the new password blank to keep your existing password."
      />
      <Feedback error={error} notice={notice} />
      <form
        className="account-editor record-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const data = Object.fromEntries(new FormData(e.currentTarget));
            const result = await api<{ signedOut: boolean }>("account", {
              ...data,
              photo,
            });
            if (result.signedOut) {
              router.push("/login");
              router.refresh();
            } else {
              setNotice("Account updated.");
              router.refresh();
            }
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {person && (
          <label>
            Full name
            <input name="name" defaultValue={user.name} required />
          </label>
        )}
        {!person && <input type="hidden" name="name" value={user.name} />}
        <label>
          {person ? "Phone number" : "Username"}
          <input name="identifier" defaultValue={user.identifier} required />
        </label>
        {person ? (
          <label>
            Sub-county
            <select name="location" defaultValue={user.location}>
              {counties.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="location" value="" />
        )}
        {user.role === "agronomist" && (
          <label>
            Profile photo
            <Upload scope="profile" onChange={setPhoto} onBusy={setUploading} />
          </label>
        )}
        <fieldset>
          <legend>Change password</legend>
          <label>
            Current password
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
            />
          </label>
          <label>
            New password
            <input
              name="password"
              type="password"
              minLength={12}
              autoComplete="new-password"
            />
          </label>
          <small>
            At least 12 characters. Changing your password signs out all
            sessions.
          </small>
        </fieldset>
        <button className="button button-primary" disabled={busy || uploading}>
          {busy ? "Saving…" : "Save account details"}
        </button>
      </form>
    </>
  );
}
function Accounts() {
  const [accounts, setAccounts] = useState<RecordRow[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ rows: RecordRow[] }>("accounts")
      .then((d) => setAccounts(d.rows))
      .catch((e) => setError(message(e)));
  }, []);
  return (
    <>
      <SectionTitle
        title="Account recovery"
        description="Issue a private recovery link after verifying the account owner’s identity. Links expire in 30 minutes and work once."
      />
      <Feedback error={error} notice="" />
      <form
        className="record-editor account-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setResult("");
          try {
            const value = String(new FormData(e.currentTarget).get("account"));
            const [role, id] = value.split(":");
            const response = await api<{ path: string }>("recovery", {
              role: role as Role,
              id: Number(id),
            });
            setResult(window.location.origin + response.path);
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Account
          <select name="account" required defaultValue="">
            <option value="">Choose an account</option>
            {accounts.map((account) => (
              <option
                key={`${account.role}:${account.id}`}
                value={`${account.role}:${account.id}`}
              >
                {decode(account.name)} · {account.role} · {account.identifier}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-primary" disabled={busy}>
          {busy ? "Creating…" : "Create private recovery link"}
        </button>
      </form>
      {result && (
        <div className="recovery-result">
          <label htmlFor="recovery-link">Private recovery link</label>
          <input
            id="recovery-link"
            value={result}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
          />
          <p>
            Copy this link and share it privately with the verified account
            owner. Generating another link replaces it.
          </p>
        </div>
      )}
    </>
  );
}
function Messages() {
  const user = useUser();
  const [people, setPeople] = useState<RecordRow[]>([]);
  const [peer, setPeer] = useState<number | null>(null);
  const [chat, setChat] = useState<RecordRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState("");
  const [uploading, setUploading] = useState(false);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    api<{ rows: RecordRow[] }>("contacts")
      .then((d) => setPeople(d.rows))
      .catch((e) => setError(message(e)));
  }, []);
  const refresh = useCallback(async () => {
    if (!peer) return;
    try {
      const data = await api<{ rows: RecordRow[] }>(`messages?peer=${peer}`);
      setChat(data.rows);
    } catch (e) {
      setError(message(e));
    }
  }, [peer]);
  useEffect(() => {
    const first = setTimeout(() => {
      void refresh();
    }, 0);
    const timer = setInterval(refresh, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [chat.length]);
  return (
    <>
      <SectionTitle
        title="Conversations"
        description="Practical advice and local knowledge, one conversation at a time."
      />
      <Feedback error={error} notice="" />
      <div className="messaging-layout">
        <aside className="contact-list" aria-label="Contacts">
          <h2>
            {user.role === "farmer" ? "Your agronomists" : "Your farmers"}
          </h2>
          {people.length ? (
            people.map((person) => (
              <button
                key={Number(person.id)}
                aria-pressed={peer === Number(person.id)}
                className={peer === Number(person.id) ? "selected" : ""}
                onClick={() => {
                  setPeer(Number(person.id));
                  setPhoto("");
                  setText("");
                  setChat([]);
                  setError("");
                }}
              >
                <span className="user-avatar">
                  {String(person.name).slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <strong>{decode(person.name)}</strong>
                  <small>{decode(person.location)}</small>
                </span>
              </button>
            ))
          ) : (
            <p>
              No contacts in your sub-county yet. Contact the administrator for
              assistance.
            </p>
          )}
        </aside>
        <section className="conversation">
          {peer ? (
            <>
              <header>
                <h2>
                  {decode(people.find((p) => Number(p.id) === peer)?.name)}
                </h2>
                <span>Messages refresh every 5 seconds</span>
              </header>
              <div
                className="message-history"
                aria-label="Conversation history"
              >
                {chat.length ? (
                  chat.map((item) => (
                    <article
                      key={Number(item.id)}
                      className={`message-bubble ${item.sender === chatKey(user) ? "sent" : ""}`}
                    >
                      {item.type !== "text" && (
                        <Photo url={item.type} alt="Shared farm photo" />
                      )}
                      <p>{decode(item.message)}</p>
                      <footer>
                        <time>{dateTime(item.time)}</time>
                        {item.sender === chatKey(user) && (
                          <button
                            className="icon-button"
                            aria-label="Delete message"
                            onClick={async () => {
                              try {
                                await api("messages", {
                                  action: "delete",
                                  id: item.id,
                                });
                                await refresh();
                              } catch (e) {
                                setError(message(e));
                              }
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </footer>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <h3>Start a conversation.</h3>
                    <p>Share a question or an update from your farm.</p>
                  </div>
                )}
                <div ref={bottom} />
              </div>
              <form
                className="message-composer"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    await api("messages", {
                      peerId: peer,
                      message: text,
                      photo,
                    });
                    setText("");
                    setPhoto("");
                    await refresh();
                  } catch (e) {
                    setError(message(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label className="sr-only" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message…"
                  maxLength={10000}
                />
                <Upload
                  key={`${peer}-${photo ? "attached" : "empty"}`}
                  scope="chat"
                  peerId={peer}
                  initial={photo}
                  onChange={setPhoto}
                  onBusy={setUploading}
                />
                <button
                  className="button button-primary"
                  disabled={busy || uploading || (!text.trim() && !photo)}
                >
                  <Send size={16} />
                  {busy ? "Sending…" : "Send"}
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state">
              <h3>A conversation starts with a connection.</h3>
              <p>Choose a contact to see your messages.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
