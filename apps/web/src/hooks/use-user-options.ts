import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface UseUserOptionsReturn {
  users: UserOption[];
  isLoading: boolean;
}

export function useUserOptions(): UseUserOptionsReturn {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/auth/users');
      const raw = res.data?.data ?? [];
      setUsers(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error('Failed to load users', err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, isLoading };
}
