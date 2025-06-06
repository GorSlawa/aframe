import { registerComponent } from '../../core/component.js';
import * as constants from '../../constants/index.js';
import * as utils from '../../utils/index.js';

var ENTER_VR_CLASS = 'a-enter-vr';
var ENTER_AR_CLASS = 'a-enter-ar';

var ENTER_VR_BTN_CLASS = 'a-enter-vr-button';
var ENTER_AR_BTN_CLASS = 'a-enter-ar-button';
var HIDDEN_CLASS = 'a-hidden';
var ORIENTATION_MODAL_CLASS = 'a-orientation-modal';

/**
 * UI for entering VR mode.
 */
export var Component = registerComponent('xr-mode-ui', {
  dependencies: ['canvas'],

  schema: {
    enabled: {default: true},
    enterVRButton: {default: ''},
    enterVREnabled: {default: true},
    enterARButton: {default: ''},
    enterAREnabled: {default: true},
    XRMode: {default: 'vr', oneOf: ['vr', 'ar', 'xr']}
  },

  sceneOnly: true,

  init: function () {
    var self = this;
    var sceneEl = this.el;

    if (utils.getUrlParameter('ui') === 'false') { return; }

    this.insideLoader = false;
    this.enterVREl = null;
    this.enterAREl = null;

    this.orientationModalEl = null;
    this.bindMethods();

    // Hide/show VR UI when entering/exiting VR mode.
    sceneEl.addEventListener('enter-vr', this.updateEnterInterfaces);
    sceneEl.addEventListener('exit-vr', this.updateEnterInterfaces);
    sceneEl.addEventListener('update-vr-devices', this.updateEnterInterfaces);

    window.addEventListener('message', function (event) {
      if (event.data.type === 'loaderReady') {
        self.insideLoader = true;
        self.remove();
      }
    });

    // Modal that tells the user to change orientation if in portrait.
    window.addEventListener('orientationchange', this.toggleOrientationModalIfNeeded);
  },

  bindMethods: function () {
    this.onEnterVRButtonClick = this.onEnterVRButtonClick.bind(this);
    this.onEnterARButtonClick = this.onEnterARButtonClick.bind(this);
    this.onModalClick = this.onModalClick.bind(this);
    this.toggleOrientationModalIfNeeded = this.toggleOrientationModalIfNeeded.bind(this);
    this.updateEnterInterfaces = this.updateEnterInterfaces.bind(this);
  },

  /**
   * Exit VR when modal clicked.
   */
  onModalClick: function () {
    this.el.exitVR();
  },

  /**
   * Enter VR when clicked.
   */
  onEnterVRButtonClick: function () {
    this.el.enterVR();
  },

  /**
   * Enter AR when clicked.
   */
  onEnterARButtonClick: function () {
    this.el.enterAR();
  },

  update: function () {
    var data = this.data;
    var sceneEl = this.el;

    if (!data.enabled || this.insideLoader || utils.getUrlParameter('ui') === 'false') {
      return this.remove();
    }

    if (this.enterVREl || this.enterAREl || this.orientationModalEl) { return; }

    // Add UI if enabled and not already present.
    if (!this.enterVREl && data.enterVREnabled && (data.XRMode === 'xr' || data.XRMode === 'vr')) {
      if (data.enterVRButton) {
        // Custom button.
        this.enterVREl = document.querySelector(data.enterVRButton);
        this.enterVREl.addEventListener('click', this.onEnterVRButtonClick);
      } else {
        this.enterVREl = createEnterVRButton(this.onEnterVRButtonClick);
        sceneEl.appendChild(this.enterVREl);
      }
    }

    if (!this.enterAREl && data.enterAREnabled && (data.XRMode === 'xr' || data.XRMode === 'ar')) {
      if (data.enterARButton) {
        // Custom button.
        this.enterAREl = document.querySelector(data.enterARButton);
        this.enterAREl.addEventListener('click', this.onEnterARButtonClick);
      } else {
        this.enterAREl = createEnterARButton(this.onEnterARButtonClick, data.XRMode === 'xr');
        sceneEl.appendChild(this.enterAREl);
      }
    }

    this.orientationModalEl = createOrientationModal(this.onModalClick);
    sceneEl.appendChild(this.orientationModalEl);

    this.updateEnterInterfaces();
  },

  remove: function () {
    [this.enterVREl, this.enterAREl, this.orientationModalEl].forEach(function (uiElement) {
      if (uiElement && uiElement.parentNode) {
        uiElement.parentNode.removeChild(uiElement);
      }
    });
    this.enterVREl = undefined;
    this.enterAREl = undefined;
    this.orientationModalEl = undefined;
  },

  updateEnterInterfaces: function () {
    this.toggleEnterVRButtonIfNeeded();
    this.toggleEnterARButtonIfNeeded();
    this.toggleOrientationModalIfNeeded();
  },

  toggleEnterVRButtonIfNeeded: function () {
    var sceneEl = this.el;
    if (!this.enterVREl) { return; }
    if (sceneEl.is('vr-mode') ||
       ((sceneEl.isMobile || utils.device.isMobileDeviceRequestingDesktopSite()) && !utils.device.checkVRSupport())) {
      this.enterVREl.classList.add(HIDDEN_CLASS);
    } else {
      if (!utils.device.checkVRSupport()) { this.enterVREl.classList.add('fullscreen'); }
      this.enterVREl.classList.remove(HIDDEN_CLASS);
      sceneEl.enterVR(false, true);
    }
  },

  toggleEnterARButtonIfNeeded: function () {
    var sceneEl = this.el;
    if (!this.enterAREl) { return; }
    // Hide the button while in a session, or if AR is not supported.
    if (sceneEl.is('vr-mode') || !utils.device.checkARSupport()) {
      this.enterAREl.classList.add(HIDDEN_CLASS);
    } else {
      this.enterAREl.classList.remove(HIDDEN_CLASS);
      sceneEl.enterVR(true, true);
    }
  },

  toggleOrientationModalIfNeeded: function () {
    var sceneEl = this.el;
    var orientationModalEl = this.orientationModalEl;
    if (!orientationModalEl || !sceneEl.isMobile) { return; }
    if (!utils.device.isLandscape() && sceneEl.is('vr-mode')) {
      // Show if in VR mode on portrait.
      orientationModalEl.classList.remove(HIDDEN_CLASS);
    } else {
      orientationModalEl.classList.add(HIDDEN_CLASS);
    }
  }
});

