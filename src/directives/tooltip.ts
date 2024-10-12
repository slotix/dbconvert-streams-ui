import { Directive } from 'vue';

export const vTooltip: Directive = {
  mounted(el, binding) {
    el.setAttribute('title', binding.value);
    el.style.position = 'relative';
    el.style.cursor = 'pointer';
  }
};