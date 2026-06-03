import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { Badge, Button, Card, Alert } from '../../components/ui';
import '../../components/ui/ui.css';

interface Room {
  id: string;
  name: string;
  type: string;
  capacity: number;
  status: 'disponivel' | 'em-uso' | 'manutencao' | 'reservada';
  currentProcedure?: string;
  professional?: string;
  endTime?: string;
  equipment: string[];
  nextReservation?: string;
}

const rooms: Room[] = [
  {
    id: '1',
    name: 'Sala 1 · Laser',
    type: 'Procedimento Laser',
    capacity: 1,
    status: 'em-uso',
    currentProcedure: 'Depilação Laser',
    professional: 'Carla Mendes',
    endTime: '14:30',
    equipment: ['Laser Diodo', 'Óculos Protetor', 'Gel'],
    nextReservation: '15:00 · João Pedro',
  },
  {
    id: '2',
    name: 'Sala 2 · Estética',
    type: 'Estética Facial',
    capacity: 1,
    status: 'disponivel',
    equipment: ['Aparelho Ultrassom', 'Micro-Agulhamento', 'Luminoterapia'],
    nextReservation: '15:30 · Lara Costa',
  },
  {
    id: '3',
    name: 'Sala 3 · Injetáveis',
    type: 'Procedimentos Injetáveis',
    capacity: 1,
    status: 'reservada',
    currentProcedure: 'Botox Facial',
    professional: 'Dra. Carla Mendes',
    endTime: '15:00',
    equipment: ['Mesa Cirúrgica', 'Iluminação LED', 'Kit Injetáveis'],
    nextReservation: '15:00 · Carla Mendes',
  },
  {
    id: '4',
    name: 'Sala 4 · Corporal',
    type: 'Estética Corporal',
    capacity: 2,
    status: 'manutencao',
    equipment: ['Criolipólise', 'Radiofrequência', 'Drenagem Linfática'],
  },
  {
    id: '5',
    name: 'Sala 5 · Consulta',
    type: 'Consultório',
    capacity: 1,
    status: 'disponivel',
    equipment: ['Computador', 'Balança', 'Maca'],
    nextReservation: '16:00 · João Pedro',
  },
  {
    id: '6',
    name: 'Sala 6 · VIP',
    type: 'Procedimento Premium',
    capacity: 1,
    status: 'em-uso',
    currentProcedure: 'Peeling Químico',
    professional: 'Lara Costa',
    endTime: '14:45',
    equipment: ['Kit Peeling', 'Fototerapia', 'Máscara LED'],
  },
];

const statusConfig = {
  'disponivel':  { label: 'Disponível',  variant: 'success' as const, dot: 'var(--success)' },
  'em-uso':      { label: 'Em Uso',      variant: 'info'    as const, dot: 'var(--info)'    },
  'reservada':   { label: 'Reservada',   variant: 'warning' as const, dot: '#f59e0b'        },
  'manutencao':  { label: 'Manutenção',  variant: 'danger'  as const, dot: 'var(--danger)'  },
};

const SalasClinica = () => {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? rooms : rooms.filter(r => r.status === filter);

  const counts = {
    all: rooms.length,
    disponivel: rooms.filter(r => r.status === 'disponivel').length,
    'em-uso': rooms.filter(r => r.status === 'em-uso').length,
    manutencao: rooms.filter(r => r.status === 'manutencao').length,
  };

  const topbarRight = (
    <>
      <Button variant="outline" size="sm">+ Nova Sala</Button>
      <Button variant="primary" size="sm">Agendar Sala</Button>
    </>
  );

  return (
    <AppShell topbarRight={topbarRight}>
      {counts.manutencao > 0 && (
        <Alert variant="warning">
          <strong>Sala 4 · Corporal</strong> está em manutenção desde ontem. Atualize o status quando disponível.
        </Alert>
      )}

      {/* Summary metrics */}
      <div className="metrics" style={{ marginBottom: 16 }}>
        <div className="m-card">
          <div className="m-lbl">Total de Salas</div>
          <div className="m-val">{rooms.length}</div>
          <div className="m-delta neutral">Capacidade instalada</div>
        </div>
        <div className="m-card">
          <div className="m-lbl">Disponíveis</div>
          <div className="m-val" style={{ color: 'var(--success)' }}>{counts.disponivel}</div>
          <div className="m-delta up">Prontas para uso</div>
        </div>
        <div className="m-card">
          <div className="m-lbl">Em Uso Agora</div>
          <div className="m-val" style={{ color: 'var(--info)' }}>{counts['em-uso']}</div>
          <div className="m-delta neutral">Ocupação atual</div>
        </div>
        <div className="m-card">
          <div className="m-lbl">Em Manutenção</div>
          <div className="m-val" style={{ color: 'var(--danger)' }}>{counts.manutencao}</div>
          <div className="m-delta down">Indisponíveis</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {[
          { key: 'all',         label: `Todas (${counts.all})` },
          { key: 'disponivel',  label: `Disponíveis (${counts.disponivel})` },
          { key: 'em-uso',      label: `Em Uso (${counts['em-uso']})` },
          { key: 'manutencao',  label: `Manutenção (${counts.manutencao})` },
        ].map(t => (
          <button key={t.key} className={`tab ${filter === t.key ? 'on' : ''}`} onClick={() => setFilter(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Room cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {filtered.map(room => {
          const cfg = statusConfig[room.status];
          return (
            <Card key={room.id} style={{ padding: 16 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{room.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{room.type}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot }} />
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
              </div>

              {/* Current procedure */}
              {room.currentProcedure && (
                <div style={{ background: 'var(--bg-alt)', borderRadius: 'var(--r-sm)', padding: '8px 10px', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Procedimento atual</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{room.currentProcedure}</div>
                  {room.professional && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {room.professional} · até {room.endTime}
                    </div>
                  )}
                </div>
              )}

              {/* Equipment */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Equipamentos</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {room.equipment.map(eq => (
                    <span key={eq} style={{
                      fontSize: 10.5, padding: '2px 7px',
                      background: 'var(--bg-alt)', borderRadius: 20,
                      border: '1px solid var(--border)', color: 'var(--text-secondary)'
                    }}>{eq}</span>
                  ))}
                </div>
              </div>

              {/* Next reservation */}
              {room.nextReservation && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  Próxima reserva: <strong style={{ color: 'var(--text)' }}>{room.nextReservation}</strong>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {room.status === 'disponivel' && <Button variant="primary" size="sm" style={{ flex: 1 }}>Reservar</Button>}
                {room.status === 'em-uso' && <Button variant="outline" size="sm" style={{ flex: 1 }}>Ver Detalhes</Button>}
                {room.status === 'manutencao' && <Button variant="outline" size="sm" style={{ flex: 1 }}>Marcar Disponível</Button>}
                {room.status === 'reservada' && <Button variant="outline" size="sm" style={{ flex: 1 }}>Cancelar Reserva</Button>}
                <Button variant="outline" size="sm">Editar</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
};

export default SalasClinica;
