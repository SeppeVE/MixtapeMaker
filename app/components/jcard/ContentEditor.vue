<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle, Color, FontSize, FontFamily } from '@tiptap/extension-text-style';
import { CURATED_FONTS } from '~/utils/fontManager';

const props = withDefaults(defineProps<{
  value: string;
  placeholder?: string;
  minHeight?: string;
  customFontNames?: string[];
}>(), {
  placeholder: 'Type here...',
  minHeight: '60px',
  customFontNames: () => [],
});

const emit = defineEmits<{ change: [html: string] }>();

// ── Custom Tiptap extensions (framework-agnostic, ported verbatim) ──────────

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
  dom.querySelectorAll<HTMLLIElement>('li').forEach((li) => {
    let foundColor = '';
    for (const span of li.querySelectorAll<HTMLElement>('span')) {
      if (span.style.color) { foundColor = span.style.color; break; }
    }
    if (foundColor) li.style.setProperty('color', foundColor, 'important');
    else li.style.removeProperty('color');
  });
}

const FONT_SIZES = ['4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '18', '22', '28'];
const LETTER_SPACINGS = ['0px', '0.5px', '1px', '1.5px', '2px', '3px', '5px'];
const LINE_HEIGHTS = ['0.6', '0.7', '0.8', '0.9', '1', '1.1', '1.2', '1.3', '1.5', '1.8', '2', '2.5', '3'];
const COLOR_PRESETS = ['#000000', '#ffffff', '#555555', '#d4524a', '#3182ce', '#38a169', '#ed8936', '#805ad5'];

const colorInputRef = ref<HTMLInputElement | null>(null);

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
  content: props.value,
  editorProps: {
    attributes: {
      class: 'ce-area',
      style: 'min-height: ' + props.minHeight,
      'data-placeholder': props.placeholder,
    },
  },
  onUpdate({ editor }) {
    emit('change', editor.getHTML());
    syncListColors(editor.view.dom as HTMLElement);
  },
});

// Sync external value → editor (without emitting an update loop).
watch(() => props.value, (val) => {
  const inst = editor.value;
  if (!inst) return;
  if (inst.getHTML() !== val) {
    inst.commands.setContent(val, { emitUpdate: false });
    syncListColors(inst.view.dom as HTMLElement);
  }
});

onBeforeUnmount(() => editor.value?.destroy());

