import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

// Lazy init — env vars may not be loaded yet at import time
let anthropic;
function getClient() {
  if (!anthropic) anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

// Weapon data (mirrors game.js WEAPONS constant)
const WEAPONS = {
  bazooka: { name: 'Bazooka', blastRadius: 32, damage: 45, speed: 8, affectedByWind: true, bounces: 0, type: 'projectile', ammo: 'Unlimited', description: 'Reliable rocket with good range and damage. Affected by wind.' },
  grenade: { name: 'Grenade', blastRadius: 28, damage: 40, speed: 7, affectedByWind: false, bounces: 3, fuse: '3s', type: 'projectile', ammo: 'Unlimited', description: 'Bounces before exploding. Tricky but powerful.' },
  shotgun: { name: 'Shotgun', blastRadius: 12, damage: 25, speed: 12, affectedByWind: false, pellets: 2, type: 'projectile', ammo: 'Unlimited', description: 'Short range, high damage. Fires 2 pellets.' },
  holyGrenade: { name: 'Holy Grenade', blastRadius: 65, damage: 80, speed: 6, affectedByWind: false, bounces: 1, fuse: '4s', type: 'projectile', ammo: '1 per team', description: 'Massive blast radius. Handle with prayer.' },
  bananaBomb: { name: 'Banana Bomb', blastRadius: 24, damage: 30, speed: 7, affectedByWind: true, bounces: 2, fuse: '3s', cluster: 5, type: 'projectile', ammo: '2 per team', description: 'Splits into 5 cluster bombs on impact.' },
  airstrike: { name: 'Airstrike', blastRadius: 22, damage: 35, missiles: 5, type: 'airstrike', ammo: '1 per team', description: 'Tap a target location. 5 bombs rain from above.' },
  dynamite: { name: 'Dynamite', blastRadius: 55, damage: 75, speed: 0, fuse: '3s', type: 'placement', ammo: '2 per team', description: 'Drop at your feet for a massive explosion. Run away!' },
  sniper: { name: 'Sniper', blastRadius: 8, damage: 50, speed: 25, affectedByWind: false, type: 'projectile', ammo: '3 per team', description: 'Ultra-fast precision shot. Ignores wind.' }
};

const GAME_RULES = {
  controls: 'Drag from your worm to aim and set power. Release to fire. Use arrow buttons to walk. Tap JUMP to hop.',
  wind: 'Wind affects bazooka and banana bomb trajectories. Wind direction/strength shown in top bar. Changes slightly each turn.',
  fall_damage: 'Falling from heights causes damage. Threshold is 40 pixels — damage = (fall_distance - 40) * 0.8.',
  water: 'Water is instant death! Worms that fall below the water line (y=760) are immediately killed.',
  turn_timer: '30 seconds per turn. If time runs out, your turn ends (even without shooting).',
  teams: '3 worms per team. Teams alternate turns. Cycle through your worms each turn.',
  game_modes: '2 Player (local hotseat) or vs Computer (AI opponent).',
  terrains: 'Green Hills (classic), Volcanic Peaks (sharp peaks with lava), Frozen Valleys (ice ridges), Alien Floaters (floating islands with gaps).',
  terrain_builder: 'Custom terrain builder available — create your own maps with drawing tools, stamps, and height presets.'
};

// Chat tools definitions
const tools = [
  {
    name: 'generate_terrain_heights',
    description: 'Generate terrain height values from parameters. Returns an array of 1600 height values (one per pixel column). Use waves for rolling hills, plateaus for flat areas, and noise for roughness.',
    input_schema: {
      type: 'object',
      properties: {
        base_y: { type: 'number', description: 'Base height (0=top, 800=bottom). Default ~440 for mid-terrain.' },
        waves: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              frequency: { type: 'number', description: 'Wave frequency (0.001=very wide, 0.05=narrow)' },
              amplitude: { type: 'number', description: 'Wave height in pixels (10=subtle, 100=dramatic)' },
              offset: { type: 'number', description: 'Phase offset (0 to 2*PI)' }
            },
            required: ['frequency', 'amplitude']
          },
          description: 'Sine waves to shape the terrain'
        },
        plateaus: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: { type: 'number', description: 'Start x position (0-1600)' },
              end: { type: 'number', description: 'End x position (0-1600)' },
              height: { type: 'number', description: 'Y position of plateau surface' }
            },
            required: ['start', 'end', 'height']
          },
          description: 'Flat plateaus at specific positions'
        },
        noise_level: { type: 'number', description: 'Random noise amount (0=smooth, 30=rough)' }
      },
      required: ['base_y']
    }
  },
  {
    name: 'add_terrain_feature',
    description: 'Add a feature to the terrain: canyon, bridge, tunnel, or floating platform. Returns a modification object to apply to the terrain config.',
    input_schema: {
      type: 'object',
      properties: {
        feature_type: {
          type: 'string',
          enum: ['canyon', 'bridge', 'tunnel', 'platform'],
          description: 'Type of feature to add'
        },
        x: { type: 'number', description: 'Center X position (0-1600)' },
        y: { type: 'number', description: 'Center Y position (0-800)' },
        width: { type: 'number', description: 'Width of the feature' },
        height: { type: 'number', description: 'Height/depth of the feature' }
      },
      required: ['feature_type', 'x', 'width']
    }
  },
  {
    name: 'set_terrain_theme',
    description: 'Set the visual theme for a terrain. Returns theme configuration.',
    input_schema: {
      type: 'object',
      properties: {
        theme: {
          type: 'string',
          enum: ['greenHills', 'volcanicPeaks', 'frozenValleys', 'alienFloaters', 'desert', 'moonscape'],
          description: 'Visual theme for the terrain'
        }
      },
      required: ['theme']
    }
  },
  {
    name: 'get_weapon_info',
    description: 'Get stats and information about a weapon or all weapons.',
    input_schema: {
      type: 'object',
      properties: {
        weapon: {
          type: 'string',
          description: 'Weapon key (e.g. "bazooka", "holyGrenade") or "all" for all weapons'
        }
      },
      required: ['weapon']
    }
  },
  {
    name: 'get_game_rules',
    description: 'Get game rules and mechanics information.',
    input_schema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Specific topic (controls, wind, fall_damage, water, turn_timer, teams, terrains, terrain_builder) or "all"'
        }
      },
      required: ['topic']
    }
  },
  {
    name: 'analyze_situation',
    description: 'Analyze a game situation and suggest strategy. Requires current game state data.',
    input_schema: {
      type: 'object',
      properties: {
        active_worm: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            hp: { type: 'number' },
            team: { type: 'number' }
          },
          description: 'Active worm position and stats'
        },
        enemies: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              hp: { type: 'number' }
            }
          },
          description: 'Enemy worm positions'
        },
        wind: { type: 'number', description: 'Current wind value (-8 to 8)' },
        terrain_type: { type: 'string', description: 'Current terrain type' },
        available_weapons: {
          type: 'object',
          description: 'Weapon ammo counts'
        }
      },
      required: ['active_worm', 'enemies', 'wind']
    }
  }
];

