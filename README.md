# map-utilities

Repositories for common Vue 3 components used by MAP components

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run serve
```

### Compile and Minify for Production

```sh
npm run build-bundle
```

## Help mode

`HelpModeTour` (a guided tour) and `HelpModeHover` (hover over a highlighted control to see its help) show the help of the controls marked with the `v-help-mode` directive.

### Add or remove a control

Add `v-help-mode` to the control to add it to the help, remove the directive to remove it. Nothing else needs to change.

```vue
<map-svg-icon
  icon="zoomIn"
  v-help-mode="{
    id: 'scaffold-zoom-in',
    area: 'zoom',
    title: 'Zoom in',
    description: 'Zoom in to see more detail.',
    placement: 'left',
  }"
  @click="zoomIn()"
/>
```

```js
import { helpModeDirective } from '@abi-software/map-utilities';

export default {
  directives: { helpMode: helpModeDirective },
};
```

| Field                  |          | Description                                                                                                                 |
| ---------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | required | Unique id, also used for analytics. Prefix it with the component, e.g. `flatmap-`.                                          |
| `area`                 |          | One of `HELP_MODE_AREAS`: `toolbar`, `panel-header`, `map-info`, `legends`, `zoom`, `map-settings`, `drawing`, `animation`. |
| `title`, `description` |          | The help text. Values are reactive, e.g. `description: warningMessage`.                                                     |
| `placement`            |          | Where the help is shown, defaults to `bottom`.                                                                              |
| `order`                |          | Order within the area, defaults to the order in the page.                                                                   |
| `onEnter`, `onLeave`   |          | Prepare the UI before the help is shown, e.g. open a drawer, and revert it.                                                 |
| `target`               |          | A function returning the element to highlight, when it is not the element with the directive.                               |
| `hover`                |          | `false` to leave it out of the hover help.                                                                                  |

### Get the steps

`collectHelpModeSteps(rootElement)` returns the steps of the controls under the element, sorted by area, then `order`, then page order. Controls inside a hidden element with `data-help-scope`, e.g. a viewer which is not shown, are left out. Viewers expose it as `getHelpModeSteps()`.

```vue
<HelpModeTour v-model="tourOpen" :steps="steps" />
<HelpModeHover v-model="hoverOpen" :steps="steps" :container="viewerElement" />
```
