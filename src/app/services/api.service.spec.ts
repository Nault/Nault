import { ApiService } from './api.service';
import { TxType } from './util.service';
import { of, throwError } from 'rxjs';

describe('ApiService.process', () => {
  it('submits a JSON block without double-encoding it', async () => {
    const service = new ApiService(null as any, null as any, null as any);
    const request = spyOn<any>(service, 'request').and.returnValue(Promise.resolve({ hash: 'hash' }));
    const block = {
      type: 'state',
      account: 'nano_test',
      previous: '0'.repeat(64),
      representative: 'nano_representative',
      balance: '100',
      link: '0'.repeat(64),
      signature: 'A'.repeat(128),
      work: 'A'.repeat(16)
    };

    for (const subtype of [TxType.send, TxType.receive, TxType.open, TxType.change]) {
      const result = await service.process(block, subtype);
      expect(result).toEqual({ hash: 'hash' });
      expect(request).toHaveBeenCalledWith('process', {
        json_block: 'true',
        block,
        subtype: TxType[subtype]
      }, false);
      const payload = request.calls.mostRecent().args[1] as any;
      expect(payload.block).toBe(block);
      expect(payload.watch_work).toBeUndefined();
    }
    expect(request).toHaveBeenCalledTimes(4);
  });
});


describe('ApiService block contents compatibility', () => {
  const block = { type: 'state', balance: '100', representative: 'nano_representative' };

  it('normalizes RsNano object contents in blocks_info', async () => {
    const service = new ApiService(null as any, null as any, null as any);
    const request = spyOn<any>(service, 'request').and.returnValue(Promise.resolve({
      blocks: { ABC: { amount: '1', contents: { ...block } } }
    }));

    const response = await service.blocksInfo(['ABC']);

    expect(request).toHaveBeenCalledWith('blocks_info', {
      hashes: ['ABC'], pending: true, source: true
    }, false);
    expect(typeof response.blocks.ABC.contents).toBe('string');
    expect(JSON.parse(response.blocks.ABC.contents)).toEqual(block);
    expect(response.blocks.ABC.amount).toBe('1');
  });

  it('preserves Nano Node string contents in blocks_info', async () => {
    const service = new ApiService(null as any, null as any, null as any);
    const contents = JSON.stringify(block);
    spyOn<any>(service, 'request').and.returnValue(Promise.resolve({
      blocks: { ABC: { contents } }
    }));

    const response = await service.blocksInfo(['ABC']);

    expect(response.blocks.ABC.contents).toBe(contents);
  });

  it('normalizes object contents in block_info', async () => {
    const service = new ApiService(null as any, null as any, null as any);
    const request = spyOn<any>(service, 'request').and.returnValue(Promise.resolve({
      contents: { ...block }, subtype: 'send'
    }));

    const response = await service.blockInfo('ABC');

    expect(request).toHaveBeenCalledWith('block_info', { hash: 'ABC' }, false);
    expect(JSON.parse(response.contents)).toEqual(block);
    expect(response.subtype).toBe('send');
  });
});


describe('ApiService receivable RPC compatibility', () => {
  it('uses accounts_receivable for all multi-account pending queries', async () => {
    const service = new ApiService(null as any, null as any, null as any);
    const request = spyOn<any>(service, 'request').and.returnValue(Promise.resolve({ blocks: {} }));
    const accounts = ['nano_test'];
    const base = { accounts, count: 50, source: true, include_only_confirmed: true };

    await service.accountsPending(accounts);
    expect(request).toHaveBeenCalledWith('accounts_receivable', base, false);

    await service.accountsPendingLimit(accounts, '100');
    expect(request).toHaveBeenCalledWith('accounts_receivable', { ...base, threshold: '100' }, false);

    await service.accountsPendingSorted(accounts);
    expect(request).toHaveBeenCalledWith('accounts_receivable', { ...base, sorting: true }, false);

    await service.accountsPendingLimitSorted(accounts, '100');
    expect(request).toHaveBeenCalledWith('accounts_receivable', { ...base, threshold: '100', sorting: true }, false);
    expect(request).toHaveBeenCalledTimes(4);
  });

  it('uses receivable for all single-account pending queries', async () => {
    const service = new ApiService(null as any, null as any, null as any);
    const request = spyOn<any>(service, 'request').and.returnValue(Promise.resolve({ blocks: {} }));
    const account = 'nano_test';
    const base = { account, count: 50, source: true, include_only_confirmed: true };

    await service.pending(account, 50);
    expect(request).toHaveBeenCalledWith('receivable', base, false);

    await service.pendingLimit(account, 50, '100');
    expect(request).toHaveBeenCalledWith('receivable', { ...base, threshold: '100' }, false);

    await service.pendingSorted(account, 50);
    expect(request).toHaveBeenCalledWith('receivable', { ...base, sorting: true }, false);

    await service.pendingLimitSorted(account, 50, '100');
    expect(request).toHaveBeenCalledWith('receivable', { ...base, threshold: '100', sorting: true }, false);
    expect(request).toHaveBeenCalledTimes(4);
  });
});


