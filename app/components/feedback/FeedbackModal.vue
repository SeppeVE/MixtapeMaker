<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useUiStore } from '~/stores/ui';
import { useAuthStore } from '~/stores/auth';
import {
  submitFeedback,
  isRateLimitError,
  FEEDBACK_MESSAGE_MAX_LENGTH,
  FEEDBACK_COOLDOWN_MS,
} from '~/utils/feedbackDatabase';

// Self-contained, mirrors AuthModal: driven by the ui store (open state).
const ui = useUiStore();
const auth = useAuthStore();

const LAST_SUBMIT_KEY = 'mixtape-feedback-last-submit';

const message = ref('');
const email = ref('');
const error = ref<string | null>(null);
const loading = ref(false);
const success = ref(false);

// Soft, client-side cooldown so the UI doesn't need a round trip (or a
// signed-in session) to tell someone they just sent feedback. This is a UX
// nicety, not a security control — it lives in localStorage and only
// covers this browser; the DB-enforced rate limit (see
// isRateLimitError/FEEDBACK_COOLDOWN_MS) is what actually stops abuse for
// signed-in users.
function msSinceLastSubmit(): number {
  const last = Number(localStorage.getItem(LAST_SUBMIT_KEY) ?? 0);
  return Date.now() - last;
}

const cooldownActive = ref(false);

function checkCooldown() {
  try {
    cooldownActive.value = msSinceLastSubmit() < FEEDBACK_COOLDOWN_MS;
  } catch {
    cooldownActive.value = false;
  }
}

const remainingChars = computed(() => FEEDBACK_MESSAGE_MAX_LENGTH - message.value.length);

function reset() {
  message.value = '';
  email.value = '';
  error.value = null;
  loading.value = false;
  success.value = false;
}

function close() {
  reset();
  ui.closeFeedback();
}

watch(
  () => ui.isFeedbackModalOpen,
  (isOpen) => {
    if (isOpen) checkCooldown();
  }
);

async function handleSubmit() {
  if (!message.value.trim() || cooldownActive.value) return;
  error.value = null;
  loading.value = true;
  try {
    await submitFeedback(
      message.value.trim(),
      email.value.trim() || auth.user?.email || null,
      auth.user?.id ?? null
    );
    try {
      localStorage.setItem(LAST_SUBMIT_KEY, String(Date.now()));
    } catch {
      // localStorage unavailable (private mode, etc.) — cooldown just won't persist.
    }
    success.value = true;
    ui.showToast('Thanks! Your feedback helps shape what we build next.', 'success');
    setTimeout(close, 1200);
  } catch (err) {
    error.value = isRateLimitError(err)
      ? "You've already sent feedback recently — thanks! Please wait a bit before sending more."
      : "Couldn't send your feedback — please try again.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div v-if="ui.isFeedbackModalOpen" class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <button class="modal-close" @click="close">×</button>

      <h2>Feedback &amp; Feature Requests</h2>

      <p class="feedback-intro">
        What would you like to see change? Bugs, ideas, missing features — we read every one.
      </p>

      <div v-if="success" class="success-message">Thanks for the feedback!</div>
      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-else-if="cooldownActive" class="cooldown-message">
        You've already sent feedback recently — thanks! You can send more in a bit.
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="feedback-message">Your feedback</label>
          <textarea
            id="feedback-message"
            v-model="message"
            rows="5"
            required
            :maxlength="FEEDBACK_MESSAGE_MAX_LENGTH"
            :disabled="loading || cooldownActive"
            placeholder="I'd love to see..."
          />
          <span class="char-count">{{ remainingChars }} characters left</span>
        </div>

        <div class="form-group">
          <label for="feedback-email">Email (optional)</label>
          <input
            id="feedback-email"
            v-model="email"
            type="email"
            :disabled="loading || cooldownActive"
            placeholder="So we can follow up"
          />
        </div>

        <button
          type="submit"
          class="submit-button"
          :disabled="loading || !message.trim() || cooldownActive"
        >
          {{ loading ? 'Sending...' : 'Send Feedback' }}
        </button>
      </form>
    </div>
  </div>
</template>
