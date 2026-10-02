import { notFound } from 'next/navigation';
import TeamDetailClient from '../TeamDetailClient';
import { bootstrapData } from '@/lib/serverData';

export const dynamic = 'force-dynamic';

export default async function TeamDetailPage({ params }) {
  const { id } = await params;
  let initial = null;
  try { initial = await bootstrapData(); } catch (error) { initial = null; }
  const team = initial?.teams.find((row) => row.id === id);
  if (!team) notFound();
  return <TeamDetailClient initial={{ ...initial, team }} />;
}
