import { createApp } from 'vue';
import App from './App.vue';
import './assets/fonts.scss';

import DrawToolbar from './components/DrawToolbar/DrawToolbar.vue';
import Tooltip from './components/Tooltip/Tooltip.vue';
import TreeControls from './components/TreeControls/TreeControls.vue';

const app = createApp(App);

app.component('DrawToolbar', DrawToolbar);
app.component('Tooltip', Tooltip);
app.component('TreeControls', TreeControls);

app.mount('#app');