// Tool implementations
function executeGenerateTerrainHeights({ base_y, waves, plateaus, noise_level }) {
  const heights = new Array(1600);
  for (let x = 0; x < 1600; x++) {
    let h = base_y || 440;
    for (const wave of (waves || [])) {
      h += Math.sin(x * wave.frequency + (wave.offset || 0)) * wave.amplitude;
    }
    if (noise_level) h += (Math.random() - 0.5) * noise_level;
    heights[x] = Math.max(100, Math.min(750, Math.round(h)));
  }
  for (const p of (plateaus || [])) {
    for (let x = p.start; x < Math.min(p.end, 1600); x++) {
      if (x >= 0) heights[x] = p.height;
    }
  }
  return { heights, description: `Generated terrain with base_y=${base_y}, ${(waves || []).length} waves, ${(plateaus || []).length} plateaus` };
}

function executeAddTerrainFeature({ feature_type, x, y, width, height }) {
  const modifications = [];
  switch (feature_type) {
    case 'canyon':
      modifications.push({ type: 'rect', x: x - width / 2, y: (y || 300), w: width, h: height || 300, fill: 0 });
      break;
    case 'bridge':
      modifications.push({ type: 'rect', x: x - width / 2, y: (y || 350), w: width, h: height || 12, fill: 1 });
      break;
    case 'tunnel':
      modifications.push({ type: 'circle', x, y: y || 500, r: (height || width) / 2, fill: 0 });
      break;
    case 'platform':
      modifications.push({ type: 'rect', x: x - width / 2, y: y || 250, w: width, h: height || 15, fill: 1 });
      break;
  }
  return { modifications, description: `Added ${feature_type} at x=${x}` };
}

