export const CONFIG = {
    GRAVITY: -20,
    PLAYER_SPEED: 15,
    VOXEL_SIZE: 1,

    // Audio
    MASTER_VOLUME: 0.5,

    // Game
    STARTING_MONEY: 2000,

    // Physics Limits
    PHYSICS_STEPS: 1 / 60,
    PHYSICS_SUBSTEPS: 2,
    MAX_BODIES: 400,
    SLEEP_SPEED_LIMIT: 1.0,
    SLEEP_TIME_LIMIT: 0.1,

    // Cleanup
    VOXEL_LIFETIME: 1.5,

    // Gameplay
    COMBO_WINDOW: 2.5,
};

export const TOOLS = {
    // Construction
    HOUSE: { id: 'HOUSE', name: 'Maison', price: 500, type: 'build' },
    BUILDING: { id: 'BUILDING', name: 'Immeuble', price: 1500, type: 'build' },
    SKYSCRAPER: { id: 'SKYSCRAPER', name: 'Tour', price: 5000, type: 'build' },
    FACTORY: { id: 'FACTORY', name: 'Usine', price: 3000, type: 'build' },
    GAS_STATION: { id: 'GAS_STATION', name: 'Essence', price: 2000, type: 'build' },

    // Destruction
    BALL: { id: 'BALL', name: 'Boule', price: 0, type: 'destroy', force: 25, radius: 2 },
    MISSILE: { id: 'MISSILE', name: 'Missile', price: 100, type: 'destroy', force: 40, radius: 5 },
    NUKE: { id: 'NUKE', name: 'Nuke', price: 2000, type: 'destroy', force: 60, radius: 15 },
    BLACK_HOLE: { id: 'BLACK_HOLE', name: 'Trou Noir', price: 5000, type: 'destroy', radius: 30, duration: 5 }
};

export const LEVELS = [
    {
        id: 1,
        name: "Tutoriel Explosif",
        objectiveDescription: "Détruisez 3 bâtiments.",
        winCondition: { type: 'DESTRUCTION_COUNT', value: 3 },
        budget: 1000,
        toolsAllowed: ['BALL', 'MISSILE'],
        setup: { count: 8, type: 'MODERN' },
        stars: 0,
        unlocked: true
    },
    {
        id: 2,
        name: "Réaction en Chaîne",
        objectiveDescription: "Score cible : 10 000 pts.",
        winCondition: { type: 'SCORE', value: 10000 },
        budget: 2000,
        toolsAllowed: ['BALL', 'MISSILE'],
        setup: { count: 18, type: 'INDUSTRIAL' }, // More buildings for more chains
        stars: 0,
        unlocked: false
    },
    {
        id: 3,
        name: "Singularité",
        objectiveDescription: "Détruisez 25 bâtiments.",
        winCondition: { type: 'DESTRUCTION_COUNT', value: 25 },
        budget: 8000,
        toolsAllowed: ['ALL'],
        setup: { count: 30, type: 'MODERN' },
        stars: 0,
        unlocked: false
    },
    {
        id: 4,
        name: "Mégapole",
        objectiveDescription: "Score cible : 50 000 pts.",
        winCondition: { type: 'SCORE', value: 50000 },
        budget: 15000,
        toolsAllowed: ['ALL'],
        setup: { count: 40, type: 'MODERN' },
        stars: 0,
        unlocked: false
    },
    {
        id: 5,
        name: "Apocalypse",
        objectiveDescription: "Score cible : 200 000 pts.",
        winCondition: { type: 'SCORE', value: 200000 },
        budget: 30000,
        toolsAllowed: ['ALL'],
        setup: { count: 50, type: 'ANCIENT' },
        stars: 0,
        unlocked: false
    }
];
