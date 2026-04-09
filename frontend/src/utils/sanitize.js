import DOMPurify from "dompurify";

export const sanitizeHtml = (html) => {
  if (!html) return '';
  return DOMPurify.sanitize(html, { 
    ALLOWED_TAGS: ['strong', 'b', 'i', 'em', 'br', 'p', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
};

export const formatContent = (text) => {
  if (!text) return '';
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '<br/>• ')
    .replace(/\n\d\. /g, (match) => '<br/>' + match.trim() + ' ')
    .replace(/\n/g, '<br/>');
  return sanitizeHtml(formatted);
};
