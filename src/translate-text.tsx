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

export default function TranslateText() {
  const [isLoading, setIsLoading] = useState(false);
  const [translation, setTranslation] = useState<string>("");

  const { apiKey, endpoint: rawEndpoint, model: rawModel } = getPreferenceValues<Preferences>();
  const endpoint = rawEndpoint || "https://api.openai.com/v1";
  const model = rawModel || "gpt-4o-mini";

  useEffect(() => {
    (async () => {
      try {
        const sel = await getSelectedText();
        if (!sel || sel.trim().length === 0) {
          await showToast({ style: Toast.Style.Failure, title: "No selected text" });
          return;
        }
        await translate(sel);
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "No selected text" });
      }
    })();
  }, []);

  async function translate(text: string) {
    if (!text.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "No text to translate" });
      return;
    }

    setIsLoading(true);
    setTranslation("");
    try {
      const client = new OpenAI({ apiKey, baseURL: endpoint });

      const systemMessage = `You are a professional translator. Detect whether the user's text is Japanese or English. If Japanese, translate to English. If English, translate to Japanese.
Rules:
- Preserve meaning, tone, and formatting (line breaks, lists)
- Keep numbers, names, URLs unchanged
- Output ONLY the translation, no extra text, no code blocks`;

      const resp = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: text },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      });

      const content = resp.choices?.[0]?.message?.content?.trim() ?? "";
      if (!content) {
        throw new Error("No translation generated");
      }
      setTranslation(content);
      await showToast({ style: Toast.Style.Success, title: "Translated" });
    } catch (error) {
      console.error("Translate Error:", error);
      const message = error instanceof Error ? error.message : "Translation failed";
      await showToast({ style: Toast.Style.Failure, title: "Translation failed", message });
    } finally {
      setIsLoading(false);
    }
  }

  function DetailView() {
    const markdown = translation || "Translating...";
    return (
      <Detail
        isLoading={isLoading}
        markdown={markdown}
        actions={
          <ActionPanel>
            {translation && (
              <Action
                title="Copy Translation"
                icon={Icon.CopyClipboard}
                onAction={async () => {
                  await Clipboard.copy(translation);
                  await showToast({ style: Toast.Style.Success, title: "Copied to clipboard" });
                }}
              />
            )}
            {translation && <Action.Paste title="Replace Selection with Translation" content={translation} />}
          </ActionPanel>
        }
      />
    );
  }

  return <DetailView />;
}
