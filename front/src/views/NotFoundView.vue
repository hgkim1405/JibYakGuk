<script setup lang="ts">
import { RouterLink } from 'vue-router';
import PageIntro from '../components/common/PageIntro.vue';
</script>

<template>
  <section>
    <PageIntro title="페이지를 찾을 수 없습니다" description="주소를 확인하거나 홈으로 돌아가 주세요." />
    <RouterLink to="/">집약국 홈으로 이동</RouterLink>
  </section>
</template>
