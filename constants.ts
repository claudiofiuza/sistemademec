
import { Permission, Role, AppSettings, Workshop, User } from './types';

export const SUPER_ADMIN_ID = 'u1';

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

export const DEFAULT_SETTINGS: AppSettings = {
  workshopName: 'Los Santos Customs Pro',
  logoUrl: '',
  taxRate: 0.15,
  freelanceMultiplier: 1.5,
  primaryColor: '#10b981',
  currencySymbol: 'R$',
  categories: ['Motor', 'Transmissão', 'Estetica', 'Pintura', 'Suspensão', 'Outros'],
  categoryGroups: {
    'Motor': 'Performance',
    'Transmissão': 'Performance',
    'Estetica': 'Estetica',
    'Pintura': 'Estetica',
    'Suspensão': 'Performance',
    'Outros': 'Estetica'
  },
  esteticaWebhook: '',
  performanceWebhook: ''
};

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

export const INITIAL_WORKSHOPS: Workshop[] = [
  {
    id: 'w1',
    name: 'LSC Central',
    ownerId: SUPER_ADMIN_ID,
    settings: { ...DEFAULT_SETTINGS },
    parts: [
      { id: 'p1', name: 'Turbo Tuning', category: 'Motor', price: 15000 },
      { id: 'p2', name: 'Pintura Mate', category: 'Pintura', price: 5000 },
    ],
    roles: [...INITIAL_ROLES],
    history: [],
    announcements: [],
    workSessions: []
  }
];
