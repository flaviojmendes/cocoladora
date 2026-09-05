import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheck,
  FaEdit,
  FaKey,
  FaSearch,
  FaSignOutAlt,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaTrash,
  FaUnlock,
} from "react-icons/fa";
import { translate } from "../../languages/translator";
import {
  formatMoneyAmount,
  inferSalaryFromSession,
  parseCurrencyAmount,
} from "../../utils/inferSalary";
import { AdminPixelDoor } from "../AdminPixelDoor";
import { Modal } from "../Modal";

const SECRET_KEY = "cocoladora_admin_secret";
const HOURS_KEY = "cocoladora_admin_hours_week";
const PAGE_SIZE = 40;
const DEFAULT_HOURS_PER_WEEK = 44;

type AdminLocation = {
  id: number;
  latitude: number;
  longitude: number;
  city: string;
  totalearned: string;
  timestarted: string;
  timeended: string;
  day: string;
  createdAt?: string;
};

type AdminPlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  cleanRating: number;
  facilitiesRating: number;
  privacyRating: number;
  notes: string[];
  createdAt?: string;
};

type AdminMessage = {
  id: string;
  message: string;
  fontColor: string;
  font: string;
  rotation: number;
  createdAt?: string;
};

type Tab = "locations" | "places" | "messages" | "pixels";
type SortDir = "asc" | "desc";
type SortState = { key: string; dir: SortDir };

const DEFAULT_SORT: Record<Tab, SortState> = {
  locations: { key: "id", dir: "desc" },
  places: { key: "name", dir: "asc" },
  messages: { key: "message", dir: "asc" },
  pixels: { key: "index", dir: "asc" },
};

