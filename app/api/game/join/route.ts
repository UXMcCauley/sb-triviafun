import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';
import { getPusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { gameCode, playerName } = await request.json();

    if (!gameCode || !playerName) {
      return NextResponse.json({ error: 'Game code and player name required' }, { status: 400 });
    }

    const game = await GameModel.findOne({ gameCode: gameCode.toUpperCase() });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status === 'active') {
      return NextResponse.json({ error: 'Game already in progress' }, { status: 400 });
    }

    if (game.status === 'finished') {
      return NextResponse.json({ error: 'Game has ended' }, { status: 400 });
    }

    if (game.players.length >= 8) {
      return NextResponse.json({ error: 'Game is full (max 8 players). You can watch at /watch' }, { status: 400 });
    }

    // Handle duplicate names
    let finalName = playerName.trim();
    const existingNames = game.players.map((p: { name: string }) => p.name);
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
      score: 0,
      answers: [],
    };

    game.players.push(player);
    await game.save();

    const pusher = getPusherServer();
    await pusher.trigger(`game-${gameCode.toUpperCase()}`, 'player-joined', {
      player: { id: player.id, name: player.name },
      players: game.players.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
    });

    return NextResponse.json({
      playerId: player.id,
      playerName: finalName,
      gameCode: game.gameCode,
    });
  } catch (error) {
    console.error('Join game error:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