/**
 * Create a button that when clicked will enter into stereo-rendering mode for VR.
 *
 * Structure: <div><button></div>
 *
 * @param {function} onClick - click event handler
 * @returns {Element} Wrapper <div>.
 */
function createEnterVRButton (onClick) {
  var vrButton;
  var wrapper;

  // Create elements.
  wrapper = document.createElement('div');
  wrapper.classList.add(ENTER_VR_CLASS);
  wrapper.setAttribute(constants.AFRAME_INJECTED, '');
  vrButton = document.createElement('button');
  vrButton.className = ENTER_VR_BTN_CLASS;
  vrButton.setAttribute('title',
                        'Enter VR mode with a headset or fullscreen without');
  vrButton.setAttribute(constants.AFRAME_INJECTED, '');
  if (utils.device.isMobile()) { applyStickyHoverFix(vrButton); }
  // Insert elements.
  wrapper.appendChild(vrButton);
  vrButton.addEventListener('click', function (evt) {
    onClick();
    evt.stopPropagation();
  });
  return wrapper;
}

/**
 * Create a button that when clicked will enter into AR mode
 *
 * Structure: <div><button></div>
 *
 * @param {function} onClick - click event handler
 * @returns {Element} Wrapper <div>.
 */
function createEnterARButton (onClick, xrMode) {
  var arButton;
  var wrapper;

  // Create elements.
  wrapper = document.createElement('div');
  wrapper.classList.add(ENTER_AR_CLASS);
  if (xrMode) { wrapper.classList.add('xr'); }
  wrapper.setAttribute(constants.AFRAME_INJECTED, '');
  arButton = document.createElement('button');
  arButton.className = ENTER_AR_BTN_CLASS;
  arButton.setAttribute('title',
                        'Enter AR mode with a headset or handheld device.');
  arButton.setAttribute(constants.AFRAME_INJECTED, '');
  if (utils.device.isMobile()) { applyStickyHoverFix(arButton); }
  // Insert elements.
  wrapper.appendChild(arButton);
  arButton.addEventListener('click', function (evt) {
    onClick();
    evt.stopPropagation();
  });
  return wrapper;
}

/**
 * Creates a modal dialog to request the user to switch to landscape orientation.
 *
 * @param {function} onClick - click event handler
 * @returns {Element} Wrapper <div>.
 */
function createOrientationModal (onClick) {
  var modal = document.createElement('div');
  modal.className = ORIENTATION_MODAL_CLASS;
  modal.classList.add(HIDDEN_CLASS);
  modal.setAttribute(constants.AFRAME_INJECTED, '');

  var exit = document.createElement('button');
  exit.setAttribute(constants.AFRAME_INJECTED, '');
  exit.innerHTML = 'Exit VR';

  // Exit VR on close.
  exit.addEventListener('click', onClick);

  modal.appendChild(exit);

  return modal;
}

/**
 * CSS hover state is sticky in iOS (as in 12/18/2019)
 * They are not removed on mouseleave and this function applies a class
 * to resets the style.
 *
 * @param {function} buttonEl - Button element
 */
function applyStickyHoverFix (buttonEl) {
  buttonEl.addEventListener('touchstart', function () {
    buttonEl.classList.remove('resethover');
  }, {passive: true});
  buttonEl.addEventListener('touchend', function () {
    buttonEl.classList.add('resethover');
  }, {passive: true});
}
