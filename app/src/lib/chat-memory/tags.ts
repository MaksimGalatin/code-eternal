import type { ChatFilePayload } from './types';

export function prepareTags(
  payload: ChatFilePayload,
  chatTitle: string,
): Array<{ name: string; value: string }> {
  return [
    { name: 'App-Name',        value: 'CodeEternal-AIfa-Memory' },
    { name: 'Content-Type',    value: 'application/json' },
    { name: 'User-Identifier', value: payload.wallet },
    { name: 'Session-ID',      value: payload.sessionId },
    { name: 'Sequence-Number', value: String(payload.chunkIndex) },
    { name: 'Prev-TX-ID',      value: payload.prevTxId ?? 'null' },
    { name: 'Chat-Title',      value: chatTitle.slice(0, 150) },
    // Summary stored as tag so portal can render timeline without downloading JSON
    { name: 'Summary',         value: payload.metadata.summary.slice(0, 500) },
    { name: 'Timestamp',       value: String(Date.now()) },
  ];
}
