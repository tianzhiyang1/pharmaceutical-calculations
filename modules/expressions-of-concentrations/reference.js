// modules/expressions-of-concentrations/reference.js
// MODULE-EXCLUSIVE: the collapsible "Percentage Strength" / "Ratio Strength"
// reference cards on the practice page. Same pattern as basic-methods/reference.js,
// only the element ids differ.

import dom from '../../core/dom.js';

const reference = {
  init() {
    const cards = [
      ['percentageStrengthHeader', 'percentageStrengthContent'],
      ['ratioStrengthHeader', 'ratioStrengthContent'],
    ];
    cards.forEach(([headerId, contentId]) => {
      const header = dom.get(headerId);
      const content = dom.get(contentId);
      if (!header || !content) return;
      header.addEventListener('click', () => {
        header.classList.toggle('active');
        content.classList.toggle('expanded');
      });
    });
  },
};

export default reference;
