import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

export type EmailDestinationProvider = "betterblog" | "kit" | "mailchimp";
export type KitTarget = "form" | "tag";

export type EmailModuleKey =
  | "collection_newsletter"
  | "post_newsletter"
  | "collection_lead_magnet"
  | "post_lead_magnet";

export const EMAIL_MODULE_KEYS: EmailModuleKey[] = [
  "collection_newsletter",
  "post_newsletter",
  "collection_lead_magnet",
  "post_lead_magnet",
];

export type SavedEmailKeys = { kit: boolean; mailchimp: boolean };
export type PlatformKeys = { kit: string; mailchimp: string };

export function emptyPlatformKeys(): PlatformKeys {
  return { kit: "", mailchimp: "" };
}

export type EmailCatalogItem = { id: string; name: string };

export type EmailCatalog = {
  forms: EmailCatalogItem[];
  tags: EmailCatalogItem[];
  audiences: EmailCatalogItem[];
};

export const EMPTY_EMAIL_CATALOG: EmailCatalog = { forms: [], tags: [], audiences: [] };

const NO_TAG = "__none__";

type KitDraft = {
  apiKey: string;
  kitTarget: KitTarget;
  formId: string;
  tagId: string;
};

type MailchimpDraft = {
  apiKey: string;
  audienceId: string;
  tagId: string;
  tagName: string;
};

const emptyKitDraft = (): KitDraft => ({ apiKey: "", kitTarget: "form", formId: "", tagId: "" });
const emptyMailchimpDraft = (): MailchimpDraft => ({ apiKey: "", audienceId: "", tagId: "", tagName: "" });

export type EmailDestinationState = {
  provider: EmailDestinationProvider;
  destinationId: string;
  kitTarget: KitTarget;
  tagId: string;
  tagName: string;
  apiKey: string;
  hasApiKey: boolean;
  /** Provider that owns the key stored on the server. */
  savedProvider: EmailDestinationProvider;
  savedHasApiKey: boolean;
  drafts: { kit: KitDraft; mailchimp: MailchimpDraft };
  lastError: string | null;
  lastErrorAt: string | null;
  lastSuccessAt: string | null;
};

function catalogItems(value: unknown): EmailCatalogItem[] {
  if (!Array.isArray(value)) return [];
  const items: EmailCatalogItem[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const record = row as { id?: unknown; name?: unknown };
    const id = typeof record.id === "string" ? record.id : "";
    const name = typeof record.name === "string" ? record.name : "";
    if (!id || !name) continue;
    items.push({ id, name });
  }
  return items;
}

export function emailCatalogFromApi(data: unknown): { catalog: EmailCatalog; tagsError: string | null } {
  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    catalog: {
      forms: catalogItems(row.forms),
      tags: catalogItems(row.tags),
      audiences: catalogItems(row.audiences),
    },
    tagsError: typeof row.tagsError === "string" ? row.tagsError : null,
  };
}

export function emailDestinationFromApi(data: unknown): EmailDestinationState {
  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const provider: EmailDestinationProvider =
    row.provider === "kit" || row.provider === "mailchimp" ? row.provider : "betterblog";
  const destinationId = typeof row.destinationId === "string" ? row.destinationId : "";
  const kitTarget: KitTarget = row.destinationKind === "tag" ? "tag" : "form";
  const tagId = typeof row.tagId === "string" ? row.tagId : "";
  const tagName = typeof row.tagName === "string" ? row.tagName : "";
  const hasApiKey = row.hasApiKey === true;
  return {
    provider,
    destinationId: provider === "betterblog" ? "" : destinationId,
    kitTarget: provider === "kit" ? kitTarget : "form",
    tagId: provider === "mailchimp" ? tagId : "",
    tagName: provider === "mailchimp" ? tagName : "",
    apiKey: "",
    hasApiKey: provider === "betterblog" ? false : hasApiKey,
    savedProvider: provider,
    savedHasApiKey: hasApiKey,
    drafts: {
      kit:
        provider === "kit"
          ? {
              apiKey: "",
              kitTarget,
              formId: kitTarget === "form" ? destinationId : "",
              tagId: kitTarget === "tag" ? destinationId : "",
            }
          : emptyKitDraft(),
      mailchimp:
        provider === "mailchimp"
          ? { apiKey: "", audienceId: destinationId, tagId, tagName }
          : emptyMailchimpDraft(),
    },
    lastError: typeof row.lastError === "string" ? row.lastError : null,
    lastErrorAt: typeof row.lastErrorAt === "string" ? row.lastErrorAt : null,
    lastSuccessAt: typeof row.lastSuccessAt === "string" ? row.lastSuccessAt : null,
  };
}

