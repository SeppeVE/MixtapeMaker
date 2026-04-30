import { useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle, Color, FontSize, FontFamily, LineHeight } from '@tiptap/extension-text-style';
import { CURATED_FONTS } from '../../utils/fontManager';
import '../../styles/jcard/ContentEditor.css';

// Enter → <br> instead of a new <p>.
// In list context we fall through so ProseMirror can handle list-item splitting.
const EnterAsBr = Extension.create({
  name: 'enterAsBr',
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (this.editor.isActive('listItem')) return false;
        return this.editor.commands.setHardBreak();
      },
    };
  },
});

// LetterSpacing — same pattern as FontSize from @tiptap/extension-text-style
const LetterSpacing = Extension.create({
  name: 'letterSpacing',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        letterSpacing: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.letterSpacing || null,
          renderHTML: (attrs: Record<string, string | null>) => {
            if (!attrs.letterSpacing) return {};
            return { style: `letter-spacing: ${attrs.letterSpacing}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setLetterSpacing: (v: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { letterSpacing: v }).run(),
      unsetLetterSpacing: () => ({ chain }: any) =>
        chain().setMark('textStyle', { letterSpacing: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

// CSS `::marker` inherits color from the <li> element itself, NOT from
// descendant <span> elements (where Tiptap's Color extension puts it).
// syncListColors propagates the first colored <span> up to its <li> so that
// ::marker picks up the right color.
function syncListColors(dom: HTMLElement) {
  dom.querySelectorAll<HTMLLIElement>('li').forEach(li => {
    let foundColor = '';
    for (const span of li.querySelectorAll<HTMLElement>('span')) {
      if (span.style.color) { foundColor = span.style.color; break; }
    }
    if (foundColor) {
      li.style.setProperty('color', foundColor, 'important');
    } else {
      li.style.removeProperty('color');
    }
  });
}

const FONT_SIZES        = ['8', '9', '10', '11', '12', '14', '16', '18', '22', '28'];
const LETTER_SPACINGS   = ['0px', '0.5px', '1px', '1.5px', '2px', '3px', '5px'];
const LINE_HEIGHTS      = ['1', '1.1', '1.2', '1.3', '1.5', '1.8', '2', '2.5', '3'];

const COLOR_PRESETS = [
  '#000000', '#ffffff', '#555555', '#d4524a',
  '#3182ce', '#38a169', '#ed8936', '#805ad5',
];

interface ContentEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  /** Custom font names (uploaded by the user) to append after the curated list. */
  customFontNames?: string[];
}

const ContentEditor = ({ value, onChange, placeholder = 'Type here…', minHeight = '60px', customFontNames = [] }: ContentEditorProps) => {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      EnterAsBr,
      Underline,
      TextStyle,
      Color,
      FontSize,
      FontFamily,
      LetterSpacing,
      LineHeight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value,
    onUpdate({ editor }) { onChange(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: 'ce-area',
        style: `min-height: ${minHeight}`,
        'data-placeholder': placeholder,
      },
    },
  });

  // Keep the editor in sync when `value` is updated externally (e.g. "Pull
  // tracks from mixtape"). Tiptap owns its own document state after mount, so
  // prop changes are ignored unless we push them in explicitly.
  // We compare first to avoid clobbering the cursor when the change originated
  // from the editor itself (typed text → onChange → parent setState → value).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      // emitUpdate: false prevents the onChange callback from firing → no loop
      editor.commands.setContent(value, { emitUpdate: false });
      // setContent with emitUpdate: false suppresses the 'update' event, so
      // syncListColors won't fire automatically — call it manually here.
      syncListColors(editor.view.dom as HTMLElement);
    }
  }, [editor, value]);

  // Wire up list-color sync. ProseMirror fires 'update' after its own DOM
  // reconciliation is complete, so we can run syncListColors synchronously
  // right here — no RAF needed. Using RAF caused a race: ProseMirror would
  // do a second reconciliation pass and wipe the inline style we had just set.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;
    const run = () => syncListColors(dom);
    editor.on('update', run);
    run(); // initial pass for pre-filled content
    return () => { editor.off('update', run); };
  }, [editor]);

  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, label: string, title: string, extraClass = '') => (
    <button
      type="button"
      className={`ce-btn${active ? ' active' : ''}${extraClass ? ' ' + extraClass : ''}`}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
    >{label}</button>
  );

  const currentSize          = editor.getAttributes('textStyle').fontSize?.replace('px', '') ?? '';
  const currentColor: string = editor.getAttributes('textStyle').color ?? '#000000';
  // Tiptap stores the value we passed to setFontFamily verbatim. We always
  // pass quoted names ("My Font"), so strip quotes here for comparison with
  // the plain-name option values in the select.
  const currentFamily: string = (editor.getAttributes('textStyle').fontFamily ?? '')
    .replace(/^["']|["']$/g, '');
  const currentLetterSpacing = editor.getAttributes('textStyle').letterSpacing ?? '';
  const currentLineHeight    = editor.getAttributes('textStyle').lineHeight    ?? '';

  return (
    <div className="ce-root">
      <div className="ce-toolbar">
        {btn(editor.isActive('bold'),        () => editor.chain().focus().toggleBold().run(),        'B',  'Bold',      'ce-bold')}
        {btn(editor.isActive('italic'),      () => editor.chain().focus().toggleItalic().run(),      'I',  'Italic',    'ce-italic')}
        {btn(editor.isActive('underline'),   () => editor.chain().focus().toggleUnderline().run(),   'U',  'Underline', 'ce-ul')}
        <span className="ce-sep" />
        {btn(editor.isActive('bulletList'),  () => editor.chain().focus().toggleBulletList().run(),  '•',  'Bullet list')}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1.', 'Ordered list')}
        <span className="ce-sep" />
        {btn(editor.isActive({ textAlign: 'left' }),   () => editor.chain().focus().setTextAlign('left').run(),   '⬅', 'Align left')}
        {btn(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), '☰', 'Center')}
        {btn(editor.isActive({ textAlign: 'right' }),  () => editor.chain().focus().setTextAlign('right').run(),  '➡', 'Align right')}
        <span className="ce-sep" />

        {/* Font family */}
        <select
          className="ce-font-select"
          value={currentFamily}
          title="Font family"
          onMouseDown={e => e.stopPropagation()}
          onChange={e => {
            const v = e.target.value;
            const chain = editor.chain().focus() as any;
            // Always quote the name so multi-word families ("IBM Plex Sans")
            // produce valid CSS: font-family: "IBM Plex Sans", not font-family: IBM Plex Sans.
            v ? chain.setFontFamily(`"${v}"`).run() : chain.unsetFontFamily().run();
          }}
        >
          <option value="">Default</option>
          <optgroup label="Curated">
            {CURATED_FONTS.map(f => (
              <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
            ))}
          </optgroup>
          {customFontNames.length > 0 && (
            <optgroup label="Uploaded">
              {customFontNames.map(f => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Font size */}
        <select
          className="ce-size-select"
          value={currentSize}
          title="Font size"
          onMouseDown={e => e.stopPropagation()}
          onChange={e => {
            const v = e.target.value;
            const chain = editor.chain().focus() as any;
            v ? chain.setFontSize(`${v}px`).run() : chain.unsetFontSize().run();
          }}
        >
          <option value="">px</option>
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Letter spacing */}
        <select
          className="ce-size-select"
          value={currentLetterSpacing}
          title="Letter spacing"
          onMouseDown={e => e.stopPropagation()}
          onChange={e => {
            const v = e.target.value;
            const chain = editor.chain().focus() as any;
            v ? chain.setLetterSpacing(v).run() : chain.unsetLetterSpacing().run();
          }}
        >
          <option value="">Letter spacing</option>
          {LETTER_SPACINGS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Line height */}
        <select
          className="ce-size-select"
          value={currentLineHeight}
          title="Line height"
          onMouseDown={e => e.stopPropagation()}
          onChange={e => {
            const v = e.target.value;
            const chain = editor.chain().focus() as any;
            v ? chain.setLineHeight(v).run() : chain.unsetLineHeight().run();
          }}
        >
          <option value="">Line height</option>
          {LINE_HEIGHTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <span className="ce-sep" />

        {/* Color swatches */}
        <div className="ce-color-row">
          {COLOR_PRESETS.map(c => (
            <button
              key={c}
              type="button"
              className={`ce-swatch${currentColor === c ? ' active' : ''}`}
              style={{ background: c }}
              title={c}
              onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c).run(); }}
            />
          ))}
          {/* Custom picker — clicking the preview div opens the hidden input */}
          <div
            className="ce-swatch ce-swatch-custom"
            style={{ background: currentColor }}
            title="Custom color"
            onMouseDown={e => { e.preventDefault(); colorInputRef.current?.click(); }}
          >
            <span className="ce-swatch-plus">+</span>
          </div>
          <input
            ref={colorInputRef}
            type="color"
            className="ce-color-hidden"
            value={currentColor}
            onChange={e => editor.chain().focus().setColor(e.target.value).run()}
          />
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default ContentEditor;
