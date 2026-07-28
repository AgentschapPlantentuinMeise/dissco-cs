import React from 'react';
import { useTranslation } from 'react-i18next';
import { LinkIcon } from '../icons/LinkIcon';
import { ImageIcon } from '../icons/ImageIcon';
import { ListIcon } from '../icons/ListIcon';

type MarkdownToolbarProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
};

function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (next: string) => void,
  before: string,
  after: string,
  placeholder: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  onChange(next);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
  });
}

function insertAtLineStart(textarea: HTMLTextAreaElement, value: string, onChange: (next: string) => void, prefix: string) {
  const start = textarea.selectionStart;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  onChange(next);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + prefix.length, start + prefix.length);
  });
}

// Reusable opmaak-werkbalk boven een Markdown-<textarea> — voegt syntax in op de
// cursorpositie i.p.v. een volledige WYSIWYG-editor te zijn, zodat de opslag een
// veilige platte Markdown-string blijft (geen HTML-sanitisatie nodig).
export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ textareaRef, value, onChange }) => {
  const { t } = useTranslation('dissco-cs');

  const withTextarea = (fn: (textarea: HTMLTextAreaElement) => void) => {
    const textarea = textareaRef.current;
    if (textarea) {
      fn(textarea);
    }
  };

  const applyBold = () =>
    withTextarea(ta => wrapSelection(ta, value, onChange, '**', '**', t('md_toolbar_bold_placeholder')));
  const applyItalic = () =>
    withTextarea(ta => wrapSelection(ta, value, onChange, '_', '_', t('md_toolbar_italic_placeholder')));
  const applyHeading = () => withTextarea(ta => insertAtLineStart(ta, value, onChange, '## '));
  const applyHeading3 = () => withTextarea(ta => insertAtLineStart(ta, value, onChange, '### '));
  const applyBulletList = () => withTextarea(ta => insertAtLineStart(ta, value, onChange, '- '));

  const applyLink = () =>
    withTextarea(ta => {
      const url = window.prompt(t('md_toolbar_link_prompt'));
      if (!url) {
        return;
      }
      wrapSelection(ta, value, onChange, '[', `](${url})`, t('md_toolbar_link_placeholder'));
    });

  const applyImage = () =>
    withTextarea(ta => {
      const url = window.prompt(t('md_toolbar_image_prompt'));
      if (!url) {
        return;
      }
      const start = ta.selectionStart;
      const snippet = `![${t('md_toolbar_image_alt_placeholder')}](${url})`;
      onChange(value.slice(0, start) + snippet + value.slice(start));
    });

  const btnClass =
    'w-7 h-7 rounded-md border-none bg-transparent text-gray-700 flex items-center justify-center hover:bg-gray-200 cursor-pointer';

  return (
    <div className="flex items-center gap-0.5 border border-gray-300 border-b-0 rounded-t-lg p-1.5 bg-gray-50">
      <button type="button" title={t('md_toolbar_bold')} aria-label={t('md_toolbar_bold')} onClick={applyBold} className={`${btnClass} font-bold text-sm`}>
        B
      </button>
      <button type="button" title={t('md_toolbar_italic')} aria-label={t('md_toolbar_italic')} onClick={applyItalic} className={`${btnClass} italic text-sm`}>
        I
      </button>
      <button type="button" title={t('md_toolbar_heading')} aria-label={t('md_toolbar_heading')} onClick={applyHeading} className={`${btnClass} text-xs font-bold`}>
        H2
      </button>
      <button type="button" title={t('md_toolbar_heading3')} aria-label={t('md_toolbar_heading3')} onClick={applyHeading3} className={`${btnClass} text-xs font-bold`}>
        H3
      </button>
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <button type="button" title={t('md_toolbar_bullet_list')} aria-label={t('md_toolbar_bullet_list')} onClick={applyBulletList} className={btnClass}>
        <ListIcon />
      </button>
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <button type="button" title={t('md_toolbar_link')} aria-label={t('md_toolbar_link')} onClick={applyLink} className={btnClass}>
        <LinkIcon />
      </button>
      <button type="button" title={t('md_toolbar_image')} aria-label={t('md_toolbar_image')} onClick={applyImage} className={btnClass}>
        <ImageIcon />
      </button>
    </div>
  );
};
