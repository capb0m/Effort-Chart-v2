"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Header } from "@/components/layout/Header";
import { useToast } from "@/components/ui/Toast";
import { Pencil, Trash2, RotateCcw, Plus, X, Check } from "lucide-react";
import { Category } from "@/types/database";

const PRESET_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#06b6d4"];

export default function CategoriesPage() {
  const { user, loading, session } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const fetchCategories = () => {
    if (!session?.access_token) return;
    fetch("/api/categories", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error);
  };

  useEffect(() => { fetchCategories(); }, [session?.access_token]);

  const handleSubmit = async () => {
    if (!name.trim()) { toast("カテゴリー名を入力してください", "error"); return; }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/categories/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ name, color }),
        });
        if (res.ok) { toast("更新しました", "success"); fetchCategories(); resetForm(); }
      } else {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ name, color }),
        });
        if (res.ok) { toast("作成しました", "success"); fetchCategories(); resetForm(); }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    await fetch(`/api/categories/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    toast("アーカイブしました", "success");
    fetchCategories();
  };

  const handleRestore = async (id: string) => {
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ is_archived: false }),
    });
    toast("復元しました", "success");
    fetchCategories();
  };

  const resetForm = () => { setName(""); setColor(PRESET_COLORS[0]); setShowForm(false); setEditingId(null); };
  const startEdit = (cat: Category) => { setEditingId(cat.id); setName(cat.name); setColor(cat.color); setShowForm(true); };

  const active = categories.filter((c) => !c.is_archived);
  const archived = categories.filter((c) => c.is_archived);

  if (loading || !user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-20 lg:pb-0">
        <Header title="カテゴリー" />
        <div className="px-4 lg:px-8 py-6 space-y-6 max-w-3xl">

          {/* Form */}
          {showForm ? (
            <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
                  {editingId ? "カテゴリーを編集" : "新しいカテゴリー"}
                </h2>
                <button onClick={resetForm} className="text-gray-400 dark:text-white/30 hover:text-gray-600 transition"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="カテゴリー名"
                  className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
                />
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-white/60 mb-2 block">カラー</label>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                        style={{ backgroundColor: c, outline: color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={resetForm} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.06] text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition">キャンセル</button>
                  <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition disabled:opacity-50">
                    {saving ? "保存中..." : editingId ? "更新" : "作成"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center gap-2 justify-center py-3 rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/[0.1] text-gray-500 dark:text-white/40 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition text-sm"
            >
              <Plus className="w-4 h-4" />
              カテゴリーを追加
            </button>
          )}

          {/* Active categories */}
          <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
              <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
                カテゴリー ({active.length})
              </h2>
            </div>
            {active.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-white/30 text-sm">カテゴリーがありません</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {active.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 text-sm font-medium">{cat.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(cat)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-400 transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleArchive(cat.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Archived */}
          {archived.length > 0 && (
            <div>
              <button onClick={() => setShowArchived(!showArchived)} className="text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 transition mb-3">
                {showArchived ? "▲" : "▼"} アーカイブ済み ({archived.length})
              </button>
              {showArchived && (
                <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden opacity-60">
                  <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                    {archived.map((cat) => (
                      <div key={cat.id} className="flex items-center gap-4 px-6 py-4">
                        <div className="w-4 h-4 rounded-full flex-shrink-0 grayscale" style={{ backgroundColor: cat.color }} />
                        <span className="flex-1 text-sm text-gray-400 dark:text-white/40 line-through">{cat.name}</span>
                        <button onClick={() => handleRestore(cat.id)} className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 text-gray-400 hover:text-green-500 transition">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}
