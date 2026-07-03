<script setup lang="ts">
import type { JCardContent, JCard, Mixtape, CustomFont } from '~/types';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { JCARD_PRESETS } from '~/utils/jcardPresets';
import { exportJCardToPDF } from '~/utils/jcardPdf';
import { readFileAsBase64, fontNameFromFile, mimeTypeFromFile, registerCustomFonts } from '~/utils/fontManager';
import type { Section } from './SettingsBlock.vue';
import '~/assets/styles/jcard/JCardSettings.css';

const COLOR_PRESETS = [
  '#EFE8D6', '#FAF6EB', '#2A1E28', '#4A3A48',
  '#A8C4A2', '#8FC9B7', '#3D5A47',
  '#5B2838', '#D4A935', '#B4A0C7',
];

const props = defineProps<{
  card: JCard;
  currentMixtape: Mixtape | null;
  onTitleChange: (title: string) => void;
  onContentChange: (content: JCardContent) => void;
  onMixtapeLink: (mixtapeId: string | null) => void;
  sections?: Section[];
}>();

// Always work on a migrated card so old coverContent cards don't lose data
const content = computed(() => migrateJCardContent(props.card.content));

const patch = (partial: Partial<JCardContent>) =>
  props.onContentChange({ ...content.value, ...partial });

const patchFlap = (index: number, html: string) => {
  const next = [...content.value.flapContents];
  while (next.length < 6) next.push('');
  next[index] = html;
  patch({ flapContents: next });
};

const patchInsideFlap = (index: number, html: string) => {
  const next = [...(content.value.insideFlapContents ?? (Array(6).fill('') as string[]))];
  while (next.length < 6) next.push('');
  next[index] = html;
  patch({ insideFlapContents: next });
};

const openSections = ref<Set<Section>>(
  new Set(['info', 'layout', 'flaps', 'background', 'fonts', 'spine', 'back', 'inside', 'mixtape', 'export'] as Section[])
);
const activeFlap = ref(0);
const activeInsideFlap = ref(0);
const exporting = ref(false);
const fontUploading = ref(false);
const fontInputRef = ref<HTMLInputElement | null>(null);

const customFonts = computed<CustomFont[]>(() => content.value.customFonts ?? []);
const customFontNames = computed(() => customFonts.value.map((f) => f.name));

const MAX_FONTS = 3;
const WARN_SIZE_KB = 200;
const fontWarning = ref<string | null>(null);

const handleFontUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  // Reset input so the same file can be re-uploaded after deletion
  target.value = '';
  fontWarning.value = null;

  if (customFonts.value.length >= MAX_FONTS) {
    fontWarning.value = `Max ${MAX_FONTS} fonts per card. Remove one first.`;
    return;
  }

  const sizeKb = file.size / 1024;
  if (sizeKb > WARN_SIZE_KB) {
    fontWarning.value = `${file.name} is ${Math.round(sizeKb)} KB — large fonts increase save size.`;
    // Not a hard block, just a heads-up; continue uploading.
  }

  fontUploading.value = true;
  try {
    const name = fontNameFromFile(file);
    const data = await readFileAsBase64(file);
    const mimeType = mimeTypeFromFile(file);
    const newFont: CustomFont = { name, data, mimeType };
    // Register immediately so it's available in the editor right away
    await registerCustomFonts([newFont]);
    patch({ customFonts: [...customFonts.value, newFont] });
  } catch (err) {
    console.error('Font upload failed:', err);
    fontWarning.value = 'Upload failed — the file may be corrupt.';
  } finally {
    fontUploading.value = false;
  }
};

const removeFont = (name: string) => {
  patch({ customFonts: customFonts.value.filter((f) => f.name !== name) });
};

// Keep activeFlap / activeInsideFlap in bounds if user reduces flap count
watch(
  () => content.value.flaps,
  (flaps) => {
    if (activeFlap.value >= flaps) activeFlap.value = flaps - 1;
    if (activeInsideFlap.value >= flaps) activeInsideFlap.value = flaps - 1;
  }
);

const toggle = (s: Section) => {
  const next = new Set(openSections.value);
  next.has(s) ? next.delete(s) : next.add(s);
  openSections.value = next;
};

const isOpen = (s: Section) => openSections.value.has(s);
const isVisible = (s: Section) => !props.sections || props.sections.includes(s);

