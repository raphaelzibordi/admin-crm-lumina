import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { fetchClinicas } from '../../lib/crmQueries';
import '../layout/Topbar.css';

interface ClinicContext {
  id: string;
  name: string;
  plan: string;
  health: number;
}

interface AppShellProps {
  children: ReactNode;
  clinicContext?: ClinicContext | null;
  topbarRight?: ReactNode;
}

// Module-level cache so we only fetch once per session
let _cache: Map<string, ClinicContext> | null = null;
let _cachePromise: Promise<void> | null = null;

async function resolveClinicContext(clinicId: string): Promise<ClinicContext | null> {
  if (!_cache) {
    if (!_cachePromise) {
      _cachePromise = fetchClinicas().then(clinics => {
        _cache = new Map(clinics.map(c => [c.id, {
          id: c.id,
          name: c.nome_clinica,
          plan: '—',
          health: c.health_score,
        }]));
      }).catch(() => {
        _cache = new Map();
      });
    }
    await _cachePromise;
  }
  return _cache?.get(clinicId) ?? null;
}

const AppShell = ({ children, clinicContext, topbarRight }: AppShellProps) => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [resolvedClinic, setResolvedClinic] = useState<ClinicContext | null>(null);

  useEffect(() => {
    if (clinicContext !== undefined) {
      setResolvedClinic(clinicContext ?? null);
      return;
    }
    if (!clinicId) {
      setResolvedClinic(null);
      return;
    }
    resolveClinicContext(clinicId).then(ctx => setResolvedClinic(ctx));
  }, [clinicId, clinicContext]);

  const activeClinic = clinicContext !== undefined ? (clinicContext ?? null) : resolvedClinic;

  return (
    <div className="shell">
      <Sidebar clinicContext={activeClinic} />
      <div className="page">
        <Topbar clinicName={activeClinic?.name} right={topbarRight} />
        <div className="pbody">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppShell;
export type { ClinicContext };
