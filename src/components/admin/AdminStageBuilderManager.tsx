import React from 'react';
import { AdminGameMapManager } from './AdminGameMapManager';
import { SiteSettings, JourneyStage } from '../../types';

interface AdminStageBuilderManagerProps {
  siteSettings: SiteSettings;
  setSiteSettings: (settings: any) => void;
  triggerAlert: (msg: string) => void;
  stages?: JourneyStage[];
  setStages?: React.Dispatch<React.SetStateAction<JourneyStage[]>>;
}

export const AdminStageBuilderManager: React.FC<AdminStageBuilderManagerProps> = ({
  siteSettings,
  setSiteSettings,
  triggerAlert,
  stages = [],
  setStages
}) => {
  return (
    <div className="space-y-6 dir-rtl font-sans">
      <AdminGameMapManager
        siteSettings={siteSettings}
        setSiteSettings={setSiteSettings}
        triggerAlert={triggerAlert}
        stages={stages}
        setStages={setStages}
        hideHeader={true}
      />
    </div>
  );
};
