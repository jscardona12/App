type ReimbursementAccountDraft = {
    accountNumber?: string;
    routingNumber?: string;
    acceptTerms?: boolean;
    plaidAccountID?: string;
    plaidMask?: string;
    companyName?: string;
    companyPhone?: string;
    website?: string;
    companyTaxID?: string;
    incorporationType?: string;
    incorporationDate?: string | Date;
    incorporationState?: string;
    hasNoConnectionToCannabis?: boolean;
    isControllingOfficer?: boolean;
    isOnfidoSetupComplete?: boolean;
    ownsMoreThan25Percent?: boolean;
    hasOtherBeneficialOwners?: boolean;
    acceptTermsAndConditions?: boolean;
    certifyTrueInformation?: boolean;
    beneficialOwners?: string[];
    isSavings?: boolean;
    bankName?: string;
    plaidAccessToken?: string;
    amount1?: string;
    amount2?: string;
    amount3?: string;
};

export default ReimbursementAccountDraft;