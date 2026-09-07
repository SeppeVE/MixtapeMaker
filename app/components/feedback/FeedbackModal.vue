<script setup lang="ts">
import { ref } from 'vue';
import { useUiStore } from '~/stores/ui';
import { useAuthStore } from '~/stores/auth';
import { submitFeedback } from '~/utils/feedbackDatabase';

// Self-contained, mirrors AuthModal: driven by the ui store (open state).
const ui = useUiStore();
const auth = useAuthStore();

const message = ref('');
const email = ref('');
const error = ref<string | null>(null);
const loading = ref(false);
const success = ref(false);

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

async function handleSubmit() {
  if (!message.value.trim()) return;
  error.value = null;
  loading.value = true;
  try {
    await submitFeedback(
      message.value.trim(),
      email.value.trim() || auth.user?.email || null,
      auth.user?.id ?? null
    );
    success.value = true;
    ui.showToast('Thanks! Your feedback helps shape what we build next.', 'success');
    setTimeout(close, 1200);
  } catch {
    error.value = "Couldn't send your feedback — please try again.";
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

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="feedback-message">Your feedback</label>
          <textarea
            id="feedback-message"
            v-model="message"
            rows="5"
            required
            :disabled="loading"
            placeholder="I'd love to see..."
          />
        </div>

        <div class="form-group">
          <label for="feedback-email">Email (optional)</label>
          <input
            id="feedback-email"
            v-model="email"
            type="email"
            :disabled="loading"
            placeholder="So we can follow up"
          />
        </div>

        <button type="submit" class="submit-button" :disabled="loading || !message.trim()">
          {{ loading ? 'Sending...' : 'Send Feedback' }}
        </button>
      </form>
    </div>
  </div>
</template>
