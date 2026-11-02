"use client";

import { KEYS, SEED_KEY } from "./store";
import type { Episode, Project, ProjectScene } from "./types";

/** Locked character looks — copied verbatim into scene prompts for continuity. */
const ZARA =
  "Zara — 19, deep brown eyes, long black braid, faint ash mark on forehead, worn brown leather apron over indigo kurti, tool belt, small hammer, iron chain necklace";
const MINA =
  "Mina — 9, big brown eyes, two small braids with red thread, patchy pink woolen frock, wooden horse toy";
const MARO =
  "Maro — 60s, white beard, bent back, broken round glasses, patched golden-brown coat, map roll on back";
const KAEL =
  "Kael — 27, ash-grey Ashen Court uniform, scar on left cheek, sword with blue stone";
const SERAPHINA =
  "Seraphina — pale, black hair to waist, ash gown with live embers, thin black crown";
const DARIAN =
  "Darian — 22, golden-white royal clothes, no crown, thin gold chains on wrists";

const PHOTO =
  "photorealistic cinematic film still, real actors, natural skin texture, no cartoon look";

interface SeedScene {
  n: number;
  title: string;
  description: string;
  prompt: string;
  chars: string[];
  done?: boolean;
}

const EP1_SCENES: SeedScene[] = [
  {
    n: 1,
    title: "Broken sun over the village",
    description:
      "Act 1. Night. The dying fire-sun Suraj-Shola cracks in the sky; embers fall over the snowy village Thal. Maro's voice-over: the sun is dying, and a dying sun is the most dangerous.",
    prompt: `${PHOTO}: ultra-wide night sky filled with a dying fire-sun, cracks of light across its surface, golden embers falling like burning snow toward a tiny snowy village with one lit window below; slow tilt down, deep indigo palette with golden fire light.`,
    chars: [],
    done: true,
  },
  {
    n: 2,
    title: "Zara at the forge",
    description:
      "Act 1. Zara hammers hot iron at her forge at night, sparks on her face. Mina comes in with her wooden horse and tells her seven stars died tonight.",
    prompt: `${PHOTO}: close-up of a young blacksmith woman hammering glowing iron at a night forge, sparks flying across her face, forge fire flickering on skin; 50mm feel, shallow depth of field, warm practical lighting.`,
    chars: [ZARA, MINA],
    done: true,
  },
  {
    n: 3,
    title: "Maro and the ember chest",
    description:
      "Act 1. Snowy morning in the village chowk. Villagers seal a fallen ember in a wooden chest; Maro cleans his broken glasses and writes in his map — the sun is not breaking, it is scattering.",
    prompt: `${PHOTO}: snowy village square at blue hour, crowd blurred in background, an old man with broken round glasses and patched coat in foreground beside a wooden chest glowing through its cracks; cold blue morning light, visible breath, photorealistic snow and wood texture.`,
    chars: [MARO, ZARA],
    done: true,
  },
  {
    n: 4,
    title: "Home — Zara and Mina",
    description:
      "Act 1. Their small warm home: soup, the wooden horse, a flickering diya. The whole house suddenly shakes — the sky outside flares like day.",
    prompt: `${PHOTO}: warm humble interior lit only by an oil lamp and dying hearth, a young woman pouring soup for her little sister playing with a wooden horse; slow push-in, old clay pots and patched quilts, then a sudden bright flare through the window.`,
    chars: [ZARA, MINA],
    done: true,
  },
  {
    n: 5,
    title: "The ember crater",
    description:
      "Act 2. Behind the village, a smoking crater on a snowy slope. In its center an ember three times normal size, pulsing like a living heart. Zara steps toward it — it recognizes her.",
    prompt: `${PHOTO}: night, a smoking crater on a snowy slope, a huge ember pulsing golden light at its center; a young woman approaches, the light brightening with her steps; low-angle slow dolly-in, the ember as the only practical light source.`,
    chars: [ZARA],
    done: true,
  },
  {
    n: 6,
    title: "The ember chooses Zara",
    description:
      "Act 2. The episode's hero shot. The Last Ember sinks into Zara's chest — golden light pulsing under her skin. Mina watches from the slope: 'Api… there is a star inside you?'",
    prompt: `${PHOTO}: 360-degree slow orbit around a young woman on a snowy slope at night, golden light glowing beneath the skin of her chest like veins of light, beautiful not frightening; extreme close-up of the glow, snow sparkling in the light.`,
    chars: [ZARA, MINA],
    done: true,
  },
  {
    n: 7,
    title: "Maro's map",
    description:
      "Act 2. Maro's candlelit map room. He unrolls an ancient map showing a golden orb inside a human chest — the Aakhri Angara. It chose Zara, and the Court must never know.",
    prompt: `${PHOTO}: intimate two-shot in a candlelit room covered with old maps, an old man with broken glasses staring wide-eyed at golden light glowing through a young woman's shawl; only two light sources — candle and chest glow; insert of the ancient map with a golden orb drawn inside a human chest.`,
    chars: [ZARA, MARO],
    done: true,
  },
  {
    n: 8,
    title: "Quiet night",
    description:
      "Act 2. No dialogue for half the scene. Zara puts Mina to sleep; frost melts on the window, a dead hearth spark reignites by itself. The ember warms the house. Zara decides: tomorrow she will tell the village.",
    prompt: `${PHOTO}: very quiet night interior, macro shots — frost melting on window glass, a spark flaring alive in a cold hearth, a sleeping child at peace; no dialogue, only sound design; soft golden light breathing through the room.`,
    chars: [ZARA, MINA],
    done: true,
  },
  {
    n: 9,
    title: "Zara lights the chowk brazier",
    description:
      "Act 2. Morning crowd in the chowk. Zara drops her shawl, lays her hands on the great dead brazier, and it ignites — fire the Court did not give. At the back, a veiled traveler with an Ashen Court mark sends a black pigeon toward Aksabad.",
    prompt: `${PHOTO}: misty morning village square, a crowd gathered around a young woman whose hands pour golden light into a great iron brazier that bursts into flame; wide to medium slow push-in, real reactions — wonder, hope, tears; at the back a veiled spy adjusting a Court mark on his wrist.`,
    chars: [ZARA, MINA, MARO],
  },
  {
    n: 10,
    title: "Seraphina's court",
    description:
      "Act 3. The Darbar-e-Raakh above the clouds: white stone, golden arches, hundreds of embers trapped in glass under the floor. Queen Seraphina, calm and curious, summons Kael. Prince Darian watches the clouds.",
    prompt: `${PHOTO}: symmetrical wide shot of a majestic hall above the clouds, white stone and golden arches, embers glowing in glass beneath the floor; a pale queen with black hair to her waist and a thin black crown sits calm on her throne — no anger, only curiosity, which is more frightening; a young prince soft-focus by a window.`,
    chars: [SERAPHINA, DARIAN],
  },
  {
    n: 11,
    title: "The gate falls",
    description:
      "Act 3. Snow falls. The village gate doesn't get knocked — it falls in one blow. Ashen Court soldiers march in with glass ember-chests, led by Kael, who glances back at the fallen gate like he disapproves of the method.",
    prompt: `${PHOTO}: low-angle shot of soldiers in ash-grey uniforms marching through a smashed wooden village gate in falling snow, glass chests in their hands, snow kicking up at their boots; foreground — their commander Kael and the fallen gate; background — villagers; sound of wood breaking, then total silence.`,
    chars: [KAEL, ZARA],
  },
  {
    n: 12,
    title: "Standoff — Zara vs Kael",
    description:
      "Act 3. Zara steps forward, hiding Mina behind Maro. Between her and Kael only the burning brazier. She draws her hammer. A soldier lunges — Kael's hand shoots up: 'RUKO! No one gets hurt.'",
    prompt: `${PHOTO}: tense two-shot — a young woman with a blacksmith's hammer and a uniformed commander at opposite edges of the frame, a burning brazier between them; alternating close-ups: hammer, fingers tightening on a sword hilt with a blue stone, a frightened child's eyes; cold daylight, shallow focus.`,
    chars: [ZARA, KAEL, MINA],
  },
  {
    n: 13,
    title: "The house burns",
    description:
      "Act 3. A soldier filling a chest knocks over Zara's home lamp — fire catches the wooden wall. Mina is inside, gone back for her wooden horse. Zara breaks the door down with her shoulder; Mina crawls toward the light in Zara's chest.",
    prompt: `${PHOTO}: handheld, fast cuts, one action per shot — a wooden house catching fire in a snowy village, smoke and sparks, a young woman smashing through the door and carrying a small child out as the roof collapses behind them; fire photorealistic: smoke first, flames after; the golden chest-glow the clearest thing in the smoke.`,
    chars: [ZARA, MINA],
  },
  {
    n: 14,
    title: "Escape through the tunnel",
    description:
      "Act 3. A secret tunnel under the forge known only to Maro's maps. Zara carries Mina, Maro shoulders his map roll. At the tunnel mouth Zara looks back: Thal burns, and Kael watches her go — lowering his sword, sending his soldiers the wrong way.",
    prompt: `${PHOTO}: inside a dark damp tunnel lit only by golden light from a young woman's chest behind the camera, wet stone walls; final shot — close-up of commander Kael at the tunnel mouth, his face showing decision and burden, lowering his sword and waving his soldiers away.`,
    chars: [ZARA, MINA, MARO, KAEL],
  },
  {
    n: 15,
    title: "The snowy valley",
    description:
      "Act 4. A white valley to the horizon. Three small shadows — Zara, Mina, Maro — wade through knee-deep snow. Zara warms Mina's blue lips with the ember's heat. Behind them in the mist: black dots — riders in pursuit.",
    prompt: `${PHOTO}: long-lens compression, three small travelers in the foreground of an endless white valley, riders as black dots in the mist behind; frost on clothes, visible breath, red noses; the ember's warmth only a faint gold in close shots.`,
    chars: [ZARA, MINA, MARO],
  },
  {
    n: 16,
    title: "Ruins ambush",
    description:
      "Act 4. Ruins of an old shrine. Zara melts a frozen aqueduct with the ember's heat and floods the riders' path. A soldier raises his sword at Zara — and the blade stops mid-air: Kael holds his own sword against his soldier's.",
    prompt: `${PHOTO}: action kept physical and clean — a young woman pressing her hands to an ice-filled channel, a sudden rush of meltwater toppling a horse; a commander's sword blocking his own soldier's blade; snow, mud and water with real weight; a proud child watching from hiding.`,
    chars: [ZARA, KAEL, MINA, MARO],
  },
  {
    n: 17,
    title: "The quiet talk",
    description:
      "Act 4. The episode's quietest two-shot. Kael sends his soldiers back and talks to Zara by a small fire — his village went cold seven years ago, and he has obeyed orders ever since. Tonight he will lead them into the wrong valley. One night. Only one.",
    prompt: `${PHOTO}: the quietest two-shot of the episode — over-the-shoulder alternation between a tired commander and a young woman by a small dying fire in ancient ruins; natural cold light, faint warmth between them; small expressions, held breaths, no raised voices.`,
    chars: [ZARA, KAEL],
  },
  {
    n: 18,
    title: "Campfire and the map's end",
    description:
      "Act 4. Night camp: two blankets, Maro's maps, a fire Zara lights and kills with a gesture as she learns. Maro opens his oldest map — the mark beyond the bridge. 'Only one went there and came back. Your mother.'",
    prompt: `${PHOTO}: night camp lit only by firelight, soft flicker on faces; a young woman practicing lighting and killing the flame with a hand gesture; insert of a hand-drawn ancient map, a golden line running past the bridge; everything breathes, no freeze-frame moments.`,
    chars: [ZARA, MINA, MARO],
  },
  {
    n: 19,
    title: "The old bridge",
    description:
      "Act 5. A rope-and-wood bridge creaking over a cloud-filled abyss. Halfway across, the Queen's own silent hunters arrive — their leader hurls a glass net that pulls at the ember in Zara's chest.",
    prompt: `${PHOTO}: vertigo wide shot of an ancient rope bridge over a bottomless cloud-filled gorge; tight framing — trembling hands on ropes, a child's squeezed-shut eyes; a beautiful, terrifying glass net spinning slowly through the air toward a young woman; only three faces in the foreground.`,
    chars: [ZARA, MINA, MARO],
  },
  {
    n: 20,
    title: "Kael's choice",
    description:
      "Act 5. The net drags at Zara's light, her knees buckle — then a sword cuts the net's rope: Kael, running onto the bridge. He doesn't raise his sword at the hunters; he stands at the bridge rope and offers Zara his hand. 'Cut it!'",
    prompt: `${PHOTO}: grounded hero entry — no slow-motion pose, a breathless commander sprinting across a swaying rope bridge in snow, slicing a glass net's rope; close-up of two hands meeting — the first trust; he lays his sword on the bridge's mooring rope and looks at her. 'Cut it!'`,
    chars: [ZARA, KAEL, MINA, MARO],
  },
  {
    n: 21,
    title: "The bridge breaks",
    description:
      "Act 5. The rope is cut; the bridge swings into the abyss with the hunters behind. Kael leaps to the rocky slope at the last moment, shoulder wounded — and Zara's warmth eases his wound. Beyond the ridge: a colossal stone door carved with fire — the Burning Gate.",
    prompt: `${PHOTO}: long silent wide shot after the bridge falls — a small, exhausted victory, no spectacle; close-up of golden light easing a wounded shoulder, soft and gentle, no laser effect; then a colossal stone door carved with fire revealed in the first morning light beyond the ridge.`,
    chars: [ZARA, KAEL, MINA, MARO],
  },
  {
    n: 22,
    title: "The Queen wakes",
    description:
      "Act 5 — cliffhanger. Night in the Darbar-e-Raakh. A wounded black crow falls through the window, Thal's ash on its wing and a tiny golden mark. Seraphina smiles, touches the great empty globe — and inside it, a spark ignites by itself.",
    prompt: `${PHOTO}: night court of cold white stone, one golden mark glowing brightest; slow push-in close-up of a pale queen smiling very quietly; a prince's reaction in a single shot — a question left for the next episodes; inside a great glass globe, a tiny spark ignites on its own; smash cut to black.`,
    chars: [SERAPHINA, DARIAN],
  },
];

