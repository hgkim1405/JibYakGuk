<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';

const navigation = [
  { label: '홈', to: '/' },
  { label: '증상 탐색', to: '/recommend' },
  { label: '의약품', to: '/medicine' },
  { label: '내 약장', to: '/cabinet' },
];
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/" aria-label="집약국 홈">
        <span class="brand-mark" aria-hidden="true">집</span>
        <span>집약국</span>
      </RouterLink>
      <nav class="desktop-nav" aria-label="주요 메뉴">
        <RouterLink v-for="item in navigation" :key="item.to" :to="item.to">
          {{ item.label }}
        </RouterLink>
      </nav>
    </header>

    <main id="main-content" class="page-content">
      <RouterView />
    </main>

    <nav class="mobile-nav" aria-label="모바일 주요 메뉴">
      <RouterLink v-for="item in navigation" :key="item.to" :to="item.to">
        {{ item.label }}
      </RouterLink>
    </nav>
  </div>
</template>
