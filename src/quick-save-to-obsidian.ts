import { Clipboard, Toast, getFrontmostApplication, getPreferenceValues, open, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface Preferences {
  vault: string;
  folder?: string;
  defaultTags?: string;
  useDomainTag?: boolean;
  filenameFormat?: string;
}

interface PageInfo {
  url: string;
  title: string;
  sourceApp?: string;
}

export default async function main() {
  try {
    const prefs = getPreferenceValues<Preferences>();
    const vault = (prefs.vault || "").trim();
    const folder = (prefs.folder || "").trim();
    const defaultTagsStr = (prefs.defaultTags || "bookmark,inbox").trim();
    const useDomainTag = prefs.useDomainTag ?? true;
    const filenameFormat = (prefs.filenameFormat || "{{slug}}").trim();

    if (!vault) {
      await showToast({ style: Toast.Style.Failure, title: "Vault name is required" });
      return;
    }

    const page = await getActivePageInfo();
    let url = page?.url || "";
    let title = page?.title || "";

    if (!url) {
      // Fallback to clipboard URL
      const clip = await Clipboard.readText();
      if (clip && isProbablyUrl(clip)) {
        url = clip.trim();
        if (!title) {
          title = deriveTitleFromUrl(url);
        }
      }
    }

    if (!url) {
      await showToast({ style: Toast.Style.Failure, title: "No URL found", message: "Open a page or copy a URL" });
      return;
    }

    if (!title) {
      title = deriveTitleFromUrl(url);
    }

    const domain = safeDomainFromUrl(url);

    // tags
    const tags: string[] = [];
    tags.push(...splitTags(defaultTagsStr));
    if (useDomainTag && domain) {
      const domainTag = mapDomainToTag(domain);
      if (domainTag) tags.push(domainTag);
    }
    const uniqueTags = Array.from(new Set(tags.map(sanitizeTag))).filter(Boolean);

    // markdown content (YAML front matter for created and tags)
    const createdYMD = formatLocalDateYMD(new Date());
    const yamlTagsBlock = uniqueTags.length ? `tags:\n${uniqueTags.map((t) => `  - ${t}`).join("\n")}` : `tags: []`;
    const content =
      `---\n` +
      `created: ${createdYMD}\n` +
      `${yamlTagsBlock}\n` +
      `---\n\n` +
      `- URL: ${url}\n` +
      `- Why: \n\n` +
      `## Notes\n`;

    // build filename
    const filename = buildFilename(filenameFormat, title, domain);
    const targetPath = folder ? `${trimSlashes(folder)}/${filename}` : filename;

    const obsidianUri = buildObsidianNewUri({ vault, filePath: targetPath, content });

    await showToast({ style: Toast.Style.Animated, title: "Saving to Obsidian..." });
    await open(obsidianUri);
    await showToast({ style: Toast.Style.Success, title: "Saved to Obsidian" });
  } catch (error) {
    console.error("Quick Save Error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to save",
      message: "An unexpected error occurred. Please try again.",
    });
  }
}

async function getActivePageInfo(): Promise<PageInfo | null> {
  const front = await getFrontmostApplication();
  const appName = front?.name ?? "";

  // Try based on frontmost app first
  const orderedApps = prioritize(appName, ["Safari", "Google Chrome", "Arc", "Brave Browser", "Microsoft Edge"]);

  for (const app of orderedApps) {
    try {
      const data = await getFromBrowser(app);
      if (data && data.url) return { ...data, sourceApp: app };
    } catch {
      // ignore and continue
    }
  }
  return null;
}

async function getFromBrowser(app: string): Promise<PageInfo | null> {
  switch (app) {
    case "Safari":
      return getFromSafari();
    case "Google Chrome":
    case "Brave Browser":
    case "Microsoft Edge":
      return getFromChromium(app);
    case "Arc":
      return getFromArc();
    default:
      return null;
  }
}

async function getFromSafari(): Promise<PageInfo | null> {
  const script = `
    tell application "Safari"
      if (exists front document) then
        set theURL to URL of front document
        set theTitle to name of front document
        if theURL is missing value then return ""
        return theURL & "\n" & theTitle
      else
        return ""
      end if
    end tell
  `;
  try {
    const out = (await runAppleScript(script)).trim();
    if (!out) return null;
    const [url, ...titleParts] = out.split("\n");
    const title = titleParts.join(" ").trim();
    if (!isProbablyUrl(url)) return null;
    return { url, title };
  } catch {
    return null;
  }
}

