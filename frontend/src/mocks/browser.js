import { http, HttpResponse } from 'msw';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const handlers = [
  http.get(`${API}/admin/me`, () =>
    HttpResponse.json({ user: { id: 'USR-0001', name: 'Dev Admin', role: 'super_admin' } })),

  // Example handler. Each member adds their own in their own file and spreads it in here.
  http.get(`${API}/admin/users`, () =>
    HttpResponse.json({
      data: [
        { id: 'USR-1001', name: 'Nimal Perera', email: 'n***@gmail.com', status: 'active' },
        { id: 'USR-1002', name: 'Kasun Silva', email: 'k***@gmail.com', status: 'suspended' },
      ],
      page: 1, pageSize: 25, total: 2,
    })),
];