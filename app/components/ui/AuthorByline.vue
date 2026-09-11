<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { Profile } from '~/types';

// "by @username" with a tiny avatar, navigating to the public profile page.
// Rendered as a span (not an anchor) so it can sit inside a card that is
// itself a link. Private profiles still show the name (the profile page
// itself shows the private notice) but never the picture.
const props = withDefaults(defineProps<{ profile: Profile; prefix?: string }>(), { prefix: 'by' });

const router = useRouter();
function go() {
  router.push(`/user/${props.profile.username}`);
}
</script>

<template>
  <span
    class="pf-byline"
    role="link"
    tabindex="0"
    :title="`View @${profile.username}'s profile`"
    @click.stop.prevent="go"
    @keydown.enter.stop.prevent="go"
  >
    <span v-if="prefix" class="pf-byline-prefix">{{ prefix }}</span>
    <img v-if="profile.avatarUrl && !profile.isPrivate" :src="profile.avatarUrl" class="pf-byline-avatar" alt="" width="18" height="18" >
    <span class="pf-byline-name">@{{ profile.username }}</span>
  </span>
</template>
