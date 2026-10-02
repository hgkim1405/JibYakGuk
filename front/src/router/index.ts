import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import RecommendView from '../views/RecommendView.vue';
import MedicineListView from '../views/MedicineListView.vue';
import MedicineDetailView from '../views/MedicineDetailView.vue';
import CabinetView from '../views/CabinetView.vue';
import PharmacyView from '../views/PharmacyView.vue';
import BoardView from '../views/BoardView.vue';
import NotFoundView from '../views/NotFoundView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/recommend', name: 'recommend', component: RecommendView },
    { path: '/medicine', name: 'medicine-list', component: MedicineListView },
    { path: '/medicine/:id', name: 'medicine-detail', component: MedicineDetailView },
    { path: '/cabinet', name: 'cabinet', component: CabinetView },
    { path: '/pharmacy', name: 'pharmacy', component: PharmacyView },
    { path: '/board', name: 'board', component: BoardView },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
