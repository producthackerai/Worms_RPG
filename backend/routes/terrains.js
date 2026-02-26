import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /api/terrains — browse community terrains
router.get('/', async (req, res) => {
  try {
    const { sort = 'newest', limit = 20, offset = 0, search } = req.query;

    let query = supabase
      .from('tc_worms_terrains')
      .select('*')
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (sort === 'popular') {
      query = query.order('plays', { ascending: false });
    } else if (sort === 'top') {
      // We'll sort by vote count client-side or use a computed field
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: terrains, error } = await query;
    if (error) throw error;

    // Get vote scores for these terrains
    const terrainIds = terrains.map(t => t.id);
    let votesMap = {};
    let userVotes = {};

    if (terrainIds.length > 0) {
      const { data: votes } = await supabase
        .from('tc_worms_terrain_votes')
        .select('terrain_id, vote')
        .in('terrain_id', terrainIds);

      if (votes) {
        for (const v of votes) {
          votesMap[v.terrain_id] = (votesMap[v.terrain_id] || 0) + v.vote;
        }
      }

      // Get current user's votes if authenticated
      if (req.user) {
        const { data: myVotes } = await supabase
          .from('tc_worms_terrain_votes')
          .select('terrain_id, vote')
          .eq('user_id', req.user.id)
          .in('terrain_id', terrainIds);

        if (myVotes) {
          for (const v of myVotes) {
            userVotes[v.terrain_id] = v.vote;
          }
        }
      }
    }

    // Get author display names
    const userIds = [...new Set(terrains.map(t => t.user_id).filter(Boolean))];
    let authorNames = {};
    if (userIds.length > 0) {
      const { data: prefs } = await supabase
        .from('tc_user_preferences')
        .select('user_id, display_name')
        .in('user_id', userIds);

      if (prefs) {
        for (const p of prefs) {
          authorNames[p.user_id] = p.display_name;
        }
      }
    }

    const result = terrains.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      user_id: t.user_id,
      author_name: authorNames[t.user_id] || 'Anonymous',
      terrain_type: t.terrain_type,
      terrain_config: t.terrain_config,
      plays: t.plays,
      vote_score: votesMap[t.id] || 0,
      user_vote: userVotes[t.id] || null,
      preview_url: t.preview_url,
      created_at: t.created_at
    }));

    // Sort by votes if requested
    if (sort === 'top') {
      result.sort((a, b) => b.vote_score - a.vote_score);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching terrains:', error);
    res.status(500).json({ error: 'Failed to fetch terrains' });
  }
});

// GET /api/terrains/:id — single terrain
router.get('/:id', async (req, res) => {
  try {
    const { data: terrain, error } = await supabase
      .from('tc_worms_terrains')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !terrain) {
      return res.status(404).json({ error: 'Terrain not found' });
    }

    // Get vote score
    const { data: votes } = await supabase
      .from('tc_worms_terrain_votes')
      .select('vote')
      .eq('terrain_id', terrain.id);

    const vote_score = votes ? votes.reduce((sum, v) => sum + v.vote, 0) : 0;

    let user_vote = null;
    if (req.user) {
      const { data: myVote } = await supabase
        .from('tc_worms_terrain_votes')
        .select('vote')
        .eq('user_id', req.user.id)
        .eq('terrain_id', terrain.id)
        .single();
      user_vote = myVote?.vote || null;
    }

    // Author name
    let author_name = 'Anonymous';
    if (terrain.user_id) {
      const { data: pref } = await supabase
        .from('tc_user_preferences')
        .select('display_name')
        .eq('user_id', terrain.user_id)
        .single();
      author_name = pref?.display_name || 'Anonymous';
    }

    res.json({
      ...terrain,
      author_name,
      vote_score,
      user_vote
    });
  } catch (error) {
    console.error('Error fetching terrain:', error);
    res.status(500).json({ error: 'Failed to fetch terrain' });
  }
});

// POST /api/terrains — save a terrain
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, terrain_type, terrain_config, preview_url } = req.body;

    if (!name || !terrain_config) {
      return res.status(400).json({ error: 'Name and terrain_config are required' });
    }

    const { data, error } = await supabase
      .from('tc_worms_terrains')
      .insert({
        user_id: req.user.id,
        name,
        description: description || '',
        terrain_type: terrain_type || 'custom',
        terrain_config,
        preview_url: preview_url || null
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error saving terrain:', error);
    res.status(500).json({ error: 'Failed to save terrain' });
  }
});

// PUT /api/terrains/:id — update own terrain
router.put('/:id', requireAuth, async (req, res) => {
  try {
    // Verify ownership
    const { data: existing } = await supabase
      .from('tc_worms_terrains')
      .select('user_id')
      .eq('id', req.params.id)
      .single();

    if (!existing || existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { name, description, terrain_config, preview_url } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (terrain_config !== undefined) updates.terrain_config = terrain_config;
    if (preview_url !== undefined) updates.preview_url = preview_url;

    const { data, error } = await supabase
      .from('tc_worms_terrains')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating terrain:', error);
    res.status(500).json({ error: 'Failed to update terrain' });
  }
});

// DELETE /api/terrains/:id — delete own terrain
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('tc_worms_terrains')
      .select('user_id')
      .eq('id', req.params.id)
      .single();

    if (!existing || existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { error } = await supabase
      .from('tc_worms_terrains')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting terrain:', error);
    res.status(500).json({ error: 'Failed to delete terrain' });
  }
});

// POST /api/terrains/:id/vote — upvote/downvote (toggle)
router.post('/:id/vote', requireAuth, async (req, res) => {
  try {
    const { vote } = req.body; // 1 or -1
    if (vote !== 1 && vote !== -1) {
      return res.status(400).json({ error: 'Vote must be 1 or -1' });
    }

    // Check existing vote
    const { data: existing } = await supabase
      .from('tc_worms_terrain_votes')
      .select('vote')
      .eq('user_id', req.user.id)
      .eq('terrain_id', req.params.id)
      .single();

    if (existing) {
      if (existing.vote === vote) {
        // Same vote — remove it (toggle off)
        await supabase
          .from('tc_worms_terrain_votes')
          .delete()
          .eq('user_id', req.user.id)
          .eq('terrain_id', req.params.id);
        return res.json({ vote: null });
      } else {
        // Different vote — update
        await supabase
          .from('tc_worms_terrain_votes')
          .update({ vote })
          .eq('user_id', req.user.id)
          .eq('terrain_id', req.params.id);
        return res.json({ vote });
      }
    }

    // New vote
    const { error } = await supabase
      .from('tc_worms_terrain_votes')
      .insert({
        user_id: req.user.id,
        terrain_id: req.params.id,
        vote
      });

    if (error) throw error;
    res.json({ vote });
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// POST /api/terrains/:id/play — increment play count
router.post('/:id/play', async (req, res) => {
  try {
    const { data: terrain } = await supabase
      .from('tc_worms_terrains')
      .select('plays')
      .eq('id', req.params.id)
      .single();

    if (!terrain) {
      return res.status(404).json({ error: 'Terrain not found' });
    }

    await supabase
      .from('tc_worms_terrains')
      .update({ plays: (terrain.plays || 0) + 1 })
      .eq('id', req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error incrementing plays:', error);
    res.status(500).json({ error: 'Failed to record play' });
  }
});

export default router;
