<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { JCard, JCardContent, Mixtape, CustomFont, JCardPaperSize, JCardDuplexFlip } from '~/types';
import { JCARD_PRESETS } from '~/utils/jcardPresets';
import { type Section, SECTION_COLORS, SETTINGS_COLOR_PRESETS as COLOR_PRESETS } from './settingsSections';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { fontNameFromFile, readFileAsBase64, mimeTypeFromFile, registerCustomFonts } from '~/utils/fontManager';
import { deleteJCardImage } from '~/utils/supabaseImages';
import {
  exportJCardToPDF, resolvePdfLayout, shouldExportInside, jcardHasInsideContent,
  PAPER_SIZES_MM, DEFAULT_PAPER, DEFAULT_DUPLEX_FLIP,
} from '~/utils/jcardPdf';
import { useUiStore } from '~/stores/ui';

const props = defineProps<{
  card: JCard;
  currentMixtape: Mixtape | null;
  sections?: Section[];
}>();

const emit = defineEmits<{
  titleChange: [title: string];
  contentChange: [content: JCardContent];
  mixtapeLink: [id: string | null];
  publicChange: [isPublic: boolean];
}>();

const ui = useUiStore();
const content = computed(() => migrateJCardContent(props.card.content));

function patch(partial: Partial<JCardContent>) {
  emit('contentChange', { ...content.value, ...partial });
}
function patchFlap(index: number, html: string) {
  const next = [...content.value.flapContents];
  while (next.length < 6) next.push('');
  next[index] = html;
  patch({ flapContents: next });
}
function patchInsideFlap(index: number, html: string) {
  const next = [...(content.value.insideFlapContents ?? (Array(6).fill('') as string[]))];
  while (next.length < 6) next.push('');
  next[index] = html;
  patch({ insideFlapContents: next });
}

const openSections = ref<Set<Section>>(
  new Set(['info', 'layout', 'flaps', 'background', 'fonts', 'spine', 'back', 'inside', 'mixtape', 'export'] as Section[]),
);
const activeFlap = ref(0);
const activeInsideFlap = ref(0);
const exporting = ref(false);
const fontUploading = ref(false);
const fontWarning = ref<string | null>(null);
const fontInputRef = ref<HTMLInputElement | null>(null);
const backgroundColorInput = ref<HTMLInputElement | null>(null);

const isCustomBackground = computed(() =>
  !COLOR_PRESETS.some((c) => c.toLowerCase() === content.value.backgroundColor.toLowerCase()),
);

const customFonts = computed<CustomFont[]>(() => content.value.customFonts ?? []);
const customFontNames = computed(() => customFonts.value.map((f) => f.name));

const MAX_FONTS = 3;
const WARN_SIZE_KB = 200;

async function handleFontUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  input.value = '';
  fontWarning.value = null;

  if (customFonts.value.length >= MAX_FONTS) {
    fontWarning.value = `Max ${MAX_FONTS} fonts per card. Remove one first.`;
    return;
  }
  const sizeKb = file.size / 1024;
  if (sizeKb > WARN_SIZE_KB) {
    fontWarning.value = `${file.name} is ${Math.round(sizeKb)} KB — large fonts increase save size.`;
  }

  fontUploading.value = true;
  try {
    const name = fontNameFromFile(file);
    const data = await readFileAsBase64(file);
    const mimeType = mimeTypeFromFile(file);
    const newFont: CustomFont = { name, data, mimeType };
    await registerCustomFonts([newFont]);
    patch({ customFonts: [...customFonts.value, newFont] });
  } catch (err) {
    console.error('Font upload failed:', err);
    fontWarning.value = 'Upload failed — the file may be corrupt.';
  } finally {
    fontUploading.value = false;
  }
}
function removeFont(name: string) {
  patch({ customFonts: customFonts.value.filter((f) => f.name !== name) });
}