const EPISODES: { title: string; synopsis: string }[] = [
  {
    title: "Chunao aur Faraar",
    synopsis:
      "The dying fire-sun sheds its Last Ember over Thal; the ember chooses Zara. The Ashen Court raids, her home burns, and the chase begins across the snowy valley — ending at the Burning Gate.",
  },
  {
    title: "Sheeshe Ki Registan",
    synopsis:
      "Zara, Mina aur Kael Sheeshe ke registan ko paar karke Maro ke paas pohanchte hain, magar registan har musafir ko uska sab se dardnaak manzar dikhata hai.",
  },
  {
    title: "Woh Gaon Jo Bhool Gaya",
    synopsis:
      "Ek aisa gaon jahan kisi ko aag yaad hi nahi — wahan Zara ko apna sab se mushkil intekhaab karna padta hai: roshni baantna ya chhupana.",
  },
  {
    title: "Suraj-Shola Ka Raaz",
    synopsis:
      "Zameen ke neeche dafan Pehli Bhatti me Zara ko sach pata chalta hai: Suraj-Shola kudrat se nahi toota — use tora gaya tha, aur tornay wala koi aur nahi.",
  },
  {
    title: "Malika Ka Mansooba",
    synopsis:
      "Mina ko bachane ki koshish me Zara khud Aksabad pohanchti hai, jahan Seraphina use dushman nahi — waaris banne ki peshkash karti hai, aur apna asal, khaufnaak mansooba kholti hai.",
  },
  {
    title: "Aksabad Par Hamla",
    synopsis:
      "Nau gaon ka ittehaad Aksabad par charhta hai — magar nakli Suraj har hamlaawar ki roshni pee raha hai, aur jeet ke liye kisi ko woh qeemat deni hogi jo wapas nahi aati.",
  },
  {
    title: "Qurbaniyon Ki Raat",
    synopsis:
      "Aksabad jal raha hai, nakli Suraj bebas hai aur har kirdaar ko apni sab se azeez cheez deni padti hai — is se pehle ke Zara woh qadam uthaye jahan se wapsi nahi.",
  },
  {
    title: "Aakhri Faisla",
    synopsis:
      "Golay ke andar Zara ko har woh zindagi dikhai deti hai jo uske faisle se badlegi — aur duniya ko naya Suraj tabhi milta hai jab koi apna angara rakhne ke bajaye use jaane de.",
  },
];

