export const CONFIG = {
    GRAVITY: -15, // Stronger gravity for faster settling
    PLAYER_SPEED: 15,
    VOXEL_SIZE: 1,
    DEFAULT_MAP_SIZE: 100,

    // Audio
    MASTER_VOLUME: 0.5,

    // Game
    STARTING_MONEY: 10000,

    // Physics Limits - OPTIMIZED
    PHYSICS_STEPS: 1 / 60,
    PHYSICS_SUBSTEPS: 3, // Reduced for performance
    MAX_BODIES: 500, // Hard limit
    SLEEP_SPEED_LIMIT: 0.5, // Sleep faster
    SLEEP_TIME_LIMIT: 0.1, // Sleep very fast

    // Cleanup
    VOXEL_LIFETIME: 3, // Seconds before destroyed voxel disappears
};

export const TOOLS = {
    // Construction
    HOUSE: { id: 'HOUSE', name: 'Maison', price: 500, type: 'build' },
    BUILDING: { id: 'BUILDING', name: 'Immeuble', price: 1500, type: 'build' },
    SKYSCRAPER: { id: 'SKYSCRAPER', name: 'Tour', price: 5000, type: 'build' },
    FACTORY: { id: 'FACTORY', name: 'Usine', price: 3000, type: 'build' },

    // Destruction - BALANCED
    BALL: { id: 'BALL', name: 'Boule', price: 0, type: 'destroy', force: 25, radius: 2 },
    MISSILE: { id: 'MISSILE', name: 'Missile', price: 100, type: 'destroy', force: 40, radius: 5 },
    NUKE: { id: 'NUKE', name: 'Nuke', price: 2000, type: 'destroy', force: 60, radius: 15 },
};

export const LEVELS = [
    {
        id: 1,
        name: "Tutoriel",
        objectiveDescription: "Détruisez 2 bâtiments.",
        winCondition: { type: 'DESTRUCTION_COUNT', value: 2 },
        budget: 1000,
        toolsAllowed: ['BALL', 'MISSILE'],
        setup: { count: 3, type: 'MODERN' },
        stars: 0,
        unlocked: true
    },
    {
        id: 2,
        name: "Quartier Résidentiel",
        objectiveDescription: "Score cible : 3 000 pts.",
        winCondition: { type: 'SCORE', value: 3000 },
        budget: 2000,
        toolsAllowed: ['BALL', 'MISSILE'],
        setup: { count: 5, type: 'MODERN' },
        stars: 0,
        unlocked: false
    },
    {
        id: 3,
        name: "Zone Industrielle",
        objectiveDescription: "Score cible : 8 000 pts.",
        winCondition: { type: 'SCORE', value: 8000 },
        budget: 5000,
        toolsAllowed: ['BALL', 'MISSILE', 'NUKE'],
        setup: { count: 8, type: 'INDUSTRIAL' },
        stars: 0,
        unlocked: false
    },
    {
        id: 4,
        name: "Centre-Ville",
        objectiveDescription: "Détruisez 5 Gratte-ciels.",
        winCondition: { type: 'DESTRUCTION_COUNT', value: 5 },
        budget: 8000,
        toolsAllowed: ['ALL'],
        setup: { count: 10, type: 'MODERN' },
        stars: 0,
        unlocked: false
    },
    {
        id: 5,
        name: "Chaos Final",
        objectiveDescription: "Score cible : 20 000 pts.",
        winCondition: { type: 'SCORE', value: 20000 },
        budget: 15000,
        toolsAllowed: ['ALL'],
        setup: { count: 12, type: 'ANCIENT' },
        stars: 0,
        unlocked: false
    }
];