// Keep active flap indices in bounds when flap count drops.
watch(() => content.value.flaps, (flaps) => {
  if (activeFlap.value >= flaps) activeFlap.value = flaps - 1;
  if (activeInsideFlap.value >= flaps) activeInsideFlap.value = flaps - 1;
});

function toggle(s: Section) {
  const next = new Set(openSections.value);
  next.has(s) ? next.delete(s) : next.add(s);
  openSections.value = next;
}
const isOpen = (s: Section) => openSections.value.has(s);
const isVisible = (s: Section) => !props.sections || props.sections.includes(s);

async function handleExport() {
  exporting.value = true;
  try {
    await exportJCardToPDF(content.value, props.card.title || 'jcard');
  } catch (e) {
    console.error(e);
    ui.showToast('Could not generate the PDF — please try again', 'error');
    return;
  } finally {
    exporting.value = false;
  }
  // The file is already downloading. What people need *now* is the print
  // guidance they would otherwise get wrong; it is muteable on its own.
  ui.openSuccessModal({
    title: 'J-card downloaded',
    trigger: 'pdf',
    checklist: { heading: 'Before you print', items: printChecklist.value },
    fallbackToast: 'J-card PDF downloaded',
  });
}

function handleApplyPreset(presetId: string) {
  const preset = JCARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  if (!confirm(`Apply the "${preset.label}" preset? This will overwrite your current design.`)) return;
  emit('contentChange', { ...content.value, ...preset.content } as JCardContent);
}

// Background images carry a thumbnail (see supabaseImages.ts) that the Explore
// grid preview reads instead of the full-size original. The old thumbnail is
// orphaned once its image is replaced or removed, so it's deleted here
// explicitly — ImageUpload only reports the new upload.
function handleBackgroundImageChange({ url, thumbUrl }: { url: string | null; thumbUrl?: string }) {
  if (content.value.backgroundImageThumbUrl) deleteJCardImage(content.value.backgroundImageThumbUrl);
  patch({ backgroundImageUrl: url ?? undefined, backgroundImageThumbUrl: thumbUrl });
}

// Export / print options.
const pdfLayout = computed(() => resolvePdfLayout(content.value));
const paperSize = computed<JCardPaperSize>(() => content.value.paperSize ?? DEFAULT_PAPER);
const duplexFlip = computed<JCardDuplexFlip>(() => content.value.duplexFlip ?? DEFAULT_DUPLEX_FLIP);
const exportInside = computed(() => shouldExportInside(content.value));
const insideHasContent = computed(() => jcardHasInsideContent(content.value));
const paperLabel = computed(() =>
  pdfLayout.value.paper === 'fit'
    ? `custom page ${pdfLayout.value.pageWmm.toFixed(0)} × ${pdfLayout.value.pageHmm.toFixed(0)} mm`
    : `${PAPER_SIZES_MM[pdfLayout.value.paper].label} landscape`,
);

// Same guidance as the PRINT SETTINGS list below, condensed for the download modal.
const printChecklist = computed<string[]>(() => {
  const items = [
    `Paper: ${paperLabel.value}`,
    '100% scale / actual size — turn off "fit to page"',
  ];
  if (exportInside.value) {
    items.push(`Two-sided, flip on the ${duplexFlip.value} edge (match the print dialog)`);
    items.push('Print page 1 alone first and measure the 50 mm bar before printing both sides');
  } else {
    items.push('Two-sided: off');
  }
  items.push('Cut on the crop marks, fold on the dashed guides');
  if (content.value.bleed) items.push('The ghosted border is the bleed — it is cut away');
  return items;
});

function blockAttrs(id: Section) {
  return { id, visible: isVisible(id), open: isOpen(id), bg: SECTION_COLORS[id].bg, fg: SECTION_COLORS[id].fg };
}
</script>

