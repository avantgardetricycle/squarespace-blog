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

type ProviderDraft = {
  destinationId: string;
  apiKey: string;
};

const emptyDraft = (): ProviderDraft => ({ destinationId: "", apiKey: "" });

export type EmailDestinationState = {
  provider: EmailDestinationProvider;
  destinationId: string;
  apiKey: string;
  hasApiKey: boolean;
  /** Provider that owns the key stored on the server. */
  savedProvider: EmailDestinationProvider;
  savedHasApiKey: boolean;
  drafts: { kit: ProviderDraft; mailchimp: ProviderDraft };
  lastError: string | null;
  lastErrorAt: string | null;
  lastSuccessAt: string | null;
};

export function emailDestinationFromApi(data: unknown): EmailDestinationState {
  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const provider: EmailDestinationProvider =
    row.provider === "kit" || row.provider === "mailchimp" ? row.provider : "betterblog";
  const destinationId = typeof row.destinationId === "string" ? row.destinationId : "";
  const hasApiKey = row.hasApiKey === true;
  return {
    provider,
    destinationId: provider === "betterblog" ? "" : destinationId,
    apiKey: "",
    hasApiKey: provider === "betterblog" ? false : hasApiKey,
    savedProvider: provider,
    savedHasApiKey: hasApiKey,
    drafts: {
      kit: provider === "kit" ? { destinationId, apiKey: "" } : emptyDraft(),
      mailchimp: provider === "mailchimp" ? { destinationId, apiKey: "" } : emptyDraft(),
    },
    lastError: typeof row.lastError === "string" ? row.lastError : null,
    lastErrorAt: typeof row.lastErrorAt === "string" ? row.lastErrorAt : null,
    lastSuccessAt: typeof row.lastSuccessAt === "string" ? row.lastSuccessAt : null,
  };
}

export function switchEmailDestination(
  current: EmailDestinationState,
  nextProvider: EmailDestinationProvider
): EmailDestinationState {
  if (nextProvider === current.provider) return current;
  const drafts = {
    kit: { ...current.drafts.kit },
    mailchimp: { ...current.drafts.mailchimp },
  };
  if (current.provider === "kit" || current.provider === "mailchimp") {
    drafts[current.provider] = {
      destinationId: current.destinationId,
      apiKey: current.apiKey,
    };
  }
  if (nextProvider === "betterblog") {
    return {
      ...current,
      provider: "betterblog",
      drafts,
      destinationId: "",
      apiKey: "",
      hasApiKey: false,
    };
  }
  const draft = drafts[nextProvider];
  return {
    ...current,
    provider: nextProvider,
    drafts,
    destinationId: draft.destinationId,
    apiKey: draft.apiKey,
    hasApiKey: nextProvider === current.savedProvider && current.savedHasApiKey,
  };
}

export function emailDestinationDirty(
  current: EmailDestinationState | null,
  saved: EmailDestinationState | null
): boolean {
  if (!current || !saved) return false;
  if (current.provider !== saved.provider) return true;
  if (current.apiKey.trim() !== "") return true;
  if (current.provider !== "betterblog" && current.destinationId.trim() !== saved.destinationId.trim()) return true;
  return false;
}

function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

type EmailDestinationFieldsProps = {
  value: EmailDestinationState;
  onChange: (next: EmailDestinationState) => void;
  onTest: () => void;
  testing: boolean;
  testMessage: { ok: boolean; text: string } | null;
};

export function EmailDestinationFields({
  value,
  onChange,
  onTest,
  testing,
  testMessage,
}: EmailDestinationFieldsProps) {
  const external = value.provider === "kit" || value.provider === "mailchimp";
  const destinationLabel = value.provider === "mailchimp" ? "Audience ID" : "Form ID";
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
            onChange(switchEmailDestination(value, provider as EmailDestinationProvider))
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
          </div>
          <div className="space-y-2" key={`${value.provider}-destination`}>
            <Label className="text-xs text-[#6b6b6b]">{destinationLabel}</Label>
            <Input
              value={value.destinationId}
              placeholder={value.provider === "mailchimp" ? "Audience ID" : "Form ID"}
              onChange={(e) => onChange({ ...value, destinationId: e.target.value })}
            />
            <p className="text-[10px] text-[#6b6b6b]">
              {value.provider === "mailchimp"
                ? "The audience ID is in Audience settings. The API key includes the datacenter suffix, such as -us21."
                : "In Kit, open the form you want and copy its numeric ID."}
            </p>
          </div>
          <div className="space-y-2">
            <Button type="button" variant="outline" size="sm" disabled={testing} onClick={onTest}>
              {testing ? "Testing…" : "Test connection"}
            </Button>
            {testMessage && (
              <p className={`text-[10px] ${testMessage.ok ? "text-[#0f766e]" : "text-red-600"}`}>
                {testMessage.text}
              </p>
            )}
          </div>
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
