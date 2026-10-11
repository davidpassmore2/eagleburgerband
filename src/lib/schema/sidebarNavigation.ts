import { z } from "zod";
import { ToolCategory, WORKSPACE_TOOLS, WorkspaceTool } from "@/lib/portal/workspaceRegistry";

export const CATEGORY_ORDER: ToolCategory[] = [
  "Help, Guides & Docs",
  "Performances & Logistics",
  "Personnel & Attendance",
  "Music & Repertoire",
  "Website & Intake",
  "Finance",
  "Business & Admin",
];

export const SidebarLinkConfigSchema = z.object({
  id: z.string(),
  title: z.string().default(""),
  order: z.number().default(0),
  isVisible: z.boolean().default(true),
});

export type SidebarLinkConfig = z.infer<typeof SidebarLinkConfigSchema>;

export const SidebarSectionConfigSchema = z.object({
  id: z.string(), // ToolCategory
  title: z.string().default(""),
  order: z.number().default(0),
  isVisible: z.boolean().default(true),
  links: z.array(SidebarLinkConfigSchema).default([]),
});

export type SidebarSectionConfig = z.infer<typeof SidebarSectionConfigSchema>;

export const SidebarNavigationConfigSchema = z.object({
  schemaVersion: z.number().default(1),
  updatedAt: z.string().default(() => new Date().toISOString()),
  updatedBy: z.string().default("system"),
  sections: z.array(SidebarSectionConfigSchema).default([]),
});

export type SidebarNavigationConfig = z.infer<typeof SidebarNavigationConfigSchema>;

export interface ResolvedSidebarLink {
  id: string;
  title: string;
  order: number;
  isVisible: boolean;
  tool: WorkspaceTool;
}

export interface ResolvedSidebarSection {
  id: ToolCategory;
  title: string;
  order: number;
  isVisible: boolean;
  links: ResolvedSidebarLink[];
}

/**
 * Generates the default navigation structure based on CATEGORY_ORDER and WORKSPACE_TOOLS.
 */
export function getDefaultSidebarNavigationConfig(): SidebarNavigationConfig {
  const sections: SidebarSectionConfig[] = CATEGORY_ORDER.map((category, catIndex) => {
    const toolsInCategory = WORKSPACE_TOOLS.filter((t) => t.category === category);
    const links: SidebarLinkConfig[] = toolsInCategory.map((tool, toolIndex) => ({
      id: tool.id,
      title: tool.title,
      order: toolIndex,
      isVisible: true,
    }));

    return {
      id: category,
      title: category,
      order: catIndex,
      isVisible: true,
      links,
    };
  });

  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: "system",
    sections,
  };
}

/**
 * Resolves saved configuration with existing registered tools, guaranteeing
 * resilient fallback, auto-appending of new tools/categories, and removal of orphan references.
 */
export function resolveSidebarNavigation(
  config: SidebarNavigationConfig | null | undefined,
  tools: WorkspaceTool[] = WORKSPACE_TOOLS
): ResolvedSidebarSection[] {
  const savedSectionsMap = new Map<string, SidebarSectionConfig>();
  if (config?.sections && Array.isArray(config.sections)) {
    config.sections.forEach((s) => {
      savedSectionsMap.set(s.id, s);
    });
  }

  const resolvedSections: ResolvedSidebarSection[] = [];

  CATEGORY_ORDER.forEach((category, defaultCatIndex) => {
    const savedSection = savedSectionsMap.get(category);
    const sectionOrder = savedSection?.order !== undefined ? savedSection.order : defaultCatIndex;
    const isVisible = savedSection?.isVisible !== undefined ? savedSection.isVisible : true;
    const title = savedSection?.title || category;

    // Map existing saved links for this section
    const savedLinksMap = new Map<string, SidebarLinkConfig>();
    if (savedSection?.links && Array.isArray(savedSection.links)) {
      savedSection.links.forEach((l) => {
        savedLinksMap.set(l.id, l);
      });
    }

    // Filter tools registered under this category
    const toolsInCategory = tools.filter((t) => t.category === category);
    const resolvedLinks: ResolvedSidebarLink[] = [];

    toolsInCategory.forEach((tool, defaultToolIndex) => {
      const savedLink = savedLinksMap.get(tool.id);
      const linkOrder = savedLink?.order !== undefined ? savedLink.order : defaultToolIndex;
      const linkVisible = savedLink?.isVisible !== undefined ? savedLink.isVisible : true;

      resolvedLinks.push({
        id: tool.id,
        title: tool.title,
        order: linkOrder,
        isVisible: linkVisible,
        tool,
      });
    });

    // Sort links by order
    resolvedLinks.sort((a, b) => a.order - b.order);

    resolvedSections.push({
      id: category,
      title,
      order: sectionOrder,
      isVisible,
      links: resolvedLinks,
    });
  });

  // Sort sections by order
  resolvedSections.sort((a, b) => a.order - b.order);

  return resolvedSections;
}

