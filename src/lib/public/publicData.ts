import type { DocumentData } from "firebase/firestore";
import { getDocument, listDocuments } from "@/lib/firebase/serverFirestore";
import { PublicBeneficiary, PublicBeneficiarySchema } from "@/lib/schema/donation";

const LISTED_GIG_STATUSES = ["confirmed", "completed"];

const GIG_PUBLIC_KEYS = [
  "date",
  "status",
  "publicDetails",
  "title",
  "venue",
  "venueAddress",
  "coordinates",
  "city",
  "headerImageUrl",
  "headerImageAlt",
  "headerImageOverlayOpacity",
  "headerImageHeightPreset",
  "headerImageVerticalPosition",
];

const TESTIMONIAL_PUBLIC_KEYS = ["roleOrEvent", "organization", "quote", "rating", "tag", "status", "createdAt"];

function toPublicGig(id: string, data: DocumentData): DocumentData | null {
  if (data.publicDetails?.isPublic === false) return null;

  const gig: DocumentData = { id };
  for (const key of GIG_PUBLIC_KEYS) {
    if (data[key] !== undefined) gig[key] = data[key];
  }
  return gig;
}

export async function listPublicGigs(): Promise<DocumentData[]> {
  const docs = await listDocuments("gigs");
  return docs
    .filter((d) => LISTED_GIG_STATUSES.includes(String(d.data.status)))
    .map((d) => toPublicGig(d.id, d.data))
    .filter((gig): gig is DocumentData => gig !== null);
}

export async function getPublicGig(id: string): Promise<DocumentData | null> {
  if (!id || id === "." || id === ".." || id.includes("/")) return null;
  const doc = await getDocument(`gigs/${encodeURIComponent(id)}`);
  return doc ? toPublicGig(doc.id, doc.data) : null;
}

export async function listPublicBeneficiaries(): Promise<PublicBeneficiary[]> {
  const docs = await listDocuments("donations");
  return docs.flatMap((d) => {
    if (d.data.isPublic !== true) return [];
    const parsed = PublicBeneficiarySchema.safeParse({ ...d.data, id: d.id });
    return parsed.success ? [parsed.data] : [];
  });
}

export async function listPublicTestimonials(): Promise<DocumentData[]> {
  const docs = await listDocuments("testimonials");
  return docs
    .filter((d) => d.data.status === "approved" || d.data.status === "featured")
    .map((d) => {
      const isPrivate = d.data.nameVisibility === "private";
      const testimonial: DocumentData = {
        id: d.id,
        nameVisibility: isPrivate ? "private" : "public",
        authorName: isPrivate ? "" : d.data.authorName || "",
      };
      for (const key of TESTIMONIAL_PUBLIC_KEYS) {
        if (d.data[key] !== undefined) testimonial[key] = d.data[key];
      }
      return testimonial;
    });
}