<template>
  <div class="jc-settings">
    <!-- 1. Card info -->
    <SettingsBlock v-bind="blockAttrs('info')" label="✎ Card info" @toggle="toggle">
      <label class="jc-label">Title</label>
      <input class="jc-input" :value="card.title" placeholder="My J-Card" @input="emit('titleChange', ($event.target as HTMLInputElement).value)" />
      <label class="jc-checkbox-label jc-mt-sm">
        <input
          type="checkbox"
          :checked="card.isPublic === true"
          :disabled="card.isCopy === true"
          :title="card.isCopy ? 'This is an unedited copy of another J-card, and will not show up in the explore page' : undefined"
          @change="emit('publicChange', ($event.target as HTMLInputElement).checked)"
        />
        Make this card public. Let others see it and inspire them.
      </label>
      <p v-if="card.isCopy" class="small-info">
        This is an unedited copy of another J-card, and will not show up in the explore page
      </p>
      <p class="small-info">Needs to be saved to the cloud (sign in) before anyone else can see it.</p>
    </SettingsBlock>

    <!-- 1b. Presets -->
    <SettingsBlock v-bind="blockAttrs('presets')" label="✦ Basic presets" @toggle="toggle">
      <p class="small-info">Applying a preset overwrites your current design. Use Undo to revert.</p>
      <div class="jc-preset-list">
        <button
          v-for="preset in JCARD_PRESETS"
          :key="preset.id"
          class="btn jc-preset-btn"
          @click="handleApplyPreset(preset.id)"
        >
          <span class="jc-preset-label">{{ preset.label }}</span>
        </button>
      </div>
    </SettingsBlock>

    <!-- 2. Layout -->
    <SettingsBlock v-bind="blockAttrs('layout')" label="▣ Panel layout" @toggle="toggle">
      <label class="jc-checkbox-label">
        <input type="checkbox" :checked="content.isReversed" @change="patch({ isReversed: ($event.target as HTMLInputElement).checked })" />
        Reverse card (flip left/right)
      </label>
      <label class="jc-checkbox-label">
        <input type="checkbox" :checked="content.shortBack" @change="patch({ shortBack: ($event.target as HTMLInputElement).checked })" />
        Short back panel (10 mm)
      </label>
      <label class="jc-label jc-mt-sm">Panels: {{ content.flaps }}</label>
      <input
        type="range" :min="1" :max="6" :value="content.flaps"
        class="jc-range"
        @input="patch({ flaps: parseInt(($event.target as HTMLInputElement).value, 10) as 1|2|3|4|5|6 })"
      />
      <div class="jc-range-ticks">
        <span v-for="n in 6" :key="n">{{ n }}</span>
      </div>
      <p v-if="!pdfLayout.fitsRequested" class="small-info">
        Cover + {{ content.flaps - 1 }} panels is {{ pdfLayout.widthMm.toFixed(1) }} mm wide — too wide for
        {{ PAPER_SIZES_MM[pdfLayout.requestedPaper === 'fit' ? 'a4' : pdfLayout.requestedPaper].label }} landscape.
        The PDF will use a custom page size; print it on larger paper (A3) or at a copy shop.
      </p>
    </SettingsBlock>

    <!-- 3. Fonts -->
    <SettingsBlock v-bind="blockAttrs('fonts')" label="Aa Custom fonts" @toggle="toggle">
      <p class="small-info">
        9 default fonts are always available in the text editors.
        Upload up to 3 of your own <b>.woff2</b>, <b>.otf</b>, or <b>.ttf</b> files to add more.
      </p>

      <div v-if="customFonts.length > 0" class="jc-font-list">
        <div
          v-for="f in customFonts"
          :key="f.name"
          class="jc-font-row"
        >
          <span :style="{ fontFamily: f.name, fontSize: '1.25rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">{{ f.name }}</span>
          <span class="jc-font-tag">custom</span>
          <button class="btn btn-small" :title="`Remove ${f.name}`" @click="removeFont(f.name)">x</button>
        </div>
      </div>

      <p v-if="fontWarning" class="jc-font-warning">{{ fontWarning }}</p>

      <!-- Upload custom fonts -->
      <input ref="fontInputRef" type="file" accept=".woff2,.woff,.otf,.ttf" class="jc-file-input" @change="handleFontUpload" />
      <button
        class="btn jc-btn-full"
        :disabled="fontUploading || customFonts.length >= MAX_FONTS"
        @click="fontWarning = null; fontInputRef?.click()"
      >
        {{ fontUploading ? 'Loading...' : `+ Upload font (.woff2 / .otf / .ttf)${customFonts.length >= MAX_FONTS ? ' — limit reached' : ''}` }}
      </button>
    </SettingsBlock>

    <!-- 4. Background -> Set color or image for all panels (can be streched across all panels or per panel) -->
    <SettingsBlock v-bind="blockAttrs('background')" label="▧ Background color and image" @toggle="toggle">
      <label class="jc-label">Color</label>
      <div class="jc-swatch-row jc-swatch-row--tight">
        <div
          v-for="c in COLOR_PRESETS"
          :key="c"
          :class="`jc-swatch${content.backgroundColor === c ? ' selected' : ''}`"
          :style="{ background: c }"
          :title="c"
          @click="patch({ backgroundColor: c })"
        />
        <button
          type="button"
          :class="`jc-swatch jc-swatch-custom${isCustomBackground ? ' selected' : ''}`"
          :style="isCustomBackground ? { background: content.backgroundColor } : undefined"
          title="Custom color"
          aria-label="Custom color"
          @click="backgroundColorInput?.click()"
        >
          <span class="jc-swatch-plus">+</span>
        </button>
        <span class="jc-swatch-custom-label">Custom</span>
        <input
          ref="backgroundColorInput"
          type="color"
          class="jc-color-hidden"
          :value="content.backgroundColor"
          aria-label="Custom background color"
          @input="patch({ backgroundColor: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div class="jc-side-divider"><span class="jc-side-label">Outside</span></div>
      <ImageUpload
        label="Background image outside"
        :current-url="content.backgroundImageUrl"
        image-type="background"
        :card-id="card.id"
        @change="handleBackgroundImageChange"
      />
      <label class="jc-checkbox-label jc-mt">
        <input type="checkbox" :checked="!!content.continuousBackground" @change="patch({ continuousBackground: ($event.target as HTMLInputElement).checked })" />
        Stretch image across all panels
      </label>

      <div class="jc-side-divider"><span class="jc-side-label">Inside</span></div>
      <ImageUpload
        label="Background image inside"
        :current-url="content.insideBackgroundImageUrl"
        image-type="background"
        :card-id="card.id"
        @change="patch({ insideBackgroundImageUrl: $event.url ?? undefined })"
      />
      <label class="jc-checkbox-label jc-mt">
        <input type="checkbox" :checked="!!content.insideContinuousBackground" @change="patch({ insideContinuousBackground: ($event.target as HTMLInputElement).checked })" />
        Stretch image across all panels
      </label>
    </SettingsBlock>

    <!-- 5. Panel content -->
    <SettingsBlock v-bind="blockAttrs('flaps')" label="◫ Panel content" @toggle="toggle">
      <!-- Outside panel ------------------------------------------------------------ -->
      <div class="jc-side-divider-borderless"><span class="jc-side-label">Outside</span></div>
      <PanelImageSettings
        v-model:active-panel="activeFlap"
        side="outside"
        :content="content"
        :card-id="card.id"
        @patch="patch"
      />

      <label class="jc-label jc-mt-lg">Text (shift + enter for new line)</label>
      <ContentEditor
        :key="activeFlap"
        :value="content.flapContents[activeFlap] ?? ''"
        :placeholder="activeFlap === 0 ? 'Title, artist, year...' : `Panel ${activeFlap + 1} content...`"
        :min-height="activeFlap === 0 ? '80px' : '60px'"
        :custom-font-names="customFontNames"
        @change="patchFlap(activeFlap, $event)"
      />

      <!-- Inside panel ------------------------------------------------------------ -->
      <div class="jc-side-divider"><span class="jc-side-label">Inside</span></div>
      <PanelImageSettings
        v-model:active-panel="activeInsideFlap"
        side="inside"
        :content="content"
        :card-id="card.id"
        @patch="patch"
      />
      <ContentEditor
        :key="`inside-flap-${activeInsideFlap}`"
        :value="(content.insideFlapContents ?? [])[activeInsideFlap] ?? ''"
        :placeholder="activeInsideFlap === 0 ? 'Inside cover...' : `Inside panel ${activeInsideFlap + 1}...`"
        min-height="80px"
        :custom-font-names="customFontNames"
        @change="patchInsideFlap(activeInsideFlap, $event)"
      />
    </SettingsBlock>

    <!-- 6. Spine -->
    <SettingsBlock v-bind="blockAttrs('spine')" label="▏Spine" @toggle="toggle">
      <div class="jc-side-divider-borderless"><span class="jc-side-label">Outside</span></div>

      <label class="jc-label">Top</label>
      <ContentEditor :value="content.spineTopContent" placeholder="Mixtape title" min-height="40px" :custom-font-names="customFontNames" @change="patch({ spineTopContent: $event })" />
      <label class="jc-label jc-mt">Center</label>
      <ContentEditor :value="content.spineCenterContent" placeholder="Side A / Side B" min-height="40px" :custom-font-names="customFontNames" @change="patch({ spineCenterContent: $event })" />
      <label class="jc-label jc-mt">Bottom</label>
      <ContentEditor :value="content.spineBottomContent" placeholder="90 min" min-height="40px" :custom-font-names="customFontNames" @change="patch({ spineBottomContent: $event })" />

      <div class="jc-side-divider"><span class="jc-side-label">Inside</span></div>
      
      <label class="jc-label jc-mt">Center</label>
      <ContentEditor :value="content.insideSpineContent ?? ''" placeholder="Spine inside..." min-height="40px" :custom-font-names="customFontNames" @change="patch({ insideSpineContent: $event })" />
    </SettingsBlock>

    <!-- 7. Back panel -->
    <SettingsBlock v-bind="blockAttrs('back')" label="◧ Back panel" @toggle="toggle">
      <div class="jc-side-divider-borderless"><span class="jc-side-label">Outside</span></div>
      <label class="jc-label">Left column (Side A)</label>
      <ContentEditor :value="content.backLeftContent" placeholder="Side A tracks..." min-height="80px" :custom-font-names="customFontNames" @change="patch({ backLeftContent: $event })" />
      <label class="jc-label jc-mt">Right column (Side B)</label>
      <ContentEditor :value="content.backRightContent" placeholder="Side B tracks..." min-height="80px" :custom-font-names="customFontNames" @change="patch({ backRightContent: $event })" />

      <div class="jc-side-divider"><span class="jc-side-label">Inside</span></div>
      <label class="jc-label jc-mt">Content</label>
      <ContentEditor :value="content.insideBackContent ?? ''" placeholder="Back panel inside..." min-height="80px" :custom-font-names="customFontNames" @change="patch({ insideBackContent: $event })" />
    </SettingsBlock>

    <!-- 8. Tracklist -->
    <SettingsBlock v-bind="blockAttrs('mixtape')" label="⚏ Tracklist" @toggle="toggle">
      <MixtapeLinkPicker
        :mixtape-id="card.mixtapeId"
        :current-mixtape="currentMixtape"
        :content="content"
        @link-change="emit('mixtapeLink', $event)"
        @content-change="emit('contentChange', $event)"
      />
    </SettingsBlock>

    <!-- 9. Export -->
    <SettingsBlock v-bind="blockAttrs('export')" label="⇪ Export" @toggle="toggle">
      <label class="jc-label">Paper</label>
      <select
        class="jc-select"
        :value="paperSize"
        @change="patch({ paperSize: ($event.target as HTMLSelectElement).value as JCardPaperSize })"
      >
        <option value="a4">A4 landscape (297 × 210 mm)</option>
        <option value="letter">US Letter landscape (11 × 8.5 in)</option>
        <option value="fit">Fit to card (custom page size)</option>
      </select>
      <p v-if="!pdfLayout.fitsRequested" class="small-info">
        The card is wider than this paper — the PDF will use a custom page instead.
      </p>

      <label class="jc-checkbox-label jc-mt">
        <input type="checkbox" :checked="!!content.showCutGuides" @change="patch({ showCutGuides: ($event.target as HTMLInputElement).checked })" />
        Show fold / cut guides
      </label>
      <label class="jc-checkbox-label">
        <input type="checkbox" :checked="!!content.bleed" @change="patch({ bleed: ($event.target as HTMLInputElement).checked })" />
        Add 3 mm bleed (mirrors the edges outward so an off cut shows no white)
      </label>
      <label class="jc-checkbox-label">
        <input type="checkbox" :checked="exportInside" @change="patch({ exportInside: ($event.target as HTMLInputElement).checked })" />
        Include inside as page 2 (two-sided print)
      </label>
      <p v-if="exportInside && !insideHasContent" class="small-info">
        The inside is empty — page 2 will only carry the background colour.
      </p>

      <template v-if="exportInside">
        <label class="jc-label jc-mt-sm">Printer flips the sheet on the</label>
        <select
          class="jc-select"
          :value="duplexFlip"
          @change="patch({ duplexFlip: ($event.target as HTMLSelectElement).value as JCardDuplexFlip })"
        >
          <option value="long">Long edge (printer default)</option>
          <option value="short">Short edge</option>
        </select>
        <p class="small-info">
          Match this to the "two-sided" setting in your print dialog. With "long edge", page 2 looks upside
          down in the PDF viewer — that is intended, it comes out right after the flip.
        </p>
      </template>

      <button class="btn btn-primary jc-btn-full jc-mt" :disabled="exporting" @click="handleExport">
        {{ exporting ? 'Generating...' : 'Export PDF' }}
      </button>

      <p class="jc-print-note">PRINT SETTINGS</p>
      <ul class="jc-print-list">
        <li>Paper: {{ paperLabel }}</li>
        <li>Scale: 100% / actual size — never "fit to page" or "shrink to printable area"</li>
        <li v-if="exportInside">Two-sided: on, flip on {{ duplexFlip }} edge (or feed page 1 back in by hand the same way)</li>
        <li v-else>Two-sided: off</li>
        <li>Print page 1 alone first and measure the 50 mm bar under the card before printing both sides</li>
        <li>Use card stock of 160–250 g/m² and cut on the crop marks, fold on the dashed guides</li>
        <li v-if="content.bleed">The ghosted border around the card is the bleed; it is cut away</li>
      </ul>
    </SettingsBlock>
  </div>
