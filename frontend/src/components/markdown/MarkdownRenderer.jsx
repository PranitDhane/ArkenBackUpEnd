/**
 * MarkdownRenderer Component
 * 
 * Renders markdown content with support for tables, code blocks, etc.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Custom code block with copy button
function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') || '';
  const code = String(children).replace(/\n$/, '');
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative group my-2">
      {language && (
        <div className="absolute top-0 left-0 px-2 py-1 text-xs text-content-secondary bg-surface-tertiary rounded-tl-md rounded-br-md">
          {language}
        </div>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-surface-tertiary hover:bg-border opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy code"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-600" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-content-secondary" />
        )}
      </button>
      <pre className={`bg-gray-800 dark:bg-gray-900 text-gray-100 rounded-md p-4 overflow-x-auto text-sm ${language ? 'pt-8' : ''}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Custom table component
function Table({ children }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-border text-sm">
        {children}
      </table>
    </div>
  );
}

function TableHead({ children }) {
  return <thead className="bg-surface-secondary">{children}</thead>;
}

function TableRow({ children }) {
  return <tr className="border-b border-border hover:bg-surface-secondary">{children}</tr>;
}

function TableCell({ children, isHeader }) {
  const Component = isHeader ? 'th' : 'td';
  return (
    <Component className={`border border-border px-3 py-2 text-left ${isHeader ? 'font-semibold bg-surface-secondary' : ''}`}>
      {children}
    </Component>
  );
}

export default function MarkdownRenderer({ content }) {
  const navigate = useNavigate();
  
  if (!content) return null;
  
  // Custom link component that handles internal navigation
  function LinkRenderer({ href, children }) {
    const handleClick = (e) => {
      // Check if this is an internal /results/ link
      if (href && href.includes('/results/')) {
        e.preventDefault();
        
        // Extract the path from the full URL or use as-is if it's already a path
        let path = href;
        try {
          const url = new URL(href);
          path = url.pathname; // Extract just the path from full URL
        } catch {
          // href is already a relative path, use it directly
        }
        
        // Navigate using React Router
        navigate(path);
      }
      // For external links, let the default behavior happen (open in new tab)
    };
    
    const isInternalResultLink = href && href.includes('/results/');
    
    return (
      <a
        href={href}
        onClick={handleClick}
        target={isInternalResultLink ? undefined : "_blank"}
        rel={isInternalResultLink ? undefined : "noopener noreferrer"}
        className="text-primary hover:text-primary-hover underline cursor-pointer"
      >
        {children}
      </a>
    );
  }
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Code blocks
        code({ node, inline, className, children, ...props }) {
          if (inline) {
            return (
              <code className="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          }
          return <CodeBlock className={className}>{children}</CodeBlock>;
        },
        
        // Pre (wraps code blocks) - render as fragment to prevent p > pre nesting
        pre({ children }) {
          return <>{children}</>;
        },
        
        // Tables
        table: Table,
        thead: TableHead,
        tr: TableRow,
        th: ({ children }) => <TableCell isHeader>{children}</TableCell>,
        td: ({ children }) => <TableCell>{children}</TableCell>,
        
        // Links - use custom handler for internal navigation
        a: LinkRenderer,
        
        // Paragraphs - avoid wrapping block-level elements
        p({ children, node }) {
          // Check if paragraph contains any child that will render as a block element
          // This includes code blocks, divs, pre tags, tables, etc.
          const hasBlockChild = Array.isArray(children) && children.some(child => {
            // Check if it's a React element (component)
            if (child?.type) {
              // CodeBlock component renders a div
              if (child.type === CodeBlock || child.type?.name === 'CodeBlock') {
                return true;
              }
              // Check for other block-level components
              if (typeof child.type === 'string' && ['div', 'pre', 'table', 'blockquote'].includes(child.type)) {
                return true;
              }
            }
            return false;
          });
          
          // Also check the node's children from the AST
          const nodeHasBlockElement = node?.children?.some(
            child => child.type === 'element' && 
            ['pre', 'div', 'table', 'blockquote', 'code'].includes(child.tagName)
          );
          
          // If it contains block elements, render as div to maintain valid HTML
          if (hasBlockChild || nodeHasBlockElement) {
            return <div className="mb-2 last:mb-0">{children}</div>;
          }
          
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        
        // Lists
        ul({ children }) {
          return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
        },
        
        // Headers
        h1({ children }) {
          return <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base font-bold mb-2 mt-2">{children}</h3>;
        },
        
        // Blockquote
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-border pl-4 italic text-content-secondary my-2">
              {children}
            </blockquote>
          );
        },
        
        // Horizontal rule - very subtle, almost invisible
        hr() {
          return <hr className="my-4 border-0 h-px" style={{ backgroundColor: 'rgba(128, 128, 128, 0.15)' }} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
