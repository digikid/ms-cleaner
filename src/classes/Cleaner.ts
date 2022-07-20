import $, { type DomElement } from 'dom-element';

import beautify, { type HTMLBeautifyOptions } from 'js-beautify';
import Toastify, { type Options as ToastifyOptions } from 'toastify-js';
import Clipboard from 'clipboard';

import { type Entries } from '../utils/object';
import { type StringReplacer } from '../utils/string';

export type DomObject<T extends string> = Record<T, DomElement>;

export interface IPluginsOptions {
  beautify: HTMLBeautifyOptions;
  toastify: ToastifyOptions;
}

export interface IOptions {
  duration: number;
  ready: null | Function;
  whiteList: string[];
  enable: string[];
  plugins: IPluginsOptions
}

export interface ISelector {
  attr: string;
  selector: string;
}

export type ClipboardInstance = InstanceType<typeof Clipboard>;

export type Mode = 'ms' | 'html';
export type Editors = 'code' | 'editor';
export type Actions = 'clean' | 'copy' | 'reset' | 'settings';
export type Params = 'format' | 'strong' | 'double' | 'instant' | 'copy' | 'reset';
export type ToastType = 'success' | 'error' | 'info' | 'danger';

export type Handler = (e: Event) => void;
export type ClipboardHandler = (e: ClipboardEvent) => void;

export type Handlers = Record<string, Record<string, Handler | ClipboardHandler>>;

export interface ISetup {
  actions: Record<Actions, string>;
  params: Record<Params, string>;
}

export interface ICleaner {
  readonly selector: string;
  readonly options: IOptions;

  readonly $action: DomObject<Actions>;
  readonly $param: DomObject<Params>;
  readonly $control: DomObject<Params>;
  readonly $actions: DomElement;
  readonly $params: DomElement;
  readonly $editor: DomElement;
  readonly $code: DomElement;

  mode: Mode;
  input: string;
  result: string;
  params: Record<Params, boolean>;

  readonly clipboard: ClipboardInstance;

  readonly parseSelector: (id: string, value?: string) => ISelector;
  readonly resetSelection: () => void;
  readonly toggleEditor: (id: Editors) => void;

  readonly clean: () => void;
  readonly update: () => void;
  readonly reset: () => void;
  readonly settings: () => void;
  readonly parse: (str: string) => HTMLElement;
  readonly isHtmlString: (str: string) => boolean;
  readonly toast: (text: string, type?: ToastType) => void;

  readonly onActionClick: Handler;
  readonly onControlChange: Handler;
  readonly onEditorInput: Handler;
  readonly onCodeInput: Handler;
  readonly onDocumentClick: Handler;
  readonly onDocumentPaste: ClipboardHandler;
  readonly onCopySuccess: Handler;
  readonly onCopyError: Handler;
}

export default class Cleaner implements ICleaner {
  static defaults: IOptions = {
    duration: 150,
    ready: null,
    whiteList: ['rowspan', 'colspan', 'href', 'src'],
    enable: [],
    plugins: {
      beautify: {
        indent_size: 4,
        max_preserve_newlines: 1,
        preserve_newlines: true,
        // @ts-ignore
        brace_style: 'collapse,preserve-inline',
      },
      toastify: {
        duration: 3000,
        gravity: 'bottom',
        position: 'right',
        stopOnFocus: true,
        offset: {
          x: 15,
          y: 15,
        },
      },
    },
  };

  static setup: ISetup = {
    actions: {
      clean: 'Запустить очистку',
      copy: 'Скопировать',
      reset: 'Начать заново',
      settings: 'Настройки',
    },
    params: {
      format: 'Форматирование кода',
      strong: 'Заменить &lt;b&gt; на &lt;strong&gt;',
      double: 'Двойной перенос строки',
      instant: 'Мгновенная очистка',
      copy: 'Копировать после очистки',
      reset: 'Очищать после копирования',
    },
  };

  public options: IOptions;

  public mode: Mode = 'ms';

  public input = '';

  public result = '';

  public clipboard: ClipboardInstance;

  public params = {} as Record<Params, boolean>;

  public $action = {} as DomObject<Actions>;

  public $param = {} as DomObject<Params>;

  public $control = {} as DomObject<Params>;

  public $actions = {} as DomElement;

  public $params = {} as DomElement;

  public $editor = {} as DomElement;

  public $code = {} as DomElement;

