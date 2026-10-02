<script setup lang="ts">
import PageIntro from '../components/common/PageIntro.vue';
</script>

<template>
  <section>
    <PageIntro eyebrow="의약품 상세" title="의약품 정보" description="제품 식별자와 공식 출처가 연결된 뒤 상세 정보를 제공합니다." />
    <div class="status-card"><p>현재 경로 식별자: {{ $route.params.id }}</p></div>
  </section>
</template>
