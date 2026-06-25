import { analyzePortfolio } from './portfolios';

function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return { ok: true, status: 200, body } as unknown as Response;
}

afterEach(() => vi.unstubAllGlobals());

// Build a `data: {chat-completion chunk}` frame carrying a content delta.
function delta(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content } }] })}\n\n`;
}

describe('analyzePortfolio (SSE parsing)', () => {
  it('extracts choices[0].delta.content and stops at [DONE]', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        streamResponse([delta('Hello'), delta(' World'), 'data: [DONE]\n\n', delta('ignored')])
      )
    );
    const chunks: string[] = [];
    await analyzePortfolio('t', 'p1', ['risk'], { onChunk: c => chunks.push(c) });
    expect(chunks).toEqual(['Hello', ' World']);
  });

  it('reassembles a frame split across reads', async () => {
    const frame = delta('Hello');
    const mid = Math.floor(frame.length / 2);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(streamResponse([frame.slice(0, mid), frame.slice(mid)]))
    );
    const chunks: string[] = [];
    await analyzePortfolio('t', 'p1', ['risk'], { onChunk: c => chunks.push(c) });
    expect(chunks).toEqual(['Hello']);
  });

  it('skips role-only / empty-content chunks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        streamResponse([
          `data: ${JSON.stringify({ choices: [{ delta: { role: 'assistant', content: '' } }] })}\n\n`,
          delta('Real text'),
        ])
      )
    );
    const chunks: string[] = [];
    await analyzePortfolio('t', 'p1', ['risk'], { onChunk: c => chunks.push(c) });
    expect(chunks).toEqual(['Real text']);
  });

  it('throws the envelope errorMessage on a pre-stream error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ errorMessage: 'portfolio not found' }),
      } as unknown as Response)
    );
    await expect(
      analyzePortfolio('t', 'missing', ['risk'], { onChunk: () => {} })
    ).rejects.toThrow('portfolio not found');
  });
});
