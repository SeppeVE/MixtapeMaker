<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle, Color, FontSize, FontFamily } from '@tiptap/extension-text-style';
import { CURATED_FONTS } from '~/utils/fontManager';
import '~/assets/styles/jcard/ContentEditor.css';

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
  dom.querySelectorAll<HTMLLIElement>('li').forEach((li) => {
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

const FONT_SIZES = ['4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '18', '22', '28'];
const LETTER_SPACINGS = ['0px', '0.5px', '1px', '1.5px', '2px', '3px', '5px'];
const LINE_HEIGHTS = ['0.6', '0.7', '0.8', '0.9', '1', '1.1', '1.2', '1.3', '1.5', '1.8', '2', '2.5', '3'];

const COLOR_PRESETS = [
  '#000000', '#ffffff', '#555555', '#d4524a',
  '#3182ce', '#38a169', '#ed8936', '#805ad5',
];

const props = withDefaults(
  defineProps<{
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: string;
    customFontNames?: string[];
  }>(),
  { placeholder: 'Type here...', minHeight: '60px', customFontNames: () => [] }
);

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
  onUpdate({ editor }) { props.onChange(editor.getHTML()); },
  editorProps: {
    attributes: {
      class: 'ce-area',
      style: 'min-height: ' + props.minHeight,
      'data-placeholder': props.placeholder,
    },
  },
});

// Bump on every transaction so toolbar state (computed below) stays reactive.
const tick = ref(0);

watch(
  editor,
  (e) => {
    if (!e) return;
    e.on('transaction', () => { tick.value++; });
    const dom = e.view.dom as HTMLElement;
    const run = () => syncListColors(dom);
    e.on('update', run);
    run();
  },
  { immediate: true }
);

watch(
  () => props.value,
  (value) => {
    const e = editor.value;
    if (!e) return;
    if (e.getHTML() !== value) {
      e.commands.setContent(value, { emitUpdate: false });
      syncListColors(e.view.dom as HTMLElement);
    }
  }
);

const currentSize = computed(() => {
  void tick.value;
  return editor.value?.getAttributes('textStyle').fontSize?.replace('px', '') ?? '';
});
const currentColor = computed<string>(() => {
  void tick.value;
  return editor.value?.getAttributes('textStyle').color ?? '#000000';
});
const currentFamily = computed<string>(() => {
  void tick.value;
  return ((editor.value?.getAttributes('textStyle').fontFamily ?? '') as string)
    .replace(/^["']|["']$/g, '');
});
const currentLetterSpacing = computed(() => {
  void tick.value;
  return editor.value?.getAttributes('textStyle').letterSpacing ?? '';
});
const currentLineHeight = computed(() => {
  void tick.value;
  return editor.value?.getAttributes('paragraph').lineHeight ?? '';
});

const isActive = (nameOrAttrs: string | Record<string, unknown>) => {
  void tick.value;
  return typeof nameOrAttrs === 'string'
    ? (editor.value?.isActive(nameOrAttrs) ?? false)
    : (editor.value?.isActive(nameOrAttrs) ?? false);
};

const chain = () => (editor.value!.chain().focus() as any);

const onFamilyChange = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value;
  v ? chain().setFontFamily('"' + v + '"').run() : chain().unsetFontFamily().run();
};
const onSizeChange = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value;
  v ? chain().setFontSize(v + 'px').run() : chain().unsetFontSize().run();
};
const onLetterSpacingChange = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value;
  v ? chain().setLetterSpacing(v).run() : chain().unsetLetterSpacing().run();
};
const onLineHeightChange = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value;
  v ? chain().setLineHeight(v).run() : chain().unsetLineHeight().run();
};
const onColorInput = (e: Event) => {
  chain().setColor((e.target as HTMLInputElement).value).run();
};
</script>

