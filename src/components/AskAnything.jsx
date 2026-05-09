import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, X, Send, KeyRound, Loader2, MessageSquare, ExternalLink } from 'lucide-react';
import Anthropic from '@anthropic-ai/sdk';
import { COLUMN_KEYS, isAcquisitionParent } from '../data/mockData';

// Bring-your-own-key — the dashboard never sees the key, never sends it
// anywhere except directly to api.anthropic.com from the user's browser.
// We use the SDK's dangerouslyAllowBrowser flag knowingly; the dashboard
// is a single-user CEO tool, so the localStorage tradeoff is acceptable.
const KEY_STORAGE = 'dlt.anthropicKey.v1';

// Always use Opus 4.7 per project policy. The dataset is small (a few
// hundred rows ≈ 30K tokens) and the system prompt is identical between
// queries in a chat session, so prompt caching makes repeat questions
// effectively free on cached tokens.
const MODEL = 'claude-opus-4-7';

// Compact TSV serializer. We intentionally lose the parent/child deal
// hierarchy here — for Q&A purposes a flat row-per-event view is what
// the model needs, and aggregation is handled in the answer.
function rowsToContext(rows) {
  const header = [
    'brand', 'launchType', 'date', 'seller', 'buyer', 'dealType',
    'molecule', 'therapy', 'indication', 'marketSize_Cr', 'dealValue_Cr',
    'chronicAcute', 'price',
  ].join('\t');
  const lines = [header];
  for (const r of rows) {
    if (isAcquisitionParent(r)) continue;
    const cells = [
      r[COLUMN_KEYS.BRAND],
      r[COLUMN_KEYS.LAUNCH_TYPE],
      r[COLUMN_KEYS.DATE],
      r[COLUMN_KEYS.SELLER],
      r[COLUMN_KEYS.BUYER],
      r[COLUMN_KEYS.DEAL_TYPE],
      r[COLUMN_KEYS.MOLECULE],
      r[COLUMN_KEYS.THERAPY],
      r[COLUMN_KEYS.INDICATION],
      r[COLUMN_KEYS.MARKET_SIZE],
      r[COLUMN_KEYS.DEAL_VALUE],
      r[COLUMN_KEYS.CHRONIC_ACUTE],
      r[COLUMN_KEYS.PRICING],
    ];
    lines.push(
      cells
        .map((v) => String(v ?? '').replace(/[\t\n\r]+/g, ' '))
        .join('\t')
    );
  }
  return lines.join('\n');
}

const SYSTEM_PROMPT_HEADER = `You are an analyst for an India-pharma drug launch tracker. The user is a CEO or executive — answer concisely with markdown (bullet lists, **bold**, tables when comparing).

Rules:
  - Use ONLY the data below. If it doesn't contain the answer, say so explicitly.
  - Format INR values with ₹. Use ₹X Cr for amounts ≥ 1 crore.
  - For rankings/lists, return top 5 by default. Cite specific brand and company names from the data.
  - Don't speculate beyond the data — no general industry knowledge.
  - Skip preamble. Lead with the answer.

Dataset: tab-separated, one launch event per row. Columns: brand, launchType, date (ISO), seller, buyer, dealType, molecule, therapy, indication, marketSize_Cr (India TAM in ₹Cr), dealValue_Cr (deal consideration in ₹Cr), chronicAcute, price (string with currency + pack).

`;

const SUGGESTED_PROMPTS = [
  'Top 5 brands by India TAM',
  'Which oncology launches happened in 2026?',
  'Compare Sun Pharma vs Cipla launch volume',
  'Largest acquired brand portfolio?',
];

