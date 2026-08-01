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
