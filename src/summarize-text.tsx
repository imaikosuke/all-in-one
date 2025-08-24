import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Toast,
  getPreferenceValues,
  getSelectedText,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import OpenAI from "openai";

interface Preferences {
  apiKey: string;
  endpoint: string;
  model: string;
}

export default function SummarizeText() {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");

  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;
  const endpoint = preferences.endpoint || "https://api.openai.com/v1";
  const model = preferences.model || "gpt-4o-mini";

  const summarize = async () => {
    try {
      setIsLoading(true);
      setSummary("");

      const text = await getSelectedText();

      const openai = new OpenAI({ apiKey, baseURL: endpoint });
      const systemMessage = `You are an expert at summarizing text in Japanese. Please summarize the user's text in Japanese.
Output rules:
- Use only Japanese
- Output 3-10 bullet points
- Each bullet MUST be a single line starting with "- "
- Retain all specific numbers, names, dates, and URLs
- Do not add any new information or opinions
- Output bullets only, no preface or suffix`;

      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: text },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices?.[0]?.message?.content?.trim() ?? "";
      if (!content) {
        throw new Error("No summary generated");
      }

      setSummary(content);
      await showToast({ style: Toast.Style.Success, title: "Summarized" });
    } catch (error) {
      console.error("Summarize Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Summarize failed";
      await showToast({ style: Toast.Style.Failure, title: "Summarize failed", message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    summarize();
  }, []);

  const markdown = summary || "Summarizing...";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {summary && (
            <Action
              title="Copy Summary"
              icon={Icon.CopyClipboard}
              onAction={async () => {
                await Clipboard.copy(summary);
                await showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