async function getFromChromium(app: string): Promise<PageInfo | null> {
  const script = `
    tell application "${app}"
      if (exists front window) then
        set theTab to active tab of front window
        set theURL to URL of theTab
        set theTitle to title of theTab
        if theURL is missing value then return ""
        return theURL & "\n" & theTitle
      else
        return ""
      end if
    end tell
  `;
  try {
    const out = (await runAppleScript(script)).trim();
    if (!out) return null;
    const [url, ...titleParts] = out.split("\n");
    const title = titleParts.join(" ").trim();
    if (!isProbablyUrl(url)) return null;
    return { url, title };
  } catch {
    return null;
  }
}

async function getFromArc(): Promise<PageInfo | null> {
  const script = `
    tell application "Arc"
      try
        set theTab to active tab of front window
        set theURL to URL of theTab
        set theTitle to title of theTab
        if theURL is missing value then return ""
        return theURL & "\n" & theTitle
      on error
        return ""
      end try
    end tell
  `;
  try {
    const out = (await runAppleScript(script)).trim();
    if (!out) return null;
    const [url, ...titleParts] = out.split("\n");
    const title = titleParts.join(" ").trim();
    if (!isProbablyUrl(url)) return null;
    return { url, title };
  } catch {
    return null;
  }
}

function isProbablyUrl(text: string): boolean {
  const t = text.trim();
  if (!/^https?:\/\//i.test(t)) return false;
  try {
    new URL(t);
    return true;
  } catch {
    return false;
  }
}

function deriveTitleFromUrl(url: string): string {
  const domain = safeDomainFromUrl(url);
  return domain || "Untitled";
}

function safeDomainFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return "";
  }
}

function mapDomainToTag(domain: string): string {
  const d = domain.toLowerCase();
  const mapping: Record<string, string> = {
    "zenn.dev": "zenn",
    "note.com": "note",
    "x.com": "twitter",
    "twitter.com": "twitter",
    "github.com": "github",
    "qiita.com": "qiita",
    "dev.to": "devto",
    "medium.com": "medium",
    "youtube.com": "youtube",
    "youtu.be": "youtube",
  };
  if (mapping[d]) return mapping[d];
  // fallback to second-level label
  const parts = d.split(".");
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2];
    return sanitizeTag(candidate);
  }
  return sanitizeTag(d);
}

function splitTags(input: string): string[] {
  return input
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function sanitizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9\-_/]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

// escapeYamlString removed: title is no longer stored in YAML front matter

function formatLocalDateYMD(date: Date): string {
  const pad = (n: number, w = 2) => `${Math.abs(n)}`.padStart(w, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

function slugify(text: string): string {
  // Preserve non-ASCII letters (e.g., Japanese), remove spaces, and strip invalid filename chars
  const noWhitespace = text.replace(/\s+/gu, "");
  const sanitized = noWhitespace.replace(/[\\/:*?"<>|]/g, "-");
  const collapsed = sanitized.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return collapsed;
}

function buildFilename(format: string, title: string, domain: string): string {
  const now = new Date();
  const yyyy = `${now.getFullYear()}`;
  const mm = `${now.getMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getDate()}`.padStart(2, "0");
  const HH = `${now.getHours()}`.padStart(2, "0");
  const MM = `${now.getMinutes()}`.padStart(2, "0");
  const SS = `${now.getSeconds()}`.padStart(2, "0");
  const slug = slugify(title) || slugify(domain) || `${yyyy}${mm}${dd}-${HH}${MM}${SS}`;

  let out = format;
  out = out.replace(/\{\{yyyy-MM-dd\}\}/g, `${yyyy}-${mm}-${dd}`);
  out = out.replace(/\{\{yyyyMMdd-HHmmss\}\}/g, `${yyyy}${mm}${dd}-${HH}${MM}${SS}`);
  out = out.replace(/\{\{domain\}\}/g, domain);
  out = out.replace(/\{\{slug\}\}/g, slug);
  out = out.replace(/[\\/:*?"<>|]/g, "-");
  out = out.replace(/\s+/g, " ");
  return out.trim();
}

function buildObsidianNewUri(params: { vault: string; filePath: string; content: string }): string {
  const { vault, filePath, content } = params;
  const q = `vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(filePath)}&content=${encodeURIComponent(content)}`;
  return `obsidian://new?${q}`;
}

function trimSlashes(path: string): string {
  return path.replace(/^\/+|\/+$/g, "");
}

function prioritize<T>(focus: T, items: T[]): T[] {
  const list = [...items];
  const idx = list.indexOf(focus);
  if (idx > 0) {
    const [v] = list.splice(idx, 1);
    list.unshift(v);
  }
  return list;
}
