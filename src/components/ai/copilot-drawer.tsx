import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Send, Loader2, User } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { askCopilot } from "@/lib/copilot.functions";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_ACTIONS = ["Screen Candidate", "Draft Outreach", "Suggest Interview Questions"];

export function CopilotPanel({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm the Staffinix Copilot. I read your requisitions, bench and pipeline, and I never invent facts. Ask me anything.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const askCopilotFn = useServerFn(askCopilot);

  async function send(text: string) {
    const value = text.trim();
    if (!value || loading) return;
    setMessages((m) => [...m, { role: "user", content: value }]);
    setInput("");
    setLoading(true);
    try {
      const response = await askCopilotFn({ data: { question: value } });
      setMessages((m) => [...m, { role: "assistant", content: response.answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "I couldn't retrieve an authorized answer. Please try again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", compact && "h-full")}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
        {messages.map((m, i) => (
          <div key={i} className="flex gap-2.5">
            <div
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
                m.role === "assistant"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-surface-2 text-muted-foreground",
              )}
            >
              {m.role === "assistant" ? (
                <Bot className="h-3.5 w-3.5" />
              ) : (
                <User className="h-3.5 w-3.5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                {m.role === "assistant" ? "Copilot" : "You"}
              </p>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {renderMarkdown(m.content)}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Retrieving grounded context…
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void send(q)}
              disabled={loading}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about candidates, reqs or pipeline…"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground">
          Read-only assistant · never executes writes
        </p>
      </div>
    </div>
  );
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const bold = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={j} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={j}>{part.replace(/_/g, "")}</span>
      ),
    );
    return (
      <p key={i} className={cn(line.trim() === "" && "h-2")}>
        {bold}
      </p>
    );
  });
}

export function CopilotDrawer({ children }: { children?: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs font-semibold border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 shadow-sm transition-all"
            aria-label="Open AI Copilot"
          >
            <Bot className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">AI Copilot</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border pb-3">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> AI Copilot
            <Badge variant="outline" className="ml-auto text-[10px]">
              RAG · read-only
            </Badge>
          </SheetTitle>
        </SheetHeader>
        <CopilotPanel compact />
      </SheetContent>
    </Sheet>
  );
}