export type EmailDestinationsState = {
  modules: Record<EmailModuleKey, EmailDestinationState>;
  savedKeys: SavedEmailKeys;
  /** Unsaved API key text, shared by every module that uses that platform. */
  platformKeys: PlatformKeys;
};

export function emptyEmailDestinations(): EmailDestinationsState {
  return {
    modules: {
      collection_newsletter: emailDestinationFromApi(null),
      post_newsletter: emailDestinationFromApi(null),
      collection_lead_magnet: emailDestinationFromApi(null),
      post_lead_magnet: emailDestinationFromApi(null),
    },
    savedKeys: { kit: false, mailchimp: false },
    platformKeys: emptyPlatformKeys(),
  };
}

export function presentModule(state: EmailDestinationsState, moduleKey: EmailModuleKey): EmailDestinationState {
  const moduleState = state.modules[moduleKey];
  if (moduleState.provider !== "kit" && moduleState.provider !== "mailchimp") return moduleState;
  const apiKey = state.platformKeys[moduleState.provider];
  return {
    ...moduleState,
    apiKey,
    hasApiKey: state.savedKeys[moduleState.provider] || apiKey.trim() !== "",
  };
}

export function emailDestinationsFromApi(data: unknown): EmailDestinationsState {
  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const keys = row.savedKeys && typeof row.savedKeys === "object" ? (row.savedKeys as Record<string, unknown>) : {};
  const savedKeys: SavedEmailKeys = { kit: keys.kit === true, mailchimp: keys.mailchimp === true };
  const modulesRaw = row.modules && typeof row.modules === "object" ? (row.modules as Record<string, unknown>) : {};
  const modules = {} as Record<EmailModuleKey, EmailDestinationState>;
  for (const key of EMAIL_MODULE_KEYS) {
    const moduleState = emailDestinationFromApi(modulesRaw[key] ?? null);
    if (moduleState.provider === "kit" || moduleState.provider === "mailchimp") {
      const hasKey = savedKeys[moduleState.provider] || moduleState.hasApiKey;
      moduleState.hasApiKey = hasKey;
      moduleState.savedHasApiKey = hasKey;
    }
    modules[key] = moduleState;
  }
  return { modules, savedKeys, platformKeys: emptyPlatformKeys() };
}

export function emailDestinationsDirty(
  current: EmailDestinationsState | null,
  saved: EmailDestinationsState | null
): boolean {
  if (!current || !saved) return false;
  return EMAIL_MODULE_KEYS.some((key) => emailDestinationDirty(current.modules[key], saved.modules[key]));
}

export function modulePayload(state: EmailDestinationState) {
  return {
    provider: state.provider,
    destinationId: state.destinationId,
    destinationKind: state.provider === "kit" ? state.kitTarget : undefined,
    tagId: state.provider === "mailchimp" ? state.tagId : "",
    tagName: state.provider === "mailchimp" ? state.tagName : "",
    apiKey: state.apiKey,
  };
}

