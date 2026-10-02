import MatchesClient from './MatchesClient';
import { bootstrapData } from '@/lib/serverData';

export const dynamic = 'force-dynamic';

export default async function MatchesPage() {
  let initial = null;
  try { initial = await bootstrapData(); } catch (error) { initial = null; }
  if (!initial) return <main className="min-h-screen grid place-items-center p-6 text-center text-muted-foreground">Match information is temporarily unavailable.</main>;
  return <MatchesClient initial={initial} />;
}
