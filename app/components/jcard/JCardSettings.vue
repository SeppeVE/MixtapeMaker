<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { JCard, JCardContent, Mixtape, CustomFont } from '~/types';
import { JCARD_PRESETS } from '~/utils/jcardPresets';
import { type Section, SECTION_COLORS, SETTINGS_COLOR_PRESETS as COLOR_PRESETS } from './settingsSections';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { fontNameFromFile, readFileAsBase64, mimeTypeFromFile, registerCustomFonts } from '~/utils/fontManager';
import { exportJCardToPDF } from '~/utils/jcardPdf';

const props = defineProps<{
  card: JCard;
  currentMixtape: Mixtape | null;
  sections?: Section[];
}>();

const emit = defineEmits<{
  titleChange: [title: string];
  contentChange: [content: JCardContent];
  mixtapeLink: [id: string | null];
}>();

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
  } finally {
    exporting.value = false;
  }
}

function handleApplyPreset(presetId: string) {
  const preset = JCARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  if (!confirm(`Apply the "${preset.label}" preset? This will overwrite your current design.`)) return;
  emit('contentChange', { ...content.value, ...preset.content } as JCardContent);
}

const flapLabel = (i: number) => (i === 0 ? 'Cover' : `Flap ${i + 1}`);

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

function blockAttrs(id: Section) {
  return { id, visible: isVisible(id), open: isOpen(id), bg: SECTION_COLORS[id].bg, fg: SECTION_COLORS[id].fg };
}
</script>

