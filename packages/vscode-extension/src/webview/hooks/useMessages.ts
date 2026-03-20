import { useEffect } from 'react';
import type { ExtensionMessage, WebviewMessage } from '../../types';
import { onMessage, postMessage } from '../vscode-api';

export function useSendMessage() {
  return postMessage;
}

export function useOnMessage(handler: (msg: ExtensionMessage) => void) {
  useEffect(() => {
    onMessage(handler);
  }, []);
}

export function useRequestData() {
  useEffect(() => {
    const msg1: WebviewMessage = { type: 'request:skills' };
    const msg2: WebviewMessage = { type: 'request:progression' };
    postMessage(msg1);
    postMessage(msg2);
  }, []);
}
