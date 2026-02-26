import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// POST /api/matches — record match result
router.post('/matches', requireAuth, async (req, res) => {
  try {
    const { opponent_type, result, terrain_id, terrain_type, duration_seconds, worms_remaining } = req.body;

    if (!opponent_type || !result) {
      return res.status(400).json({ error: 'opponent_type and result are required' });
    }

    if (!['cpu', 'human'].includes(opponent_type)) {
      return res.status(400).json({ error: 'opponent_type must be "cpu" or "human"' });
    }

    if (!['win', 'loss'].includes(result)) {
      return res.status(400).json({ error: 'result must be "win" or "loss"' });
    }

    const { data, error } = await supabase
      .from('tc_worms_matches')
      .insert({
        user_id: req.user.id,
        opponent_type,
        result,
        terrain_id: terrain_id || null,
        terrain_type: terrain_type || null,
        duration_seconds: duration_seconds || null,
        worms_remaining: worms_remaining || null
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error recording match:', error);
    res.status(500).json({ error: 'Failed to record match' });
  }
});

// GET /api/stats — current user's stats
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: matches, error } = await supabase
      .from('tc_worms_matches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const allMatches = matches || [];
    const total = allMatches.length;
    const wins = allMatches.filter(m => m.result === 'win').length;
    const losses = allMatches.filter(m => m.result === 'loss').length;

    const cpuMatches = allMatches.filter(m => m.opponent_type === 'cpu');
    const humanMatches = allMatches.filter(m => m.opponent_type === 'human');

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let streak = 0;
    for (const m of allMatches) {
      if (m.result === 'win') {
        streak++;
        bestStreak = Math.max(bestStreak, streak);
      } else {
        streak = 0;
      }
    }
    // Current streak = count from most recent
    for (const m of allMatches) {
      if (m.result === 'win') {
        currentStreak++;
      } else {
        break;
      }
    }

    // Favorite terrain
    const terrainCounts = {};
    for (const m of allMatches) {
      if (m.terrain_type) {
        terrainCounts[m.terrain_type] = (terrainCounts[m.terrain_type] || 0) + 1;
      }
    }
    const favoriteTerrain = Object.entries(terrainCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    res.json({
      total_matches: total,
      wins,
      losses,
      win_rate: total > 0 ? Math.round((wins / total) * 1000) / 1000 : 0,
      vs_cpu: {
        wins: cpuMatches.filter(m => m.result === 'win').length,
        losses: cpuMatches.filter(m => m.result === 'loss').length
      },
      vs_human: {
        wins: humanMatches.filter(m => m.result === 'win').length,
        losses: humanMatches.filter(m => m.result === 'loss').length
      },
      current_streak: currentStreak,
      best_streak: bestStreak,
      favorite_terrain: favoriteTerrain,
      recent_matches: allMatches.slice(0, 10)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/stats/leaderboard — top 20 players by wins
router.get('/leaderboard', async (req, res) => {
  try {
    const { data: matches, error } = await supabase
      .from('tc_worms_matches')
      .select('user_id, result');

    if (error) throw error;

    // Aggregate by user
    const userStats = {};
    for (const m of (matches || [])) {
      if (!userStats[m.user_id]) {
        userStats[m.user_id] = { wins: 0, losses: 0, total: 0 };
      }
      userStats[m.user_id].total++;
      if (m.result === 'win') userStats[m.user_id].wins++;
      else userStats[m.user_id].losses++;
    }

    // Sort by wins
    const sorted = Object.entries(userStats)
      .map(([user_id, stats]) => ({ user_id, ...stats }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 20);

    // Get display names
    const userIds = sorted.map(s => s.user_id);
    let nameMap = {};
    if (userIds.length > 0) {
      const { data: prefs } = await supabase
        .from('tc_user_preferences')
        .select('user_id, display_name')
        .in('user_id', userIds);

      if (prefs) {
        for (const p of prefs) {
          nameMap[p.user_id] = p.display_name;
        }
      }
    }

    const leaderboard = sorted.map((s, i) => ({
      rank: i + 1,
      display_name: nameMap[s.user_id] || 'Player',
      wins: s.wins,
      losses: s.losses,
      total: s.total,
      win_rate: s.total > 0 ? Math.round((s.wins / s.total) * 1000) / 1000 : 0
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
