import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@/lib/db';
import { getPusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    const serverNow = Date.now();
    const { gameCode, playerName, rejoinId } = await request.json();

    if (!gameCode || !playerName) {
      return NextResponse.json({ error: 'Game code and player name required' }, { status: 400 });
    }

    const upperCode = gameCode.toUpperCase();
    const gameRows = (await sql`
      select id, game_code, status
      from games
      where game_code = ${upperCode}
      limit 1
    `) as Array<{ id: string; game_code: string; status: string }>;
    const game = gameRows[0];
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const players = (await sql`
      select player_id::text as id, name, score
      from game_players
      where game_id = ${game.id}::uuid
    `) as Array<{ id: string; name: string; score: number }>;

    // Allow rejoin by ID (returning player)
    if (rejoinId) {
      const existingPlayer = players.find((p) => p.id === rejoinId);
      if (existingPlayer) {
        return NextResponse.json({
          serverNow,
          playerId: existingPlayer.id,
          playerName: existingPlayer.name,
          gameCode: game.game_code,
          rejoined: true,
          status: game.status,
        });
      }
    }

    // Allow rejoin by name (same name = same player returning)
    const normalizedRequestedName = playerName.trim().toLowerCase();
    const existingByName = players.find((p) => p.name.toLowerCase() === normalizedRequestedName);
    if (existingByName) {
      return NextResponse.json({
        serverNow,
        playerId: existingByName.id,
        playerName: existingByName.name,
        gameCode: game.game_code,
        rejoined: true,
        status: game.status,
      });
    }

    // New player joining
    if (game.status === 'active') {
      return NextResponse.json({ error: 'Game already in progress. Try rejoining with your original name.' }, { status: 400 });
    }

    if (game.status === 'finished') {
      return NextResponse.json({ error: 'Game has ended' }, { status: 400 });
    }

    if (players.length >= 8) {
      return NextResponse.json({ error: 'Game is full (max 8 players). You can watch at /watch' }, { status: 400 });
    }

    // Handle duplicate names
    let finalName = playerName.trim();
    const existingNames = players.map((p) => p.name);
    if (existingNames.includes(finalName)) {
      let suffix = 2;
      while (existingNames.includes(`${finalName} ${suffix}`)) {
        suffix++;
      }
      finalName = `${finalName} ${suffix}`;
    }

    const player = {
      id: uuidv4(),
      name: finalName,
    };

    await sql`
      insert into game_players (game_id, player_id, name, score, answers)
      values (${game.id}::uuid, ${player.id}::uuid, ${player.name}, ${0}, ${"[]"}::jsonb)
    `;

    const pusher = getPusherServer();
    const newPlayers = [...players, { id: player.id, name: player.name, score: 0 }];
    await pusher.trigger(`game-${upperCode}`, 'player-joined', {
      player: { id: player.id, name: player.name },
      players: newPlayers.map((p) => ({ id: p.id, name: p.name })),
    });

    return NextResponse.json({
      serverNow,
      playerId: player.id,
      playerName: finalName,
      gameCode: game.game_code,
      rejoined: false,
      status: game.status,
    });
  } catch (error) {
    console.error('Join game error:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
