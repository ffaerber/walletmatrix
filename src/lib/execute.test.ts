import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Token } from './types';
import type { LifiQuote } from './lifi';

vi.mock('./wallet', () => ({
  switchToChain: vi.fn(),
  sendTransaction: vi.fn(),
  waitForReceipt: vi.fn(),
}));

vi.mock('./erc20', () => ({
  readAllowance: vi.fn(),
  encodeApprove: vi.fn(),
}));

vi.mock('./lifi', () => ({
  fetchLifiQuote: vi.fn(),
  fetchLifiStatus: vi.fn(),
}));

import { executeQuote, type TxStage } from './execute';
import { sendTransaction, switchToChain, waitForReceipt } from './wallet';
import { readAllowance, encodeApprove } from './erc20';
import { fetchLifiStatus } from './lifi';

const ETH: Token = { id: 'eth', symbol: 'ETH', name: 'Ether', icon: 'Ξ', bg: '#000', price: 3200 };
const USDC: Token = { id: 'usdc', symbol: 'USDC', name: 'USD Coin', icon: '$', bg: '#000', price: 1 };

function makeQuote(): LifiQuote {
  return {
    id: 'q',
    type: 'lifi',
    tool: 'across',
    action: {
      fromToken: { symbol: 'USDC', decimals: 6, address: '0xusdc' },
      toToken: { symbol: 'USDC', decimals: 6, address: '0xusdc' },
      fromAmount: '1000000',
    },
    estimate: { fromAmount: '1000000', toAmount: '990000', toAmountMin: '985000', executionDuration: 120 },
    transactionRequest: { to: '0xSpender', chainId: 1, data: '0xabcd' },
  };
}

describe('executeQuote', () => {
  beforeEach(() => {
    vi.mocked(switchToChain).mockResolvedValue(undefined);
    vi.mocked(sendTransaction).mockResolvedValue('0xSIGNED');
    vi.mocked(waitForReceipt).mockResolvedValue(undefined);
    vi.mocked(readAllowance).mockResolvedValue(0n);
    vi.mocked(encodeApprove).mockReturnValue('0x095ea7b300');
    vi.mocked(fetchLifiStatus).mockResolvedValue({
      status: 'DONE',
      receiving: { txHash: '0xRECV' },
    });
  });

  it('goes idle -> switching -> signing -> pending -> done for a native token', async () => {
    const stages: TxStage['kind'][] = [];
    const onStage = (s: TxStage) => stages.push(s.kind);

    await executeQuote(
      {
        address: '0xuser',
        fromToken: ETH,
        toToken: ETH,
        fromChainId: '1',
        toChainId: '8453',
        amountHuman: '0.1',
      },
      makeQuote(),
      onStage,
      { pollInitialDelayMs: 0 },
    );

    const unique = Array.from(new Set(stages));
    expect(unique).toEqual(['switching', 'signing', 'pending', 'done']);
    expect(switchToChain).toHaveBeenCalledWith('1');
    expect(readAllowance).not.toHaveBeenCalled();
  });

  it('inserts an approving stage when source is ERC-20 and allowance is insufficient', async () => {
    const stages: TxStage[] = [];

    await executeQuote(
      {
        address: '0xuser',
        fromToken: USDC,
        toToken: USDC,
        fromChainId: '1',
        toChainId: '8453',
        amountHuman: '100',
      },
      makeQuote(),
      (s) => stages.push(s),
      { pollInitialDelayMs: 0 },
    );

    const kinds = stages.map((s) => s.kind);
    expect(kinds).toContain('approving');
    expect(kinds.indexOf('approving')).toBeLessThan(kinds.indexOf('signing'));
    expect(readAllowance).toHaveBeenCalled();
    expect(sendTransaction).toHaveBeenCalledTimes(2);
  });

  it('emits an error stage and rethrows when Li.Fi returns FAILED', async () => {
    vi.mocked(fetchLifiStatus).mockResolvedValueOnce({
      status: 'FAILED',
      substatusMessage: 'partial revert',
    });
    const stages: TxStage[] = [];

    await expect(
      executeQuote(
        {
          address: '0xuser',
          fromToken: ETH,
          toToken: ETH,
          fromChainId: '1',
          toChainId: '8453',
          amountHuman: '0.1',
        },
        makeQuote(),
        (s) => stages.push(s),
        { pollInitialDelayMs: 0 },
      ),
    ).rejects.toThrow(/partial revert/);

    const last = stages[stages.length - 1];
    expect(last.kind).toBe('error');
    if (last.kind === 'error') expect(last.message).toMatch(/partial revert/);
  });
});