  constructor(public selector: string, options = {}) {
    const handlers: Handlers = {
      click: {
        action: this.onActionClick,
        document: this.onDocumentClick,
      },
      change: {
        control: this.onControlChange,
      },
      input: {
        editor: this.onEditorInput,
        code: this.onCodeInput,
      },
      paste: {
        document: this.onDocumentPaste,
      },
    };

    this.selector = selector;
    this.options = Object.assign({}, Cleaner.defaults, options);

    (['actions', 'params', 'editor', 'code'] as const).forEach((id) => {
      this[`$${id}`] = $(this.parseSelector(id).selector);
    });

    (Object.entries(Cleaner.setup.actions) as Entries<ISetup['actions']>).forEach(([action, title]) => {
      const { selector } = this.parseSelector('action', action);

      $(`<a href="#" title="${title}" class="cleaner__action cleaner__action--${action}" data-cleaner-action="${action}"></a>`).appendTo(this.$actions);

      this.$action[action] = $(this.selector).find(selector);
    });

    (Object.entries(Cleaner.setup.params) as Entries<ISetup['params']>).forEach(([param, title]) => {
      const { selector: controlSelector } = this.parseSelector('control', param);
      const { selector: paramSelector } = this.parseSelector('param', param);

      const checked = this.options.enable.includes(param) ? ' checked' : '';

      $(`<div class="cleaner__param cleaner__param--${param}" data-cleaner-param="${param}">
                <input class="cleaner__checkbox" type="checkbox" id="${param}" data-cleaner-control="${param}"${checked}>
                <label class="cleaner__label" for="${param}"><span>${title}</span></label>
            </div>`).appendTo(this.$params);

      this.params[param] = !!checked;

      this.$param[param] = $(this.selector).find(paramSelector);
      this.$control[param] = $(this.selector).find(controlSelector);
    });

    Object.entries(handlers).forEach(([type, handlers]) => {
      Object.entries(handlers).forEach(([id, handler]) => {
        if ((typeof handler !== 'function')) {
          return;
        }

        const target = (id === 'document') ? document : this.parseSelector(id).selector;

        $(target).on(type, handler.bind(this));
      });
    });

    const { selector: copySelector } = this.parseSelector('action', 'copy');

    this.clipboard = new Clipboard(copySelector, {
      text: () => this.result,
    }).on('success', this.onCopySuccess.bind(this)).on('error', this.onCopyError.bind(this));

    this.update();

    if (typeof this.options.ready === 'function') {
      this.options.ready();
    }
  }

  onActionClick(e: Event) {
    e.preventDefault();

    const { attr } = this.parseSelector('action');

    const id = $(e.target).attr(attr) as Actions;

    if ((id !== 'copy') && (id in this) && typeof (this[id]) === 'function') {
      this[id]();
    }
  }

  onControlChange(e: Event) {
    const { attr } = this.parseSelector('control');

    const id = $(e.target).attr(attr) as Params;
    const value = $(e.target).prop('checked');

    this.params[id] = value;

    if (!!this.result && ['format', 'strong', 'double'].includes(id)) {
      this.clean();
      this.update();
    }
  }

  onEditorInput(e: Event) {
    if (this.mode === 'ms' && e.target) {
      this.input = (e.target as HTMLElement).innerHTML;

      this.update();

      if (this.params.instant) {
        this.clean();
      }
    }
  }

  onCodeInput(e: Event) {
    const { value } = (e.target as HTMLInputElement);

    this.input = value;
    this.result = value;

    this.update();
  }

  onDocumentClick(e: Event) {
    const $target = $(e.target);

    const selectors = ([
      ['params'],
      ['action', 'settings'],
    ] as const).reduce((acc, current) => {
      const [id, value] = current;

      acc[id] = this.parseSelector(id, value).selector;

      return acc;
    }, {} as Record<'params' | 'action', string>);

    const isParams = $target.closest(selectors.params).exists();
    const isSettingsAction = $target.is(selectors.action);

    if (!(isParams || isSettingsAction)) {
      $(selectors.params).slideUp(0);
    }
  }

  onDocumentPaste(e: ClipboardEvent) {
    const clipboardData = e.clipboardData || (window as any).clipboardData;
    const pastedData = clipboardData.getData('Text');

    if (this.isHtmlString(pastedData)) {
      e.preventDefault();

      this.$editor.html('');
      this.$code.val(pastedData);

      this.mode = 'html';
      this.input = pastedData;

      this.toggleEditor('code');

      this.update();

      if (this.params.instant) {
        this.clean();
      }
    } else {
      this.mode = 'ms';
    }
  }

  onCopySuccess() {
    this.toast('Успешно скопировано');

    this.update();

    if (this.params.reset) {
      this.reset();
    }
  }

  onCopyError() {
    this.toast('При копировании произошла ошибка', 'error');
  }

  parseSelector = (id: string, value = '') => {
    const base = this.selector.replace(/\[|\]|data-/gi, '');

    let attr = `data-${base}`;

    if (id) {
      attr += `-${id}`;
    }

    if (value) {
      attr += `="${value}"`;
    }

    return {
      attr,
      selector: `[${attr}]`,
    };
  };