function executeSetTerrainTheme({ theme }) {
  const themes = {
    greenHills: { name: 'Green Hills', sky: 'dark blue gradient', ground: 'green grass/brown dirt', water: 'blue' },
    volcanicPeaks: { name: 'Volcanic Peaks', sky: 'dark red gradient', ground: 'grey rock/dark brown', water: 'lava orange' },
    frozenValleys: { name: 'Frozen Valleys', sky: 'pale blue gradient', ground: 'white ice/light blue', water: 'dark teal' },
    alienFloaters: { name: 'Alien Floaters', sky: 'deep space purple', ground: 'purple/magenta', water: 'acid green' },
    desert: { name: 'Desert', sky: 'orange sunset gradient', ground: 'sandy tan', water: 'oasis blue' },
    moonscape: { name: 'Moonscape', sky: 'black space', ground: 'grey crater', water: 'none (void)' }
  };
  return { theme, config: themes[theme] || themes.greenHills, description: `Theme set to ${theme}` };
}

function executeGetWeaponInfo({ weapon }) {
  if (weapon === 'all') return WEAPONS;
  return WEAPONS[weapon] || { error: `Unknown weapon: ${weapon}. Available: ${Object.keys(WEAPONS).join(', ')}` };
}

function executeGetGameRules({ topic }) {
  if (topic === 'all') return GAME_RULES;
  return GAME_RULES[topic] || { error: `Unknown topic: ${topic}. Available: ${Object.keys(GAME_RULES).join(', ')}` };
}

function executeAnalyzeSituation({ active_worm, enemies, wind, terrain_type, available_weapons }) {
  if (!enemies || enemies.length === 0) {
    return { suggestion: 'No enemies visible. Skip turn or use time to reposition.' };
  }

  // Find nearest and weakest enemies
  const withDist = enemies.map(e => ({
    ...e,
    dist: Math.sqrt((e.x - active_worm.x) ** 2 + (e.y - active_worm.y) ** 2)
  }));
  withDist.sort((a, b) => a.dist - b.dist);

  const nearest = withDist[0];
  const weakest = [...withDist].sort((a, b) => a.hp - b.hp)[0];

  const suggestions = [];

  if (nearest.dist < 80) {
    suggestions.push(`Nearest enemy is very close (${Math.round(nearest.dist)}px). Consider Dynamite or Shotgun for close-range damage.`);
  } else if (nearest.dist < 300) {
    suggestions.push(`Nearest enemy is at medium range (${Math.round(nearest.dist)}px). Bazooka or Grenade would work well.`);
    if (Math.abs(wind) > 3) {
      suggestions.push(`Wind is ${wind > 0 ? 'rightward' : 'leftward'} at ${Math.abs(wind).toFixed(1)}. Compensate your aim ${wind > 0 ? 'left' : 'right'} when using wind-affected weapons.`);
    }
  } else {
    suggestions.push(`Nearest enemy is far (${Math.round(nearest.dist)}px). Consider Airstrike or Sniper for long range.`);
  }

  if (weakest.hp <= 25) {
    suggestions.push(`Enemy at (${Math.round(weakest.x)}, ${Math.round(weakest.y)}) has only ${weakest.hp} HP — even a Shotgun could finish them!`);
  }

  if (active_worm.y > 650) {
    suggestions.push('Warning: You are close to the water! Be careful with knockback from explosions.');
  }

  return { suggestions, nearest_enemy_dist: nearest.dist, wind_advice: Math.abs(wind) > 2 ? `Compensate for ${wind > 0 ? 'rightward' : 'leftward'} wind` : 'Wind is calm' };
}