<template>
  <div class="jcard-settings">
    <!-- 1. Card info -->
    <SettingsBlock v-bind="blockAttrs('info')" label="✎ Card info" @toggle="toggle">
      <label class="settings-label">Title</label>
      <input class="settings-input" :value="card.title" placeholder="My J-Card" @input="emit('titleChange', ($event.target as HTMLInputElement).value)" />
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
      <label class="settings-checkbox-label">
        <input type="checkbox" :checked="content.isReversed" @change="patch({ isReversed: ($event.target as HTMLInputElement).checked })" />
        Reverse card (flip left/right)
      </label>
      <label class="settings-checkbox-label">
        <input type="checkbox" :checked="content.shortBack" @change="patch({ shortBack: ($event.target as HTMLInputElement).checked })" />
        Short back panel (10 mm)
      </label>
      <label class="settings-label" style="margin-top:6px">Panels: {{ content.flaps }}</label>
      <input
        type="range" :min="1" :max="6" :value="content.flaps"
        class="settings-range"
        @input="patch({ flaps: parseInt(($event.target as HTMLInputElement).value, 10) as 1|2|3|4|5|6 })"
      />
      <div class="settings-range-ticks">
        <span v-for="n in 6" :key="n">{{ n }}</span>
      </div>
      <p v-if="!content.shortBack && content.flaps > 3" class="small-info">
        Cover + {{ content.flaps - 1 }} Panels — this will not fit on a standard A4 paper, keep this in mind for printing.
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
      <label class="settings-label">Color</label>
      <div class="settings-swatch-row" style="margin-bottom:6px">
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
          style="width:22px;height:22px;border:2px solid var(--color-text);cursor:pointer;padding:0"
          @input="patch({ backgroundColor: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div class="side-indicator-divider"><span class="side-indicator-label">Outside</span></div>
      <ImageUpload
        label="Background image outside"
        :current-url="content.backgroundImageUrl"
        image-type="background"
        :card-id="card.id"
        @change="patch({ backgroundImageUrl: $event ?? undefined })"
      />
      <label class="settings-checkbox-label" style="margin-top:8px">
        <input type="checkbox" :checked="!!content.continuousBackground" @change="patch({ continuousBackground: ($event.target as HTMLInputElement).checked })" />
        Stretch image across all panels
      </label>

      <div class="side-indicator-divider"><span class="side-indicator-label">Inside</span></div>
      <ImageUpload
        label="Background image inside"
        :current-url="content.insideBackgroundImageUrl"
        image-type="background"
        :card-id="card.id"
        @change="patch({ insideBackgroundImageUrl: $event ?? undefined })"
      />
      <label class="settings-checkbox-label" style="margin-top:8px">
        <input type="checkbox" :checked="!!content.insideContinuousBackground" @change="patch({ insideContinuousBackground: ($event.target as HTMLInputElement).checked })" />
        Stretch image across all panels
      </label>
    </SettingsBlock>

    <!-- 5. Panel content -->
    <SettingsBlock v-bind="blockAttrs('flaps')" label="◫ Panel content" @toggle="toggle">
      <div class="side-indicator-divider-borderless"><span class="side-indicator-label">Outside</span></div>
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
          @change="patch({ coverImageUrl: $event ?? undefined })"
        />
        <div v-if="content.coverImageUrl" style="display:flex;flex-direction:column;gap:4px;margin-top:6px">
          <label class="settings-checkbox-label">
            <input type="checkbox" :checked="content.isFullCoverImage" @change="patch({ isFullCoverImage: ($event.target as HTMLInputElement).checked })" />
            Fill panel with image
          </label>
          <label class="settings-checkbox-label">
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
          @change="setFlapImage($event)"
        />
        <div v-if="content.flapImageUrls?.[activeFlap]" style="display:flex;flex-direction:column;gap:4px;margin-top:6px">
          <label class="settings-checkbox-label">
            <input type="checkbox" :checked="content.flapImageFulls?.[activeFlap] ?? false" @change="setFlapImageFull(($event.target as HTMLInputElement).checked)" />
            Fill panel with image
          </label>
          <label class="settings-checkbox-label">
            <input type="checkbox" :checked="content.flapImageBehindContents?.[activeFlap] ?? false" @change="setFlapImageBehind(($event.target as HTMLInputElement).checked)" />
            Show text over image
          </label>
        </div>
      </template>

      <label class="settings-label" style="margin-top:10px">Text (shift + enter for new line)</label>
      <ContentEditor
        :key="activeFlap"
        :value="content.flapContents[activeFlap] ?? ''"
        :placeholder="activeFlap === 0 ? 'Title, artist, year...' : `Flap ${activeFlap + 1} content...`"
        :min-height="activeFlap === 0 ? '80px' : '60px'"
        :custom-font-names="customFontNames"
        @change="patchFlap(activeFlap, $event)"
      />

      <div class="side-indicator-divider"><span class="side-indicator-label">Inside</span></div>
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
        @change="setInsideFlapImage($event)"
      />
      <div v-if="content.insideFlapImageUrls?.[activeInsideFlap]" style="display:flex;flex-direction:column;gap:4px;margin-top:6px;margin-bottom:8px">
        <label class="settings-checkbox-label">
          <input type="checkbox" :checked="content.insideFlapImageFulls?.[activeInsideFlap] ?? false" @change="setInsideFlapImageFull(($event.target as HTMLInputElement).checked)" />
          Fill panel with image
        </label>
        <label class="settings-checkbox-label">
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
      <div class="side-indicator-divider-borderless"><span class="side-indicator-label">Outside</span></div>
      <label class="settings-label">Top</label>
      <ContentEditor :value="content.spineTopContent" placeholder="Mixtape title" min-height="40px" :custom-font-names="customFontNames" @change="patch({ spineTopContent: $event })" />
      <label class="settings-label" style="margin-top:8px">Center</label>
      <ContentEditor :value="content.spineCenterContent" placeholder="Side A / Side B" min-height="40px" :custom-font-names="customFontNames" @change="patch({ spineCenterContent: $event })" />
      <label class="settings-label" style="margin-top:8px">Bottom</label>
      <ContentEditor :value="content.spineBottomContent" placeholder="90 min" min-height="40px" :custom-font-names="customFontNames" @change="patch({ spineBottomContent: $event })" />

      <div class="side-indicator-divider"><span class="side-indicator-label">Inside</span></div>
      <label class="settings-label" style="margin-top:8px">Center</label>
      <ContentEditor :value="content.insideSpineContent ?? ''" placeholder="Spine inside..." min-height="40px" :custom-font-names="customFontNames" @change="patch({ insideSpineContent: $event })" />
    </SettingsBlock>

    <!-- 7. Back panel -->
    <SettingsBlock v-bind="blockAttrs('back')" label="◧ Back panel" @toggle="toggle">
      <div class="side-indicator-divider-borderless"><span class="side-indicator-label">Outside</span></div>
      <label class="settings-label">Left column (Side A)</label>
      <ContentEditor :value="content.backLeftContent" placeholder="Side A tracks..." min-height="80px" :custom-font-names="customFontNames" @change="patch({ backLeftContent: $event })" />
      <label class="settings-label" style="margin-top:8px">Right column (Side B)</label>
      <ContentEditor :value="content.backRightContent" placeholder="Side B tracks..." min-height="80px" :custom-font-names="customFontNames" @change="patch({ backRightContent: $event })" />

      <div class="side-indicator-divider"><span class="side-indicator-label">Inside</span></div>
      <label class="settings-label" style="margin-top:8px">Content</label>
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
      <label class="settings-checkbox-label" style="margin-bottom:8px">
        <input type="checkbox" :checked="!!content.showCutGuides" @change="patch({ showCutGuides: ($event.target as HTMLInputElement).checked })" />
        Show fold / cut guides
      </label>
      <button class="btn btn-primary" style="width:100%;justify-content:center" :disabled="exporting" @click="handleExport">
        {{ exporting ? 'Generating...' : 'Export PDF' }}
      </button>
      <p style="font-size:10px;color:var(--color-text-light);margin-top:6px;font-family:var(--font-body)">
        Print at 100% / Actual size for correct dimensions.
      </p>
    </SettingsBlock>
  </div>
</template>
