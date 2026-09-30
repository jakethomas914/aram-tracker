import type { MatchRecord, RosterMember } from "@/lib/types";

/**
 * Re-applies the current roster to a stored match.
 *
 * Tracked flags and aliases are derived from the roster, which changes over
 * time: renaming a friend or adding someone who was already in old games would
 * otherwise leave stale labels on everything already on disk. Doing it on read
 * keeps stored matches as a pure record of what Riot returned.
 */
export function hydrateMatch(
  match: MatchRecord,
  rosterByPuuid: Map<string, RosterMember>,
): MatchRecord {
  const participants = match.participants.map((participant) => {
    const member = rosterByPuuid.get(participant.puuid);
    if (!member) {
      return participant.isTracked
        ? { ...participant, isTracked: false, alias: null }
        : participant;
    }
    return {
      ...participant,
      isTracked: true,
      alias: member.alias,
      riotId: `${member.gameName}#${member.tagLine}`,
    };
  });

  const tracked = participants.filter((participant) => participant.isTracked);
  const teamIds = new Set(tracked.map((participant) => participant.teamId));
  const groupOnSameTeam = tracked.length > 0 && teamIds.size === 1;

  return {
    ...match,
    participants,
    trackedPuuids: tracked.map((participant) => participant.puuid),
    groupOnSameTeam,
    groupWin: groupOnSameTeam ? tracked[0].win : null,
  };
}

export function hydrateMatches(
  matches: MatchRecord[],
  roster: RosterMember[],
): MatchRecord[] {
  const rosterByPuuid = new Map(roster.map((member) => [member.puuid, member]));
  return matches.map((match) => hydrateMatch(match, rosterByPuuid));
}