export default function AskAnything({ allRows = [], isOpen, onClose }) {
  const [apiKey, setApiKey] = useState(() => {
    try {
      return window.localStorage.getItem(KEY_STORAGE) || '';
    } catch {
      return '';
    }
  });
  const [showKeyInput, setShowKeyInput] = useState(() => !apiKey);
  const [keyDraft, setKeyDraft] = useState('');
  const [question, setQuestion] = useState('');
  // Conversation history. {role: 'user'|'assistant', content: string, error?: bool}
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  // Pre-serialize the dataset once per row-set change; identical context
  // bytes across queries is what makes prompt caching engage.
  const dataContext = useMemo(() => rowsToContext(allRows), [allRows]);

  // Focus the input when the modal opens, and clean up any in-flight
  // stream if the modal is closed mid-answer.
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Defer one tick so the modal mount completes before focus moves.
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!isOpen && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [isOpen]);

  // Auto-scroll to bottom on new messages / streaming deltas.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveKey = () => {
    const trimmed = keyDraft.trim();
    if (!trimmed) return;
    try {
      window.localStorage.setItem(KEY_STORAGE, trimmed);
    } catch {
      /* ignore */
    }
    setApiKey(trimmed);
    setKeyDraft('');
    setShowKeyInput(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const clearKey = () => {
    try {
      window.localStorage.removeItem(KEY_STORAGE);
    } catch {
      /* ignore */
    }
    setApiKey('');
    setShowKeyInput(true);
  };

  const ask = async (rawQuestion) => {
    const q = (rawQuestion ?? question).trim();
    if (!q || streaming || !apiKey) return;
    setQuestion('');
    setStreaming(true);

    // Build the new conversation history first so the API sees the same
    // turn shape we're rendering. We append a placeholder assistant
    // message that gets filled in as text deltas stream.
    const nextHistory = [
      ...messages.filter((m) => !m.error),
      { role: 'user', content: q },
    ];
    setMessages([...nextHistory, { role: 'assistant', content: '' }]);

    // dangerouslyAllowBrowser is required to call the API directly from
    // the browser. Ok here because the user supplies their own key.
    const client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    try {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        // Cache the (large) data context — first question pays the
        // write premium; subsequent questions in the same 5-min window
        // read at ~10% of the per-token cost.
        system: [
          {
            type: 'text',
            text: `${SYSTEM_PROMPT_HEADER}${dataContext}`,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
      });

      let answerText = '';
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          answerText += event.delta.text;
          setMessages((prev) => {
            const copy = prev.slice();
            copy[copy.length - 1] = { role: 'assistant', content: answerText };
            return copy;
          });
        }
      }
    } catch (err) {
      // Surface the real error message so the user can fix obvious
      // issues (bad key, rate limit) without the UI swallowing them.
      const msg = err?.message || String(err) || 'Unknown error';
      setMessages((prev) => {
        const copy = prev.slice();
        copy[copy.length - 1] = {
          role: 'assistant',
          content: `**Error:** ${msg}`,
          error: true,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setQuestion('');
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 animate-[fadeIn_120ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label="Ask anything"
    >
      <div
        className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-ink-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pharma-500 to-teal-accent flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-ink-900">Ask anything</h2>
            <p className="text-[11px] text-ink-500 truncate">
              Powered by Claude Opus 4.7 ·{' '}
              <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-ink-100 text-ink-700">⌘K</kbd>{' '}
              to toggle ·{' '}
              <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-ink-100 text-ink-700">Esc</kbd>{' '}
              to close
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={reset}
              className="text-[11px] font-semibold text-ink-500 hover:text-ink-900 transition px-2 py-1"
            >
              New chat
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg hover:bg-ink-100/60 flex items-center justify-center text-ink-500 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* API key prompt */}
        {showKeyInput && (
          <div className="px-5 py-4 bg-amber-50 border-b border-amber-200">
            <div className="flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-900">
                  Bring your own Anthropic API key
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                  Stored locally in your browser only · never sent to our servers · queries go directly from your browser to api.anthropic.com.{' '}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-0.5 text-amber-900 font-semibold hover:underline"
                  >
                    Get a key <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
                <form
                  className="flex items-center gap-2 mt-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveKey();
                  }}
                >
                  <input
                    type="password"
                    placeholder="sk-ant-api03-…"
                    value={keyDraft}
                    onChange={(e) => setKeyDraft(e.target.value)}
                    className="flex-1 text-xs bg-white border border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!keyDraft.trim()}
                    className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Conversation */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[220px]"
        >
          {messages.length === 0 && !streaming && (
            <div className="text-center py-10">
              <MessageSquare className="w-8 h-8 text-ink-300 mx-auto mb-2" />
              <p className="text-xs text-ink-500 mb-3">
                Ask anything about the launches in scope.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 max-w-md mx-auto">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      if (apiKey) ask(p);
                      else {
                        setQuestion(p);
                      }
                    }}
                    disabled={streaming}
                    className="text-[11px] text-pharma-700 bg-pharma-50 border border-pharma-200 hover:bg-pharma-100 px-2.5 py-1 rounded-full transition disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-pharma-500 to-teal-accent text-white rounded-br-sm shadow-sm'
                    : m.error
                      ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-sm'
                      : 'bg-ink-100/80 text-ink-900 rounded-bl-sm'
                }`}
              >
                {m.content || (streaming && i === messages.length - 1 && (
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce [animation-delay:240ms]" />
                  </span>
                ))}
                {streaming && i === messages.length - 1 && m.content && (
                  <span className="inline-block w-1.5 h-4 align-middle ml-0.5 bg-current animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input bar */}
        <div className="px-5 py-3 border-t border-ink-100 bg-ink-50/30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                !apiKey
                  ? 'Add your API key first'
                  : streaming
                    ? 'Thinking…'
                    : 'Ask about your launch portfolio…'
              }
              disabled={!apiKey || streaming}
              className="flex-1 text-sm bg-white border border-ink-200 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-pharma-300 focus:border-pharma-400 disabled:bg-ink-100 disabled:text-ink-400 transition"
            />
            <button
              type="submit"
              disabled={!apiKey || streaming || !question.trim()}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-pharma-500 to-teal-accent text-white shadow-sm hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              aria-label="Send"
            >
              {streaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>
          {apiKey && !showKeyInput && (
            <div className="mt-1.5 flex items-center justify-between">
              <button
                onClick={() => setShowKeyInput(true)}
                className="text-[10px] text-ink-400 hover:text-ink-700 transition"
              >
                Change API key
              </button>
              <button
                onClick={clearKey}
                className="text-[10px] text-ink-400 hover:text-rose-600 transition"
              >
                Forget key
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
