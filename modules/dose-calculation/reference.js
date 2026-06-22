// modules/dose-calculation/reference.js
// MODULE-EXCLUSIVE: wires the collapsible reference cards on the practice page,
// including the nested cards inside the main "Dose Calculation References" card.
// Generic — toggles each `.reference-header` against its sibling content.

const reference = {
  init() {
    document.querySelectorAll('.reference-header').forEach((header) => {
      const content = header.nextElementSibling;
      if (!content || !content.classList.contains('reference-content')) return;
      header.addEventListener('click', () => {
        header.classList.toggle('active');
        content.classList.toggle('expanded');
      });
    });
  },
};

export default reference;
