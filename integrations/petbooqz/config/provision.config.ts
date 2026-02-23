/**
 * Provision Configuration
 * =======================
 *
 * This file defines all resources that are automatically provisioned
 * when the app version is deployed.
 *
 * Note: Per-install env vars (API credentials) and SHARED models are in install.config.ts
 */

import type { ProvisionConfig } from 'skedyul'

const config: ProvisionConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────────────────
  navigation: {
    sidebar: {
      sections: [
        {
          items: [
            { label: 'Clients', href: '/clients', icon: 'Users' },
            { label: 'Patients', href: '/patients', icon: 'PawPrint' },
            { label: 'Appointments', href: '/appointments', icon: 'Calendar' },
          ],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Pages
  // ─────────────────────────────────────────────────────────────────────────
  pages: [
    // ─────────────────────────────────────────────────────────────────────────
    // Clients Page - Configure Client Model Mapping
    // ─────────────────────────────────────────────────────────────────────────
    {
      type: 'INSTANCE',
      title: 'Clients',
      path: '/clients',
      default: true,
      navigation: true,
      blocks: [
        {
          type: 'model-mapper',
          model: 'client',
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Patients Page - Configure Patient Model Mapping
    // ─────────────────────────────────────────────────────────────────────────
    {
      type: 'INSTANCE',
      title: 'Patients',
      path: '/patients',
      navigation: true,
      blocks: [
        {
          type: 'model-mapper',
          model: 'patient',
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Appointments Page - Configure Appointment Model Mapping
    // ─────────────────────────────────────────────────────────────────────────
    {
      type: 'INSTANCE',
      title: 'Appointments',
      path: '/appointments',
      navigation: true,
      blocks: [
        {
          type: 'model-mapper',
          model: 'appointment',
        },
      ],
    },
  ],
}

export default config
