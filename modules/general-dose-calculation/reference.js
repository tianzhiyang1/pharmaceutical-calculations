// modules/general-dose-calculation/reference.js
// MODULE-EXCLUSIVE: wires the collapsible reference cards on the practice page.
// GDC nests a main card around several sub-cards, so rather than hardcode ids
// (as basic-methods/expressions-of-concentrations do) this toggles each
// `.reference-header` against its sibling `.reference-content` generically.

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
