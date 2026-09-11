"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import DOMPurify from "dompurify";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link2,
  Unlink,
  Code,
  Eye,
  RemoveFormatting,
  Heading2,
  Heading3,
  Check,
  X,
} from "lucide-react";

export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") {
    return dirty.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "h2",
      "h3",
      "h4",
      "p",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "div",
      "span",
      "br",
      "code",
      "pre",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
}

interface WysiwygEditorProps {
  value: string;
  onChange: (sanitizedValue: string) => void;
  placeholder?: string;
}

export function WysiwygEditor({
  value,
  onChange,
  placeholder = "Write your rich page content here...",
}: WysiwygEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [rawHtml, setRawHtml] = useState(value);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const savedSelectionRange = useRef<Range | null>(null);

  // Sync incoming value to visual canvas when not focused or on initial load
  useEffect(() => {
    if (editorRef.current && mode === "visual") {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value, mode]);

  const switchMode = (newMode: "visual" | "html") => {
    if (newMode === "html") {
      setRawHtml(editorRef.current?.innerHTML || value);
    } else {
      if (editorRef.current) {
        editorRef.current.innerHTML = rawHtml || value;
      }
    }
    setMode(newMode);
  };

  const handleVisualInput = useCallback(() => {
    if (!editorRef.current) return;
    const dirty = editorRef.current.innerHTML;
    const clean = sanitizeHtml(dirty);
    setRawHtml(clean);
    onChange(clean);
  }, [onChange]);

  const handleRawHtmlChange = (newHtml: string) => {
    setRawHtml(newHtml);
    const clean = sanitizeHtml(newHtml);
    onChange(clean);
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (mode !== "visual" || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, arg);
    handleVisualInput();
  };

  const openLinkDialog = () => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRange.current = sel.getRangeAt(0).cloneRange();
      const text = sel.toString();
      setLinkText(text);
    } else {
      savedSelectionRange.current = null;
      setLinkText("");
    }
    setLinkUrl("");
    setShowLinkModal(true);
  };

  const applyLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    if (editorRef.current) {
      editorRef.current.focus();
      if (savedSelectionRange.current && typeof window !== "undefined") {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(savedSelectionRange.current);
        }
      }

      const formattedUrl =
        linkUrl.startsWith("http://") ||
        linkUrl.startsWith("https://") ||
        linkUrl.startsWith("/")
          ? linkUrl
          : `https://${linkUrl}`;

      if (linkText && savedSelectionRange.current?.collapsed) {
        // Insert new linked text
        const anchor = document.createElement("a");
        anchor.href = formattedUrl;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.innerText = linkText;
        savedSelectionRange.current.insertNode(anchor);
      } else {
        document.execCommand("createLink", false, formattedUrl);
        // Ensure secure rel and target on created anchor
        const anchors = editorRef.current.getElementsByTagName("a");
        for (let i = 0; i < anchors.length; i++) {
          if (anchors[i].href === formattedUrl || anchors[i].getAttribute("href") === formattedUrl) {
            anchors[i].target = "_blank";
            anchors[i].rel = "noopener noreferrer";
          }
        }
      }

      handleVisualInput();
    }

    setShowLinkModal(false);
  };

  const removeLink = () => {
    executeCommand("unlink");
  };

  return (
    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 focus-within:border-yellow-400/80 transition-colors shadow-inner">
      {/* Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 p-2 flex flex-wrap items-center justify-between gap-1.5 text-xs text-slate-300">
        <div className="flex flex-wrap items-center gap-1">
          {/* Headings */}
          <button
            type="button"
            title="Heading 2"
            disabled={mode === "html"}
            onClick={() => executeCommand("formatBlock", "<h2>")}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-yellow-400 disabled:opacity-40 transition"
          >
            <Heading2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Heading 3"
            disabled={mode === "html"}
            onClick={() => executeCommand("formatBlock", "<h3>")}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-yellow-400 disabled:opacity-40 transition"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-1" />

          {/* Inline styles */}
          <button
            type="button"
            title="Bold (Ctrl+B)"
            disabled={mode === "html"}
            onClick={() => executeCommand("bold")}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-yellow-400 disabled:opacity-40 transition font-bold"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Italic (Ctrl+I)"
            disabled={mode === "html"}
            onClick={() => executeCommand("italic")}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-yellow-400 disabled:opacity-40 transition"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Underline (Ctrl+U)"
            disabled={mode === "html"}
            onClick={() => executeCommand("underline")}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-yellow-400 disabled:opacity-40 transition"
          >
            <Underline className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Strikethrough"
            disabled={mode === "html"}
            onClick={() => executeCommand("strikeThrough")}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-yellow-400 disabled:opacity-40 transition"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-1" />

          {/* Lists */}
          <button
            type="button"
            title="Bulleted List"
            disabled={mode === "html"}
            onClick={() => executeCommand("insertUnorderedList")}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-yellow-400 disabled:opacity-40 transition"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Numbered List"
            disabled={mode === "html"}
            onClick={() => executeCommand("insertOrderedList")}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-yellow-400 disabled:opacity-40 transition"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Blockquote"
            disabled={mode === "html"}
            onClick={() => executeCommand("formatBlock", "<blockquote>")}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-yellow-400 disabled:opacity-40 transition"
          >
            <Quote className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-1" />

          {/* Hyperlinks */}
          <button
            type="button"
            title="Insert Secure Link"
            disabled={mode === "html"}
            onClick={openLinkDialog}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-yellow-400 disabled:opacity-40 transition"
          >
            <Link2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Remove Link"
            disabled={mode === "html"}
            onClick={removeLink}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-rose-400 disabled:opacity-40 transition"
          >
            <Unlink className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Clear Formatting"
            disabled={mode === "html"}
            onClick={() => executeCommand("removeFormat")}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-100 disabled:opacity-40 transition"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Toggle (Visual vs Code) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => switchMode("visual")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
              mode === "visual"
                ? "bg-yellow-400 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Visual</span>
          </button>

          <button
            type="button"
            onClick={() => switchMode("html")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
              mode === "html"
                ? "bg-yellow-400 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Code className="w-3 h-3" />
            <span>HTML</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {mode === "visual" ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleVisualInput}
          data-placeholder={placeholder}
          className="p-4 min-h-[220px] max-h-[500px] overflow-y-auto text-xs text-slate-200 leading-relaxed focus:outline-none 
            prose prose-invert prose-yellow max-w-none
            [&>h2]:text-lg [&>h2]:font-extrabold [&>h2]:text-white [&>h2]:mt-3 [&>h2]:mb-1.5
            [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-yellow-400 [&>h3]:mt-2.5 [&>h3]:mb-1
            [&>p]:mb-2 [&>p]:leading-relaxed
            [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2 [&>ul]:space-y-1
            [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-2 [&>ol]:space-y-1
            [&>blockquote]:border-l-4 [&>blockquote]:border-yellow-400 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:text-slate-400 [&>blockquote]:my-2
            [&>a]:text-yellow-400 [&>a]:underline hover:[&>a]:text-yellow-300
            empty:before:content-[attr(data-placeholder)] empty:before:text-slate-600 empty:before:pointer-events-none"
        />
      ) : (
        <textarea
          rows={10}
          value={rawHtml}
          onChange={(e) => handleRawHtmlChange(e.target.value)}
          placeholder="Enter sanitized HTML markup..."
          className="w-full p-4 min-h-[220px] font-mono text-xs bg-slate-950 text-slate-300 focus:outline-none leading-relaxed"
        />
      )}

      {/* Secure Link Insert Modal */}
      {showLinkModal && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2 text-xs">
          <input
            type="text"
            placeholder="Display Text (optional)"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
          />
          <input
            type="text"
            placeholder="URL (e.g. https://... or /gigs)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={applyLink}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLinkModal(false)}
              className="text-slate-400 hover:text-white p-1.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
