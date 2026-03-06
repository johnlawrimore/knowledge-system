'use client';

import EmptyState from '@/components/EmptyState';
import CardSourceFooter from '@/components/CardSourceFooter';
import { deviceTypeLabel, contextTypeLabel, methodTypeLabel } from '@/lib/enumLabels';
import type { Device, Context, Method } from '@/lib/types';
import s from '../page.module.scss';

interface ClaimEntitiesTabProps {
  entityType: 'devices' | 'contexts' | 'methods';
  devices: Device[];
  contexts: Context[];
  methods: Method[];
}

const entityConfig = {
  devices: {
    emptyMessage: 'No devices linked to this claim',
    typeLabel: deviceTypeLabel,
    typeField: 'device_type' as const,
  },
  contexts: {
    emptyMessage: 'No contexts linked to this claim',
    typeLabel: contextTypeLabel,
    typeField: 'context_type' as const,
  },
  methods: {
    emptyMessage: 'No methods linked to this claim',
    typeLabel: methodTypeLabel,
    typeField: 'method_type' as const,
  },
};

export default function ClaimEntitiesTab({ entityType, devices, contexts, methods }: ClaimEntitiesTabProps) {
  const config = entityConfig[entityType];
  const items =
    entityType === 'devices' ? devices :
    entityType === 'contexts' ? contexts :
    methods;

  if (items.length === 0) {
    return <EmptyState message={config.emptyMessage} variant="tab" />;
  }

  return (
    <div className={s.cardList}>
      {items.map((item) => {
        const typeValue =
          entityType === 'devices' ? (item as Device).device_type :
          entityType === 'contexts' ? (item as Context).context_type :
          (item as Method).method_type;

        return (
          <div key={item.id} className={s.entityCard}>
            <div className={s.entityCardHeader}>
              <span className={s.entityTypeBadge}>{config.typeLabel(typeValue)}</span>
            </div>
            <div className={s.cardContent}>{item.content}</div>
            {entityType === 'devices' && (item as Device).effectiveness_note && (
              <div className={s.cardNote}>Effectiveness: {(item as Device).effectiveness_note}</div>
            )}
            <CardSourceFooter
              sourceId={item.source_id}
              sourceTitle={item.source_title}
              contributors={item.contributors}
              abstractionLevel={entityType === 'methods' ? (item as Method).abstraction_level : undefined}
              assumedExpertise={entityType === 'methods' ? (item as Method).assumed_expertise : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
