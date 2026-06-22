// modules/basic-methods/reference.js
// MODULE-EXCLUSIVE bespoke content: the collapsible Ratio & Proportion and
// Dimensional Analysis reference cards on the practice page. No other module
// has these. (Was: basic-methods/reference.js, unchanged behavior.)

import dom from '../../core/dom.js';

const reference = {
  init() {
    const ratioHeader = dom.get('ratioProportionHeader');
    const dimHeader = dom.get('dimAnalysisHeader');
    const ratioContent = dom.get('ratioProportionContent');
    const dimContent = dom.get('dimAnalysisContent');
    if (!ratioHeader || !dimHeader) return; // not on this page

    ratioHeader.addEventListener('click', () => {
      ratioHeader.classList.toggle('active');
      ratioContent.classList.toggle('expanded');
    });
    dimHeader.addEventListener('click', () => {
      dimHeader.classList.toggle('active');
      dimContent.classList.toggle('expanded');
    });
  },
};

export default reference;