</template>

<style scoped>
/* Settings panels — "punched plastic" SchWindow aesthetic */
.jc-settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Text inputs */
.jc-input {
  width: 100%;
  padding: 7px 10px;
  border: 2px solid var(--color-text);
  background: var(--color-white);
  box-shadow: var(--bevel-in);
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-text);
  box-sizing: border-box;
  outline: none;
  border-radius: 0;
}

.jc-input:focus {
  background: rgba(212, 169, 53, 0.18);
}

/* Color swatch presets row */
.jc-swatch-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.jc-swatch {
  width: 22px;
  height: 22px;
  border: 2px solid var(--color-text);
  cursor: pointer;
  outline: none;
  flex-shrink: 0;
}

/* Range slider */
.jc-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: var(--color-white);
  border: 2px solid var(--color-text);
  border-radius: 0;
  box-shadow: var(--bevel-in);
  cursor: pointer;
  outline: none;
  padding: 0;
}

.jc-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 20px;
  background: var(--color-primary);
  border: 2px solid var(--color-text);
  border-radius: 0;
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--color-text);
}

.jc-range::-webkit-slider-thumb:hover {
  background: var(--color-mustard);
}

.jc-range::-moz-range-thumb {
  width: 16px;
  height: 20px;
  background: var(--color-primary);
  border: 2px solid var(--color-text);
  border-radius: 0;
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--color-text);
}