  update = () => {
    if (!!this.input || !!this.result) {
      this.$action.reset.removeClass('is-disabled');
    } else {
      this.$action.reset.addClass('is-disabled');
    }

    if (this.input) {
      this.$action.clean.removeClass('is-disabled');
    } else {
      this.$action.clean.addClass('is-disabled');
    }

    if (this.result) {
      this.$action.copy.removeClass('is-disabled');
    } else {
      this.$action.copy.addClass('is-disabled');
    }
  };

  toast = (text: string, type = 'success') => {
    const className = `toastify--${type}`;

    if (text) {
      Toastify({
        text,
        className,
        ...this.options.plugins.toastify,
      }).showToast();
    }
  };

  reset = () => {
    this.input = '';
    this.result = '';

    this.$editor.html('');
    this.$code.val('');

    const resetTimeout = setTimeout(() => {
      this.toggleEditor('editor');
      this.resetSelection();
      this.update();

      clearTimeout(resetTimeout);
    }, 1);
  };

  settings = () => {
    this.$params.slideToggle(this.options.duration);
  };

  resetSelection = () => {
    const range = document.createRange();
    const selection = window.getSelection();

    if (selection) {
      range.setStart(this.$editor.get(0) as HTMLElement, 0);
      range.collapse(true);

      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  toggleEditor = (id: Editors) => {
    const showId = `$${id}` as '$code' | '$editor';

    if (showId in this) {
      const display = this[showId].css('display');
      const hideId = (id === 'editor') ? '$code' : '$editor';

      if (display === 'none') {
        this[showId].fadeIn(0);
        this[hideId].fadeOut(0);
      }
    } else {
      this.$code.add(this.$editor).fadeToggle(0);
    }
  };

  parse = (str: string) => {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(str, 'text/html');

    return parsed.body;
  };

  isHtmlString = (str: string) => Array.from(this.parse(str).childNodes).some((node) => node.nodeType === 1);

  clean = () => {
    const parsed = this.parse(this.input);

    const replaces: [RegExp, (string | StringReplacer)?][] = [
      [/<(img|class|span|style|script|applet|embed|noframes|noscript).*?>(.*?)<\/(class|span|style|script|applet|embed|noframes|noscript)>/gi, ' $2 '],
      [/<!--(.*?)-->/g],
      [/<(\/)*(meta|link|span|\?xml:|st1:|o:|font)(.*?)>/gi],
      [/<\/(strong|i|u)><(strong|i|u)>/gi],
      [/<pre>(.*?)<\/pre>/gi, '<p>$1</p>'],
      [/\s*?<br\s?\/>\s*?/gi, '<br>'],
      [/(<br>)+/g, '<br>'],
      [/(<.*>)<br>/gi, '$1'],
      [/<br>(<\/.*>)/gi, '$1'],
      [/&nbsp;/g, ' '],
      [/“([^”]*)”/gi, '«$1»'],
      [/(\r\n|\n|\r)/gi],
      [/\s+(?= )/g],
      [/:/gi, ': '],
      [/(http|https|\d):\s+/gi, '$1:'],
      [/<(td|th|li)><p>(.*?)<\/p><\/(td|th|li)>/gi, '<$1>$2</$1>'],
      [/(км|м|дм|см|мм|л|мл)([2-3])/gi, '$1<sup>$2</sup>'],
      [/(«|\()\s+?(.*)\s+?(»|\))/gi, '$1$2$3'],
      [/(>\w\.+)(\D)/gi, '$1 $2'],
      [/<p>\s?(•|·)(.*?)(<\/p>)/gi, '<ul><li>$2</li></ul>'],
      [/<\/ul><ul>/gi],
      [/<p>(.*?)<br>(.*?)<\/p>/gi, '<p>$1</p><p>$2</p>'],
      [/>[\r\n ]+</g, '><'],
      [/(<.*?>)|\s+/g, (_: string, $1: string) => ($1 || ' ')],
      [/>\s+|\s+</g, (m: string) => m.trim()],
    ];

    parsed.querySelectorAll('*').forEach((el) => {
      [...el.attributes].filter((attr) => !this.options.whiteList.includes(attr.name)).forEach((attr) => el.removeAttribute(attr.name));

      if (el.textContent && !el.textContent.trim() && !['br', 'td'].includes(el.tagName.toLowerCase())) {
        el.remove();
      }
    });

    this.result = replaces.reduce((acc, replace) => acc.replace(replace[0], (replace[1] as string) || ''), parsed.innerHTML.trim());

    if (this.params.format) {
      this.result = beautify.html(this.result, this.options.plugins.beautify);
    }

    if (this.params.strong) {
      this.result = this.result.replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>');
    }

    if (this.params.double) {
      this.result = this.result.replace(/(\r?\n)+/g, '\n\n');
    }

    this.$code.val(this.result);

    this.update();

    if (this.mode === 'ms') {
      this.toggleEditor('code');
    }

    if (this.params.copy) {
      this.$action.copy.trigger('click');
    }
  };
}
