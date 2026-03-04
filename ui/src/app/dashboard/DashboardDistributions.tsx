import { DashboardData } from '@/lib/types';
import { DimensionGrid } from '@/components/EvalSection';
import s from '../page.module.scss';

export default function DashboardDistributions({
  evalAverages,
}: {
  evalAverages: DashboardData['evalAverages'];
}) {
  return (
    <div className={s.evalRow}>
      <div className={s.evalCard}>
        <div className={`${s.evalHeader} ${s.evalHeaderClaim}`}>
          <span className={`${s.evalHeaderLabel} ${s.evalHeaderLabelClaim}`}>Claim Evaluation</span>
        </div>
        <div className={s.evalBody}>
          <DimensionGrid dimensions={evalAverages.claimValidity} columns={3} label="Validity" />
          <DimensionGrid dimensions={evalAverages.claimSubstance} columns={3} label="Substance" />
        </div>
      </div>

      <div className={s.evalCard}>
        <div className={`${s.evalHeader} ${s.evalHeaderSource}`}>
          <span className={`${s.evalHeaderLabel} ${s.evalHeaderLabelSource}`}>Source Evaluation</span>
        </div>
        <div className={s.evalBody}>
          <DimensionGrid dimensions={evalAverages.sourceQuality} columns={4} label="Quality" />
          <DimensionGrid dimensions={evalAverages.sourceRigor} columns={4} label="Rigor" />
        </div>
      </div>
    </div>
  );
}
