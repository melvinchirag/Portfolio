/* ============================================================================
 * work.ts — the projects shown on the Work page
 * ----------------------------------------------------------------------------
 * SEPARATE from `projects.ts` on purpose. `projects.ts` holds the THREE curated
 * cards the hero's Present frame renders (it maps over every entry, so adding a
 * fourth would silently break that layout, tuned to exactly three). The Work
 * page needs a richer shape and ALL of Melvin's projects, so the two live apart.
 *
 * TAGS are ids from the canonical registry in `tags.ts`, never free strings —
 * that is what lets search reliably group "everything that used React". Tags are
 * the SEARCHABLE, identifying few (languages + notable frameworks + discipline +
 * purpose); the full tech stack lives in the write-up, not the tag row.
 *
 * `category` is the SECTION (flagship / hackathon / personal). Inside Personal,
 * projects are further grouped by their PURPOSE tag (domainExpansion /
 * skillBuilding / forFun) — see Work.tsx.
 *
 * `detail` is a list of blocks (optional heading + paragraphs + labelled points)
 * so a case study can have real structure instead of one wall of text.
 *
 * Copy is in Melvin's voice (see the melvin-voice skill): short, concrete, no
 * em-dashes. `tentative: true` still marks placeholder copy; `href: ''` renders
 * a link dimmed and non-clickable.
 * ========================================================================= */

import type { TagId } from './tags'

export type ProjectLink = { label: string; href: string }

/** One block of a project write-up: an optional heading, paragraphs, and/or a
 *  list of labelled points (label is the bolded lead-in, e.g. "Black hole lab"). */
export type DetailBlock = {
  heading?: string
  body?: string[]
  points?: { label?: string; text: string }[]
}

export type WorkProject = {
  /** Stable key for React lists and search anchors. */
  id: string
  name: string
  /** Which section the project sits in. */
  category: 'flagship' | 'hackathon' | 'personal'
  /** Short status chip, e.g. 'In Progress' / 'Winner' / 'Live'. */
  status?: string
  /** One or two sentences shown at the top of the expanded row. */
  blurb: string
  /** Tags — ids from the registry, spanning discipline / tech / purpose. */
  tags: TagId[]
  role?: string
  /** Structured write-up. */
  detail?: DetailBlock[]
  /** The tech stack, shown as its own bolded section (Melvin's rule: tags alone
   *  don't convey the real stack, so every project gets an explicit list). */
  stack?: string[]
  // Hackathon-specific metadata.
  event?: string
  award?: string
  team?: string
  /** Repo / demo / devpost / live links. Empty href → dimmed placeholder. */
  links?: ProjectLink[]
  /** Paths under /public. Absent → a "coming" placeholder is shown. */
  media?: { images?: string[]; video?: string }
  /** True while the copy is a placeholder awaiting real details. */
  tentative?: boolean
}