export function switchEmailDestination(
  current: EmailDestinationState,
  nextProvider: EmailDestinationProvider,
  savedKeys: SavedEmailKeys = { kit: false, mailchimp: false },
  platformKeys: PlatformKeys = emptyPlatformKeys()
): EmailDestinationState {
  if (nextProvider === current.provider) return current;
  const drafts = {
    kit: { ...current.drafts.kit, apiKey: "" },
    mailchimp: { ...current.drafts.mailchimp, apiKey: "" },
  };
  if (current.provider === "kit") {
    drafts.kit = {
      apiKey: "",
      kitTarget: current.kitTarget,
      formId: current.kitTarget === "form" ? current.destinationId : current.drafts.kit.formId,
      tagId: current.kitTarget === "tag" ? current.destinationId : current.drafts.kit.tagId,
    };
  } else if (current.provider === "mailchimp") {
    drafts.mailchimp = {
      apiKey: "",
      audienceId: current.destinationId,
      tagId: current.tagId,
      tagName: current.tagName,
    };
  }
  if (nextProvider === "betterblog") {
    return {
      ...current,
      provider: "betterblog",
      drafts,
      destinationId: "",
      apiKey: "",
      tagId: "",
      tagName: "",
      hasApiKey: false,
    };
  }
  const apiKey = platformKeys[nextProvider];
  const hasApiKey = savedKeys[nextProvider] || apiKey.trim() !== "";
  if (nextProvider === "kit") {
    const draft = drafts.kit;
    return {
      ...current,
      provider: "kit",
      drafts,
      kitTarget: draft.kitTarget,
      destinationId: draft.kitTarget === "tag" ? draft.tagId : draft.formId,
      apiKey,
      tagId: "",
      tagName: "",
      hasApiKey,
    };
  }
  const draft = drafts.mailchimp;
  return {
    ...current,
    provider: "mailchimp",
    drafts,
    destinationId: draft.audienceId,
    tagId: draft.tagId,
    tagName: draft.tagName,
    apiKey,
    hasApiKey,
  };
}

export function setKitTarget(current: EmailDestinationState, kitTarget: KitTarget): EmailDestinationState {
  if (current.provider !== "kit" || current.kitTarget === kitTarget) return current;
  const kit: KitDraft = {
    ...current.drafts.kit,
    apiKey: current.apiKey,
    kitTarget,
    formId: current.kitTarget === "form" ? current.destinationId : current.drafts.kit.formId,
    tagId: current.kitTarget === "tag" ? current.destinationId : current.drafts.kit.tagId,
  };
  return {
    ...current,
    kitTarget,
    destinationId: kitTarget === "tag" ? kit.tagId : kit.formId,
    drafts: { ...current.drafts, kit },
  };
}

export function selectKitDestination(current: EmailDestinationState, destinationId: string): EmailDestinationState {
  const kit: KitDraft = {
    ...current.drafts.kit,
    apiKey: current.apiKey,
    kitTarget: current.kitTarget,
    formId: current.kitTarget === "form" ? destinationId : current.drafts.kit.formId,
    tagId: current.kitTarget === "tag" ? destinationId : current.drafts.kit.tagId,
  };
  return { ...current, destinationId, drafts: { ...current.drafts, kit } };
}

export function selectMailchimpAudience(current: EmailDestinationState, audienceId: string): EmailDestinationState {
  const same = audienceId === current.destinationId;
  const tagId = same ? current.tagId : "";
  const tagName = same ? current.tagName : "";
  return {
    ...current,
    destinationId: audienceId,
    tagId,
    tagName,
    drafts: {
      ...current.drafts,
      mailchimp: { apiKey: current.apiKey, audienceId, tagId, tagName },
    },
  };
}

export function selectMailchimpTag(
  current: EmailDestinationState,
  tagId: string,
  tagName: string
): EmailDestinationState {
  return {
    ...current,
    tagId,
    tagName,
    drafts: {
      ...current.drafts,
      mailchimp: { apiKey: current.apiKey, audienceId: current.destinationId, tagId, tagName },
    },
  };
}

export function emailDestinationDirty(
  current: EmailDestinationState | null,
  saved: EmailDestinationState | null
): boolean {
  if (!current || !saved) return false;
  if (current.provider !== saved.provider) return true;
  if (current.apiKey.trim() !== "") return true;
  if (current.provider === "betterblog") return false;
  if (current.destinationId.trim() !== saved.destinationId.trim()) return true;
  if (current.provider === "kit" && current.kitTarget !== saved.kitTarget) return true;
  if (current.provider === "mailchimp" && (current.tagId !== saved.tagId || current.tagName !== saved.tagName)) {
    return true;
  }
  return false;
}

