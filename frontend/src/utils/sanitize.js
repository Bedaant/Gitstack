import DOMPurify from "dompurify";
import { marked } from "marked";

// Configure marked to be safer and more consistent
marked.setOptions({
  breaks: true,
  gfm: true
});

export const sanitizeHtml = (html) => {
  if (!html) return '';
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'strong', 'b', 'i', 'em', 'br', 'p', 'ul', 'ol', 'li', 'a',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'code', 'pre', 'blockquote', 'hr'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    // Force every <a> to open safely — prevents tab-napping
    FORCE_BODY: true,
  });
  // Post-process: ensure all <a> tags have rel="noopener noreferrer" and target="_blank"
  const div = document.createElement('div');
  div.innerHTML = clean;
  div.querySelectorAll('a').forEach(a => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
  return div.innerHTML;
};

export const formatContent = (text) => {
  if (!text) return '';
  try {
    const rawHtml = marked.parse(text);
    return sanitizeHtml(rawHtml);
  } catch (e) {
    console.error("Markdown parsing failed", e);
    return text;
  }
};