function now(): string {
  return new Date().toISOString();
}

/**
 * Seed the "Aakhri Angara" series project on first load.
 * Idempotent — guarded by the SEED_KEY marker. Safe to call on every mount.
 */
export function seedSeriesProjects(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(SEED_KEY)) return false;

    const project: Project = {
      id: "aakhri-angara",
      name: "Aakhri Angara",
      description:
        "8-episode AI fantasy series in the world of Naurang — the dying fire-sun Suraj-Shola, the floating capital Aksabad, and Zara, chosen by the Last Ember.",
      style: "Cinematic photorealistic (Mythra Films style)",
      created_at: now(),
    };

    const episodes: Episode[] = EPISODES.map((e, i) => ({
      id: `aakhri-angara-ep${i + 1}`,
      projectId: project.id,
      number: i + 1,
      title: e.title,
      synopsis: e.synopsis,
      created_at: now(),
    }));

    const scenes: ProjectScene[] = EP1_SCENES.map((s) => ({
      id: `aakhri-angara-ep1-s${s.n}`,
      episodeId: "aakhri-angara-ep1",
      number: s.n,
      title: s.title,
      description: s.description,
      prompt: s.prompt,
      characterRefs: s.chars,
      startFrameId: null,
      startFrameThumb: null,
      settings: { model: "ltx", duration: 8, aspect: "16:9" },
      status: s.done ? "done" : "pending",
      jobId: null,
      clipId: null,
      notes: "",
      created_at: now(),
    }));

    localStorage.setItem(KEYS.projects, JSON.stringify([project]));
    localStorage.setItem(KEYS.episodes, JSON.stringify(episodes));
    localStorage.setItem(KEYS.projectScenes, JSON.stringify(scenes));
    localStorage.setItem(SEED_KEY, "1");
    return true;
  } catch (e) {
    console.warn("series seed failed:", e);
    return false;
  }
}

/** IndexedDB key for a project scene's start-frame image blob. */
export const sceneStartFrameKey = (sceneId: string) => `scenestartframe:${sceneId}`;
