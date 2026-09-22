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

const flapLabel = (i: number) => (i === 0 ? 'Cover' : `Flap ${i + 1}`);

// Outside cover/background images carry a thumbnail (see supabaseImages.ts)
// that the Explore grid preview reads instead of the full-size original. The
// old thumbnail is orphaned once its image is replaced or removed, so it's
// deleted here explicitly — ImageUpload only reports the new upload.
function handleCoverImageChange({ url, thumbUrl }: { url: string | null; thumbUrl?: string }) {
  if (content.value.coverImageThumbUrl) deleteJCardImage(content.value.coverImageThumbUrl);
  patch({ coverImageUrl: url ?? undefined, coverImageThumbUrl: thumbUrl });
}
function handleBackgroundImageChange({ url, thumbUrl }: { url: string | null; thumbUrl?: string }) {
  if (content.value.backgroundImageThumbUrl) deleteJCardImage(content.value.backgroundImageThumbUrl);
  patch({ backgroundImageUrl: url ?? undefined, backgroundImageThumbUrl: thumbUrl });
}

// Per-flap image array helpers.
function setFlapImage(url: string | null) {
  const next = [...(content.value.flapImageUrls ?? Array(6).fill(undefined))];
  next[activeFlap.value] = url ?? undefined;
  patch({ flapImageUrls: next });
}
function setFlapImageFull(checked: boolean) {
  const next = [...(content.value.flapImageFulls ?? Array(6).fill(false))];
  next[activeFlap.value] = checked;
  patch({ flapImageFulls: next });
}
function setFlapImageBehind(checked: boolean) {
  const next = [...(content.value.flapImageBehindContents ?? Array(6).fill(false))];
  next[activeFlap.value] = checked;
  patch({ flapImageBehindContents: next });
}
function setInsideFlapImage(url: string | null) {
  const next = [...(content.value.insideFlapImageUrls ?? Array(6).fill(undefined))];
  next[activeInsideFlap.value] = url ?? undefined;
  patch({ insideFlapImageUrls: next });
}
function setInsideFlapImageFull(checked: boolean) {
  const next = [...(content.value.insideFlapImageFulls ?? Array(6).fill(false))];
  next[activeInsideFlap.value] = checked;
  patch({ insideFlapImageFulls: next });
}
function setInsideFlapImageBehind(checked: boolean) {
  const next = [...(content.value.insideFlapImageBehindContents ?? Array(6).fill(false))];
  next[activeInsideFlap.value] = checked;
  patch({ insideFlapImageBehindContents: next });
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
      <label class="jc-checkbox-label" style="margin-top:6px">
        <input
          type="checkbox"
          :checked="card.isPublic === true"
          :disabled="card.isCopy === true"
          :title="card.isCopy ? 'This is an unedited copy of another J-card, and will not show up in the explore page' : undefined"
          @change="emit('publicChange', ($event.target as HTMLInputElement).checked)"
        />
        Public — show on my profile and the linked mixtape's page
      </label>
      <p v-if="card.isCopy" class="small-info">
        This is an unedited copy of another J-card, and will not show up in the explore page
      </p>
      <p class="small-info">Needs to be saved to the cloud (sign in) before anyone else can see it.</p>
    </SettingsBlock>

    <!-- 1b. Presets -->
    <SettingsBlock v-bind="blockAttrs('presets')" label="✦ Presets" @toggle="toggle">
      <p class="small-info">Applying a preset overwrites your current design. Use Undo to revert.</p>
      <div style="display:flex;flex-direction:column;gap:4px">
        <button
          v-for="preset in JCARD_PRESETS"
          :key="preset.id"
          class="btn"
          style="justify-content:flex-start;gap:8px;padding:5px 10px"
          @click="handleApplyPreset(preset.id)"
        >
          <span style="font-family:var(--font-body);font-size:12px">{{ preset.label }}</span>
        </button>
      </div>
    </SettingsBlock>

    <!-- 2. Layout -->
    <SettingsBlock v-bind="blockAttrs('layout')" label="▣ Layout" @toggle="toggle">
      <label class="jc-checkbox-label">
        <input type="checkbox" :checked="content.isReversed" @change="patch({ isReversed: ($event.target as HTMLInputElement).checked })" />
        Reverse card (flip left/right)
      </label>
      <label class="jc-checkbox-label">
        <input type="checkbox" :checked="content.shortBack" @change="patch({ shortBack: ($event.target as HTMLInputElement).checked })" />
        Short back panel (10 mm)
      </label>
      <label class="jc-label" style="margin-top:6px">Panels: {{ content.flaps }}</label>
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
    <SettingsBlock v-bind="blockAttrs('fonts')" label="Aa Fonts" @toggle="toggle">
      <p class="small-info">
        9 default fonts are always available in the text editors.
        Upload up to 3 of your own <b>.woff2</b>, <b>.otf</b>, or <b>.ttf</b> files to add more.
      </p>

      <div v-if="customFonts.length > 0" style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">
        <div
          v-for="f in customFonts"
          :key="f.name"
          style="display:flex;align-items:center;gap:6px;padding:3px 6px;border:1.5px solid var(--color-text);background:var(--color-paper)"
        >
          <span :style="{ fontFamily: f.name, fontSize: '1.25rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">{{ f.name }}</span>
          <span style="font-family:var(--font-body);font-size:10px;opacity:0.5;flex-shrink:0">custom</span>
          <button class="btn btn-small" :title="`Remove ${f.name}`" @click="removeFont(f.name)">x</button>
        </div>
      </div>

      <p v-if="fontWarning" style="font-family:var(--font-body);font-size:11px;margin:0 0 6px;color:var(--color-accent)">{{ fontWarning }}</p>

      <input ref="fontInputRef" type="file" accept=".woff2,.woff,.otf,.ttf" style="display:none" @change="handleFontUpload" />
      <button
        class="btn"
        style="width:100%;justify-content:center"
        :disabled="fontUploading || customFonts.length >= MAX_FONTS"
        @click="fontWarning = null; fontInputRef?.click()"
      >
        {{ fontUploading ? 'Loading...' : `+ Upload font (.woff2 / .otf / .ttf)${customFonts.length >= MAX_FONTS ? ' — limit reached' : ''}` }}
      </button>
    </SettingsBlock>

    <!-- 4. Background -->
    <SettingsBlock v-bind="blockAttrs('background')" label="▧ Background" @toggle="toggle">
      <label class="jc-label">Color</label>
      <div class="jc-swatch-row" style="margin-bottom:6px">
        <div
          v-for="c in COLOR_PRESETS"
          :key="c"
          :class="`jc-swatch${content.backgroundColor === c ? ' selected' : ''}`"
          :style="{ background: c }"
          :title="c"
          @click="patch({ backgroundColor: c })"
        />
        <input
          type="color"
          :value="content.backgroundColor"
          style="width:22px;height:22px;border:2px solid var(--color-text);cursor:pointer;padding:0"
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
      <label class="jc-checkbox-label" style="margin-top:8px">
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
      <label class="jc-checkbox-label" style="margin-top:8px">
        <input type="checkbox" :checked="!!content.insideContinuousBackground" @change="patch({ insideContinuousBackground: ($event.target as HTMLInputElement).checked })" />
        Stretch image across all panels
      </label>
    </SettingsBlock>

    <!-- 5. Panel content -->
    <SettingsBlock v-bind="blockAttrs('flaps')" label="◫ Panel content" @toggle="toggle">
      <div class="jc-side-divider-borderless"><span class="jc-side-label">Outside</span></div>
      <div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap">
        <button
          v-for="i in content.flaps"
          :key="i - 1"
          type="button"
          :class="`btn${activeFlap === i - 1 ? ' active' : ''}`"
          style="font-size:0.8rem;padding:4px 8px;min-width:0"
          @click="activeFlap = i - 1"
        >
          {{ flapLabel(i - 1) }}
        </button>
      </div>

      <template v-if="activeFlap === 0">
        <ImageUpload
          label="Cover image"
          :current-url="content.coverImageUrl"
          image-type="cover"
          :card-id="card.id"
          @change="handleCoverImageChange"
        />
        <div v-if="content.coverImageUrl" style="display:flex;flex-direction:column;gap:4px;margin-top:6px">
          <label class="jc-checkbox-label">
            <input type="checkbox" :checked="content.isFullCoverImage" @change="patch({ isFullCoverImage: ($event.target as HTMLInputElement).checked })" />
            Fill panel with image
          </label>
          <label class="jc-checkbox-label">
            <input type="checkbox" :checked="content.coverImageBehindContent" @change="patch({ coverImageBehindContent: ($event.target as HTMLInputElement).checked })" />
            Show text over image
          </label>
        </div>
      </template>

      <template v-else>
        <ImageUpload
          :label="`Panel ${activeFlap + 1} image`"
          :current-url="content.flapImageUrls?.[activeFlap]"
          image-type="cover"
          :card-id="card.id"
          @change="setFlapImage($event.url)"
        />
        <div v-if="content.flapImageUrls?.[activeFlap]" style="display:flex;flex-direction:column;gap:4px;margin-top:6px">
          <label class="jc-checkbox-label">
            <input type="checkbox" :checked="content.flapImageFulls?.[activeFlap] ?? false" @change="setFlapImageFull(($event.target as HTMLInputElement).checked)" />
            Fill panel with image
          </label>
          <label class="jc-checkbox-label">
            <input type="checkbox" :checked="content.flapImageBehindContents?.[activeFlap] ?? false" @change="setFlapImageBehind(($event.target as HTMLInputElement).checked)" />
            Show text over image
          </label>
        </div>
      </template>

      <label class="jc-label" style="margin-top:10px">Text (shift + enter for new line)</label>
      <ContentEditor
        :key="activeFlap"
        :value="content.flapContents[activeFlap] ?? ''"
        :placeholder="activeFlap === 0 ? 'Title, artist, year...' : `Flap ${activeFlap + 1} content...`"
        :min-height="activeFlap === 0 ? '80px' : '60px'"
        :custom-font-names="customFontNames"
        @change="patchFlap(activeFlap, $event)"
      />

      <div class="jc-side-divider"><span class="jc-side-label">Inside</span></div>
      <div style="display:flex;gap:4px;margin-top:8px;margin-bottom:8px;flex-wrap:wrap">
        <button
          v-for="i in content.flaps"
          :key="i - 1"
          type="button"
          :class="`btn${activeInsideFlap === i - 1 ? ' active' : ''}`"
          style="font-size:0.8rem;padding:4px 8px;min-width:0"
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
        @change="setInsideFlapImage($event.url)"
      />
      <div v-if="content.insideFlapImageUrls?.[activeInsideFlap]" style="display:flex;flex-direction:column;gap:4px;margin-top:6px;margin-bottom:8px">
        <label class="jc-checkbox-label">
          <input type="checkbox" :checked="content.insideFlapImageFulls?.[activeInsideFlap] ?? false" @change="setInsideFlapImageFull(($event.target as HTMLInputElement).checked)" />
          Fill panel with image
        </label>
        <label class="jc-checkbox-label">
          <input type="checkbox" :checked="content.insideFlapImageBehindContents?.[activeInsideFlap] ?? false" @change="setInsideFlapImageBehind(($event.target as HTMLInputElement).checked)" />
          Show text over image
        </label>
      </div>
      <ContentEditor
        :key="`inside-flap-${activeInsideFlap}`"
        :value="(content.insideFlapContents ?? [])[activeInsideFlap] ?? ''"
        :placeholder="activeInsideFlap === 0 ? 'Inside cover...' : `Inside flap ${activeInsideFlap + 1}...`"
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
      <label class="jc-label" style="margin-top:8px">Center</label>
      <ContentEditor :value="content.spineCenterContent" placeholder="Side A / Side B" min-height="40px" :custom-font-names="customFontNames" @change="patch({ spineCenterContent: $event })" />
      <label class="jc-label" style="margin-top:8px">Bottom</label>
      <ContentEditor :value="content.spineBottomContent" placeholder="90 min" min-height="40px" :custom-font-names="customFontNames" @change="patch({ spineBottomContent: $event })" />

      <div class="jc-side-divider"><span class="jc-side-label">Inside</span></div>
      <label class="jc-label" style="margin-top:8px">Center</label>
      <ContentEditor :value="content.insideSpineContent ?? ''" placeholder="Spine inside..." min-height="40px" :custom-font-names="customFontNames" @change="patch({ insideSpineContent: $event })" />
    </SettingsBlock>

    <!-- 7. Back panel -->
    <SettingsBlock v-bind="blockAttrs('back')" label="◧ Back panel" @toggle="toggle">
      <div class="jc-side-divider-borderless"><span class="jc-side-label">Outside</span></div>
      <label class="jc-label">Left column (Side A)</label>
      <ContentEditor :value="content.backLeftContent" placeholder="Side A tracks..." min-height="80px" :custom-font-names="customFontNames" @change="patch({ backLeftContent: $event })" />
      <label class="jc-label" style="margin-top:8px">Right column (Side B)</label>
      <ContentEditor :value="content.backRightContent" placeholder="Side B tracks..." min-height="80px" :custom-font-names="customFontNames" @change="patch({ backRightContent: $event })" />

      <div class="jc-side-divider"><span class="jc-side-label">Inside</span></div>
      <label class="jc-label" style="margin-top:8px">Content</label>
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

      <label class="jc-checkbox-label" style="margin-top:8px">
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
        <label class="jc-label" style="margin-top:6px">Printer flips the sheet on the</label>
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

      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px" :disabled="exporting" @click="handleExport">
        {{ exporting ? 'Generating...' : 'Export PDF' }}
      </button>

      <p style="font-size:10px;color:var(--color-text-light);margin:8px 0 2px;font-family:var(--font-body);letter-spacing:0.5px">PRINT SETTINGS</p>
      <ul style="font-size:10px;color:var(--color-text-light);margin:0;padding-left:14px;font-family:var(--font-body);line-height:1.5">
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
