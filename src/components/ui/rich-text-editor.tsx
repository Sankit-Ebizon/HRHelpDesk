"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

type Command =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "justifyLeft"
  | "justifyCenter"
  | "justifyRight"
  | "removeFormat";

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  function exec(command: Command) {
    editorRef.current?.focus();
    document.execCommand(command);
    onChange(editorRef.current?.innerHTML || "");
  }

  function applyFormatBlock(tag: "p" | "h3" | "blockquote") {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
    onChange(editorRef.current?.innerHTML || "");
  }

  function applyFontSize(size: "2" | "3" | "4" | "5") {
    editorRef.current?.focus();
    document.execCommand("fontSize", false, size);
    onChange(editorRef.current?.innerHTML || "");
  }

  function addLink() {
    editorRef.current?.focus();
    const url = window.prompt("Enter URL");
    if (!url) return;
    document.execCommand("createLink", false, url);
    onChange(editorRef.current?.innerHTML || "");
  }

  function removeLink() {
    editorRef.current?.focus();
    document.execCommand("unlink");
    onChange(editorRef.current?.innerHTML || "");
  }

  return (
    <div className="max-w-full overflow-hidden rounded-md border bg-background">
      <div className="flex flex-wrap items-center gap-1 overflow-x-auto border-b p-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormatBlock("p")}>Normal</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormatBlock("h3")}>H3</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => applyFormatBlock("blockquote")}>Quote</Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button type="button" variant="ghost" size="sm" onClick={() => exec("bold")}><strong>B</strong></Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => exec("italic")}><em>I</em></Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => exec("underline")}><u>U</u></Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => exec("strikeThrough")}><s>S</s></Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button type="button" variant="ghost" size="sm" onClick={() => exec("insertUnorderedList")}>• List</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => exec("insertOrderedList")}>1. List</Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button type="button" variant="ghost" size="sm" onClick={() => exec("justifyLeft")}>Left</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => exec("justifyCenter")}>Center</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => exec("justifyRight")}>Right</Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button type="button" variant="ghost" size="sm" onClick={() => applyFontSize("2")}>A-</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => applyFontSize("4")}>A</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => applyFontSize("5")}>A+</Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button type="button" variant="ghost" size="sm" onClick={addLink}>Link</Button>
        <Button type="button" variant="ghost" size="sm" onClick={removeLink}>Unlink</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => exec("removeFormat")}>Clear</Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        className="min-h-36 w-full p-3 text-sm leading-6 focus:outline-none"
        data-placeholder={placeholder || "Type here..."}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        suppressContentEditableWarning
      />
      <style jsx>{`
        div[contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
