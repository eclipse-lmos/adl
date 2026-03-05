'use client';

import React, { useMemo, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';

const JsonHighlighter = {
  highlight(line: string): (string | JSX.Element)[] {
    // Basic JSON highlighting regex-based split
    const parts = line.split(/("(?:\\.|[^"])*"|[:{},\[\]]|\d+|true|false|null)/g);
    return parts.map((part, i) => {
      if (!part) return null;

      if (part.startsWith('"') && part.endsWith('"')) {
        // Look ahead for colon to identify keys
        const nextPart = parts[i + 1]?.trim();
        if (nextPart === ':') {
          return <span key={i} className="text-blue-400">{part}</span>;
        }
        return <span key={i} className="text-green-500">{part}</span>;
      }
      if (/^\d+$/.test(part)) return <span key={i} className="text-orange-400">{part}</span>;
      if (part === 'true' || part === 'false') return <span key={i} className="text-purple-400">{part}</span>;
      if (part === 'null') return <span key={i} className="text-gray-400">{part}</span>;
      if (['{', '}', '[', ']', ':', ','].includes(part)) return <span key={i} className="text-gray-500">{part}</span>;

      return <span key={i}>{part}</span>;
    });
  }
};

type JsonEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function JsonEditor({ value, onChange }: JsonEditorProps) {
  const highlighterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleScroll = () => {
    if (highlighterRef.current && textareaRef.current) {
      highlighterRef.current.scrollTop = textareaRef.current.scrollTop;
      highlighterRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const highlightedJson = useMemo(() => {
    const lines = value.split('\n');
    return lines.map((line, index) => {
      const content = JsonHighlighter.highlight(line);
      return (
        <React.Fragment key={index}>
          {content}
          {index < lines.length - 1 ? '\n' : ''}
        </React.Fragment>
      );
    });
  }, [value]);

  return (
    <div className="relative h-full">
      <div
        ref={highlighterRef}
        className="absolute inset-0 z-10 px-4 py-4 font-mono text-sm rounded-lg whitespace-pre-wrap pointer-events-none overflow-auto no-scrollbar"
        aria-hidden="true"
      >
        {highlightedJson}
        {' '}
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder='{ "type": "object", "properties": { ... } }'
        className="relative w-full h-full resize-none font-mono text-sm rounded-lg bg-transparent text-transparent caret-foreground p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-4"
        spellCheck="false"
      />
    </div>
  );
}
