// Read-only frontend GraphQL queries against Arweave.
// Works reliably on mainnet (arweave.net/graphql).
// Irys devnet does not guarantee tag indexing — portal primarily uses the DB fallback.

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_ARWEAVE_GRAPHQL_URL ?? 'https://arweave.net/graphql';

export interface ArweaveTxNode {
  id: string;
  tags: Array<{ name: string; value: string }>;
  block: { timestamp: number } | null;
}

export interface PortalSession {
  txId: string;
  sessionId: string;
  title: string;
  summary: string;
  timestamp: number;
}

function getTag(node: ArweaveTxNode, name: string): string | undefined {
  return node.tags.find(t => t.name === name)?.value;
}

const FETCH_ALL_SESSIONS = `
  query FetchAllUserSessions($wallet: String!) {
    transactions(
      tags: [
        { name: "App-Name",        values: ["CodeEternal-AIfa-Memory"] }
        { name: "User-Identifier", values: [$wallet] }
      ]
      order: DESC
      first: 100
    ) {
      edges {
        node {
          id
          tags { name value }
          block { timestamp }
        }
      }
    }
  }
`;

export async function fetchAllUserSessionsFromArweave(
  wallet: string,
): Promise<PortalSession[]> {
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: FETCH_ALL_SESSIONS, variables: { wallet } }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const nodes: ArweaveTxNode[] =
      json.data?.transactions?.edges?.map((e: any) => e.node) ?? [];

    // Group by Session-ID, keep only the latest chunk per session (DESC order)
    const map = new Map<string, ArweaveTxNode>();
    for (const node of nodes) {
      const sid = getTag(node, 'Session-ID');
      if (sid && !map.has(sid)) map.set(sid, node);
    }

    return Array.from(map.values()).map(node => ({
      txId:      node.id,
      sessionId: getTag(node, 'Session-ID')!,
      title:     getTag(node, 'Chat-Title') ?? 'Session',
      summary:   getTag(node, 'Summary') ?? '',
      timestamp: node.block?.timestamp
        ? node.block.timestamp * 1000
        : Number(getTag(node, 'Timestamp') ?? 0),
    }));
  } catch {
    return [];
  }
}
