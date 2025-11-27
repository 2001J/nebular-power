import { describe, expect, test, vi } from 'vitest';

const _activateMock = vi.fn();
const deactivateMock = vi.fn();
const subscribeMock = vi.fn();

vi.mock('sockjs-client', () => ({ default: vi.fn(() => ({ onopen: null, onerror: null, onclose: null })) }));
vi.mock('@stomp/stompjs', () => ({
  Client: class {
    onConnect: any;
    connected = true;
    webSocketFactory: any;
    connectHeaders: any;
    debug: any;
    heartbeatIncoming: any;
    heartbeatOutgoing: any;
    constructor(opts: any) {
      this.webSocketFactory = opts.webSocketFactory;
    }
    activate() {
      // simulate connect
      this.onConnect && this.onConnect({});
    }
    deactivate() { deactivateMock(); }
    subscribe(_dest: string, cb: any) { subscribeMock(); cb({ body: JSON.stringify({ ok: true }) }); }
  }
}));

import { energyWebSocket } from '@/lib/energyWebSocket';

describe('energyWebSocket', () => {
  test('createSystemMonitor returns controller and receives messages', () => {
    const messages: any[] = [];
    const ctrl = energyWebSocket.createSystemMonitor((data) => messages.push(data));
    expect(typeof ctrl.close).toBe('function');
    // on connect triggers subscribe and push message
    expect(subscribeMock).toHaveBeenCalled();
    expect(messages.length).toBeGreaterThan(0);
    ctrl.close();
    expect(deactivateMock).toHaveBeenCalled();
  });
});