export const WORK_PROJECTS: WorkProject[] = [
  // ── FLAGSHIP ───────────────────────────────────────────────────────────────
  {
    id: 'osiris',
    name: 'Osiris',
    category: 'flagship',
    status: 'Confidential',
    // Deliberately minimal, NOT a placeholder. Osiris is a possible startup, so
    // the details stay private until there is an NDA and a patent. Do not expand
    // this with confidential specifics.
    blurb:
      'A computer vision system built on V-JEPA family models and world models, aimed across different domains.',
    tags: ['cs', 'aiml', 'computerVision', 'vjepa', 'flagship'],
    role: 'Creator & Lead Developer',
    detail: [
      {
        body: [
          'Osiris is my flagship, and the one project I keep under wraps. It works with computer vision, the V-JEPA family of models, and world models aimed at different domains.',
          'It is early and has startup potential, so the details stay private for now, until there is an NDA and a patent in place. Happy to talk about it directly under the right terms.',
        ],
      },
    ],
  },

  // ── HACKATHONS ───────────────────────────────────────────────────────────────
  {
    id: 'lingo',
    name: 'Lingo',
    category: 'hackathon',
    status: 'Winner',
    blurb:
      'An AI layer that sits between two people texting and makes sure nothing gets lost in translation. It breaks idioms, grammar, and cultural references down into plain terms.',
    tags: ['cs', 'aiml', 'react', 'gemini', 'openrouter', 'fastapi', 'tailwind', 'hackathon'],
    event: 'SpartaHack 11',
    award: 'Winner, Roots and Renewal track',
    team: 'Alex Thebolt, William Dalian, Melvin',
    detail: [
      {
        body: [
          'Lingo sits between two people texting and makes sure nothing gets lost in translation. It breaks down complex grammar, idioms, and cultural references, then explains them in plain terms. The idea came from a real texting mix up. Most tools translate words fine but miss meaning. Lingo translates the culture, not just the language.',
        ],
      },
      {
        heading: 'How it works',
        points: [
          {
            label: 'On your side',
            text: 'Lingo notices when the person you are messaging is not a native English speaker, tells you, and offers a simpler version of your message before you send it.',
          },
          {
            label: 'On their side',
            text: 'If you send it anyway, the receiver sees certain phrases underlined. Tap one and a small card explains what it means and the context behind it. The underline itself signals there is more to the sentence than the words.',
          },
          {
            label: 'Any language',
            text: 'It works across languages, not just English. A Telugu speaker messaging someone Japanese gets the same help. Even within English, someone from Bengaluru writes differently than someone from France, and that gap is exactly where Lingo works.',
          },
        ],
      },
      {
        heading: 'Engineering',
        points: [
          {
            label: 'Latency vs accuracy',
            text: 'Running the model on every keystroke was too slow, so I debounce and only analyze on send.',
          },
          {
            label: 'Many idioms at once',
            text: 'I rewrote the backend to return an array of matches and built a dynamic regex engine to highlight all of them in a single sentence.',
          },
          {
            label: 'Reliable output',
            text: 'A strict sociolinguistic expert system prompt that returns a fixed JSON schema (phrase, definition, context, suggestion), which stopped the model returning broken or made up responses.',
          },
          {
            label: 'False positives',
            text: 'The model had to learn that "break a leg" is an idiom in a theater but a real emergency in a hospital.',
          },
          {
            label: 'The demo',
            text: 'I faked a dual phone sender and receiver view inside one browser window so judges could watch both sides live.',
          },
        ],
      },
      {
        heading: 'Where it goes',
        body: [
          'Each user would build a linguistic profile that updates after every good conversation, so the suggestions get sharper over time. Beyond grammar, Lingo is meant to surface emotional cues too, flagging when a message might land as cold or aggressive in the other person’s context.',
        ],
      },
      {
        heading: 'Result',
        body: [
          'My first hackathon and my first win. We took the Roots and Renewal track, a social impact category with a cash prize.',
        ],
      },
    ],
    stack: ['React', 'Vite', 'Node.js', 'Tailwind CSS', 'Framer Motion', 'Gemini', 'OpenRouter', 'FastAPI', 'v0'],
    links: [
      { label: 'Devpost', href: '' }, // TODO: real Devpost link
      { label: 'GitHub', href: '' }, // TODO: repo
    ],
  },
  {
    id: 'eventos',
    // NOTE: Melvin's write-up consistently calls this "EventOS"; earlier records
    // had "EventsOS". Using EventOS per the latest source — confirm the canonical
    // spelling.
    name: 'EventOS',
    category: 'hackathon',
    status: 'Winner',
    blurb:
      'A multi agent platform for running large events. You type one command, and specialized AI agents handle sponsors, marketing, timelines, and compliance in parallel.',
    tags: ['cs', 'aiml', 'react', 'fastapi', 'gemini', 'mongodb', 'typescript', 'hackathon'],
    event: 'GrizzHacks 8',
    award: 'Winner, 1st Place CTF and Best Use of Gemini API',
    team: 'Melvin, Alex Thebolt, Chanuth Devnaka Jayatissa, Karthikeya Thota',
    detail: [
      {
        body: [
          'EventOS is a multi agent event management platform. You type a single plain language command, and several specialized AI agents run in parallel. Organizing a large tech event means sponsors, marketing, venue contracts, timelines, budgets, and outreach all living in different tools. EventOS pulls them under one roof.',
        ],
      },
      {
        heading: 'How it works',
        points: [
          {
            label: 'Command Center',
            text: 'A live terminal. You issue a directive like "find 10 tech sponsors, build a timeline for our hackathon, and generate a hype video," and a master brain parses it and dispatches the right agents.',
          },
          {
            label: 'Sponsor Scout',
            text: 'A scraper finds companies, then a matcher tiers each lead, estimates a dollar value, and exports to Excel.',
          },
          {
            label: 'Marketing Factory',
            text: 'A designer agent makes images and flyers, a cinematic agent makes promo videos.',
          },
          {
            label: 'Project Manager',
            text: 'Turns goals into a timeline with milestones, cross checking venue constraints so nothing collides.',
          },
          {
            label: 'Compliance Shield',
            text: 'Reads venue PDFs, pulls out the constraints (noise limits, load in windows, fire codes), and flags them before you book.',
          },
          {
            label: 'Communications',
            text: 'A Discord agent spins up servers and posts updates, an email agent drafts outreach and sends it from your Gmail over OAuth.',
          },
          {
            label: 'Finance',
            text: 'A planner builds category budgets, a tracker logs spending and flags overruns in real time.',
          },
        ],
      },
      {
        heading: 'Under the hood',
        body: [
          'A Gemini master brain routes your intent into a structured dispatch map. An asyncio orchestrator fires the matched agents in true parallel, each with a shared queue for streaming logs. Those logs stream to the terminal over SSE and persist to MongoDB, so history survives a refresh. A separate GPU gateway runs Stable Diffusion and CogVideoX on a Vultr A40 behind retry logic. Everything renders across five dashboards: Command Center, The Vault, Sponsor Hub, Logistics, and Finance.',
        ],
      },
    ],
    stack: [
      'React',
      'TypeScript',
      'Vite',
      'Tailwind CSS',
      'shadcn/ui',
      'Framer Motion',
      'Recharts',
      'FastAPI',
      'Python',
      'MongoDB Atlas',
      'Gemini',
      'Stable Diffusion',
      'CogVideoX',
      'Google OAuth',
    ],
    links: [
      { label: 'Devpost', href: '' }, // TODO: real Devpost link
      { label: 'GitHub', href: '' }, // TODO: repo
    ],
  },

  // ── PERSONAL ─────────────────────────────────────────────────────────────────
  {
    id: 'manas',
    name: 'Manas',
    // NOT a flagship (Melvin, 2026-08-11): a domain-expansion personal project
    // where CS, engineering, and astronomy meet.
    category: 'personal',
    blurb:
      'A desktop console for physically accurate space simulation. Four real simulations run in one window, every visual computed from physics, all driven from a built in terminal.',
    tags: ['cs', 'engineering', 'astronomy', 'typescript', 'webgl', 'glsl', 'tauri', 'domainExpansion'],
    role: 'Creator & Lead Developer',
    detail: [
      {
        body: [
          'Manas is a desktop cosmic simulation console. One window holds a 3D canvas, a command terminal, an instrument panel with live editable physics values, and a real time signal chart. It loads four simulations. Most other projects at the hackathon were a single simulation. Manas is the platform that holds several. Built for the Simathon hackathon.',
        ],
      },
      {
        heading: 'The four simulations',
        points: [
          {
            label: 'Black hole lab',
            text: 'A Schwarzschild black hole with a physically computed accretion disk. Photons are traced backward per pixel through curved spacetime with a geodesic integrator in GLSL. The photon ring, the lensing, and the Doppler brightness asymmetry all fall out of the math. Nothing is painted.',
          },
          {
            label: 'Pulsar signal lab',
            text: 'A neutron star with a tilted magnetic axis, sweeping its beams past an observer. The chart shows the exact intensity that observer would pick up. One preset is a silent pulsar, where the geometry proves no pulse can ever reach you.',
          },
          {
            label: 'Eclipsing binary observatory',
            text: 'Two stars orbiting a shared barycenter with closed form Keplerian positions, so there is zero drift. When one star slides behind the other on screen, the light curve dips in sync, because the picture and the model share one geometry.',
          },
          {
            label: 'Exoplanet transit lab',
            text: 'A planet crossing its star and dimming it by a computable amount. The 1% dip of a hot Jupiter and the 0.12% dip of a super Earth are both visible, because the chart auto zooms to the predicted depth.',
          },
        ],
      },
      {
        heading: 'The idea',
        body: [
          'Every module works the same way: geometry decides the signal. Beams sweeping an observer, an eclipse hiding a star, a transit dimming one. The chart always shows a real computed observable, never a scripted animation.',
        ],
      },
      {
        heading: 'How it is built',
        body: [
          'One manifest per simulation drives everything: the terminal commands, the panel sliders, the readouts, and the shader uniforms. Change a value in the terminal and the slider moves. Drag the slider and the terminal updates. They can never disagree, because they share one store. The physics lives in pure TypeScript with no rendering imports, and it is unit tested before any visual work starts.',
        ],
      },
      {
        heading: 'Rendering rule',
        body: [
          'Every color on a physical object comes from physics. Temperature maps to blackbody radiation, velocity to Doppler brightness. Most of every frame sits in near darkness, so the bright parts are earned. Hot spots blow to white through bloom, never painted. Every visual is a single fullscreen raymarched or raytraced shader, never meshes or sprites, run through an HDR pipeline with mip bloom, ACES tonemapping, and film grain.',
        ],
      },
    ],
    stack: ['TypeScript', 'Vite', 'WebGL2', 'GLSL', 'Tauri 2', 'vitest'],
    links: [
      { label: 'GitHub', href: '' }, // TODO: repo
    ],
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    category: 'personal',
    status: 'Live',
    blurb:
      'The site you are on. An interactive WebGL experience built by hand, structured around a life in three tenses. Every major visual is custom, from the shaders to the scroll physics.',
    tags: ['cs', 'react', 'typescript', 'threejs', 'webgl', 'glsl', 'gsap', 'skillBuilding'],
    role: 'Creator & Developer',
    detail: [
      {
        body: [
          'My personal portfolio, built to read as wide ranging craft rather than one field. The spine is a life in three tenses: past, present, future. Instead of a template with a project grid, it is a custom WebGL experience where every major visual is built by hand.',
        ],
      },
      {
        heading: 'Signature features',
        points: [
          {
            label: 'Loading sequence',
            text: 'A neuron ignition in raw WebGL. Cell bodies light up, dendrites grow and connect as a volumetric point cloud with multi pass bloom, and the camera pushes through the network. It plays once per session and you can skip it.',
          },
          {
            label: 'Hero particle face',
            text: 'A 1.4 million particle GPU simulation scattered across a real 3D face mesh. Each particle is spring held to its home and pushed by the cursor, and its brightness is its speed, so motion is what makes the face appear. You can drag to spin it a full 360. A subset render as glyphs, binary, Telugu, and hex, cycling through roving hotspots.',
          },
          {
            label: 'Liquid glass',
            text: 'Real glass, not a CSS blur. A WebGL2 shader captures the 3D scene, blurs it, then renders rounded rectangles with true refraction, chromatic dispersion, Fresnel, and glare. The shapes track the real interface elements every frame, so the glass sits exactly under the text.',
          },
          {
            label: 'Scrollytelling',
            text: 'A five beat sticky scroll driven by GSAP. One shared scroll store is the only thing scroll writes to, and the 3D scenes never read scroll directly, so a scroll change can never break a visual.',
          },
        ],
      },
      {
        heading: 'How it is built',
        body: [
          'The particle face runs entirely on the GPU. GPUComputationRenderer holds each particle’s state, and a surface sampler with a BVH scatters them onto a real 3D face mesh. One shared scroll store owns all scroll state, and the 3D scenes only ever read from it, so a change to the scroll timeline can never break a scene. Quality tiers adapt the load to the device, and reduced motion is respected.',
        ],
      },
      {
        heading: 'What I learned',
        body: [
          'CGI reads as CGI because of volumetric mass, real bloom, a moving camera, and atmosphere, never wireframe. Representational art needs real geometry: two failed attempts, a face of pure particles and a photo stretched into 3D, proved that noise cannot fake a real subject, and sampling onto an actual mesh fixed it. And motion is what sells liquid. A static distortion just reads as a textured surface.',
        ],
      },
    ],
    stack: [
      'React 19',
      'TypeScript',
      'Vite',
      'Tailwind CSS v4',
      'Three.js',
      'React Three Fiber',
      'GLSL',
      'GSAP',
      'Lenis',
      'Vercel',
    ],
    links: [
      { label: 'GitHub', href: '' }, // TODO: public repo (if source is shared)
    ],
  },

  {
    id: 'ottosys',
    name: 'OttoSys',
    // Melvin's call (2026-08-12): filed under Personal / For Fun. It is a serious
    // system but carries no conventional tech stack, so no `stack` section.
    category: 'personal',
    status: 'In Progress',
    blurb:
      'A personal automation system I’m building on Claude, one skill at a time. Right now it runs my admin life: LinkedIn, email, calendar, club.',
    tags: ['cs', 'aiml', 'forFun'],
    role: 'Creator & Developer',
    detail: [
      {
        body: [
          'Long term, OttoSys is one node in a network of automations, each bounded to its own part of life, coordinated by a single intelligent layer above them.',
          'The tempting move is one system that automates everything. I’m avoiding that on purpose. One system covering a whole life adds latency, adds redundancy, and burns compute on tasks that never needed that much reasoning. So OttoSys is a network instead.',
        ],
      },
      {
        heading: 'What’s built: the skills',
        points: [
          {
            label: 'LinkedIn post drafting',
            text: 'Writes posts from real project data pulled from Devpost and GitHub, not memory. Tone shifts by content type. Credits teammates by name, every time.',
          },
          {
            label: 'LinkedIn outreach DMs',
            text: 'Short, one ask, always tied to something specific about the person. Never invents a hook.',
          },
          {
            label: 'Google Calendar',
            text: 'Books events by relationship and time of day rules. Surfaces conflicts instead of resolving them on its own. Confirms before inviting anyone.',
          },
          {
            label: 'Email drafting',
            text: 'Tone climbs as the relationship gets more established. Drafts only. Never sends.',
          },
          {
            label: 'Skill creator',
            text: 'A meta skill that scaffolds every new skill to the same standard, so nothing drifts from day one.',
          },
        ],
      },
      {
        heading: 'The hands: MCP connections',
        points: [
          {
            label: 'Gmail and Calendar',
            text: 'Anthropic’s own connectors. Credentials stay server side, off any single device.',
          },
          {
            label: 'GitHub and Devpost',
            text: 'Fetched live for real project facts, a direct fetch each time, no standing connector.',
          },
          {
            label: 'LinkedIn',
            text: 'No connector at all. There is no API to actually post or send, so everything is draft only, copied out by hand. That is a safety rail, not a gap I’m rushing to close.',
          },
        ],
      },
      {
        heading: 'Architecture: a network of domains, not one brain',
        body: [
          'Each part of life becomes its own domain: bounded, independent, replaceable. OttoSys is the admin domain (LinkedIn, email, calendar, club, soon GitHub hygiene). A future domain would oversee my actual builds, like Osiris.',
          'Every domain runs the same three layers: MCP for the hands, skills for the judgment, context for the memory. Above them all sits a thin orchestrator, the harness. It does two jobs only: decide which domain owns a task, and decide which model runs it.',
        ],
      },
      {
        heading: 'Model agnosticism',
        body: [
          'The core bet: judgment lives in the skill, not in whichever model is running it. Every skill has to pass one test. Could a cheap, weak model execute it correctly, start to finish, with no hidden judgment left unstated. If a skill only works on a strong model, that is a bug in the skill, not a limit of the model.',
          'Strong models write and improve skills. Cheap models run them day to day. That split is what makes the whole thing affordable to run for real, not just as a demo.',
        ],
      },
      {
        heading: 'SEAS: assisted evolution, always human approved',
        body: [
          'The goal is a system that keeps getting better on its own initiative. It notices its own mistakes, proposes fixes, improves over time. I call the loop SEAS. Observe a correction or a repeated failure. Propose a concrete diff to the skill, with a reason. Present it to me, never applied silently. I approve or reject, my call every time. Commit to git, so every change is tracked and reversible.',
          'It is deliberately not autonomous. A system that drafts my emails and books my time doesn’t get to rewrite its own judgment while I’m not looking. The improvement is real, the loop just always closes through me.',
        ],
      },
      {
        heading: 'Command center',
        body: [
          'One place to talk to the whole system, not a different app per domain. Terminal first, where the harness gets built and proven. A Telegram bot next, a phone based door into the same orchestrator, so a task started on my phone and one started in the terminal get handled the exact same way. The same rules travel with it: draft don’t send, confirm before anything irreversible, verify after write. Texting a bot doesn’t loosen the human gate.',
        ],
      },
      {
        heading: 'The context vault: toward a second brain',
        body: [
          'Right now the vault is plain markdown with YAML frontmatter, one file each for people, rules, and facts, linked together and Obsidian compatible on purpose. The plan is to bring it into Obsidian and use the graph view to actually see the system think, relationships and rules and past decisions as one connected map. A second brain the automation reads from, not just a place I take notes.',
        ],
      },
      {
        heading: 'Roadmap',
        points: [
          { text: 'Finish the admin domain: compliance auditor, then scout.' },
          {
            text: 'Put the club side to real use helping run Hack the Nest, EMU’s first ever hackathon, led by our Google Developer Group.',
          },
          { text: 'Stand up a second domain and let two real systems tell me what the harness actually needs.' },
          { text: 'Build the harness: domain router plus model router.' },
          { text: 'Bring the context vault into Obsidian for the second brain view.' },
          { text: 'Move hosting onto local and VPS instances.' },
          { text: 'Interfaces last: a command center in the terminal, then a Telegram bot, both on the same harness.' },
        ],
      },
    ],
  },
  {
    id: 'spidey',
    name: 'Spidey',
    category: 'personal',
    status: 'In Progress',
    // Placeholder — Melvin will supply the write-up. A "for fun" personal build.
    blurb: 'A project I’m building for fun. More on it soon.',
    tags: ['cs', 'forFun'],
    tentative: true,
  },
]

/** Section title shown for each category (also used to open the right section
 *  when a search result is clicked). */
export const CATEGORY_LABEL: Record<WorkProject['category'], string> = {
  flagship: 'Flagship',
  hackathon: 'Hackathons',
  personal: 'Personal',
}
