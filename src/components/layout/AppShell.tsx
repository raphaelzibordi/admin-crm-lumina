import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
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

// Static clinic data (would come from API/context in real app)
const CLINICS: Record<string, ClinicContext> = {
  '1': { id: '1', name: 'Clínica Aurora', plan: 'Pro', health: 88 },
  '2': { id: '2', name: 'Rejuvenece BH', plan: 'Enterprise', health: 97 },
  '3': { id: '3', name: 'Studio Beleza', plan: 'Básico', health: 52 },
};

const AppShell = ({ children, clinicContext, topbarRight }: AppShellProps) => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const resolvedClinic = clinicContext ?? (clinicId ? CLINICS[clinicId] ?? null : null);

  return (
    <div className="shell">
      <Sidebar clinicContext={resolvedClinic} />
      <div className="page">
        <Topbar clinicName={resolvedClinic?.name} right={topbarRight} />
        <div className="pbody">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppShell;
export type { ClinicContext };