<template>
  <div v-if="editor" class="ce-root">
    <div class="ce-toolbar">
      <button type="button" :class="'ce-btn ce-bold' + (isActive('bold') ? ' active' : '')" title="Bold" @mousedown.prevent="chain().toggleBold().run()">B</button>
      <button type="button" :class="'ce-btn ce-italic' + (isActive('italic') ? ' active' : '')" title="Italic" @mousedown.prevent="chain().toggleItalic().run()">I</button>
      <button type="button" :class="'ce-btn ce-ul' + (isActive('underline') ? ' active' : '')" title="Underline" @mousedown.prevent="chain().toggleUnderline().run()">U</button>
      <span class="ce-sep" />
      <button type="button" :class="'ce-btn' + (isActive('bulletList') ? ' active' : '')" title="Bullet list" @mousedown.prevent="chain().toggleBulletList().run()">•</button>
      <button type="button" :class="'ce-btn' + (isActive('orderedList') ? ' active' : '')" title="Ordered list" @mousedown.prevent="chain().toggleOrderedList().run()">1.</button>
      <span class="ce-sep" />
      <button type="button" :class="'ce-btn' + (isActive({ textAlign: 'left' }) ? ' active' : '')" title="Align left" @mousedown.prevent="chain().setTextAlign('left').run()">⬅</button>
      <button type="button" :class="'ce-btn' + (isActive({ textAlign: 'center' }) ? ' active' : '')" title="Center" @mousedown.prevent="chain().setTextAlign('center').run()">☰</button>
      <button type="button" :class="'ce-btn' + (isActive({ textAlign: 'right' }) ? ' active' : '')" title="Align right" @mousedown.prevent="chain().setTextAlign('right').run()">➡</button>
      <span class="ce-sep" />

      <select
        class="ce-font-select"
        :value="currentFamily"
        title="Font family"
        @mousedown.stop
        @change="onFamilyChange"
      >
        <option value="">Default</option>
        <optgroup label="Curated">
          <option v-for="f in CURATED_FONTS" :key="f" :value="f" :style="{ fontFamily: f }">{{ f }}</option>
        </optgroup>
        <optgroup v-if="customFontNames.length > 0" label="Uploaded">
          <option v-for="f in customFontNames" :key="f" :value="f" :style="{ fontFamily: f }">{{ f }}</option>
        </optgroup>
      </select>

      <select
        class="ce-size-select"
        :value="currentSize"
        title="Font size"
        @mousedown.stop
        @change="onSizeChange"
      >
        <option value="">px</option>
        <option v-for="sz in FONT_SIZES" :key="sz" :value="sz">{{ sz }}</option>
      </select>

      <select
        class="ce-size-select"
        :value="currentLetterSpacing"
        title="Letter spacing"
        @mousedown.stop
        @change="onLetterSpacingChange"
      >
        <option value="">Letter spacing</option>
        <option v-for="sp in LETTER_SPACINGS" :key="sp" :value="sp">{{ sp }}</option>
      </select>

      <select
        class="ce-size-select"
        :value="currentLineHeight"
        title="Line height"
        @mousedown.stop
        @change="onLineHeightChange"
      >
        <option value="">Line height</option>
        <option v-for="lh in LINE_HEIGHTS" :key="lh" :value="lh">{{ lh }}</option>
      </select>

      <span class="ce-sep" />

      <div class="ce-color-row">
        <button
          v-for="c in COLOR_PRESETS"
          :key="c"
          type="button"
          :class="'ce-swatch' + (currentColor === c ? ' active' : '')"
          :style="{ background: c }"
          :title="c"
          @mousedown.prevent="chain().setColor(c).run()"
        />
        <div
          class="ce-swatch ce-swatch-custom"
          :style="{ background: currentColor }"
          title="Custom color"
          @mousedown.prevent="colorInputRef?.click()"
        >
          <span class="ce-swatch-plus">+</span>
        </div>
        <input
          ref="colorInputRef"
          type="color"
          class="ce-color-hidden"
          :value="currentColor"
          @change="onColorInput"
        >
      </div>
    </div>
    <EditorContent :editor="editor" />
  </div>
</template>
