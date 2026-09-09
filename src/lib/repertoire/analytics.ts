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
  internalLogistics?: { title?: string };
  setlist?: GigSet[];
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

    gig.setlist.forEach((set) => {
      if (!Array.isArray(set.items)) return;

      set.items.forEach((item) => {
        if (!item.title) return;
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