.jc-range::-moz-range-thumb:hover {
  background: var(--color-mustard);
}

.jc-range::-moz-range-track {
  background: var(--color-white);
  border: none;
}

.jc-range-ticks {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-display);
  font-size: 11px;
  color: var(--color-text);
  opacity: 0.7;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.jc-swatch.selected {
  outline: 2px solid var(--color-mustard);
  outline-offset: 1px;
}

/* Custom-colour swatch: a conic gradient behind a "+", with the real
   <input type="color"> hidden next to it and opened by clicking the swatch. */
.jc-swatch-custom {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 6px;
  padding: 0;
  background: conic-gradient(#5b2838, #d4a935, #a8c4a2, #8fc9b7, #3d5a47, #b4a0c7, #5b2838);
}

.jc-swatch-plus {
  font-family: var(--font-display);
  font-size: 16px;
  line-height: 1;
  color: #fff;
  text-shadow:
    -1px -1px 0 var(--color-text),
    1px -1px 0 var(--color-text),
    -1px 1px 0 var(--color-text),
    1px 1px 0 var(--color-text);
  pointer-events: none;
}

.jc-swatch-custom-label {
  font-family: var(--font-body);
  font-size: 10px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--color-text-light);
  flex-shrink: 0;
}

.jc-color-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.jc-side-label {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: bold;
  color: var(--color-primary);
  border-bottom: 2px solid var(--color-primary);
  padding: 0 2px;
}

