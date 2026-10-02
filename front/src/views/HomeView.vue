<script setup lang="ts">
import { RouterLink } from 'vue-router';
import PageIntro from '../components/common/PageIntro.vue';
</script>

<template>
  <section>
    <PageIntro
      eyebrow="공식 정보로 살펴보는 생활 의약품"
      title="내 증상에 맞는 정보를 차근차근"
      description="집약국은 공식 의약품 데이터를 확인하고 이해하기 쉽게 안내하는 서비스를 준비하고 있습니다."
    />
    <div class="status-card">
      <p>현재 프로젝트 초기 단계입니다. 검증된 의약품 정보가 준비되면 탐색 기능을 연결합니다.</p>
      <p style="margin-top: 1rem"><RouterLink to="/recommend">증상 탐색 구조 보기 →</RouterLink></p>
    </div>
  </section>
</template>
