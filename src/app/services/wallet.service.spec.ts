import { of } from 'rxjs';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  it('initializes with isolated websocket and address-book event streams', () => {
    // Constructor smoke test: no real RPC connection, Ledger or wallet secrets.
    const service = new WalletService(
      null as any, null as any, null as any,
      { addressBook$: of(null) } as any,
      null as any, null as any,
      { newTransactions$: of(null) } as any,
      null as any, null as any, null as any, null as any
    );
    expect(service.wallet.accounts).toEqual([]);
    expect(service.wallet.updatingBalance).toBe(false);
  });
});


describe('WalletService.reloadBalances errors', () => {
  it('clears the loading indicator if the RPC refresh rejects', async () => {
    // Avoid unrelated Angular dependencies: exercise the error boundary directly.
    const service = Object.create(WalletService.prototype) as WalletService;
    service.wallet = { updatingBalance: false } as any;
    spyOn<any>(service, 'refreshBalances').and.returnValue(Promise.reject(new Error('RPC unavailable')));

    let caughtError: any;
    try {
      await service.reloadBalances();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toEqual(jasmine.any(Error));
    expect(caughtError.message).toBe('RPC unavailable');
    expect(service.wallet.updatingBalance).toBe(false);
  });
});