function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function choicesFor(items: EmailCatalogItem[], selectedId: string, selectedName?: string): EmailCatalogItem[] {
  if (!selectedId || items.some((item) => item.id === selectedId)) return items;
  const name = selectedName?.trim() || selectedId;
  return [{ id: selectedId, name }, ...items];
}

type EmailDestinationFieldsProps = {
  value: EmailDestinationState;
  savedKeys: SavedEmailKeys;
  platformKeys: PlatformKeys;
  onChange: (next: EmailDestinationState) => void;
  onTest: () => void;
  onRefresh: () => void;
  testing: boolean;
  testMessage: { ok: boolean; text: string } | null;
  catalog: EmailCatalog;
  catalogLoading: boolean;
  catalogError: string | null;
  tagsError: string | null;
};

export function EmailDestinationFields({
  value,
  savedKeys,
  platformKeys,
  onChange,
  onTest,
  onRefresh,
  testing,
  testMessage,
  catalog,
  catalogLoading,
  catalogError,
  tagsError,
}: EmailDestinationFieldsProps) {
  const external = value.provider === "kit" || value.provider === "mailchimp";
  const canLoad = value.apiKey.trim() !== "" || value.hasApiKey;
  const showingSaved = value.provider === value.savedProvider;
  const successWhen = showingSaved ? formatWhen(value.lastSuccessAt) : null;
  const errorWhen = showingSaved ? formatWhen(value.lastErrorAt) : null;

  return (
    <div className="space-y-3 border-t border-[#e5e4e0] pt-3">
      <div className="space-y-2">
        <Label className="text-xs text-[#6b6b6b]">Send subscribers to</Label>
        <Select
          value={value.provider}
          onValueChange={(provider) =>
            onChange(switchEmailDestination(value, provider as EmailDestinationProvider, savedKeys, platformKeys))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="betterblog">BetterBlog</SelectItem>
            <SelectItem value="kit">Kit</SelectItem>
            <SelectItem value="mailchimp">Mailchimp</SelectItem>
          </SelectContent>
        </Select>
        {value.provider === "betterblog" && (
          <p className="text-[10px] text-[#6b6b6b]">
            Subscribers stay in your BetterBlog dashboard, where you can export them as CSV.
          </p>
        )}
      </div>
      {external && (
        <>
          <div className="space-y-2" key={`${value.provider}-key`}>
            <Label className="text-xs text-[#6b6b6b]">API key</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={value.apiKey}
              placeholder={value.hasApiKey ? "Saved" : "Paste API key"}
              onChange={(e) => onChange({ ...value, apiKey: e.target.value })}
            />
            {value.provider === "mailchimp" && (
              <p className="text-[10px] text-[#6b6b6b]">
                The API key includes the datacenter suffix, such as -us21.
              </p>
            )}
          </div>
          {value.provider === "kit" ? (
            <KitDestinationFields
              value={value}
              onChange={onChange}
              catalog={catalog}
              loading={catalogLoading}
              error={catalogError}
              canLoad={canLoad}
            />
          ) : (
            <MailchimpDestinationFields
              value={value}
              onChange={onChange}
              catalog={catalog}
              loading={catalogLoading}
              error={catalogError}
              tagsError={tagsError}
              canLoad={canLoad}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={testing} onClick={onTest}>
              {testing ? "Testing…" : "Test connection"}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!canLoad || catalogLoading} onClick={onRefresh}>
              {catalogLoading ? "Loading…" : "Refresh list"}
            </Button>
          </div>
          {testMessage && (
            <p className={`text-[10px] ${testMessage.ok ? "text-[#0f766e]" : "text-red-600"}`}>
              {testMessage.text}
            </p>
          )}
        </>
      )}
      {successWhen && (
        <p className="text-[10px] text-[#6b6b6b]">Last successful send {successWhen}.</p>
      )}
      {showingSaved && value.lastError && (
        <p className="text-[10px] text-red-600">
          {errorWhen ? `Last send problem (${errorWhen}): ` : ""}
          {value.lastError}
        </p>
      )}
    </div>
  );
}

function KitDestinationFields({
  value,
  onChange,
  catalog,
  loading,
  error,
  canLoad,
}: {
  value: EmailDestinationState;
  onChange: (next: EmailDestinationState) => void;
  catalog: EmailCatalog;
  loading: boolean;
  error: string | null;
  canLoad: boolean;
}) {
  const items = value.kitTarget === "tag" ? catalog.tags : catalog.forms;
  const label = value.kitTarget === "tag" ? "Tag" : "Form";
  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs text-[#6b6b6b]">Add subscribers to</Label>
        <Select
          value={value.kitTarget}
          onValueChange={(next) => onChange(setKitTarget(value, next as KitTarget))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="form">Form</SelectItem>
            <SelectItem value="tag">Tag</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ResourceSelect
        label={label}
        placeholder={value.kitTarget === "tag" ? "Select a tag" : "Select a form"}
        value={value.destinationId}
        items={choicesFor(items, value.destinationId)}
        canLoad={canLoad}
        loading={loading}
        error={error}
        emptyText={
          value.kitTarget === "tag" ? "No tags found in this Kit account." : "No forms found in this Kit account."
        }
        waitingText="Paste an API key to load forms and tags."
        onChange={(id) => onChange(selectKitDestination(value, id))}
      />
    </>
  );
}

function MailchimpDestinationFields({
  value,
  onChange,
  catalog,
  loading,
  error,
  tagsError,
  canLoad,
}: {
  value: EmailDestinationState;
  onChange: (next: EmailDestinationState) => void;
  catalog: EmailCatalog;
  loading: boolean;
  error: string | null;
  tagsError: string | null;
  canLoad: boolean;
}) {
  const tagItems = choicesFor(catalog.tags, value.tagId, value.tagName);
  return (
    <>
      <ResourceSelect
        label="Audience"
        placeholder="Select an audience"
        value={value.destinationId}
        items={choicesFor(catalog.audiences, value.destinationId)}
        canLoad={canLoad}
        loading={loading}
        error={error}
        emptyText="No audiences found in this Mailchimp account."
        waitingText="Paste an API key to load audiences."
        onChange={(id) => onChange(selectMailchimpAudience(value, id))}
      />
      <ResourceSelect
        label="Tag"
        placeholder="No tag"
        value={value.tagId || NO_TAG}
        items={tagItems}
        canLoad={canLoad && Boolean(value.destinationId)}
        loading={loading && Boolean(value.destinationId)}
        error={value.destinationId ? tagsError || error : null}
        emptyText="No tags found in this audience."
        waitingText={value.destinationId ? "Paste an API key to load tags." : "Choose an audience to load its tags."}
        allowNone
        onChange={(id) => {
          if (id === NO_TAG) {
            onChange(selectMailchimpTag(value, "", ""));
            return;
          }
          const match = tagItems.find((item) => item.id === id);
          onChange(selectMailchimpTag(value, id, match?.name ?? ""));
        }}
      />
      <p className="text-[10px] text-[#6b6b6b]">
        Optional. Subscribers join the audience, and this tag when you choose one.
      </p>
    </>
  );
}

function ResourceSelect({
  label,
  placeholder,
  value,
  items,
  canLoad,
  loading,
  error,
  emptyText,
  waitingText,
  allowNone,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  items: EmailCatalogItem[];
  canLoad: boolean;
  loading: boolean;
  error: string | null;
  emptyText: string;
  waitingText: string;
  allowNone?: boolean;
  onChange: (id: string) => void;
}) {
  const showMenu = canLoad && (items.length > 0 || Boolean(allowNone));
  return (
    <div className="space-y-2">
      <Label className="text-xs text-[#6b6b6b]">{label}</Label>
      {showMenu ? (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={loading ? "Loading…" : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {allowNone && <SelectItem value={NO_TAG}>No tag</SelectItem>}
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="text-[10px] text-[#6b6b6b]">
          {!canLoad ? waitingText : loading ? "Loading…" : error ? error : emptyText}
        </p>
      )}
      {showMenu && error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
