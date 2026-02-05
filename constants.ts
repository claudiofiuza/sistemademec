
import { Part, User, Permission, Role, AppSettings, Workshop } from './types';

export const INITIAL_ROLES: Role[] = [
  {
    id: 'r_admin',
    name: 'Administrador',
    permissions: Object.values(Permission)
  },
  {
    id: 'r_mechanic',
    name: 'Mecânico',
    permissions: [
      Permission.VIEW_DASHBOARD,
      Permission.USE_CALCULATOR,
      Permission.VIEW_HISTORY,
      Permission.VIEW_TIME_TRACKER
    ]
  }
];

export const SUPER_ADMIN_ID = 'u1';

export const INITIAL_USERS: User[] = [
  {
    id: SUPER_ADMIN_ID,
    username: 'Panda',
    name: 'Panda (Super Admin)',
    roleId: 'r_admin',
    workshopId: 'system',
    password: '12345',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Panda'
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  workshopName: 'Los Santos Customs',
  logoUrl: '',
  taxRate: 0.15,
  freelanceMultiplier: 1.5,
  primaryColor: '#10b981',
  currencySymbol: 'R$',
  categories: ['Motor', 'Transmissão', 'Lataria', 'Suspensão', 'Estetica', 'Outro'],
  categoryGroups: {
    'Motor': 'Performance',
    'Transmissão': 'Performance',
    'Lataria': 'Estetica',
    'Suspensão': 'Performance',
    'Estetica': 'Estetica',
    'Outro': 'Estetica'
  },
  esteticaWebhook: '',
  performanceWebhook: ''
};

export const INITIAL_WORKSHOPS: Workshop[] = [
  {
    id: 'w1',
    name: 'Oficina Central Pro',
    ownerId: SUPER_ADMIN_ID,
    settings: { ...DEFAULT_SETTINGS, workshopName: 'Oficina Central Pro' },
    parts: [
      { id: 'p1', name: 'Turbo Tuning', category: 'Motor', price: 15000 },
      { id: 'p2', name: 'Motor Estágio 4', category: 'Motor', price: 25000 },
    ],
    roles: [...INITIAL_ROLES],
    history: [],
    announcements: [],
    workSessions: []
  }
];
