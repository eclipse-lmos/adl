
'use client';

import React, { useMemo, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';

const HtmlHighlighter = {
  highlight(line: string): (string | JSX.Element)[] {
    const parts = line.split(/(<[^>]+>)/g); // Split by tags.
    return parts.map((part, i) => {
      if (!part) return null;

      if (part.startsWith('<') && part.endsWith('>')) {
        const content = part.slice(1, -1);
        const partsWithinTag = content.split(/([\w\-\:]+="[^"]*")/g);

        return (
          <span key={i} className="text-gray-500">
            {'<'}
            {partsWithinTag.map((p, j) => {
              if (j === 0) { // This part contains the tag name.
                const tagNameMatch = p.match(/^\/?[\w\-\:]+/);
                if (tagNameMatch) {
                  const tagName = tagNameMatch[0];
                  const rest = p.substring(tagName.length);
                  return <span key={j}><span className="text-blue-400">{tagName}</span>{rest}</span>;
                }
                return <span key={j}>{p}</span>;
              }
              if (/[\w\-\:]+="[^"]*"/.test(p)) {
                const [key, val] = p.split('=', 2);
                return (
                  <span key={j}>
                    <span className="text-yellow-500">{key}</span>
                    <span className="text-gray-500">=</span>
                    <span className="text-green-500">{val}</span>
                  </span>
                )
              }
              return <span key={j}>{p}</span>;
            })}
            {'>'}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }
};

type HtmlEditorProps = {
  html: string;
  onHtmlChange: (value: string) => void;
};

export default function HtmlEditor({ html, onHtmlChange }: HtmlEditorProps) {
  const highlighterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleScroll = () => {
    if (highlighterRef.current && textareaRef.current) {
      highlighterRef.current.scrollTop = textareaRef.current.scrollTop;
      highlighterRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onHtmlChange(e.target.value);
  };

  const highlightedHtml = useMemo(() => {
    const lines = html.split('\n');
    return lines.map((line, index) => {
      const content = HtmlHighlighter.highlight(line);
      return (
        <React.Fragment key={index}>
          {content}
          {index < lines.length - 1 ? '\n' : ''}
        </React.Fragment>
      );
    });
  }, [html]);

  return (
    <div className="relative h-full">
      <div
        ref={highlighterRef}
        className="absolute inset-0 z-10 px-3 py-2 font-mono text-sm rounded-lg whitespace-pre-wrap pointer-events-none overflow-auto no-scrollbar"
        aria-hidden="true"
      >
        {highlightedHtml}
        {' '}
      </div>
      <Textarea
        ref={textareaRef}
        value={html}
        onChange={handleTextChange}
        onScroll={handleScroll}
        placeholder="Enter your HTML here..."
        className="relative w-full h-full resize-none font-mono text-sm rounded-lg bg-transparent text-transparent caret-foreground p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-2"
        spellCheck="false"
      />
    </div>
  );
}