async function adminRequest(secret: string, init: RequestInit & { path?: string } = {}) {
  const { path = "/api/admin", ...rest } = init;
  const res = await fetch(path, {
    cache: "no-store",
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": secret,
      ...(rest.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

function formatDuration(minutes: number): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function parseDayValue(day?: string): number {
  if (!day) return 0;
  const br = String(day).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  const iso = Date.parse(day);
  return Number.isNaN(iso) ? 0 : iso;
}

function parseTimeMinutes(time?: string): number {
  if (!time) return 0;
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function compareValues(a: string | number, b: string | number, dir: SortDir): number {
  const mul = dir === "asc" ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return 0;
    if (Number.isNaN(a)) return 1;
    if (Number.isNaN(b)) return -1;
    return (a - b) * mul;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }) * mul;
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? FaSort : sort.dir === "asc" ? FaSortUp : FaSortDown;
  return (
    <th className={`p-2 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 font-secondary font-semibold hover:text-primary ${
          active ? "text-primary" : "text-primary-dark"
        }`}
        aria-label={`${translate("adminSortBy")} ${label}`}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        <Icon className={`text-xs ${active ? "opacity-100" : "opacity-40"}`} />
      </button>
    </th>
  );
}

export function AdminPage() {
  const [secretInput, setSecretInput] = useState("");
  const [secret, setSecret] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [tab, setTab] = useState<Tab>("locations");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT.locations);
  const [hoursPerWeek, setHoursPerWeek] = useState(DEFAULT_HOURS_PER_WEEK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editingLocation, setEditingLocation] = useState<AdminLocation | null>(null);
  const [editingPlace, setEditingPlace] = useState<AdminPlace | null>(null);
  const [editingMessage, setEditingMessage] = useState<AdminMessage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SECRET_KEY);
      if (saved) setSecret(saved);
      const hours = Number(localStorage.getItem(HOURS_KEY));
      if (hours > 0) setHoursPerWeek(hours);
    } catch {}
  }, []);

  useEffect(() => {
    if (!secret) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await adminRequest(secret);
        if (cancelled) return;
        setLocations(data.locations || []);
        setPlaces(data.places || []);
        setMessages(data.messages || []);
      } catch (err: any) {
        if (cancelled) return;
        if (String(err.message).includes("Unauthorized")) {
          try {
            sessionStorage.removeItem(SECRET_KEY);
          } catch {}
          setSecret("");
          setLoginError(translate("adminUnauthorized"));
        } else {
          setError(err.message || translate("adminLoadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [secret]);

  useEffect(() => {
    setPage(0);
    setSelected(new Set());
    setQuery("");
    setSort(DEFAULT_SORT[tab]);
  }, [tab]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
      await adminRequest(secretInput.trim(), {
        method: "POST",
        body: JSON.stringify({ action: "login" }),
      });
      const trimmed = secretInput.trim();
      sessionStorage.setItem(SECRET_KEY, trimmed);
      setSecret(trimmed);
    } catch (err: any) {
      setLoginError(err.message || translate("adminUnauthorized"));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SECRET_KEY);
    setSecret("");
    setSecretInput("");
    setLocations([]);
    setPlaces([]);
    setMessages([]);
  };

  const flash = (msg: string) => {
    setError("");
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  };

  const handleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
    setPage(0);
  };

  const updateHoursPerWeek = (value: number) => {
    const next = value > 0 ? value : DEFAULT_HOURS_PER_WEEK;
    setHoursPerWeek(next);
    try {
      localStorage.setItem(HOURS_KEY, String(next));
    } catch {}
  };

  const filteredLocations = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = locations.map((item) => {
      const inferred = inferSalaryFromSession(item.totalearned, item.timestarted, item.timeended, hoursPerWeek);
      return { item, inferred };
    });
    const searched = q
      ? rows.filter(({ item, inferred }) => {
          const salaryText = inferred.valid ? formatMoneyAmount(inferred.monthlySalary, inferred.currency) : "";
          return [item.id, item.city, item.totalearned, item.day, item.timestarted, item.timeended, salaryText]
            .join(" ")
            .toLowerCase()
            .includes(q);
        })
      : rows;

    const sorted = [...searched].sort((a, b) => {
      switch (sort.key) {
        case "id":
          return compareValues(a.item.id, b.item.id, sort.dir);
        case "city":
          return compareValues(a.item.city || "", b.item.city || "", sort.dir);
        case "earned":
          return compareValues(parseCurrencyAmount(a.item.totalearned), parseCurrencyAmount(b.item.totalearned), sort.dir);
        case "day":
          return compareValues(parseDayValue(a.item.day), parseDayValue(b.item.day), sort.dir);
        case "start":
          return compareValues(parseTimeMinutes(a.item.timestarted), parseTimeMinutes(b.item.timestarted), sort.dir);
        case "end":
          return compareValues(parseTimeMinutes(a.item.timeended), parseTimeMinutes(b.item.timeended), sort.dir);
        case "duration":
          return compareValues(a.inferred.durationMinutes, b.inferred.durationMinutes, sort.dir);
        case "salary":
          return compareValues(
            a.inferred.valid ? a.inferred.monthlySalary : -1,
            b.inferred.valid ? b.inferred.monthlySalary : -1,
            sort.dir
          );
        case "coords":
          return compareValues(a.item.latitude, b.item.latitude, sort.dir) || compareValues(a.item.longitude, b.item.longitude, sort.dir);
        default:
          return 0;
      }
    });
    return sorted;
  }, [locations, query, sort, hoursPerWeek]);

  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = q
      ? places.filter((item) => [item.id, item.name, item.notes.join(" ")].join(" ").toLowerCase().includes(q))
      : places;
    return [...searched].sort((a, b) => {
      switch (sort.key) {
        case "name":
          return compareValues(a.name || "", b.name || "", sort.dir);
        case "ratings":
          return compareValues(
            (a.cleanRating + a.facilitiesRating + a.privacyRating) / 3,
            (b.cleanRating + b.facilitiesRating + b.privacyRating) / 3,
            sort.dir
          );
        case "coords":
          return compareValues(a.latitude, b.latitude, sort.dir) || compareValues(a.longitude, b.longitude, sort.dir);
        default:
          return 0;
      }
    });
  }, [places, query, sort]);

  const filteredMessages = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = q
      ? messages.filter((item) => [item.id, item.message].join(" ").toLowerCase().includes(q))
      : messages;
    return [...searched].sort((a, b) => {
      switch (sort.key) {
        case "message":
          return compareValues(a.message || "", b.message || "", sort.dir);
        case "color":
          return compareValues(a.fontColor || "", b.fontColor || "", sort.dir) || compareValues(a.rotation, b.rotation, sort.dir);
        default:
          return 0;
      }
    });
  }, [messages, query, sort]);

  const currentRows =
    tab === "locations"
      ? filteredLocations
      : tab === "places"
        ? filteredPlaces
        : tab === "messages"
          ? filteredMessages
          : [];
  const pageCount = Math.max(1, Math.ceil(currentRows.length / PAGE_SIZE));
  const paged = currentRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pageIds = paged.map((row) =>
    tab === "locations"
      ? String((row as { item: AdminLocation }).item.id)
      : String((row as AdminPlace | AdminMessage).id)
  );

  const toggleSelectPage = () => {
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const deleteIds = async (ids: string[]) => {
    if (ids.length === 0) return;
    const label =
      tab === "locations"
        ? translate("adminSessions")
        : tab === "places"
        ? translate("adminPlaces")
        : translate("adminMessages");
    if (!window.confirm(`${translate("adminConfirmDelete")} ${ids.length} ${label}?`)) return;

    try {
      const qs = new URLSearchParams({
        resource: tab,
        ids: ids.join(","),
      });
      await adminRequest(secret, {
        path: `/api/admin?${qs.toString()}`,
        method: "DELETE",
        body: JSON.stringify({ resource: tab, ids }),
      });
      if (tab === "locations") {
        setLocations((prev) => prev.filter((item) => !ids.includes(String(item.id))));
      } else if (tab === "places") {
        setPlaces((prev) => prev.filter((item) => !ids.includes(item.id)));
      } else {
        setMessages((prev) => prev.filter((item) => !ids.includes(item.id)));
      }
      setSelected(new Set());
      flash(translate("adminDeleted"));
    } catch (err: any) {
      setError(err.message || translate("adminSaveError"));
    }
  };

  const saveLocation = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;
    setSaving(true);
    try {
      const saved = await adminRequest(secret, {
        method: "PATCH",
        body: JSON.stringify({ resource: "locations", ...editingLocation }),
      });
      setLocations((prev) => prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));
      setEditingLocation(null);
      flash(translate("adminSaved"));
    } catch (err: any) {
      setError(err.message || translate("adminSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const savePlace = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPlace) return;
    setSaving(true);
    try {
      const saved = await adminRequest(secret, {
        method: "PATCH",
        body: JSON.stringify({ resource: "places", ...editingPlace }),
      });
      setPlaces((prev) => prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));
      setEditingPlace(null);
      flash(translate("adminSaved"));
    } catch (err: any) {
      setError(err.message || translate("adminSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const saveMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingMessage) return;
    setSaving(true);
    try {
      const saved = await adminRequest(secret, {
        method: "PATCH",
        body: JSON.stringify({ resource: "messages", ...editingMessage }),
      });
      setMessages((prev) => prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));
      setEditingMessage(null);
      flash(translate("adminSaved"));
    } catch (err: any) {
      setError(err.message || translate("adminSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const editingInferred = editingLocation
    ? inferSalaryFromSession(
        editingLocation.totalearned,
        editingLocation.timestarted,
        editingLocation.timeended,
        hoursPerWeek
      )
    : null;

  const inputClass =
    "w-full py-2 px-3 rounded-lg border-2 border-primary-dark font-secondary text-base text-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary";

  if (!secret) {
    return (
      <div className="min-h-screen bg-secondary-light flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md bg-background text-secondary rounded-2xl border-4 border-primary p-6 sm:p-8 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-2">
            <FaUnlock className="text-primary text-2xl" />
            <h1 className="font-primary text-3xl text-primary font-bold">{translate("adminTitle")}</h1>
          </div>
          <p className="font-secondary text-secondary-light mb-6">{translate("adminLoginHint")}</p>

          <label className="block font-secondary text-primary-dark font-semibold mb-1">
            {translate("adminSecretLabel")}
          </label>
          <div className="relative mb-4">
            <FaKey className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-dark/50" />
            <input
              type="password"
              autoComplete="current-password"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              className={`${inputClass} pl-10`}
              required
            />
          </div>

          {loginError && (
            <p className="mb-4 text-sm font-secondary text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-background font-primary text-2xl font-bold transition-colors disabled:opacity-60"
          >
            {isLoggingIn ? translate("adminChecking") : translate("adminEnter")}
          </button>

          <Link
            to="/"
            className="mt-4 flex items-center justify-center gap-2 font-secondary text-primary-dark hover:text-primary"
          >
            <FaArrowLeft /> {translate("adminBackHome")}
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-light text-background">
      <header className="sticky top-0 z-20 bg-secondary/95 border-b border-background/20 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-primary text-3xl text-background font-bold">{translate("adminTitle")}</h1>
            <p className="font-secondary text-sm text-background/70">
              {locations.length} {translate("adminSessions")} · {places.length} {translate("adminPlaces")} · {messages.length} {translate("adminMessages")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="px-3 py-2 rounded-lg border border-background/20 font-secondary text-sm hover:bg-background/10 flex items-center gap-2"
            >
              <FaArrowLeft /> {translate("adminBackHome")}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg bg-primary text-background font-secondary text-sm flex items-center gap-2"
            >
              <FaSignOutAlt /> {translate("adminLogout")}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-background text-secondary rounded-2xl border-4 border-primary p-4 sm:p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
            <div className="flex flex-wrap bg-background-dark rounded-xl border-2 border-primary/20 p-1">
              {(["locations", "places", "messages", "pixels"] as Tab[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`px-3 py-2 rounded-lg font-secondary text-sm sm:text-base ${
                    tab === item ? "bg-primary text-background font-bold" : "text-secondary hover:text-primary"
                  }`}
                >
                  {item === "locations"
                    ? translate("adminSessions")
                    : item === "places"
                    ? translate("adminPlaces")
                    : item === "messages"
                    ? translate("adminMessages")
                    : translate("adminDoor")}
                </button>
              ))}
            </div>

            {tab !== "pixels" && (
              <>
                <div className="relative flex-1">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-dark/50" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(0);
                    }}
                    placeholder={translate("adminSearch")}
                    className={`${inputClass} pl-10`}
                  />
                </div>

                {tab === "locations" && (
                  <label className="flex items-center gap-2 font-secondary text-sm text-primary-dark whitespace-nowrap">
                    {translate("adminHoursWeek")}
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={hoursPerWeek}
                      onChange={(e) => updateHoursPerWeek(parseFloat(e.target.value))}
                      className="w-16 py-2 px-2 rounded-lg border-2 border-primary-dark font-secondary text-base text-secondary bg-white text-center focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>
                )}

                <button
                  type="button"
                  disabled={selected.size === 0}
                  onClick={() => deleteIds([...selected])}
                  className="px-4 py-2 rounded-lg bg-red-700 text-white font-secondary disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <FaTrash /> {translate("adminDeleteSelected")} ({selected.size})
                </button>
              </>
            )}
          </div>

          {tab === "locations" && (
            <p className="mb-3 font-secondary text-xs text-secondary-light">{translate("adminSalaryHint")}</p>
          )}

          {notice && (
            <p className="mb-3 font-secondary text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <FaCheck /> {notice}
            </p>
          )}
          {error && (
            <p className="mb-3 font-secondary text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {loading && tab !== "pixels" && (
            <p className="mb-3 font-secondary text-secondary-light">{translate("adminLoading")}</p>
          )}

          {tab === "pixels" && (
            <AdminPixelDoor secret={secret} onNotice={flash} onError={setError} />
          )}

          {tab !== "pixels" && (
          <div className="overflow-x-auto rounded-xl border border-primary/20">
            {tab === "locations" && (
              <table className="w-full text-sm font-secondary min-w-[980px]">
                <thead className="bg-background-dark text-primary-dark">
                  <tr>
                    <th className="p-2 w-10">
                      <input
                        type="checkbox"
                        onChange={toggleSelectPage}
                        checked={pageIds.length > 0 && pageIds.every((id) => selected.has(id))}
                      />
                    </th>
                    <SortHeader label="ID" sortKey="id" sort={sort} onSort={handleSort} />
                    <SortHeader label={translate("adminCity")} sortKey="city" sort={sort} onSort={handleSort} />
                    <SortHeader label={translate("adminEarned")} sortKey="earned" sort={sort} onSort={handleSort} />
                    <SortHeader label={translate("adminDay")} sortKey="day" sort={sort} onSort={handleSort} />
                    <SortHeader label={translate("start")} sortKey="start" sort={sort} onSort={handleSort} />
                    <SortHeader label={translate("end")} sortKey="end" sort={sort} onSort={handleSort} />
                    <SortHeader label={translate("adminDuration")} sortKey="duration" sort={sort} onSort={handleSort} />
                    <SortHeader label={translate("adminEstSalary")} sortKey="salary" sort={sort} onSort={handleSort} />
                    <SortHeader label={translate("adminCoords")} sortKey="coords" sort={sort} onSort={handleSort} />
                    <th className="p-2 text-right">{translate("adminActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(paged as { item: AdminLocation; inferred: ReturnType<typeof inferSalaryFromSession> }[]).map(
                    ({ item, inferred }) => (
                      <tr key={item.id} className="border-t border-primary/10 hover:bg-amber-50/50">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={selected.has(String(item.id))}
                            onChange={() => toggleSelect(String(item.id))}
                          />
                        </td>
                        <td className="p-2 font-typewriter">{item.id}</td>
                        <td className="p-2">{item.city || "—"}</td>
                        <td className="p-2 font-bold text-primary">{item.totalearned}</td>
                        <td className="p-2 whitespace-nowrap">{item.day || "—"}</td>
                        <td className="p-2 font-typewriter">{item.timestarted || "—"}</td>
                        <td className="p-2 font-typewriter">{item.timeended || "—"}</td>
                        <td className="p-2 whitespace-nowrap">{formatDuration(inferred.durationMinutes)}</td>
                        <td className="p-2 whitespace-nowrap">
                          {inferred.valid ? (
                            <span title={`${translate("adminEstHourly")}: ${formatMoneyAmount(inferred.hourlyRate, inferred.currency)}`}>
                              {formatMoneyAmount(inferred.monthlySalary, inferred.currency)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-2 font-typewriter text-xs">
                          {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            className="text-primary px-2"
                            onClick={() => setEditingLocation({ ...item })}
                            aria-label={translate("adminEdit")}
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            className="text-red-700 px-2"
                            onClick={() => deleteIds([String(item.id)])}
                            aria-label={translate("adminDelete")}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}

            {tab === "places" && (
              <table className="w-full text-sm font-secondary min-w-[720px]">
                <thead className="bg-background-dark text-primary-dark">
                  <tr>
                    <th className="p-2 w-10">
                      <input
                        type="checkbox"
                        onChange={toggleSelectPage}
                        checked={pageIds.length > 0 && pageIds.every((id) => selected.has(id))}
                      />
                    </th>
                    <SortHeader label={translate("adminName")} sortKey="name" sort={sort} onSort={handleSort} />
                    <SortHeader label={translate("adminRatings")} sortKey="ratings" sort={sort} onSort={handleSort} />
                    <SortHeader label={translate("adminCoords")} sortKey="coords" sort={sort} onSort={handleSort} />
                    <th className="p-2 text-right">{translate("adminActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(paged as AdminPlace[]).map((item) => (
                    <tr key={item.id} className="border-t border-primary/10 hover:bg-amber-50/50">
                      <td className="p-2">
                        <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                      </td>
                      <td className="p-2">
                        <div className="font-bold text-primary-dark">{item.name}</div>
                        <div className="text-xs text-secondary-light truncate max-w-xs">{item.notes.join(" · ")}</div>
                      </td>
                      <td className="p-2">
                        {item.cleanRating}/{item.facilitiesRating}/{item.privacyRating}
                      </td>
                      <td className="p-2 font-typewriter text-xs">
                        {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="text-primary px-2"
                          onClick={() => setEditingPlace({ ...item, notes: [...item.notes] })}
                        >
                          <FaEdit />
                        </button>
                        <button type="button" className="text-red-700 px-2" onClick={() => deleteIds([item.id])}>
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "messages" && (
              <table className="w-full text-sm font-secondary min-w-[640px]">
                <thead className="bg-background-dark text-primary-dark">
                  <tr>
                    <th className="p-2 w-10">
                      <input
                        type="checkbox"
                        onChange={toggleSelectPage}
                        checked={pageIds.length > 0 && pageIds.every((id) => selected.has(id))}
                      />
                    </th>
                    <SortHeader label={translate("adminMessage")} sortKey="message" sort={sort} onSort={handleSort} />
                    <SortHeader label={translate("adminColor")} sortKey="color" sort={sort} onSort={handleSort} />
                    <th className="p-2 text-right">{translate("adminActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(paged as AdminMessage[]).map((item) => (
                    <tr key={item.id} className="border-t border-primary/10 hover:bg-amber-50/50">
                      <td className="p-2">
                        <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                      </td>
                      <td className="p-2 max-w-md">
                        <span style={{ color: item.fontColor, fontFamily: item.font }}>{item.message}</span>
                      </td>
                      <td className="p-2 font-typewriter text-xs">
                        {item.fontColor} · {item.rotation}°
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        <button type="button" className="text-primary px-2" onClick={() => setEditingMessage({ ...item })}>
                          <FaEdit />
                        </button>
                        <button type="button" className="text-red-700 px-2" onClick={() => deleteIds([item.id])}>
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          )}

          {tab !== "pixels" && currentRows.length === 0 && !loading && (
            <p className="py-8 text-center font-secondary text-secondary-light">{translate("adminEmpty")}</p>
          )}

          {tab !== "pixels" && pageCount > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 font-secondary">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-primary/30 disabled:opacity-40"
              >
                ←
              </button>
              <span>
                {page + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-primary/30 disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </div>
      </main>

      <Modal
        isOpen={!!editingLocation}
        onClose={() => setEditingLocation(null)}
        title={translate("adminEditSession")}
        maxWidth="max-w-lg"
      >
        {editingLocation && (
          <form onSubmit={saveLocation} className="flex flex-col gap-3">
            <label className="font-secondary text-sm">
              {translate("adminCity")}
              <input
                className={`${inputClass} mt-1`}
                value={editingLocation.city}
                onChange={(e) => setEditingLocation({ ...editingLocation, city: e.target.value })}
              />
            </label>
            <label className="font-secondary text-sm">
              {translate("adminEarned")}
              <input
                className={`${inputClass} mt-1`}
                value={editingLocation.totalearned}
                onChange={(e) => setEditingLocation({ ...editingLocation, totalearned: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="font-secondary text-sm">
                {translate("adminDay")}
                <input
                  className={`${inputClass} mt-1`}
                  value={editingLocation.day}
                  onChange={(e) => setEditingLocation({ ...editingLocation, day: e.target.value })}
                />
              </label>
              <label className="font-secondary text-sm">
                {translate("start")}
                <input
                  className={`${inputClass} mt-1`}
                  value={editingLocation.timestarted}
                  onChange={(e) => setEditingLocation({ ...editingLocation, timestarted: e.target.value })}
                />
              </label>
              <label className="font-secondary text-sm">
                {translate("end")}
                <input
                  className={`${inputClass} mt-1`}
                  value={editingLocation.timeended}
                  onChange={(e) => setEditingLocation({ ...editingLocation, timeended: e.target.value })}
                />
              </label>
            </div>
            {editingInferred && (
              <div className="rounded-xl border-2 border-primary/20 bg-background-dark px-3 py-2 font-secondary text-sm">
                <p className="text-secondary-light mb-2">{translate("adminSalaryPreview")}</p>
                <div className="flex justify-between gap-3">
                  <span className="text-secondary-light">{translate("adminDuration")}</span>
                  <span className="font-bold">{formatDuration(editingInferred.durationMinutes)}</span>
                </div>
                <div className="flex justify-between gap-3 mt-1">
                  <span className="text-secondary-light">{translate("adminEstHourly")}</span>
                  <span className="font-bold">
                    {editingInferred.valid
                      ? formatMoneyAmount(editingInferred.hourlyRate, editingInferred.currency)
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3 mt-1">
                  <span className="text-secondary-light">{translate("adminEstSalary")}</span>
                  <span className="font-bold text-primary">
                    {editingInferred.valid
                      ? formatMoneyAmount(editingInferred.monthlySalary, editingInferred.currency)
                      : "—"}
                  </span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <label className="font-secondary text-sm">
                Lat
                <input
                  type="number"
                  step="any"
                  className={`${inputClass} mt-1`}
                  value={editingLocation.latitude}
                  onChange={(e) => setEditingLocation({ ...editingLocation, latitude: parseFloat(e.target.value) })}
                />
              </label>
              <label className="font-secondary text-sm">
                Lng
                <input
                  type="number"
                  step="any"
                  className={`${inputClass} mt-1`}
                  value={editingLocation.longitude}
                  onChange={(e) => setEditingLocation({ ...editingLocation, longitude: parseFloat(e.target.value) })}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-2 py-2.5 rounded-xl bg-primary text-background font-primary text-xl font-bold"
            >
              {saving ? translate("adminSaving") : translate("adminSave")}
            </button>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!editingPlace}
        onClose={() => setEditingPlace(null)}
        title={translate("adminEditPlace")}
        maxWidth="max-w-lg"
      >
        {editingPlace && (
          <form onSubmit={savePlace} className="flex flex-col gap-3">
            <label className="font-secondary text-sm">
              {translate("adminName")}
              <input
                className={`${inputClass} mt-1`}
                value={editingPlace.name}
                onChange={(e) => setEditingPlace({ ...editingPlace, name: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="font-secondary text-sm">
                {translate("cleaness")}
                <input
                  type="number"
                  min={0}
                  max={5}
                  className={`${inputClass} mt-1`}
                  value={editingPlace.cleanRating}
                  onChange={(e) => setEditingPlace({ ...editingPlace, cleanRating: parseInt(e.target.value, 10) || 0 })}
                />
              </label>
              <label className="font-secondary text-sm">
                {translate("facilities")}
                <input
                  type="number"
                  min={0}
                  max={5}
                  className={`${inputClass} mt-1`}
                  value={editingPlace.facilitiesRating}
                  onChange={(e) =>
                    setEditingPlace({ ...editingPlace, facilitiesRating: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </label>
              <label className="font-secondary text-sm">
                {translate("privacy")}
                <input
                  type="number"
                  min={0}
                  max={5}
                  className={`${inputClass} mt-1`}
                  value={editingPlace.privacyRating}
                  onChange={(e) =>
                    setEditingPlace({ ...editingPlace, privacyRating: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="font-secondary text-sm">
                Lat
                <input
                  type="number"
                  step="any"
                  className={`${inputClass} mt-1`}
                  value={editingPlace.latitude}
                  onChange={(e) => setEditingPlace({ ...editingPlace, latitude: parseFloat(e.target.value) })}
                />
              </label>
              <label className="font-secondary text-sm">
                Lng
                <input
                  type="number"
                  step="any"
                  className={`${inputClass} mt-1`}
                  value={editingPlace.longitude}
                  onChange={(e) => setEditingPlace({ ...editingPlace, longitude: parseFloat(e.target.value) })}
                />
              </label>
            </div>
            <label className="font-secondary text-sm">
              {translate("commentsLabel")}
              <textarea
                rows={4}
                className={`${inputClass} mt-1`}
                value={editingPlace.notes.join("\n")}
                onChange={(e) => setEditingPlace({ ...editingPlace, notes: e.target.value.split("\n") })}
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="mt-2 py-2.5 rounded-xl bg-primary text-background font-primary text-xl font-bold"
            >
              {saving ? translate("adminSaving") : translate("adminSave")}
            </button>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!editingMessage}
        onClose={() => setEditingMessage(null)}
        title={translate("adminEditMessage")}
        maxWidth="max-w-lg"
      >
        {editingMessage && (
          <form onSubmit={saveMessage} className="flex flex-col gap-3">
            <label className="font-secondary text-sm">
              {translate("adminMessage")}
              <textarea
                rows={4}
                className={`${inputClass} mt-1`}
                value={editingMessage.message}
                onChange={(e) => setEditingMessage({ ...editingMessage, message: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="font-secondary text-sm">
                {translate("adminColor")}
                <input
                  type="color"
                  className={`${inputClass} mt-1 h-11`}
                  value={editingMessage.fontColor}
                  onChange={(e) => setEditingMessage({ ...editingMessage, fontColor: e.target.value })}
                />
              </label>
              <label className="font-secondary text-sm">
                {translate("adminRotation")}
                <input
                  type="number"
                  step="0.1"
                  className={`${inputClass} mt-1`}
                  value={editingMessage.rotation}
                  onChange={(e) => setEditingMessage({ ...editingMessage, rotation: parseFloat(e.target.value) || 0 })}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-2 py-2.5 rounded-xl bg-primary text-background font-primary text-xl font-bold"
            >
              {saving ? translate("adminSaving") : translate("adminSave")}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
