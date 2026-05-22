import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, MapPin, Trash2 } from "lucide-react";

interface SavedLocation {
  _id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number | null;
  createdAt: string;
  outdoor?: number;
  indoor?: number;
  report: {
    neighbourhood?: string;
    scores?: {
      population?: number;
      overall?: number;
      climateDisruptionScore?: number;
    };
    population?: {
      populationVulnerabilityScore?: number;
    };
  } | null;
}

export default function SavedLocationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/saved-locations", { credentials: "include" });
        if (res.status === 401) {
          navigate("/login");
          return;
        }
        if (!res.ok) {
          setError("Could not load saved locations.");
          return;
        }
        const data = await res.json();
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) setError("Network error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/saved-locations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Could not delete.");
        return;
      }
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch {
      setError("Network error.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#1a1a2e] text-white flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-10 pb-4">
        <button
          onClick={() => navigate("/account")}
          className="bg-[#2a2a3e] p-3 rounded-2xl"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold">Saved locations</h1>
      </div>

      <div className="px-4 flex-1 flex flex-col gap-3 pb-10">
        {error && <p className="text-red-300 text-sm">{error}</p>}
        {loading ? (
          <p className="text-white/60 text-sm">Loading…</p>
        ) : items.length === 0 ? (
          <div className="bg-[#2a2a3e] rounded-2xl p-6 text-center text-white/60">
            <p className="mb-3">No saved locations yet.</p>
            <button
              onClick={() => navigate("/map")}
              className="bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all text-white font-medium px-5 py-2 rounded-full text-sm"
            >
              Pick a location
            </button>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item._id}
              className="bg-[#2a2a3e] rounded-2xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="bg-[#1a1a2e] p-2 rounded-full mt-1">
                  <MapPin size={16} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{item.name}</p>
                  <p className="text-xs text-white/50 truncate">
                    {item.report?.neighbourhood ?? `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`}
                    {item.radius ? ` · ${item.radius} m` : ""}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    Saved {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item._id)}
                  disabled={deletingId === item._id}
                  aria-label="Delete saved location"
                  className="bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all p-2 rounded-xl text-red-300 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <button
                onClick={() => navigate(`/saved-locations/${item._id}`)}
                disabled={!item.report}
                className="w-full bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileText size={14} />
                View report
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
