import { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle, Color, FontSize, FontFamily } from '@tiptap/extension-text-style';
import { CURATED_FONTS } from '../../utils/fontManager';
import '../../styles/jcard/ContentEditor.css';

const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '22', '28'];

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
      Underline,
      TextStyle,
      Color,
      FontSize,
      FontFamily,
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

  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, label: string, title: string, extraClass = '') => (
    <button
      type="button"
      className={`ce-btn${active ? ' active' : ''}${extraClass ? ' ' + extraClass : ''}`}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
    >{label}</button>
  );

  const currentSize   = editor.getAttributes('textStyle').fontSize?.replace('px', '') ?? '';
  const currentColor: string = editor.getAttributes('textStyle').color ?? '#000000';
  // Tiptap stores the value we passed to setFontFamily verbatim. We always
  // pass quoted names ("My Font"), so strip quotes here for comparison with
  // the plain-name option values in the select.
  const currentFamily: string = (editor.getAttributes('textStyle').fontFamily ?? '')
    .replace(/^["']|["']$/g, '');

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
