<script setup lang="ts">
import '~/assets/styles/AuthModal.css';

const props = defineProps<{
  isOpen: boolean;
  onClose: () => void;
}>();

const isSignUp = ref(false);
const email = ref('');
const password = ref('');
const error = ref<string | null>(null);
const loading = ref(false);
const success = ref(false);
const { signIn, signUp, signInWithGoogle } = useAuth();

const handleSubmit = async () => {
  error.value = null;
  loading.value = true;
  success.value = false;

  try {
    const { error: authError } = isSignUp.value
      ? await signUp(email.value, password.value)
      : await signIn(email.value, password.value);

    if (authError) {
      error.value = authError.message;
    } else {
      if (isSignUp.value) {
        success.value = true;
        email.value = '';
        password.value = '';
        isSignUp.value = false;
      } else {
        // Sign in successful, close modal
        props.onClose();
      }
    }
  } catch {
    error.value = 'An unexpected error occurred';
  } finally {
    loading.value = false;
  }
};

const handleGoogleSignIn = async () => {
  error.value = null;
  loading.value = true;

  try {
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      error.value = authError.message;
      loading.value = false;
    }
    // If successful, the user will be redirected, so no need to close modal
  } catch {
    error.value = 'An unexpected error occurred';
    loading.value = false;
  }
};

const handleClose = () => {
  email.value = '';
  password.value = '';
  error.value = null;
  success.value = false;
  props.onClose();
};
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <button class="modal-close" @click="handleClose">
        ×
      </button>

      <h2>{{ isSignUp ? 'Create Account' : 'Sign In' }}</h2>

      <div v-if="success" class="success-message">
        Account created! Please check your email to verify your account, then sign in.
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>

      <button
        type="button"
        class="google-button"
        :disabled="loading"
        @click="handleGoogleSignIn"
      >
        <svg class="google-icon" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </button>

      <div class="divider">
        <span>or</span>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            :disabled="loading"
          >
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            minlength="6"
            :disabled="loading"
          >
          <small v-if="isSignUp">Password must be at least 6 characters</small>
        </div>

        <button type="submit" class="submit-button" :disabled="loading">
          {{ loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In' }}
        </button>
      </form>

      <div class="auth-toggle">
        <template v-if="isSignUp">
          Already have an account?
          <button @click="isSignUp = false">Sign In</button>
        </template>
        <template v-else>
          Don't have an account?
          <button @click="isSignUp = true">Sign Up</button>
        </template>
      </div>
    </div>
  </div>
</template>
