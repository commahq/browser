import { BrowserView, app, Menu, nativeImage, clipboard, Tray, remote } from 'electron';
import { appWindow } from '.';
import { sendToAllExtensions } from './extensions';
import { engine } from './services/web-request';
import { parse } from 'tldts';
import console = require('console');
import store from '~/renderer/app/store';
import { resolve } from 'path';
const path = require("path");
const { setup: setupPushReceiver } = require('electron-push-receiver');

export class View extends BrowserView {
  public title: string = '';
  public url: string = '';
  public tabId: number;
  public homeUrl: string;

  constructor(id: number, url: string) {
    super({
      webPreferences: {
        preload: `${app.getAppPath()}/build/view-preload.js`,
        nodeIntegration: false,
        additionalArguments: [`--tab-id=${id}`],
        contextIsolation: true,
        partition: 'persist:view',
        plugins: true,
      },
    });
    

    this.homeUrl = url;
    this.tabId = id;

    this.webContents.on('context-menu', (e, params) => {
      let menuItems: Electron.MenuItemConstructorOptions[] = [];

      if (params.linkURL !== '') {
        menuItems = menuItems.concat([
          {
            label: 'Open link in new tab',
            click: () => {
              appWindow.webContents.send('api-tabs-create', {
                url: params.linkURL,
                active: false,
              });
            },
          },
          {
            type: 'separator',
          },
          {
            label: 'Copy link address',
            click: () => {
              clipboard.clear();
              clipboard.writeText(params.linkURL);
            },
          },
          {
            type: 'separator',
          },
        ]);
      }

      if (params.hasImageContents) {
        menuItems = menuItems.concat([
          {
            label: 'Open image in new tab',
            click: () => {
              appWindow.webContents.send('api-tabs-create', {
                url: params.srcURL,
                active: false,
              });
            },
          },
          {
            label: 'Copy image',
            click: () => {
              const img = nativeImage.createFromDataURL(params.srcURL);

              clipboard.clear();
              clipboard.writeImage(img);
            },
          },
          {
            label: 'Copy image address',
            click: () => {
              clipboard.clear();
              clipboard.writeText(params.srcURL);
            },
          },
          {
            type: 'separator',
          },
        ]);
      }

      if (params.isEditable) {
        menuItems = menuItems.concat([
          {
            role: 'undo',
          },
          {
            role: 'redo',
          },
          {
            type: 'separator',
          },
          {
            role: 'cut',
          },
          {
            role: 'copy',
          },
          {
            role: 'pasteAndMatchStyle',
          },
          {
            role: 'paste',
          },
          {
            role: 'selectAll',
          },
          {
            type: 'separator',
          },
        ]);
      }

      if (!params.isEditable && params.selectionText !== '') {
        menuItems = menuItems.concat([
          {
            role: 'copy',
          },
        ]);
      }

      if (
        !params.hasImageContents &&
        params.linkURL === '' &&
        params.selectionText === '' &&
        !params.isEditable
      ) {
        menuItems = menuItems.concat([
          {
            label: 'Back              ',
            accelerator: 'Alt+Left',
            icon: resolve(app.getAppPath() + '\\static\\app-icons\\bck.png'),
            enabled: this.webContents.canGoBack(),
            click: () => {
              this.webContents.goBack();
            },
          },
          {
            label: 'Forward         ',
            accelerator: 'Alt+Right',
            icon: resolve(app.getAppPath() + '\\static\\app-icons\\fwd.png'),
            enabled: this.webContents.canGoForward(),
            click: () => {
              this.webContents.goForward();
            },
          },
          {
            label: 'Refresh',
            accelerator: 'F5',
            icon: resolve(app.getAppPath() + '\\static\\app-icons\\refresh.png'),
            click: () => {
              this.webContents.reload();
            },
          },
          {
            type: 'separator',
          },
        ]);
      }
     
      menuItems.push({
        label: 'View source',
        click: () => {

          if(this.webContents.getURL().substr(0, 12) != "view-source:") {
            var url = `view-source:${this.webContents.getURL()}`;

            this.webContents.loadURL(url);
          }

        },
      },
      {
        label: 'Inspect',
        accelerator: 'F12',
        icon: resolve(app.getAppPath() + '\\static\\app-icons\\dev.png'),
        click: () => {

            if(this.webContents.getURL()) {
              this.webContents.inspectElement(params.x, params.y);

              if (this.webContents.isDevToolsOpened()) {
                this.webContents.devToolsWebContents.focus();
              }
            }

        },
      });

      const menu = Menu.buildFromTemplate(menuItems);

      menu.popup();
    });

    this.webContents.addListener('found-in-page', (e, result) => {
      appWindow.webContents.send('found-in-page', result);
    });

    this.webContents.addListener('did-stop-loading', () => {
      this.updateNavigationState();
      appWindow.webContents.send(`view-loading-${this.tabId}`, false);
    });

    this.webContents.addListener('did-start-loading', () => {
      this.updateNavigationState();
      appWindow.webContents.send(`view-loading-${this.tabId}`, true);
    });

    this.webContents.addListener('did-start-navigation', (...args: any[]) => {
      this.updateNavigationState();

      const url = this.webContents.getURL();

      const { styles, scripts } = engine.getCosmeticsFilters({
        url,
        ...parse(url),
      });

      this.webContents.insertCSS(styles);

      for (const script of scripts) {
        this.webContents.executeJavaScript(script);
      }

      appWindow.webContents.send(`load-commit-${this.tabId}`, ...args);

      this.emitWebNavigationEvent('onBeforeNavigate', {
        tabId: this.tabId,
        url: this.webContents.getURL(),
        frameId: 0,
        timeStamp: Date.now(),
        processId: process.pid,
        parentFrameId: -1,
      });

      this.emitWebNavigationEvent('onCommitted', {
        tabId: this.tabId,
        url,
        sourceFrameId: 0,
        timeStamp: Date.now(),
        processId: process.pid,
        frameId: 0,
        parentFrameId: -1,
      });
    });

    this.webContents.addListener('did-finish-load', async () => {

      this.emitWebNavigationEvent('onCompleted', {
        tabId: this.tabId,
        url: this.webContents.getURL(),
        frameId: 0,
        timeStamp: Date.now(),
        processId: process.pid,
        screenshot: this.getScreenshot()
      });

    });

    this.webContents.addListener(
      'new-window',
      (e, url, frameName, disposition) => {
        if (disposition === 'new-window') {
          console.log(frameName)
          console.log(disposition)
          if (frameName === '_self') {
            e.preventDefault();
            appWindow.viewManager.selected.webContents.loadURL(url);
            appWindow.viewManager.selected.webContents.setUserAgent(appWindow.viewManager.selected.webContents.getUserAgent() + " Dot Browser/getdot.js.org");
          } else if (frameName === '_blank') {
            e.preventDefault();
            appWindow.webContents.send('api-tabs-create', {
              url,
              active: true,
            });
          } else if (frameName === 'modal') {
            e.preventDefault();
            appWindow.webContents.send('api-tabs-create', {
              url,
              active: true,
            });
          }
        } else if (disposition === 'foreground-tab') {
          e.preventDefault();
          appWindow.webContents.send('api-tabs-create', { url, active: true });
        } else if (disposition === 'background-tab') {
          e.preventDefault();
          appWindow.webContents.send('api-tabs-create', { url, active: false });
        }

        this.emitWebNavigationEvent('onCreatedNavigationTarget', {
          tabId: this.tabId,
          url,
          sourceFrameId: 0,
          timeStamp: Date.now(),
        });
      },
    );

    this.webContents.addListener('dom-ready', () => {

      this.emitWebNavigationEvent('onDOMContentLoaded', {
        tabId: this.tabId,
        url: this.webContents.getURL(),
        frameId: 0,
        timeStamp: Date.now(),
        processId: process.pid,
        screenshot: this.getScreenshot()
      });
    });

    this.webContents.addListener(
      'page-favicon-updated',
      async (e, favicons) => {
        appWindow.webContents.send(
          `browserview-favicon-updated-${this.tabId}`,
          favicons[0],
        );
      },
    );

    this.webContents.addListener('did-change-theme-color', (e, color) => {
      appWindow.webContents.send(
        `browserview-theme-color-updated-${this.tabId}`,
        color,
      );
    });

    (this.webContents as any).addListener(
      'certificate-error',
      (
        event: Electron.Event,
        url: string,
        error: string,
        certificate: Electron.Certificate,
        callback: Function,
      ) => {
        console.log(certificate, error, url);
        // TODO: properly handle insecure websites.
        event.preventDefault();
        callback(true);
      },
    );

    this.setAutoResize({ width: true, height: true });
    this.webContents.loadURL(url);
  }

  public updateNavigationState() {
    if (this.isDestroyed()) return;

    if (appWindow.viewManager.selectedId === this.tabId) {
      appWindow.webContents.send('update-navigation-state', {
        canGoBack: this.webContents.canGoBack(),
        canGoForward: this.webContents.canGoForward(),
      });
    }
  }

  public emitWebNavigationEvent = (name: string, ...data: any[]) => {
    this.webContents.send(`api-emit-event-webNavigation-${name}`, ...data);

    sendToAllExtensions(`api-emit-event-webNavigation-${name}`, ...data);
  };

  public async getScreenshot(): Promise<string> {
    return new Promise(resolve => {
      this.webContents.capturePage(img => {
        resolve(img.toDataURL());
      });
    });
  }
}
