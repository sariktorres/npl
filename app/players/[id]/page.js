import { notFound } from 'next/navigation';
import PlayerDetailClient from '../PlayerDetailClient';
import { bootstrapData } from '@/lib/serverData';

export const dynamic = 'force-dynamic';

export default async function PlayerDetailPage({ params }) {
  const { id } = await params;
  let initial = null;
  try { initial = await bootstrapData(); } catch (error) { initial = null; }
  const player = initial?.players.find((row) => row.id === id);
  if (!player) notFound();
  return <PlayerDetailClient initial={{ ...initial, player }} />;
}
