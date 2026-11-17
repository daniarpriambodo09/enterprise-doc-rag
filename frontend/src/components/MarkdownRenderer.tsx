"use client";

import React, { useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

const BR_REGEX = /(<br\s*\/?>)/gi;

function formatChildrenWithBreaks(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      if (!BR_REGEX.test(child)) {
        BR_REGEX.lastIndex = 0;
        return child;
      }
      BR_REGEX.lastIndex = 0;
      const parts = child.split(BR_REGEX);
      return parts.map((part, idx) => {
        if (BR_REGEX.test(part)) {
          BR_REGEX.lastIndex = 0;
          return (
            <React.Fragment key={idx}>
              <br />
              <span className="block h-1.5" aria-hidden="true" />
            </React.Fragment>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      });
    }

    if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
      // Jangan ubah isi di dalam inline code atau code block
      if (child.type === "code" || child.type === "pre" || child.type === CodeBlock) {
        return child;
      }
      if (child.props.children) {
        return React.cloneElement(child, {
          children: formatChildrenWithBreaks(child.props.children),
        });
      }
    }

    return child;
  });
}

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const codeText = String(children ?? "").replace(/\n$/, "");
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/70 bg-slate-900 dark:bg-slate-950/90 shadow-inner">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800 dark:bg-slate-900/90 border-b border-slate-700 dark:border-slate-800 text-[11px] text-slate-300 dark:text-slate-400">
        <span className="font-mono uppercase tracking-wider">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-300 hover:text-white dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Disalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1.5 border-b border-slate-200 dark:border-slate-800/80 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-indigo-700 dark:text-indigo-200 mt-4 mb-2 first:mt-0 flex items-center gap-2">
      <span className="w-1 h-4 rounded-full bg-indigo-500 inline-block shrink-0" />
      <span>{children}</span>
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-3 mb-1.5 first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-7 text-slate-700 dark:text-slate-200/95 mb-3 last:mb-0">
      {formatChildrenWithBreaks(children)}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-3 space-y-1.5 text-sm text-slate-700 dark:text-slate-200/95 marker:text-indigo-500 dark:marker:text-indigo-400">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-3 space-y-1.5 text-sm text-slate-700 dark:text-slate-200/95 marker:text-indigo-600 dark:marker:text-indigo-400 marker:font-semibold">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-6 pl-0.5">{formatChildrenWithBreaks(children)}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-950 dark:text-white">
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-600 dark:text-slate-300">{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 pl-4 pr-3 py-2 border-l-2 border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/25 rounded-r-lg text-slate-700 dark:text-slate-300 text-sm italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-slate-200 dark:border-slate-800" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-2 transition"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className) || String(children).includes("\n");
    if (isBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-indigo-700 dark:bg-slate-800/90 dark:border-slate-700/60 dark:text-indigo-300 font-mono text-[12px]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-950/70 shadow-sm dark:shadow-md">
      <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 dark:bg-slate-800/90 dark:text-slate-200 dark:border-slate-700/80">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-indigo-700 dark:text-indigo-200 whitespace-nowrap">
      {formatChildrenWithBreaks(children)}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 align-top leading-relaxed">
      {formatChildrenWithBreaks(children)}
    </td>
  ),
};

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