.jc-side-divider {
  border-top: 1.5px dashed rgba(0,0,0,0.15);
  margin-top: 14px;
  padding-top: 10px;
  display: flex;
  align-items: center;
  gap: 6;
}

.jc-side-divider-borderless {
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6;
}

/* ═══════════════════════════════════════════════════════
   JCardSettings — moved out of inline style attributes
   ═══════════════════════════════════════════════════════ */

/* Vertical rhythm between stacked controls inside a .jc-body. Three steps
   cover every spacing the panel used inline. */
.jc-mt-sm { margin-top: 6px; }

.jc-mt    { margin-top: 8px; }

.jc-mt-lg { margin-top: 10px; }

/* ── Presets ── */
.jc-preset-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.jc-preset-btn {
  justify-content: flex-start;
  gap: 8px;
  padding: 5px 10px;
}

.jc-preset-label {
  font-family: var(--font-body);
  font-size: 12px;
}

/* ── Custom fonts ── */
.jc-font-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.jc-font-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border: 1.5px solid var(--color-text);
  background: var(--color-paper);
}

.jc-font-tag {
  font-family: var(--font-body);
  font-size: 10px;
  opacity: 0.5;
  flex-shrink: 0;
}

.jc-font-warning {
  font-family: var(--font-body);
  font-size: 11px;
  margin: 0 0 6px;
  color: var(--color-accent);
}

/* Hidden <input type="file"> driven by a sibling button. */
.jc-file-input {
  display: none;
}

/* Full-width action button (font upload, export). */
.jc-btn-full {
  width: 100%;
  justify-content: center;
}

/* ── Background ── */
.jc-swatch-row--tight {
  margin-bottom: 6px;
}

/* ── Export ── */
.jc-print-note {
  font-size: 10px;
  color: var(--color-text-light);
  margin: 8px 0 2px;
  font-family: var(--font-body);
  letter-spacing: 0.5px;
}

.jc-print-list {
  font-size: 10px;
  color: var(--color-text-light);
  margin: 0;
  padding-left: 14px;
  font-family: var(--font-body);
  line-height: 1.5;
}
</style>
