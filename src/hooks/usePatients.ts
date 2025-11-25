
// src/hooks/usePatients.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getPatients as getPatientsAction } from '@/ai/actions/patients';
import type { Patient } from '@/lib/types';

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { patientsUpdateCount } = useAuth();

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchedPatients = await getPatientsAction();
      setPatients(fetchedPatients);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch patients');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [patientsUpdateCount, fetchPatients]);

  return { patients, loading, error, refetch: fetchPatients };
}