function executeTool(name, input) {
  switch (name) {
    case 'generate_terrain_heights': return executeGenerateTerrainHeights(input);
    case 'add_terrain_feature': return executeAddTerrainFeature(input);
    case 'set_terrain_theme': return executeSetTerrainTheme(input);
    case 'get_weapon_info': return executeGetWeaponInfo(input);
    case 'get_game_rules': return executeGetGameRules(input);
    case 'analyze_situation': return executeAnalyzeSituation(input);
    default: return { error: `Unknown tool: ${name}` };
  }
}

const SYSTEM_PROMPT = `You are the WORMS! Game Assistant — a helpful AI that knows everything about the Worms artillery game.

You have two modes:

**Terrain Architect Mode**: When users ask about terrain, map design, or want to create/modify terrains, help them design terrain using your tools. You can generate height maps, add features like canyons/bridges/tunnels/platforms, and set visual themes.

**Battle Advisor Mode**: When users ask about gameplay, weapons, strategy, or need help during a match, provide tactical advice. Use your tools to look up weapon stats, game rules, and analyze combat situations.

The game has:
- 4 terrain types: Green Hills, Volcanic Peaks, Frozen Valleys, Alien Floaters
- 8 weapons: Bazooka, Grenade, Shotgun, Holy Grenade, Banana Bomb, Airstrike, Dynamite, Sniper
- Custom terrain builder with drawing tools, height presets, and stamps
- 3 worms per team, 30-second turns, wind affects some projectiles
- Water is instant death, falling causes damage

Be concise, fun, and game-themed in your responses. Use weapon emojis when mentioning them.`;

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { message, history, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messages = [];

    // Add history
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    // Add context as part of user message if provided
    let userMessage = message;
    if (context) {
      userMessage = `[Game context: ${JSON.stringify(context)}]\n\n${message}`;
    }

    messages.push({ role: 'user', content: userMessage });

    let toolsUsed = [];

    // Tool-use loop (max 5 iterations)
    let response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages
    });

    let iterations = 0;
    while (response.stop_reason === 'tool_use' && iterations < 5) {
      iterations++;

      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      const toolResults = [];

      for (const toolUse of toolUseBlocks) {
        const result = executeTool(toolUse.name, toolUse.input);
        toolsUsed.push(toolUse.name);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        });
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await getClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools,
        messages
      });
    }

    // Extract text response
    const textBlocks = response.content.filter(b => b.type === 'text');
    const responseText = textBlocks.map(b => b.text).join('\n');

    // Extract any terrain data from tool results for the frontend
    let terrainData = null;
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = executeTool(block.name, block.input);
        if (result.heights) terrainData = result;
        if (result.modifications) {
          if (!terrainData) terrainData = {};
          terrainData.modifications = [...(terrainData.modifications || []), ...result.modifications];
        }
        if (result.theme) {
          if (!terrainData) terrainData = {};
          terrainData.theme = result.theme;
        }
      }
    }

    res.json({
      response: responseText,
      toolsUsed: [...new Set(toolsUsed)],
      terrainData
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat request failed' });
  }
});

export default router;