describe('ApiService RPC proxy fallback', () => {
  function setupProxy(
    refusedAction: string | null,
    serverName: string = 'custom',
    refusalMessage: string | null = null
  ) {
    const payloads: any[] = [];
    const http = {
      post: jasmine.createSpy('post').and.callFake((_url: string, payload: any) => {
        payloads.push({ ...payload });
        if (payload.action === refusedAction) {
          return throwError({
            status: 500,
            error: { error: refusalMessage || `Action ${refusedAction} not allowed` }
          });
        }
        return of({ blocks: {} });
      })
    };
    const node = {
      node: { status: true },
      setOnline: jasmine.createSpy('setOnline'),
      setOffline: jasmine.createSpy('setOffline'),
      setLoading: jasmine.createSpy('setLoading')
    };
    const settings = {
      settings: {
        serverAPI: 'https://example.invalid/proxy',
        serverName,
        serverAuth: null
      },
      loadServerSettings: jasmine.createSpy('loadServerSettings')
    };
    return {
      api: new ApiService(http as any, node as any, settings as any),
      payloads, node, settings
    };
  }

  it('retries accounts_pending on a proxy denial without rotating a random server', async () => {
    const { api, payloads, node, settings } = setupProxy('accounts_receivable', 'random');

    const response = await api.accountsPendingLimitSorted(['nano_test'], '100');

    expect(response).toEqual({ blocks: {} });
    expect(payloads.map(p => p.action)).toEqual(['accounts_receivable', 'accounts_pending']);
    for (const payload of payloads) {
      expect(payload.accounts).toEqual(['nano_test']);
      expect(payload.threshold).toBe('100');
      expect(payload.count).toBe(50);
      expect(payload.source).toBe(true);
      expect(payload.sorting).toBe(true);
      expect(payload.include_only_confirmed).toBe(true);
    }
    expect(settings.loadServerSettings).not.toHaveBeenCalled();
    expect(node.setOffline).not.toHaveBeenCalled();
  });

  it('retries pending on a proxy denial of receivable', async () => {
    const { api, payloads } = setupProxy('receivable');

    await api.pendingLimitSorted('nano_test', 25, '100');

    expect(payloads.map(p => p.action)).toEqual(['receivable', 'pending']);
    for (const payload of payloads) {
      expect(payload.account).toBe('nano_test');
      expect(payload.count).toBe(25);
      expect(payload.threshold).toBe('100');
      expect(payload.source).toBe(true);
      expect(payload.sorting).toBe(true);
    }
  });

  it('uses accounts_receivable directly when the node supports it', async () => {
    const { api, payloads } = setupProxy(null);

    await api.accountsPendingSorted(['nano_test']);

    expect(payloads.map(p => p.action)).toEqual(['accounts_receivable']);
  });

  it('does not silently fall back on an unrelated HTTP 500 error', async () => {
    const { api, payloads, node } = setupProxy('accounts_receivable', 'custom', 'Internal server error');

    let error: any;
    try {
      await api.accountsPending(['nano_test']);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeDefined();
    expect(payloads.map(p => p.action)).toEqual(['accounts_receivable']);
    expect(node.setOffline).toHaveBeenCalled();
  });
});
