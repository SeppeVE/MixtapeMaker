<script setup lang="ts">
import {
  storeTokens,
  getCodeVerifier,
  getReturnPath,
  getRedirectUri,
  clearAuthSession,
  getSpotifyClientId,
} from '~/utils/spotifyAuth';

const error = ref<string | null>(null);

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const errorParam = params.get('error');

  if (errorParam) {
    error.value = 'Spotify authorization was denied.';
    return;
  }

  if (!code) {
    error.value = 'No authorization code received.';
    return;
  }

  const verifier = getCodeVerifier();
  const returnPath = getReturnPath();

  if (!verifier) {
    error.value = 'Session expired. Please try connecting again.';
    return;
  }

  const redirectUri = getRedirectUri();

  fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: getSpotifyClientId(),
      code_verifier: verifier,
    }),
  })
    .then((res) => res.json())
    .then((data: { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string }) => {
      if (data.error || !data.access_token) {
        throw new Error(data.error_description ?? data.error ?? 'Failed to connect to Spotify');
      }
      storeTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? '',
        expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      });
      clearAuthSession();
      navigateTo(returnPath, { replace: true });
    })
    .catch((err: unknown) => {
      error.value = err instanceof Error ? err.message : 'Failed to connect to Spotify';
    });
});
</script>

<template>
  <div v-if="error" style="padding: 3rem; text-align: center; font-family: inherit">
    <p style="margin-bottom: 1rem; color: #d4524a">{{ error }}</p>
    <button class="btn" @click="navigateTo('/mixtape')">
      Back to Editor
    </button>
  </div>
  <div v-else style="padding: 3rem; text-align: center; font-family: inherit">
    <p>Connecting to Spotify...</p>
  </div>
</template>
