"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageContent } from "@/lib/auth/permissions";
import {
  ResourceAsset,
  ResourceAssetSchema,
  ResourceType,
  ResourceCategory,
  StorageProvider,
  DEFAULT_RESOURCES,
} from "@/lib/schema/resource";
import { toast } from "@/lib/context/ToastContext";
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Edit,
  Trash2,
  LayoutTemplate,
  Loader2,
  Sparkles,
  ShieldAlert,
  X,
  Grid,
  List,
  Cloud,
  Settings,
  Link2,
} from "lucide-react";
import {
  openCloudinaryUploadWidget,
  isCloudinaryConfigured,
  formatBytes,
  CloudinaryUploadResultInfo,
} from "@/lib/cloudinary/widget";
import CloudinaryConfigModal from "@/components/cms/CloudinaryConfigModal";

export default function MediaResourcesStudioPage() {
  const { profile, loading: authLoading } = useAuth();
  const [resources, setResources] = useState<ResourceAsset[]>(DEFAULT_RESOURCES);
  const [loading, setLoading] = useState(true);

  // Filters & View State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "cloudinary">("cloudinary");
  const [isUploadingCloudinary, setIsUploadingCloudinary] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ResourceAsset | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    type: "image" as ResourceType,
    category: "header" as ResourceCategory,
    storageProvider: "external" as StorageProvider,
    cloudPublicId: "",
    fileSize: "",
    format: "",
    thumbnailUrl: "",
    dimensions: undefined as { width?: number; height?: number } | undefined,
    altText: "",
    description: "",
    tags: "",
  });

  // Firestore Listener
  useEffect(() => {
    if (authLoading) return;

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
        setLoading(false);
      },
      (err) => {
        console.warn("Resources listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  // Filtered Assets
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

  // Metrics
  const metrics = useMemo(() => {
    const images = resources.filter((r) => r.type === "image").length;
    const documents = resources.filter((r) => r.type === "document").length;
    const headers = resources.filter((r) => r.category === "header" || r.category === "hero").length;
    return { total: resources.length, images, documents, headers };
  }, [resources]);

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Resource URL copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTriggerCloudinaryUpload = async () => {
    if (!isCloudinaryConfigured()) {
      setIsConfigModalOpen(true);
      toast.info("Please configure Cloudinary credentials to enable direct uploads.");
      return;
    }

    try {
      setIsUploadingCloudinary(true);
      await openCloudinaryUploadWidget({
        onSuccess: (info: CloudinaryUploadResultInfo) => {
          const guessedType: ResourceType =
            info.resource_type === "video"
              ? "video"
              : info.resource_type === "raw" || (info.format && /pdf|doc|docx/i.test(info.format))
              ? "document"
              : "image";

          const readableSize = formatBytes(info.bytes);
          const rawName = info.original_filename || info.public_id.split("/").pop() || "Uploaded Asset";
          const cleanName = rawName.replace(/[-_]+/g, " ");

          setFormData({
            name: cleanName,
            url: info.secure_url,
            type: guessedType,
            category: "header",
            storageProvider: "cloudinary",
            cloudPublicId: info.public_id,
            fileSize: readableSize,
            format: info.format || "",
            thumbnailUrl: info.thumbnail_url || info.secure_url,
            dimensions: info.width && info.height ? { width: info.width, height: info.height } : undefined,
            altText: cleanName,
            description: "",
            tags: info.tags?.join(", ") || "",
          });
          setEditingAsset(null);
          setUploadMode("cloudinary");
          setIsModalOpen(true);
          toast.success("File uploaded to Cloudinary! Please verify metadata and save.");
        },
        onError: (err) => {
          toast.error("Upload error: " + (err instanceof Error ? err.message : String(err)));
        },
      });
    } catch (err) {
      toast.error("Failed to open upload widget: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUploadingCloudinary(false);
    }
  };

  const handleOpenAddModal = (mode: "url" | "cloudinary" = "url") => {
    setEditingAsset(null);
    setUploadMode(mode);
    setFormData({
      name: "",
      url: "",
      type: "image",
      category: "header",
      storageProvider: mode === "cloudinary" ? "cloudinary" : "external",
      cloudPublicId: "",
      fileSize: "",
      format: "",
      thumbnailUrl: "",
      dimensions: undefined,
      altText: "",
      description: "",
      tags: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset: ResourceAsset) => {
    setEditingAsset(asset);
    setUploadMode(asset.storageProvider === "cloudinary" ? "cloudinary" : "url");
    setFormData({
      name: asset.name,
      url: asset.url,
      type: asset.type,
      category: asset.category,
      storageProvider: asset.storageProvider || "external",
      cloudPublicId: asset.cloudPublicId || "",
      fileSize: asset.fileSize || "",
      format: asset.format || "",
      thumbnailUrl: asset.thumbnailUrl || "",
      dimensions: asset.dimensions,
      altText: asset.altText || "",
      description: asset.description || "",
      tags: asset.tags?.join(", ") || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteAsset = async (asset: ResourceAsset) => {
    if (!confirm(`Are you sure you want to remove "${asset.name}" from the resource catalog?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "resources", asset.id));
      setResources((prev) => prev.filter((r) => r.id !== asset.id));
      toast.success(`Resource "${asset.name}" deleted.`);
    } catch (err) {
      toast.error("Failed to delete resource: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) {
      toast.error("Resource name and URL are required.");
      return;
    }

    setIsSaving(true);
    try {
      const tagsArray = formData.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const id = editingAsset?.id || `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const assetPayload: ResourceAsset = ResourceAssetSchema.parse({
        id,
        name: formData.name.trim(),
        url: formData.url.trim(),
        type: formData.type,
        category: formData.category,
        storageProvider: formData.storageProvider || "external",
        cloudPublicId: formData.cloudPublicId || "",
        format: formData.format || "",
        fileSize: formData.fileSize || "",
        thumbnailUrl: formData.thumbnailUrl || "",
        dimensions: formData.dimensions,
        altText: formData.altText.trim() || formData.name.trim(),
        description: formData.description.trim(),
        tags: tagsArray,
        isPublic: true,
        uploadedBy: profile?.email || "admin",
        createdAt: editingAsset?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, "resources", id), assetPayload, { merge: true });

      setResources((prev) => {
        const index = prev.findIndex((r) => r.id === id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = assetPayload;
          return next;
        }
        return [assetPayload, ...prev];
      });

      toast.success(editingAsset ? `Updated "${formData.name}"` : `Created "${formData.name}"`);
      setIsModalOpen(false);
    } catch (err) {
      toast.error("Failed to save resource: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-400 gap-2 text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
        <span>Loading Media &amp; Resource Assets...</span>
      </div>
    );
  }

  if (!canManageContent(profile)) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Restricted</h2>
        <p className="text-xs text-slate-400">
          You must be an administrator or web manager to access the Media &amp; Resource Assets Library.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16" suppressHydrationWarning>
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider">
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Content Management Assets</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight font-arvo">
            Media &amp; Resource Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Track and organize image assets for hero banners, page headers, band logos, press documents, and promotional flyers. Referenced assets are instantly available across the CMS Page Studio.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/pages"
            className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <LayoutTemplate className="w-4 h-4 text-yellow-400" />
            <span>CMS Page Studio</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow"
            title="Cloudinary Upload Widget Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleTriggerCloudinaryUpload}
            disabled={isUploadingCloudinary}
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-sky-500/20"
          >
            {isUploadingCloudinary ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Cloud className="w-4 h-4" />
            )}
            <span>Upload via Cloudinary</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddModal("url")}
            className="px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-yellow-400/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add External URL</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Total Tracked</span>
          <div className="text-2xl font-black text-white">{metrics.total}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Images &amp; Visuals</span>
          <div className="text-2xl font-black text-yellow-400">{metrics.images}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Headers &amp; Heros</span>
          <div className="text-2xl font-black text-emerald-400">{metrics.headers}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Documents &amp; PDFs</span>
          <div className="text-2xl font-black text-blue-400">{metrics.documents}</div>
        </div>
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assets by title, description, or #tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(["all", "image", "document", "video"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                    selectedType === t
                      ? "bg-yellow-400 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t === "all" ? "All" : t + "s"}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === "grid" ? "bg-yellow-400 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === "table" ? "bg-yellow-400 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
                title="List / Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Category:
          </span>
          {[
            { id: "all", label: "All Categories" },
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
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                selectedCategory === c.id
                  ? "bg-yellow-400 text-slate-950 font-bold shadow"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Catalog View */}
      {filteredResources.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center space-y-4">
          <FolderOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Resource Assets Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query or category filters, or reference a new asset URL.
          </p>
          <button
            type="button"
            onClick={() => handleOpenAddModal("url")}
            className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Resource by URL</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredResources.map((asset) => {
            const isImg = asset.type === "image";
            const isDoc = asset.type === "document";

            return (
              <div
                key={asset.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow transition group"
              >
                {/* Visual Thumbnail */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                  {isImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.altText || asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : isDoc ? (
                    <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                      <FileText className="w-8 h-8 text-yellow-400" />
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-300">
                        {asset.mimeType || "PDF Document"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                      <Sparkles className="w-8 h-8 text-yellow-400" />
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-300">
                        {asset.type}
                      </span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-700 text-[10px] font-mono font-bold text-yellow-400 uppercase">
                    {asset.category}
                  </div>

                  <div className="absolute top-2 right-2">
                    {asset.storageProvider === "cloudinary" ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-sky-500/90 text-slate-950 text-[9px] font-mono font-black uppercase tracking-wider flex items-center gap-1 shadow">
                        <Cloud className="w-2.5 h-2.5" />
                        <span>Cloudinary</span>
                      </span>
                    ) : asset.storageProvider === "firebase" ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/90 text-slate-950 text-[9px] font-mono font-black uppercase tracking-wider shadow">
                        Firebase
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-slate-800 text-slate-400 text-[9px] font-mono font-bold uppercase tracking-wider">
                        External
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors truncate">
                    {asset.name}
                  </h3>
                  {asset.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {asset.description}
                    </p>
                  )}
                  {(asset.dimensions || asset.fileSize || asset.format) && (
                    <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5 pt-0.5">
                      {asset.dimensions && (
                        <span>{asset.dimensions.width}&times;{asset.dimensions.height}</span>
                      )}
                      {asset.format && (
                        <span>&bull; {asset.format.toUpperCase()}</span>
                      )}
                      {asset.fileSize && (
                        <span>&bull; {asset.fileSize}</span>
                      )}
                    </div>
                  )}
                  {asset.tags && asset.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      {asset.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(asset.url, asset.id)}
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-white font-medium hover:bg-slate-800 px-2 py-1 rounded-lg transition"
                    title="Copy resource URL"
                  >
                    {copiedId === asset.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Open full resource in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(asset)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-slate-800 transition"
                      title="Edit metadata"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAsset(asset)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      title="Delete asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Preview</th>
                  <th className="py-3 px-4">Name &amp; Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredResources.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="w-12 h-10 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                        {asset.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.thumbnailUrl || asset.url}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-5 h-5 text-yellow-400" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{asset.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{asset.description}</div>
                    </td>
                    <td className="py-3 px-4 font-mono uppercase text-[10px] text-yellow-400 font-bold">
                      {asset.category}
                    </td>
                    <td className="py-3 px-4">
                      {asset.storageProvider === "cloudinary" ? (
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-[10px] font-bold inline-flex items-center gap-1">
                          <Cloud className="w-2.5 h-2.5" />
                          <span>Cloudinary</span>
                        </span>
                      ) : asset.storageProvider === "firebase" ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[10px] font-bold">
                          Firebase
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800 font-mono text-[10px]">
                          External
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-300">{asset.type}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {asset.tags?.slice(0, 2).map((t, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800 text-[10px] font-mono"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(asset.url, asset.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Copy URL"
                        >
                          {copiedId === asset.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Open URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(asset)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-slate-800 transition"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAsset(asset)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Resource Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleSaveResource} className="space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase font-bold text-yellow-400">
                  {editingAsset ? "Edit Metadata" : "Add Resource"}
                </span>
                <h3 className="text-xl font-bold text-white font-arvo">
                  {editingAsset ? `Edit "${editingAsset.name}"` : "Track Resource Asset"}
                </h3>
                <p className="text-xs text-slate-400">
                  Upload directly via Cloudinary or link an external media URL.
                </p>
              </div>

              {/* Source Mode Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode("cloudinary");
                    setFormData((prev) => ({ ...prev, storageProvider: "cloudinary" }));
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    uploadMode === "cloudinary"
                      ? "bg-sky-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Upload via Cloudinary</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode("url");
                    setFormData((prev) => ({ ...prev, storageProvider: "external" }));
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    uploadMode === "url"
                      ? "bg-yellow-400 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Link External URL</span>
                </button>
              </div>

              <div className="space-y-3 pt-2">
                {/* Cloudinary Upload Box or URL Input */}
                {uploadMode === "cloudinary" ? (
                <div className="space-y-2 pt-1">
                  {formData.url ? (
                    <div className="p-3 bg-slate-950 border border-sky-500/30 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0 flex items-center justify-center">
                          {formData.type === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={formData.thumbnailUrl || formData.url}
                              alt={formData.name || "Preview"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="w-6 h-6 text-yellow-400" />
                          )}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            {formData.name || "Uploaded Asset"}
                          </span>
                          <span className="text-[10px] font-mono text-sky-400 block truncate">
                            {[formData.format ? formData.format.toUpperCase() : null, formData.fileSize, formData.dimensions ? `${formData.dimensions.width}x${formData.dimensions.height}` : null].filter(Boolean).join(" • ") || formData.url}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleTriggerCloudinaryUpload}
                        className="px-3 py-1.5 rounded-xl border border-sky-500/40 text-sky-400 hover:bg-sky-500/10 text-xs font-bold transition shrink-0"
                      >
                        Re-upload
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={handleTriggerCloudinaryUpload}
                      className="cursor-pointer border-2 border-dashed border-sky-500/30 hover:border-sky-400 bg-sky-500/5 hover:bg-sky-500/10 rounded-2xl p-6 text-center space-y-2 transition group"
                    >
                      <Cloud className="w-8 h-8 text-sky-400 mx-auto group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Click to Launch Cloudinary Upload Widget
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Drag &amp; drop files, browse local disk, or import from camera &amp; web
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Asset URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/... or https://domain.com/file.pdf"
                    value={formData.url}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        url: val,
                        type: val.match(/\.(pdf|doc|docx)$/i) ? "document" : prev.type,
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Asset Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Parades & Street Horns 2026"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, category: e.target.value as ResourceCategory }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="header">Header Banner</option>
                      <option value="hero">Hero Background</option>
                      <option value="logo">Band Logo / Crest</option>
                      <option value="gallery">Photo Gallery</option>
                      <option value="flyer">Flyer / Poster</option>
                      <option value="document">Document / PDF</option>
                      <option value="press_kit">Press Kit (EPK)</option>
                      <option value="general">General Asset</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Resource Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, type: e.target.value as ResourceType }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="image">Image</option>
                      <option value="document">Document (PDF/DOC)</option>
                      <option value="video">Video</option>
                      <option value="audio">Audio</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Alt Text (Accessibility)
                  </label>
                  <input
                    type="text"
                    placeholder="Describe image for screen readers and SEO"
                    value={formData.altText}
                    onChange={(e) => setFormData((prev) => ({ ...prev, altText: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. parade, brass, summer, header"
                    value={formData.tags}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Usage instructions, photographer attribution, or context..."
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400 resize-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingAsset ? "Save Changes" : "Create Asset"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cloudinary Configuration Modal */}
      <CloudinaryConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
}

