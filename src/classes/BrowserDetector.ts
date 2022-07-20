export type Browsers = Record<string, number>;

export interface IBrowser {
  name: string;
  version: string;
}

export interface IBrowserDetector {
  readonly supportedBrowsers: Browsers;

  get browser(): IBrowser;
  get name(): string;
  get version(): string | number;

  get supported(): boolean;
  get outdated(): boolean;

  get ie(): boolean;
  get edge(): boolean;
  get microsoft(): boolean;
  get firefox(): boolean;
  get chrome(): boolean;
  get safari(): boolean;
  get android(): boolean;
  get blackBerry(): boolean;
  get windowsMobile(): boolean;
  get ios(): boolean;
  get mobile(): boolean;
  get desktop(): boolean;
}

export default class BrowserDetector implements IBrowserDetector {
  static defaults = {
    supported: {
      chrome: 70,
      firefox: 60,
      ie: 10,
      edge: 15,
      opera: 50,
      safari: 12,
    },
  };

  public supportedBrowsers;

  constructor(browsers: Browsers = {}) {
    this.supportedBrowsers = Object.assign({}, BrowserDetector.defaults.supported, browsers);
  }

  get browser() {
    return (function () {
      const ua = navigator.userAgent;
      let tem;
      let M = ua.match(
        /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i,
      ) || [];

      if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || [];

        return {
          name: 'ie',
          version: tem[1] || '',
        };
      }

      if (M[1] === 'Chrome') {
        tem = ua.match(/\b(OPR|Edge)\/(\d+)/);

        if (tem !== null) {
          return {
            name: tem[1].replace('OPR', 'opera'),
            version: tem[2],
          };
        }
      }

      M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];

      if ((tem = ua.match(/version\/(\d+)/i)) != null) {
        M.splice(1, 1, tem[1]);
      }

      return { name: M[0].toLowerCase(), version: M[1] };
    }());
  }

  get name() {
    return this.browser.name;
  }

  get version() {
    return parseFloat(this.browser.version) || this.browser.version;
  }

  get supported() {
    if (this.name in this.supportedBrowsers && typeof this.version === 'number') {
      return this.version >= (this.supportedBrowsers as any)[this.name];
    }

    return false;
  }

  get outdated() {
    return !this.supported;
  }

  get ie() {
    return this.name === 'ie';
  }

  get edge() {
    return this.name === 'edge';
  }

  get microsoft() {
    return this.ie || this.edge;
  }

  get firefox() {
    return this.name === 'firefox';
  }

  get chrome() {
    return this.name === 'chrome';
  }

  get safari() {
    return this.name === 'safari';
  }

  get android() {
    return /Android/i.test(navigator.userAgent);
  }

  get blackBerry() {
    return /BlackBerry/i.test(navigator.userAgent);
  }

  get windowsMobile() {
    return /IEMobile/i.test(navigator.userAgent);
  }

  get ios() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  get mobile() {
    return this.android || this.blackBerry || this.windowsMobile || this.ios;
  }

  get desktop() {
    return !this.mobile;
  }
}
