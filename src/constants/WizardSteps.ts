export interface WizardStep {
    id: number;
    title: string;
    subtitle: string;
    fields: string[];
}

export const getWizardSteps = (t: (key: string) => string): WizardStep[] => [
    { 
        id: 1, 
        title: t('wizard.stepNames.step1.title'), 
        subtitle: t('wizard.stepNames.step1.subtitle'), 
        fields: ['subgroup_id', 'component_type', 'failure_date', 'failure_time', 'analysis_type', 'facilitator', 'participants', 'os_number', 'start_date', 'completion_date'] 
    },
    { 
        id: 2, 
        title: t('wizard.stepNames.step2.title'), 
        subtitle: t('wizard.stepNames.step2.subtitle'), 
        fields: ['who', 'when', 'where_description', 'what', 'problem_description', 'potential_impacts', 'quality_impacts'] 
    },
    { 
        id: 3, 
        title: t('wizard.stepNames.step3.title'), 
        subtitle: t('wizard.stepNames.step3.subtitle'), 
        fields: ['specialty_id', 'failure_mode_id', 'failure_category_id', 'downtime_minutes', 'financial_impact'] 
    },
    { 
        id: 4, 
        title: t('wizard.stepNames.step4.title'), 
        subtitle: t('wizard.stepNames.step4.subtitle'), 
        fields: ['five_whys', 'ishikawa', 'root_causes'] 
    },
    { 
        id: 5, 
        title: t('wizard.stepNames.step5.title'), 
        subtitle: t('wizard.stepNames.step5.subtitle'), 
        fields: ['actions'] 
    },
    { 
        id: 6, 
        title: t('wizard.stepNames.step6.title'), 
        subtitle: t('wizard.stepNames.step6.subtitle'), 
        fields: [] 
    },
    { 
        id: 7, 
        title: t('wizard.stepNames.step7.title'), 
        subtitle: t('wizard.stepNames.step7.subtitle'), 
        fields: [] 
    }
];
