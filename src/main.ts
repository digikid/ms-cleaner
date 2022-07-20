import $ from 'dom-element';
import './main.scss';

import BrowserDetector from './classes/BrowserDetector';
import Cleaner from './classes/Cleaner';

$(document).ready(() => {
  const browserDetector = new BrowserDetector();

  if (browserDetector.outdated || browserDetector.ie) {
    $('body').addClass('is-ready is-outdated');

    return;
  }

  $('a[href="#faq"], a[href="#close-faq"]').click((e) => {
    e.preventDefault();

    if (e.target.getAttribute('href') === '#faq') {
      $('.faq').fadeIn(150);
      $('body').addClass('is-locked');
    } else {
      $('.faq').fadeOut(150);
      $('body').removeClass('is-locked');
    }
  });

  $('.mode').click(() => $('html').toggleClass('dark-mode'));

  (window as any).cleaner = new Cleaner('[data-cleaner]', {
    enable: ['format', 'strong'],
    ready: () => {
      $('body').addClass('is-ready');
    },
  });
});