// Toolbar state readers — called in template so they re-run on every
// tiptap-triggered re-render (selection / transaction updates).
const currentSize = () => editor.value?.getAttributes('textStyle').fontSize?.replace('px', '') ?? '';
const currentColor = () => editor.value?.getAttributes('textStyle').color ?? '#000000';
const currentFamily = () => (editor.value?.getAttributes('textStyle').fontFamily ?? '').replace(/^["']|["']$/g, '');
const currentLetterSpacing = () => editor.value?.getAttributes('textStyle').letterSpacing ?? '';
const currentLineHeight = () => editor.value?.getAttributes('paragraph').lineHeight ?? '';

function setFamily(v: string) {
  const chain = editor.value!.chain().focus() as any;
  v ? chain.setFontFamily('"' + v + '"').run() : chain.unsetFontFamily().run();
}
function setSize(v: string) {
  const chain = editor.value!.chain().focus() as any;
  v ? chain.setFontSize(v + 'px').run() : chain.unsetFontSize().run();
}
function setLetterSpacing(v: string) {
  const chain = editor.value!.chain().focus() as any;
  v ? chain.setLetterSpacing(v).run() : chain.unsetLetterSpacing().run();
}
function setLineHeight(v: string) {
  const chain = editor.value!.chain().focus() as any;
  v ? chain.setLineHeight(v).run() : chain.unsetLineHeight().run();
}
</script>

<template>
  <div v-if="editor" class="ce-root">
    <div class="ce-toolbar">
      <!-- Basic markup controls -->
      <button type="button" :class="`ce-btn ce-bold${editor.isActive('bold') ? ' active' : ''}`" title="Bold" @mousedown.prevent="editor.chain().focus().toggleBold().run()">B</button>
      <button type="button" :class="`ce-btn ce-italic${editor.isActive('italic') ? ' active' : ''}`" title="Italic" @mousedown.prevent="editor.chain().focus().toggleItalic().run()">I</button>
      <button type="button" :class="`ce-btn ce-ul${editor.isActive('underline') ? ' active' : ''}`" title="Underline" @mousedown.prevent="editor.chain().focus().toggleUnderline().run()">U</button>
      <span class="ce-sep" />
      <button type="button" :class="`ce-btn${editor.isActive('bulletList') ? ' active' : ''}`" title="Bullet list" @mousedown.prevent="editor.chain().focus().toggleBulletList().run()">•</button>
      <button type="button" :class="`ce-btn${editor.isActive('orderedList') ? ' active' : ''}`" title="Ordered list" @mousedown.prevent="editor.chain().focus().toggleOrderedList().run()">1.</button>
      <span class="ce-sep" />
      <button type="button" :class="`ce-btn${editor.isActive({ textAlign: 'left' }) ? ' active' : ''}`" title="Align left" @mousedown.prevent="editor.chain().focus().setTextAlign('left').run()">⬅</button>
      <button type="button" :class="`ce-btn${editor.isActive({ textAlign: 'center' }) ? ' active' : ''}`" title="Center" @mousedown.prevent="editor.chain().focus().setTextAlign('center').run()">☰</button>
      <button type="button" :class="`ce-btn${editor.isActive({ textAlign: 'right' }) ? ' active' : ''}`" title="Align right" @mousedown.prevent="editor.chain().focus().setTextAlign('right').run()">➡</button>
      <span class="ce-sep" />

      <!-- Font family controls with custom uploaded fonts -->
      <select class="ce-font-select" :value="currentFamily()" title="Font family" @mousedown.stop @change="setFamily(($event.target as HTMLSelectElement).value)">
        <option value="">Default</option>
        <optgroup label="Curated">
          <option v-for="f in CURATED_FONTS" :key="f" :value="f" :style="{ fontFamily: f }">{{ f }}</option>
        </optgroup>
        <optgroup v-if="customFontNames.length > 0" label="Uploaded">
          <option v-for="f in customFontNames" :key="f" :value="f" :style="{ fontFamily: f }">{{ f }}</option>
        </optgroup>
      </select>

      <select class="ce-size-select" :value="currentSize()" title="Font size" @mousedown.stop @change="setSize(($event.target as HTMLSelectElement).value)">
        <option value="">px</option>
        <option v-for="s in FONT_SIZES" :key="s" :value="s">{{ s }}</option>
      </select>

      <select class="ce-size-select" :value="currentLetterSpacing()" title="Letter spacing" @mousedown.stop @change="setLetterSpacing(($event.target as HTMLSelectElement).value)">
        <option value="">Letter spacing</option>
        <option v-for="s in LETTER_SPACINGS" :key="s" :value="s">{{ s }}</option>
      </select>

      <select class="ce-size-select" :value="currentLineHeight()" title="Line height" @mousedown.stop @change="setLineHeight(($event.target as HTMLSelectElement).value)">
        <option value="">Line height</option>
        <option v-for="s in LINE_HEIGHTS" :key="s" :value="s">{{ s }}</option>
      </select>

      <span class="ce-sep" />

      <!-- Text color controls -->
      <div class="ce-color-row">
        <button
          v-for="c in COLOR_PRESETS"
          :key="c"
          type="button"
          :class="`ce-swatch${currentColor() === c ? ' active' : ''}`"
          :style="{ background: c }"
          :title="c"
          @mousedown.prevent="editor.chain().focus().setColor(c).run()"
        />
        <div class="ce-swatch ce-swatch-custom" :style="{ background: currentColor() }" title="Custom color" @mousedown.prevent="colorInputRef?.click()">
          <span class="ce-swatch-plus">+</span>
        </div>
        <input ref="colorInputRef" type="color" class="ce-color-hidden" :value="currentColor()" @input="editor.chain().focus().setColor(($event.target as HTMLInputElement).value).run()" />
      </div>
    </div>
    <EditorContent :editor="editor" />
  </div>
</template>

<style scoped>
/* The toolbar and chrome below are this component's own elements, so they
   scope normally. .ce-area is NOT: TipTap applies that class through
   editorProps.attributes to the ProseMirror element it creates at runtime,
   so it never receives a data-v attribute. Those rules go through :deep(),
   which compiles to `[data-v-…] .ce-area` and hangs off .ce-root. */
.ce-root {
  border: 2px solid var(--color-text);
  overflow: hidden;
  background: var(--color-white);
  box-shadow: var(--bevel-in);
}

.ce-root:focus-within {
  background: rgba(212, 169, 53, 0.08);
}

/* ── Toolbar ── */
.ce-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: var(--color-paper);
  border-bottom: 2px solid var(--color-text);
  flex-wrap: wrap;
}

.ce-btn {
  padding: 3px 7px;
  border: 1.5px solid var(--color-text);
  background: var(--color-paper);
  font-family: var(--font-body);
  font-size: 12px;
  cursor: pointer;
  color: var(--color-text);
  box-shadow: 1px 1px 0 var(--color-text);
  min-width: 26px;
  text-align: center;
  line-height: 1;
  transition: transform 0.06s, box-shadow 0.06s;
}

.ce-btn:hover {
  background: var(--color-mustard);
  transform: none;
  box-shadow: 1px 1px 0 var(--color-text);
}

.ce-btn:active {
  transform: translate(1px, 1px);
  box-shadow: none;
}

.ce-btn.active {
  background: var(--color-primary);
  color: var(--color-paper);
  border-color: var(--color-text);
  box-shadow: none;
}

.ce-bold      { font-weight: bold; }
.ce-italic    { font-style: italic; }
.ce-ul        { text-decoration: underline; }

.ce-sep {
  display: inline-block;
  width: 1px;
  height: 14px;
  background: var(--color-text);
  opacity: 0.3;
  margin: 0 4px;
  flex-shrink: 0;
}

/* Font family dropdown */
.ce-font-select {
  padding: 2px 4px;
  height: 24px;
  border: 1.5px solid var(--color-text);
  background: var(--color-paper);
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--color-text);
  cursor: pointer;
  box-shadow: 1px 1px 0 var(--color-text);
  width: 110px;
  flex-shrink: 0;
}

