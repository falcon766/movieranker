const K = 32;

export function expectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function eloPair(
  winnerElo: number,
  loserElo: number,
  draw = false,
): { winner: number; loser: number } {
  const expWinner = expectedScore(winnerElo, loserElo);
  const expLoser = expectedScore(loserElo, winnerElo);

  if (draw) {
    return {
      winner: winnerElo + K * (0.5 - expWinner),
      loser: loserElo + K * (0.5 - expLoser),
    };
  }

  return {
    winner: winnerElo + K * (1 - expWinner),
    loser: loserElo + K * (0 - expLoser),
  };
}

/** Map star rating 0.5–5 to a starting Elo. */
export function eloFromLetterboxdStars(stars: number) {
  const clamped = Math.min(5, Math.max(0.5, stars));
  return 800 + clamped * 80;
}

export function sortByEloThenPosition<
  T extends { elo: number; position: number | null; title: string },
>(items: T[]) {
  return [...items].sort((a, b) => {
    if (b.elo !== a.elo) return b.elo - a.elo;
    if (a.position != null && b.position != null) return a.position - b.position;
    if (a.position != null) return -1;
    if (b.position != null) return 1;
    return a.title.localeCompare(b.title);
  });
}

export function reindexPositions<T extends { position: number | null }>(
  ranked: T[],
): T[] {
  return ranked.map((item, index) => ({
    ...item,
    position: index + 1,
  }));
}
