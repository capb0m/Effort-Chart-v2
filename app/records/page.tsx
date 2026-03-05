"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Header } from "@/components/layout/Header";
import { RecordForm } from "@/components/records/RecordForm";
import { useToast } from "@/components/ui/Toast";
import { Pencil, Trash2 } from "lucide-react";
import { RecordWithCategory } from "@/types/database";

export default function RecordsPage() {
  const { user, loading, session } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [records, setRecords] = useState<RecordWithCategory[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const fetchRecords = () => {
    if (!session?.access_token) return;
    fetch("/api/records?limit=50", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => { setRecords(data); setLoadingRecords(false); })
      .catch(() => setLoadingRecords(false));
  };

  useEffect(() => { fetchRecords(); }, [session?.access_token]);

  const handleDelete = async (id: string) => {
    if (!confirm("この記録を削除しますか？")) return;
    const res = await fetch(`/api/records/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      toast("記録を削除しました", "success");
      fetchRecords();
    } else {
      toast("削除に失敗しました", "error");
    }
  };

  if (loading || !user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-20 lg:pb-0">
        <Header title="記録" />
        <div className="px-4 lg:px-8 py-6 space-y-6 max-w-4xl">
          <RecordForm onSaved={fetchRecords} />

          {/* Records List */}
          <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
              <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
                最近の記録
              </h2>
            </div>
            {loadingRecords ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-gray-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center text-gray-400 dark:text-white/30">
                <p className="text-4xl mb-3">📝</p>
                <p className="text-sm">記録がありません</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {records.map((r) => {
                  const start = new Date(r.start_time);
                  const end = new Date(r.end_time);
                  const hours = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1);
                  const cat = r.categories;
                  return (
                    <div key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat?.color ?? "#888" }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{cat?.name ?? "不明"}</div>
                        <div className="text-xs text-gray-400 dark:text-white/40">
                          {start.toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {" 〜 "}
                          {end.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <span className="text-sm font-mono text-gray-600 dark:text-white/70">{hours}h</span>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-gray-400 dark:text-white/30 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}