/* Font size dropdown */
.ce-size-select {
  padding: 2px 4px;
  height: 24px;
  border: 1.5px solid var(--color-text);
  background: var(--color-paper);
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--color-text);
  cursor: pointer;
  box-shadow: 1px 1px 0 var(--color-text);
  width: max-content;
  flex-shrink: 0;
}

/* Color swatches row */
.ce-color-row {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.ce-swatch {
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--color-text);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  position: relative;
  box-shadow: 1px 1px 0 var(--color-text);
  transition: transform 0.06s;
}

.ce-swatch:hover {
  transform: scale(1.15);
}

.ce-swatch.active {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.ce-swatch-custom {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ce-swatch-plus {
  font-size: 11px;
  line-height: 1;
  color: var(--color-text);
  mix-blend-mode: difference;
  filter: invert(1);
  pointer-events: none;
}

.ce-color-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

/* ── Editable area ── */
:deep(.ce-area) {
  padding: 8px 10px;
  outline: none;
  font-family: var(--font-body);
  font-size: 12px;
  line-height: 1.3;
  color: var(--color-text);
  /* Neutral mid-tone so both dark and white text are legible while editing.
     The card's actual background colour is set separately in the preview. */
  background: #b5aa98;
  /* Allow the browser to synthesize bold/italic even for fonts that lack
     those variants (e.g. Geneva on macOS has no bold face). Without this,
     bold appears identical to normal on macOS WebKit. */
  font-synthesis: weight style;
}

:deep(.ce-area:empty::before) {
  content: attr(data-placeholder);
  color: var(--color-text);
  opacity: 0.4;
  pointer-events: none;
}

/* Explicit weight/style rules so macOS renders them even on single-variant fonts */
:deep(.ce-area strong),
:deep(.ce-area b)                { font-weight: bold; font-synthesis: weight; }
:deep(.ce-area em),
:deep(.ce-area i)                { font-style: italic; font-synthesis: style; }
:deep(.ce-area u)                { text-decoration: underline; }

:deep(.ce-area p)                { margin: 0 0 2px; }
:deep(.ce-area h1),
:deep(.ce-area h2),
:deep(.ce-area h3)               { margin: 0 0 2px; font-family: var(--font-display); text-transform: uppercase; }
:deep(.ce-area ul),
:deep(.ce-area ol)               { padding-left: 16px; margin: 0 0 2px; }
:deep(.ce-area li)               { margin: 0; }
</style>
