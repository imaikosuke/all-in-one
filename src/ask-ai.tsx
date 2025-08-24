import { useState } from "react";
import { ActionPanel, Action, Form, getPreferenceValues, showToast, Toast, Icon, Clipboard } from "@raycast/api";
import OpenAI from "openai";

interface Preferences {
  apiKey: string;
  endpoint: string;
  model: string;
  language: string;
}

export default function AskAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState<string>("");

  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;
  const endpoint = preferences.endpoint || "https://api.openai.com/v1";
  const model = preferences.model || "gpt-4o-mini";
  const language = preferences.language || "Japanese";

  const handleSubmit = async (values: { question: string }) => {
    if (!values.question.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a question",
      });
      return;
    }

    setIsLoading(true);
    setAnswer("");

    try {
      const openai = new OpenAI({ apiKey, baseURL: endpoint });

      const systemMessage = `You are a helpful and knowledgeable AI assistant. Please answer the user's question clearly in ${language}. Keep your answers concise and practical.`;

      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: values.question },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const aiAnswer = response.choices[0].message.content || "Sorry, I couldn't generate an answer.";
      setAnswer(aiAnswer);
    } catch (error) {
      console.error("AI API Error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "An error occurred",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
    });
  };

  const clearAnswer = () => {
    setAnswer("");
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Question" icon={Icon.Message} onSubmit={handleSubmit} />
          {answer && (
            <>
              <Action
                title="Clear Answer"
                icon={Icon.Trash}
                onAction={clearAnswer}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
              <Action
                title="Copy Answer"
                icon={Icon.CopyClipboard}
                onAction={() => copyToClipboard(answer)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField id="question" title="Question" placeholder="Ask anything..." />

      {answer && <Form.Description title="AI Answer" text={answer} />}
    </Form>
  );
}
