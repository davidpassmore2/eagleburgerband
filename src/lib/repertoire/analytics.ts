export type GigSetItem = {
  id: string;
  title: string;
  artist?: string;
  keySignature?: string;
  performanceNote?: string;
};

export type GigSet = {
  id: string;
  setName: string;
  items: GigSetItem[];
};

export type GigData = {
  id: string;
  date: string;
  status: string;
  publicDetails?: { title?: string };
  internalLogistics?: { title?: string; setlistId?: string };
  setlistId?: string;
  setlist?: GigSet[] | unknown[];
};

export type SetlistUsageStat = {
  setlistId: string;
  name: string;
  category: string;
  tuneCount: number;
  targetDurationMinutes: number;
  usageCount: number;
  lastUsedDate: string | null;
  lastUsedGigTitle: string | null;
  assignedGigs: { id: string; title: string; date: string; status: string }[];
  tags: string[];
};

export type TuneStat = {
  songKey: string;
  title: string;
  playCount: number;
  lastPlayedDate: string | null;
  lastPlayedGigTitle: string | null;
  daysSinceLastPlayed: number | null;
  statusCategory: "frequent" | "moderate" | "vault" | "unplayed";
};

export function normalizeSongTitle(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function buildRepertoireAnalytics(gigs: GigData[]): Record<string, TuneStat> {
  const stats: Record<string, TuneStat> = {};
  const currentTime = Number(new Date());

  const sortedGigs = [...gigs]
    .filter((g) => g.status !== "cancelled")
    .sort((a, b) => Number(new Date(b.date)) - Number(new Date(a.date)));

  sortedGigs.forEach((gig) => {
    const gigTitle = gig.internalLogistics?.title || gig.publicDetails?.title || "Band Performance";
    const gigDate = gig.date;

    if (!Array.isArray(gig.setlist)) return;

    gig.setlist.forEach((setRaw) => {
      const set = setRaw as { items?: { title?: string }[] } | undefined;
      if (!set || !Array.isArray(set.items)) return;

      set.items.forEach((item) => {
        if (!item || !item.title) return;
        const key = normalizeSongTitle(item.title);

        if (!stats[key]) {
          const gigDateTime = Number(new Date(gigDate));
          const diffMs = currentTime - gigDateTime;
          const daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          stats[key] = {
            songKey: key,
            title: item.title.trim(),
            playCount: 1,
            lastPlayedDate: gigDate,
            lastPlayedGigTitle: gigTitle,
            daysSinceLastPlayed: Number.isNaN(daysDiff) ? null : daysDiff,
            statusCategory: "moderate",
          };
        } else {
          stats[key].playCount += 1;
        }
      });
    });
  });

  Object.values(stats).forEach((stat) => {
    if (stat.daysSinceLastPlayed === null) {
      stat.statusCategory = "moderate";
    } else if (stat.daysSinceLastPlayed <= 30) {
      stat.statusCategory = "frequent";
    } else if (stat.daysSinceLastPlayed > 90) {
      stat.statusCategory = "vault";
    } else {
      stat.statusCategory = "moderate";
    }
  });

  return stats;
}

export function buildSetlistUsageAnalytics(
  setlists: {
    id: string;
    name?: string;
    title?: string;
    category?: string;
    tunes?: unknown[];
    items?: unknown[];
    targetDurationMinutes?: number;
    tags?: string[];
    assignedGigIds?: string[];
    usageCount?: number;
    lastUsedDate?: string | null;
  }[],
  gigs: GigData[]
): SetlistUsageStat[] {
  return setlists.map((sl) => {
    const slName = sl.name || sl.title || "Untitled Setlist";
    const tunes = sl.tunes || sl.items || [];
    const tuneCount = Array.isArray(tunes) ? tunes.length : 0;
    const duration = sl.targetDurationMinutes || 45;

    // Find all matching gigs
    const assignedGigs: { id: string; title: string; date: string; status: string }[] = [];

    gigs.forEach((gig) => {
      const gigTitle = gig.internalLogistics?.title || gig.publicDetails?.title || `Gig ${gig.id.slice(0, 6)}`;
      const matchesSetlistId = gig.setlistId === sl.id || gig.internalLogistics?.setlistId === sl.id;
      const inAssignedList = Array.isArray(sl.assignedGigIds) && sl.assignedGigIds.includes(gig.id);

      if (matchesSetlistId || inAssignedList) {
        if (!assignedGigs.some((ag) => ag.id === gig.id)) {
          assignedGigs.push({
            id: gig.id,
            title: gigTitle,
            date: gig.date || "TBD",
            status: gig.status || "confirmed",
          });
        }
      }
    });

    // Sort gigs by date desc
    assignedGigs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const usageCount = Math.max(assignedGigs.length, sl.usageCount || 0);
    const lastUsedDate = assignedGigs.length > 0 ? assignedGigs[0].date : (sl.lastUsedDate || null);
    const lastUsedGigTitle = assignedGigs.length > 0 ? assignedGigs[0].title : null;

    return {
      setlistId: sl.id,
      name: slName,
      category: sl.category || "parade",
      tuneCount,
      targetDurationMinutes: duration,
      usageCount,
      lastUsedDate,
      lastUsedGigTitle,
      assignedGigs,
      tags: sl.tags || [],
    };
  }).sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name));
}