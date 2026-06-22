// step-types/information-step.js  — shared plugin, key "INFORMATION"
// Renders an info bullet list, optionally with inline inputs. (Was: the
// INFORMATION branch of basic-methods/template.js.)

import dom from '../core/dom.js';

const informationStep = {
  key: 'INFORMATION',

  render(container, step) {
    const list = dom.create('ul', 'info-list');

    if (step.hasInputs) {
      step.content.forEach((item) => {
        const li = dom.create('li');
        if (item.input) {
          if (item.text) li.appendChild(document.createTextNode(item.text));
          li.appendChild(dom.createInput(item.input.answer, item.input.hint || '', 'info-input', item.input.unit));
        } else {
          li.innerHTML = item;
        }
        list.appendChild(li);
      });
      container.appendChild(list);
      // hint container + check button (info steps with inputs are checkable)
      container.appendChild(dom.create('div', 'hint-container'));
      if (container.querySelectorAll('.box-input').length > 0) {
        const btnContainer = dom.createFromHTML(
          '<div class="check-btn-container"><button class="step-check-btn">Check Answer</button></div>'
        );
        container.appendChild(btnContainer);
      }
    } else {
      step.content.forEach((item) => {
        const li = dom.create('li');
        li.innerHTML = item;
        list.appendChild(li);
      });
      container.appendChild(list);
    }
  },
};

export default informationStep;