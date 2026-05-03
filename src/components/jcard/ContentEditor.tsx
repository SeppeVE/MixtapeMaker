import { useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle, Color, FontSize, FontFamily } from '@tiptap/extension-text-style';
import { CURATED_FONTS } from '../../utils/fontManager';
import '../../styles/jcard/ContentEditor.css';

// Enter → <br> instead of a new <p>.
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
            return { style: 'letter-spacing: ' + attrs.letterSpacing };
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

// BlockLineHeight — applies line-height to <p> and heading block nodes so it
// actually affects line-box height. The old inline textStyle approach only set
// line-height on <span>, which cannot shrink the strut of the containing block.
const BlockLineHeight = Extension.create({
  name: 'blockLineHeight',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
          renderHTML: (attrs: Record<string, string | null>) => {
            if (!attrs.lineHeight) return {};
            return { style: 'line-height: ' + attrs.lineHeight };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setLineHeight: (lineHeight: string) => ({ commands }: any) =>
        commands.updateAttributes('paragraph', { lineHeight }),
      unsetLineHeight: () => ({ commands }: any) =>
        commands.resetAttributes('paragraph', 'lineHeight'),
    } as any;
  },
});

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

const FONT_SIZES      = ['4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '18', '22', '28'];
const LETTER_SPACINGS = ['0px', '0.5px', '1px', '1.5px', '2px', '3px', '5px'];
const LINE_HEIGHTS    = ['0.6', '0.7', '0.8', '0.9', '1', '1.1', '1.2', '1.3', '1.5', '1.8', '2', '2.5', '3'];

const COLOR_PRESETS = [
  '#000000', '#ffffff', '#555555', '#d4524a',
  '#3182ce', '#38a169', '#ed8936', '#805ad5',
];

interface ContentEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  customFontNames?: string[];
}

const ContentEditor = ({ value, onChange, placeholder = 'Type here...', minHeight = '60px', customFontNames = [] }: ContentEditorProps) => {
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
      BlockLineHeight,
      TextAlign.configure({ types: ['heading', 'paragraph', 'listItem'] }),
    ],
    content: value,
    onUpdate({ editor }) { onChange(editor.getHTML()); },
    editorProps: {
      attributes: {
        class: 'ce-area',
        style: 'min-height: ' + minHeight,
        'data-placeholder': placeholder,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
      syncListColors(editor.view.dom as HTMLElement);
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;
    const run = () => syncListColors(dom);
    editor.on('update', run);
    run();
    return () => { editor.off('update', run); };
  }, [editor]);

  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, label: string, title: string, extraClass = '') => (
    <button
      type="button"
      className={'ce-btn' + (active ? ' active' : '') + (extraClass ? ' ' + extraClass : '')}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
    >{label}</button>
  );

  const currentSize          = editor.getAttributes('textStyle').fontSize?.replace('px', '') ?? '';
  const currentColor: string = editor.getAttributes('textStyle').color ?? '#000000';
  const currentFamily: string = (editor.getAttributes('textStyle').fontFamily ?? '')
    .replace(/^["']|["']$/g, '');
  const currentLetterSpacing = editor.getAttributes('textStyle').letterSpacing ?? '';
  const currentLineHeight    = editor.getAttributes('paragraph').lineHeight    ?? '';

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

        <select
          className="ce-font-select"
          value={currentFamily}
          title="Font family"
          onMouseDown={e => e.stopPropagation()}
          onChange={e => {
            const v = e.target.value;
            const chain = editor.chain().focus() as any;
            v ? chain.setFontFamily('"' + v + '"').run() : chain.unsetFontFamily().run();
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

        <select
          className="ce-size-select"
          value={currentSize}
          title="Font size"
          onMouseDown={e => e.stopPropagation()}
          onChange={e => {
            const v = e.target.value;
            const chain = editor.chain().focus() as any;
            v ? chain.setFontSize(v + 'px').run() : chain.unsetFontSize().run();
          }}
        >
          <option value="">px</option>
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

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

        <div className="ce-color-row">
          {COLOR_PRESETS.map(c => (
            <button
              key={c}
              type="button"
              className={'ce-swatch' + (currentColor === c ? ' active' : '')}
              style={{ background: c }}
              title={c}
              onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c).run(); }}
            />
          ))}
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
