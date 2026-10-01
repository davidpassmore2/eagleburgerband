"use client";

import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  ResourceAsset,
  ResourceAssetSchema,
  ResourceType,
  ResourceCategory,
  DEFAULT_RESOURCES,
} from "@/lib/schema/resource";
import { toast } from "@/lib/context/ToastContext";
import {
  X,
  Search,
  Plus,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Filter,
  Sparkles,
  Loader2,
  FolderOpen,
} from "lucide-react";

interface ResourceAssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: ResourceAsset) => void;
  filterType?: ResourceType | "all";
  filterCategory?: ResourceCategory | "all";
  title?: string;
  subtitle?: string;
}

export default function ResourceAssetPickerModal({
  isOpen,
  onClose,
  onSelectAsset,
  filterType = "all",
  filterCategory = "all",
  title = "Select Resource Asset",
  subtitle = "Choose from tracked images, headers, documents, and media resources.",
}: ResourceAssetPickerModalProps) {
  const [resources, setResources] = useState<ResourceAsset[]>(DEFAULT_RESOURCES);
  const [searchQuery, setSearchQuery] = useState("");
  const [userSelectedType, setUserSelectedType] = useState<string | null>(null);
  const [userSelectedCategory, setUserSelectedCategory] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Derive active filters from user selection or props
  const selectedType = userSelectedType ?? filterType;
  const selectedCategory = userSelectedCategory ?? filterCategory;

  // New Resource Form State
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ResourceType>("image");
  const [newCategory, setNewCategory] = useState<ResourceCategory>("header");
  const [newAltText, setNewAltText] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTags, setNewTags] = useState("");
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Firestore listener
  useEffect(() => {
    if (!isOpen) return;

    const unsub = onSnapshot(
      collection(db, "resources"),
      (snap) => {
        if (!snap.empty) {
          const list: ResourceAsset[] = [];
          snap.forEach((d) => {
            const parsed = ResourceAssetSchema.safeParse({ id: d.id, ...d.data() });
            if (parsed.success) {
              list.push(parsed.data);
            }
          });
          if (list.length > 0) {
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setResources(list);
          }
        }
      },
      (err) => console.warn("Resources listener error, using defaults:", err)
    );

    return () => unsub();
  }, [isOpen]);

  // Filtered list
  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      const matchesType = selectedType === "all" || res.type === selectedType;
      const matchesCat = selectedCategory === "all" || res.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        res.name.toLowerCase().includes(q) ||
        res.description.toLowerCase().includes(q) ||
        res.altText.toLowerCase().includes(q) ||
        res.tags.some((t) => t.toLowerCase().includes(q));

      return matchesType && matchesCat && matchesQuery;
    });
  }, [resources, selectedType, selectedCategory, searchQuery]);

  const handleCopyUrl = (e: React.MouseEvent, res: ResourceAsset) => {
    e.stopPropagation();
    navigator.clipboard.writeText(res.url);
    setCopiedId(res.id);
    toast.success(`Copied URL for "${res.name}"`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveNewResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim() || !newName.trim()) {
      toast.error("Please provide both asset name and a valid URL.");
      return;
    }

    setIsSavingNew(true);
    try {
      const parsedTags = newTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const generatedId = `res_${Date.now()}`;
      const payload: ResourceAsset = ResourceAssetSchema.parse({
        id: generatedId,
        name: newName.trim(),
        type: newType,
        category: newCategory,
        url: newUrl.trim(),
        altText: newAltText.trim() || newName.trim(),
        description: newDescription.trim(),
        tags: parsedTags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, "resources", generatedId), payload);
      toast.success(`Resource "${payload.name}" added to library!`);

      // Reset form and close new form accordion
      setNewUrl("");
      setNewName("");
      setNewAltText("");
      setNewDescription("");
      setNewTags("");
      setIsAddingNew(false);

      // Auto-select the newly created asset
      onSelectAsset(payload);
      onClose();
    } catch (err) {
      toast.error("Failed to add resource: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingNew(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold text-white tracking-wide">{title}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search, Filters & Add */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets by name, alt text, tag, or description..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-yellow-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Type Switcher */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              {(["all", "image", "document", "video"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setUserSelectedType(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition capitalize ${
                    selectedType === t
                      ? "bg-yellow-400 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t === "all" ? "All Types" : t + "s"}
                </button>
              ))}
            </div>

            {/* Add New Button Toggle */}
            <button
              type="button"
              onClick={() => setIsAddingNew((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                isAddingNew
                  ? "bg-slate-800 text-white border border-slate-700"
                  : "bg-yellow-400 hover:bg-yellow-300 text-slate-950"
              }`}
            >
              <Plus className={`w-3.5 h-3.5 transition-transform ${isAddingNew ? "rotate-45" : ""}`} />
              {isAddingNew ? "Cancel" : "Add by URL"}
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" /> Category:
            </span>
            {[
              { id: "all", label: "All" },
              { id: "header", label: "Headers" },
              { id: "hero", label: "Heros" },
              { id: "logo", label: "Logos" },
              { id: "gallery", label: "Gallery" },
              { id: "flyer", label: "Flyers" },
              { id: "document", label: "Documents" },
              { id: "press_kit", label: "Press Kit" },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setUserSelectedCategory(c.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition shrink-0 ${
                  selectedCategory === c.id
                    ? "bg-slate-800 text-yellow-400 border border-yellow-400/40 font-bold"
                    : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Inline Add New Asset Form */}
          {isAddingNew && (
            <form
              onSubmit={handleSaveNewResource}
              className="mt-2 p-4 bg-slate-950 border border-yellow-400/30 rounded-xl space-y-3 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Track New Resource by URL
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">Reference URL mode</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Resource Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Bloomfield Parade Hero 2026"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Resource URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or https://..."
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ResourceType)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="image">Image</option>
                    <option value="document">Document / PDF</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                    <option value="link">External Link</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ResourceCategory)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="header">Header Banner</option>
                    <option value="hero">Hero Background</option>
                    <option value="logo">Logo & Emblem</option>
                    <option value="gallery">Photo Gallery</option>
                    <option value="flyer">Flyer & Poster</option>
                    <option value="document">Document / Roster / Chart</option>
                    <option value="press_kit">Press Kit</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Alt Text (Accessibility)
                  </label>
                  <input
                    type="text"
                    value={newAltText}
                    onChange={(e) => setNewAltText(e.target.value)}
                    placeholder="Descriptive alt text for screen readers..."
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Where and how to use this asset..."
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="parade, brass, bloomfield"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNew}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition"
                >
                  {isSavingNew ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Save & Select Asset
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Assets Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-semibold text-sm">No resources found</p>
              <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                No tracked assets match your search or filter. You can add one by URL using the
                &quot;Add by URL&quot; button above.
              </p>
              {(searchQuery || selectedType !== "all" || selectedCategory !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setUserSelectedType("all");
                    setUserSelectedCategory("all");
                  }}
                  className="mt-4 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-bold rounded-xl transition"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredResources.map((res) => {
                const isCopied = copiedId === res.id;
                const isImage = res.type === "image";

                return (
                  <div
                    key={res.id}
                    onClick={() => {
                      onSelectAsset(res);
                      onClose();
                    }}
                    className="group relative bg-slate-950 border border-slate-800 hover:border-yellow-400/60 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:shadow-yellow-400/5 flex flex-col text-left"
                  >
                    {/* Visual Preview / Thumbnail */}
                    <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center border-b border-slate-800/80">
                      {isImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={res.url}
                          alt={res.altText || res.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                          <FileText className="w-8 h-8 text-yellow-400" />
                          <span className="text-[10px] font-mono uppercase tracking-wider">
                            {res.type}
                          </span>
                        </div>
                      )}

                      {/* Category Badge */}
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[10px] font-semibold text-yellow-400 rounded-md uppercase tracking-wider">
                        {res.category}
                      </span>

                      {/* Quick Action Overlay */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleCopyUrl(e, res)}
                          title="Copy URL"
                          className="p-1.5 bg-slate-950/90 hover:bg-yellow-400 hover:text-slate-950 text-slate-300 rounded-md border border-slate-800 transition"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Open URL in new tab"
                          className="p-1.5 bg-slate-950/90 hover:bg-slate-800 text-slate-300 rounded-md border border-slate-800 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-1">
                          {res.name}
                        </h4>
                        {res.description && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                            {res.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span className="truncate max-w-[150px]">{res.url.split("/").pop()}</span>
                        <span className="text-yellow-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          Select →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            Showing <strong className="text-white">{filteredResources.length}</strong> of{" "}
            {resources.length} tracked assets
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export { ResourceAssetPickerModal };