const handleExport = async () => {
  exporting.value = true;
  try {
    await exportJCardToPDF(content.value, props.card.title || 'jcard');
  } catch (e) {
    console.error(e);
  } finally {
    exporting.value = false;
  }
};

const handleApplyPreset = (presetId: string) => {
  const preset = JCARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  if (!confirm(`Apply the "${preset.label}" preset? This will overwrite your current design.`)) return;
  props.onContentChange({ ...content.value, ...preset.content } as JCardContent);
};

const flapLabel = (i: number) => (i === 0 ? 'Cover' : `Flap ${i + 1}`);

const setFlaps = (e: Event) => {
  patch({ flaps: parseInt((e.target as HTMLInputElement).value, 10) as 1 | 2 | 3 | 4 | 5 | 6 });
};

const openFontPicker = () => {
  fontWarning.value = null;
  fontInputRef.value?.click();
};
</script>

<template>
  <div class="jcard-settings">
    <!-- 1. Card info -->
    <SettingsBlock id="info" label="✎ Card info" :is-visible="isVisible" :is-open="isOpen" :on-toggle="toggle">
      <label class="settings-label">Title</label>
      <input
        class="settings-input"
        :value="card.title"
        placeholder="My J-Card"
        @input="onTitleChange(($event.target as HTMLInputElement).value)"
      >
    </SettingsBlock>

    <!-- 1b. Presets -->
    <SettingsBlock id="presets" label="✦ Presets" :is-visible="isVisible" :is-open="isOpen" :on-toggle="toggle">
      <p class="small-info">
        Applying a preset overwrites your current design. Use Undo to revert.
      </p>
      <div style="display: flex; flex-direction: column; gap: 4px">
        <button
          v-for="preset in JCARD_PRESETS"
          :key="preset.id"
          class="btn"
          style="justify-content: flex-start; gap: 8px; padding: 5px 10px"
          @click="handleApplyPreset(preset.id)"
        >
          <span style="font-family: var(--font-body); font-size: 12px">{{ preset.label }}</span>
        </button>
      </div>
    </SettingsBlock>

    <!-- 2. Layout -->
    <SettingsBlock id="layout" label="▣ Layout" :is-visible="isVisible" :is-open="isOpen" :on-toggle="toggle">
      <label class="settings-checkbox-label">
        <input type="checkbox" :checked="content.isReversed" @change="patch({ isReversed: ($event.target as HTMLInputElement).checked })">
        Reverse card (flip left/right)
      </label>
      <label class="settings-checkbox-label">
        <input type="checkbox" :checked="content.shortBack" @change="patch({ shortBack: ($event.target as HTMLInputElement).checked })">
        Short back panel (10 mm)
      </label>
      <label class="settings-label" style="margin-top: 6px">Panels: {{ content.flaps }}</label>
      <input
        type="range" min="1" max="6" :value="content.flaps"
        class="settings-range"
        @input="setFlaps"
      >
      <div class="settings-range-ticks">
        <span v-for="n in 6" :key="n">{{ n }}</span>
      </div>
      <p v-if="!content.shortBack && content.flaps > 3" class="small-info">
        Cover + {{ content.flaps - 1 }} Panels — this will not fit on a standard A4 paper, keep this in mind for printing.
      </p>
    </SettingsBlock>

    <!-- 3. Fonts -->
    <SettingsBlock id="fonts" label="Aa Fonts" :is-visible="isVisible" :is-open="isOpen" :on-toggle="toggle">
      <p class="small-info">
        9 default fonts are always available in the text editors.
        Upload up to 3 of your own <b>.woff2</b>, <b>.otf</b>, or <b>.ttf</b> files to add more.
      </p>

      <!-- Uploaded fonts list -->
      <div v-if="customFonts.length > 0" style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px">
        <div
          v-for="f in customFonts"
          :key="f.name"
          style="display: flex; align-items: center; gap: 6px; padding: 3px 6px; border: 1.5px solid var(--color-text); background: var(--color-paper)"
        >
          <span :style="{ fontFamily: f.name, fontSize: '1.25rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">
            {{ f.name }}
          </span>
          <span style="font-family: var(--font-body); font-size: 10px; opacity: 0.5; flex-shrink: 0">
            custom
          </span>
          <button
            class="btn btn-small"
            :title="`Remove ${f.name}`"
            @click="removeFont(f.name)"
          >x</button>
        </div>
      </div>

      <!-- Warning / error message -->
      <p v-if="fontWarning" style="font-family: var(--font-body); font-size: 11px; margin: 0 0 6px; color: var(--color-accent)">
        {{ fontWarning }}
      </p>

      <!-- Upload button -->
      <input
        ref="fontInputRef"
        type="file"
        accept=".woff2,.woff,.otf,.ttf"
        style="display: none"
        @change="handleFontUpload"
      >
      <button
        class="btn"
        style="width: 100%; justify-content: center"
        :disabled="fontUploading || customFonts.length >= MAX_FONTS"
        @click="openFontPicker"
      >
        {{ fontUploading ? 'Loading...' : `+ Upload font (.woff2 / .otf / .ttf)${customFonts.length >= MAX_FONTS ? ' — limit reached' : ''}` }}
      </button>
    </SettingsBlock>

    <!-- 4. Background -->
    <SettingsBlock id="background" label="▧ Background" :is-visible="isVisible" :is-open="isOpen" :on-toggle="toggle">
      <label class="settings-label">Color</label>
      <div class="settings-swatch-row" style="margin-bottom: 6px">
        <div
          v-for="c in COLOR_PRESETS"
          :key="c"
          :class="`settings-swatch${content.backgroundColor === c ? ' selected' : ''}`"
          :style="{ background: c }"
          :title="c"
          @click="patch({ backgroundColor: c })"
        />
        <input
          type="color"
          :value="content.backgroundColor"
          style="width: 22px; height: 22px; border: 2px solid var(--color-text); cursor: pointer; padding: 0"
          @input="patch({ backgroundColor: ($event.target as HTMLInputElement).value })"
        >
      </div>
      <div class="side-indicator-divider">
        <span class="side-indicator-label">Outside</span>
      </div>
      <ImageUpload
        label="Background image outside"
        :current-url="content.backgroundImageUrl"
        image-type="background"
        :card-id="card.id"
        :on-change="(url) => patch({ backgroundImageUrl: url ?? undefined })"
      />
      <label class="settings-checkbox-label" style="margin-top: 8px">
        <input
          type="checkbox"
          :checked="!!content.continuousBackground"
          @change="patch({ continuousBackground: ($event.target as HTMLInputElement).checked })"
        >
        Stretch image across all panels
      </label>

      <div class="side-indicator-divider">
        <span class="side-indicator-label">Inside</span>
      </div>
      <ImageUpload
        label="Background image inside"
        :current-url="content.insideBackgroundImageUrl"
        image-type="background"
        :card-id="card.id"
        :on-change="(url) => patch({ insideBackgroundImageUrl: url ?? undefined })"
      />
      <label class="settings-checkbox-label" style="margin-top: 8px">
        <input
          type="checkbox"
          :checked="!!content.insideContinuousBackground"
          @change="patch({ insideContinuousBackground: ($event.target as HTMLInputElement).checked })"
        >
        Stretch image across all panels
      </label>
    </SettingsBlock>

    <!-- 4. Flap editors -->
    <SettingsBlock id="flaps" label="◫ Panel content" :is-visible="isVisible" :is-open="isOpen" :on-toggle="toggle">
      <div class="side-indicator-divider-borderless">
        <span class="side-indicator-label">Outside</span>
      </div>
      <!-- Tab strip -->
      <div style="display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap">
        <button
          v-for="i in content.flaps"
          :key="i - 1"
          type="button"
          :class="`btn${activeFlap === i - 1 ? ' active' : ''}`"
          style="font-size: 0.8rem; padding: 4px 8px; min-width: 0"
          @click="activeFlap = i - 1"
        >
          {{ flapLabel(i - 1) }}
        </button>
      </div>

      <!-- Cover flap (index 0) -- includes image options -->
      <template v-if="activeFlap === 0">
        <ImageUpload
          label="Cover image"
          :current-url="content.coverImageUrl"
          image-type="cover"
          :card-id="card.id"
          :on-change="(url) => patch({ coverImageUrl: url ?? undefined })"
        />
        <div v-if="content.coverImageUrl" style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px">
          <label class="settings-checkbox-label">
            <input type="checkbox" :checked="content.isFullCoverImage" @change="patch({ isFullCoverImage: ($event.target as HTMLInputElement).checked })">
            Fill panel with image
          </label>
          <label class="settings-checkbox-label">
            <input type="checkbox" :checked="content.coverImageBehindContent" @change="patch({ coverImageBehindContent: ($event.target as HTMLInputElement).checked })">
            Show text over image
          </label>
        </div>
      </template>

      <!-- Non-cover outside flaps (index 1+) -- per-panel image -->
      <template v-if="activeFlap > 0">
        <ImageUpload
          :label="`Panel ${activeFlap + 1} image`"
          :current-url="content.flapImageUrls?.[activeFlap]"
          image-type="cover"
          :card-id="card.id"
          :on-change="(url) => {
            const next = [...(content.flapImageUrls ?? Array(6).fill(undefined))];
            next[activeFlap] = url ?? undefined;
            patch({ flapImageUrls: next });
          }"
        />
        <div v-if="content.flapImageUrls?.[activeFlap]" style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px">
          <label class="settings-checkbox-label">
            <input
              type="checkbox"
              :checked="content.flapImageFulls?.[activeFlap] ?? false"
              @change="(e) => {
                const next = [...(content.flapImageFulls ?? Array(6).fill(false))];
                next[activeFlap] = (e.target as HTMLInputElement).checked;
                patch({ flapImageFulls: next });
              }"
            >
            Fill panel with image
          </label>
          <label class="settings-checkbox-label">
            <input
              type="checkbox"
              :checked="content.flapImageBehindContents?.[activeFlap] ?? false"
              @change="(e) => {
                const next = [...(content.flapImageBehindContents ?? Array(6).fill(false))];
                next[activeFlap] = (e.target as HTMLInputElement).checked;
                patch({ flapImageBehindContents: next });
              }"
            >
            Show text over image
          </label>
        </div>
      </template>

      <!-- Editor for whichever flap is active -->
      <label class="settings-label" style="margin-top: 10px">Text (shift + enter for new line)</label>
      <ContentEditor
        :key="activeFlap"
        :value="content.flapContents[activeFlap] ?? ''"
        :on-change="(html) => patchFlap(activeFlap, html)"
        :placeholder="activeFlap === 0 ? 'Title, artist, year...' : `Flap ${activeFlap + 1} content...`"
        :min-height="activeFlap === 0 ? '80px' : '60px'"
        :custom-font-names="customFontNames"
      />

      <div class="side-indicator-divider">
        <span class="side-indicator-label">Inside</span>
      </div>
      <div style="display: flex; gap: 4px; margin-top: 8px; margin-bottom: 8px; flex-wrap: wrap">
        <button
          v-for="i in content.flaps"
          :key="i - 1"
          type="button"
          :class="`btn${activeInsideFlap === i - 1 ? ' active' : ''}`"
          style="font-size: 0.8rem; padding: 4px 8px; min-width: 0"
          @click="activeInsideFlap = i - 1"
        >
          {{ flapLabel(i - 1) }}
        </button>
      </div>
      <ImageUpload
        :label="activeInsideFlap === 0 ? 'Inside cover image' : `Inside panel ${activeInsideFlap + 1} image`"
        :current-url="content.insideFlapImageUrls?.[activeInsideFlap]"
        image-type="cover"
        :card-id="card.id"
        :on-change="(url) => {
          const next = [...(content.insideFlapImageUrls ?? Array(6).fill(undefined))];
          next[activeInsideFlap] = url ?? undefined;
          patch({ insideFlapImageUrls: next });
        }"
      />
      <div v-if="content.insideFlapImageUrls?.[activeInsideFlap]" style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px; margin-bottom: 8px">
        <label class="settings-checkbox-label">
          <input
            type="checkbox"
            :checked="content.insideFlapImageFulls?.[activeInsideFlap] ?? false"
            @change="(e) => {
              const next = [...(content.insideFlapImageFulls ?? Array(6).fill(false))];
              next[activeInsideFlap] = (e.target as HTMLInputElement).checked;
              patch({ insideFlapImageFulls: next });
            }"
          >
          Fill panel with image
        </label>
        <label class="settings-checkbox-label">
          <input
            type="checkbox"
            :checked="content.insideFlapImageBehindContents?.[activeInsideFlap] ?? false"
            @change="(e) => {
              const next = [...(content.insideFlapImageBehindContents ?? Array(6).fill(false))];
              next[activeInsideFlap] = (e.target as HTMLInputElement).checked;
              patch({ insideFlapImageBehindContents: next });
            }"
          >
          Show text over image
        </label>
      </div>
      <ContentEditor
        :key="`inside-flap-${activeInsideFlap}`"
        :value="(content.insideFlapContents ?? [])[activeInsideFlap] ?? ''"
        :on-change="(html) => patchInsideFlap(activeInsideFlap, html)"
        :placeholder="activeInsideFlap === 0 ? 'Inside cover...' : `Inside flap ${activeInsideFlap + 1}...`"
        min-height="80px"
        :custom-font-names="customFontNames"
      />
    </SettingsBlock>

    <!-- 5. Spine -->
    <SettingsBlock id="spine" label="▏Spine" :is-visible="isVisible" :is-open="isOpen" :on-toggle="toggle">
      <div class="side-indicator-divider-borderless">
        <span class="side-indicator-label">Outside</span>
      </div>
      <label class="settings-label">Top</label>
      <ContentEditor :value="content.spineTopContent" :on-change="(html) => patch({ spineTopContent: html })" placeholder="Mixtape title" min-height="40px" :custom-font-names="customFontNames" />
      <label class="settings-label" style="margin-top: 8px">Center</label>
      <ContentEditor :value="content.spineCenterContent" :on-change="(html) => patch({ spineCenterContent: html })" placeholder="Side A / Side B" min-height="40px" :custom-font-names="customFontNames" />
      <label class="settings-label" style="margin-top: 8px">Bottom</label>
      <ContentEditor :value="content.spineBottomContent" :on-change="(html) => patch({ spineBottomContent: html })" placeholder="90 min" min-height="40px" :custom-font-names="customFontNames" />

      <div class="side-indicator-divider">
        <span class="side-indicator-label">Inside</span>
      </div>
      <label class="settings-label" style="margin-top: 8px">Center</label>
      <ContentEditor :value="content.insideSpineContent ?? ''" :on-change="(html) => patch({ insideSpineContent: html })" placeholder="Spine inside..." min-height="40px" :custom-font-names="customFontNames" />
    </SettingsBlock>

    <!-- 6. Back panel -->
    <SettingsBlock id="back" label="◧ Back panel" :is-visible="isVisible" :is-open="isOpen" :on-toggle="toggle">
      <div class="side-indicator-divider-borderless">
        <span class="side-indicator-label">Outside</span>
      </div>
      <label class="settings-label">Left column (Side A)</label>
      <ContentEditor :value="content.backLeftContent" :on-change="(html) => patch({ backLeftContent: html })" placeholder="Side A tracks..." min-height="80px" :custom-font-names="customFontNames" />
      <label class="settings-label" style="margin-top: 8px">Right column (Side B)</label>
      <ContentEditor :value="content.backRightContent" :on-change="(html) => patch({ backRightContent: html })" placeholder="Side B tracks..." min-height="80px" :custom-font-names="customFontNames" />

      <div class="side-indicator-divider">
        <span class="side-indicator-label">Inside</span>
      </div>
      <label class="settings-label" style="margin-top: 8px">Content</label>
      <ContentEditor :value="content.insideBackContent ?? ''" :on-change="(html) => patch({ insideBackContent: html })" placeholder="Back panel inside..." min-height="80px" :custom-font-names="customFontNames" />
    </SettingsBlock>

    <!-- 7. Tracklist (linked mixtape) -->
    <SettingsBlock id="mixtape" label="⚏ Tracklist" :is-visible="isVisible" :is-open="isOpen" :on-toggle="toggle">
      <MixtapeLinkPicker
        :mixtape-id="card.mixtapeId"
        :current-mixtape="currentMixtape"
        :content="content"
        :on-link-change="onMixtapeLink"
        :on-content-change="onContentChange"
      />
    </SettingsBlock>

    <!-- 8. Export -->
    <SettingsBlock id="export" label="⇪ Export" :is-visible="isVisible" :is-open="isOpen" :on-toggle="toggle">
      <label class="settings-checkbox-label" style="margin-bottom: 8px">
        <input
          type="checkbox"
          :checked="!!content.showCutGuides"
          @change="patch({ showCutGuides: ($event.target as HTMLInputElement).checked })"
        >
        Show fold / cut guides
      </label>
      <button
        class="btn btn-primary"
        style="width: 100%; justify-content: center"
        :disabled="exporting"
        @click="handleExport"
      >
        {{ exporting ? 'Generating...' : 'Export PDF' }}
      </button>
      <p style="font-size: 10px; color: var(--color-text-light); margin-top: 6px; font-family: var(--font-body)">
        Print at 100% / Actual size for correct dimensions.
      </p>
    </SettingsBlock>
  </div>
</template>
