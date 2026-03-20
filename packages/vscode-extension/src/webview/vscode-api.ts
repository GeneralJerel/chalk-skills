import type { ExtensionMessage, WebviewMessage } from '../types';

interface VsCodeApi {
  postMessage(message: WebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

export function postMessage(message: WebviewMessage) {
  vscode.postMessage(message);
}

export function onMessage(handler: (message: ExtensionMessage) => void) {
  window.addEventListener('message', (event) => {
    handler(event.data as ExtensionMessage);
  });
}
