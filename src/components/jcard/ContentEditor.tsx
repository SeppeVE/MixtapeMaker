import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import './ContentEditor.css';

interface ContentEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const ContentEditor = ({ value, onChange, placeholder = 'Type here…', minHeight = '60px' }: ContentEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
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

  return (
    <div className="ce-root">
      <div className="ce-toolbar">
        {btn(editor.isActive('bold'),        () => editor.chain().focus().toggleBold().run(),        'B',  'Bold',         'ce-bold')}
        {btn(editor.isActive('italic'),      () => editor.chain().focus().toggleItalic().run(),      'I',  'Italic',       'ce-italic')}
        {btn(editor.isActive('underline'),   () => editor.chain().focus().toggleUnderline().run(),   'U',  'Underline',    'ce-ul')}
        <span className="ce-sep" />
        {btn(editor.isActive('bulletList'),  () => editor.chain().focus().toggleBulletList().run(),  '•',  'Bullet list')}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1.', 'Ordered list')}
        <span className="ce-sep" />
        {btn(editor.isActive({ textAlign: 'left' }),   () => editor.chain().focus().setTextAlign('left').run(),   '⬅', 'Align left')}
        {btn(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), '☰', 'Center')}
        {btn(editor.isActive({ textAlign: 'right' }),  () => editor.chain().focus().setTextAlign('right').run(),  '➡', 'Align right')}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default ContentEditor;
